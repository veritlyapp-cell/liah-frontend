'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { updateUserAssignment } from '@/lib/firestore/user-assignment-actions';
import type { UserAssignment } from '@/lib/firestore/user-assignments';
import { db } from '@/lib/firebase';

interface EditUserModalProps {
    user: UserAssignment;
    holdingId: string;
    onClose: () => void;
    onSuccess: () => void;
}

export default function EditUserModal({ user, holdingId, onClose, onSuccess }: EditUserModalProps) {
    const [displayName, setDisplayName] = useState(user.displayName);
    const [role, setRole] = useState(user.role);

    // Get user's current marcaId from their assignment
    const userMarcaId = user.marcaId ||
        user.assignedMarca?.marcaId ||
        user.assignedStore?.marcaId ||
        user.assignedStores?.[0]?.marcaId ||
        '';

    const [marcaId, setMarcaId] = useState(userMarcaId);
    const [storeId, setStoreId] = useState(user.assignedStore?.tiendaId || '');
    const [selectedStores, setSelectedStores] = useState<string[]>(
        user.assignedStores?.map(s => s.tiendaId) || []
    );
    // Multi-brand selection for Recruiters
    const [selectedMarcas, setSelectedMarcas] = useState<string[]>(
        user.assignedMarcas?.map(m => m.marcaId) || (user.assignedMarca ? [user.assignedMarca.marcaId] : [])
    );

    const [marcas, setMarcas] = useState<{ id: string, nombre: string }[]>([]);
    const [availableStores, setAvailableStores] = useState<{ id: string, nombre: string, marcaId: string, isClaimedBySupervisor?: boolean, isClaimedByManager?: boolean }[]>([]);
    const [zonas, setZonas] = useState<{ id: string, nombre: string }[]>([]);
    const [selectedZonas, setSelectedZonas] = useState<string[]>(
        user.assignedZones?.map(z => z.zoneId) || []
    );
    const [loading, setLoading] = useState(false);

    // Load marcas and stores
    useEffect(() => {
        loadMarcas();
        loadStores();
        loadZonas();
    }, []);

    async function loadZonas() {
        try {
            const zonasRef = collection(db, 'zones');
            const q = query(zonasRef, where('holdingId', '==', holdingId));
            const snapshot = await getDocs(q);
            const loaded = snapshot.docs.map(doc => ({
                id: doc.id,
                nombre: doc.data().nombre
            }));
            setZonas(loaded);
        } catch (error) {
            console.error('Error loading zonas:', error);
        }
    }


    async function loadMarcas() {
        try {
            const marcasRef = collection(db, 'marcas');
            const q = query(marcasRef, where('holdingId', 'in', [holdingId, 'ngr']));
            const snapshot = await getDocs(q);

            const loadedMarcas = snapshot.docs.map(doc => ({
                id: doc.id,
                nombre: doc.data().nombre
            }));

            setMarcas(loadedMarcas);
        } catch (error) {
            console.error('Error loading marcas:', error);
        }
    }

    async function loadStores() {
        try {
            const storesRef = collection(db, 'tiendas');
            const q = query(storesRef, where('holdingId', 'in', [holdingId, 'ngr']));
            const snapshot = await getDocs(q);

            const loadedStores = snapshot.docs.map(doc => ({
                id: doc.id,
                nombre: doc.data().nombre,
                marcaId: doc.data().marcaId
            }));

            // Fetch all user assignments to identify claimed stores by OTHERS
            const assignmentsRef = collection(db, 'userAssignments');
            const assignmentsSnap = await getDocs(assignmentsRef);

            const claimedBySupervisorOther = new Set<string>();
            const claimedByManagerOther = new Set<string>();

            assignmentsSnap.docs.forEach(doc => {
                const data = doc.data();
                // Skip the current user we are editing
                if (data.userId === user.userId) return;

                if (data.active !== false && data.isActive !== false) {
                    if (data.role === 'supervisor' && data.assignedStores) {
                        data.assignedStores.forEach((s: any) => claimedBySupervisorOther.add(s.tiendaId));
                    }
                    if (data.role === 'store_manager' && (data.tiendaId || data.assignedStore?.tiendaId)) {
                        claimedByManagerOther.add(data.tiendaId || data.assignedStore.tiendaId);
                    }
                }
            });

            setAvailableStores(loadedStores.map(s => ({
                ...s,
                isClaimedBySupervisor: claimedBySupervisorOther.has(s.id),
                isClaimedByManager: claimedByManagerOther.has(s.id)
            })));
        } catch (error) {
            console.error('Error loading stores:', error);
        }
    }

    function toggleStore(storeId: string) {
        setSelectedStores(prev =>
            prev.includes(storeId)
                ? prev.filter(id => id !== storeId)
                : [...prev, storeId]
        );
    }

    function toggleMarca(marcaId: string) {
        setSelectedMarcas(prev =>
            prev.includes(marcaId)
                ? prev.filter(id => id !== marcaId)
                : [...prev, marcaId]
        );
    }

    function toggleZona(zonaId: string) {
        setSelectedZonas(prev =>
            prev.includes(zonaId)
                ? prev.filter(id => id !== zonaId)
                : [...prev, zonaId]
        );
    }

    async function handleSave() {
        setLoading(true);
        try {
            const updateData: Partial<UserAssignment> = {
                displayName,
                role
            };

            // Update role-specific assignments
            if (role === 'supervisor') {
                const assignedStores = selectedStores.map(sid => {
                    const store = availableStores.find(s => s.id === sid);
                    const marca = marcas.find(m => m.id === store?.marcaId);
                    return {
                        tiendaId: sid,
                        tiendaNombre: store?.nombre || sid,
                        marcaId: store?.marcaId || '',
                        marcaNombre: marca?.nombre || ''
                    };
                });
                updateData.assignedStores = assignedStores;
                // Update primary brand if first store exists
                if (assignedStores.length > 0) {
                    updateData.marcaId = assignedStores[0].marcaId;
                    // Adding this for future consistency
                    (updateData as any).marcaNombre = assignedStores[0].marcaNombre;
                }
            } else if (role === 'jefe_marca') {
                if (marcaId) {
                    const marca = marcas.find(m => m.id === marcaId);
                    updateData.assignedMarca = {
                        marcaId,
                        marcaNombre: marca?.nombre || marcaId
                    };
                    updateData.marcaId = marcaId;
                    (updateData as any).marcaNombre = marca?.nombre;
                }
            } else if (role === 'recruiter') {
                // Recruiters can have multiple marcas
                const assignedMarcas = selectedMarcas.map(mid => {
                    const marca = marcas.find(m => m.id === mid);
                    return {
                        marcaId: mid,
                        marcaNombre: marca?.nombre || mid
                    };
                });
                updateData.assignedMarcas = assignedMarcas;
                // Also set first marca as primary for backwards compatibility
                if (assignedMarcas.length > 0) {
                    updateData.assignedMarca = assignedMarcas[0];
                    updateData.marcaId = assignedMarcas[0].marcaId;
                    (updateData as any).marcaNombre = assignedMarcas[0].marcaNombre;
                }
            } else if (role === 'store_manager') {
                if (storeId) {
                    const store = availableStores.find(s => s.id === storeId);
                    const marca = marcas.find(m => m.id === store?.marcaId);
                    updateData.assignedStore = {
                        tiendaId: storeId,
                        tiendaNombre: store?.nombre || storeId,
                        marcaId: store?.marcaId || '',
                        marcaNombre: marca?.nombre || ''
                    };
                    // Ensure root fields are also updated
                    updateData.tiendaId = storeId;
                    updateData.marcaId = store?.marcaId;
                    (updateData as any).marcaNombre = marca?.nombre;
                }
            } else if (role === 'jefe_zonal' || role === 'hrbp') {
                updateData.assignedZones = selectedZonas.map(zid => ({
                    zoneId: zid,
                    zoneNombre: zonas.find(z => z.id === zid)?.nombre || zid
                }));
            }

            await updateUserAssignment(user.id, updateData);
            alert('✅ Usuario actualizado correctamente');
            onSuccess();
        } catch (error: any) {
            console.error('Error updating user:', error);
            alert(error.message || 'Error al actualizar usuario');
        } finally {
            setLoading(false);
        }
    }

    const getRoleLabel = (role: string) => {
        const labels: Record<string, string> = {
            client_admin: 'Administrador',
            supervisor: 'Supervisor',
            jefe_marca: 'Jefe de Marca',
            recruiter: 'Recruiter',
            store_manager: 'Gerente de Tienda',
            compensaciones: 'Compensaciones',
            jefe_zonal: 'Jefe Zonal',
            hrbp: 'HRBP'
        };
        return labels[role] || role;
    };

    const storesForRole = role === 'supervisor'
        ? availableStores.filter(s => !s.isClaimedBySupervisor)
        : role === 'store_manager'
            ? availableStores.filter(s => !s.isClaimedByManager)
            : availableStores;

    // For Store Manager and Supervisor: Always filter by their assigned brand
    // For other roles: Allow filtering by selected marcaId
    const brandToFilter = (role === 'store_manager' || role === 'supervisor')
        ? userMarcaId  // Lock to user's brand
        : marcaId;     // Allow free selection

    const filteredStores = brandToFilter
        ? storesForRole.filter(s => s.marcaId === brandToFilter)
        : storesForRole;


    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Editar Usuario</h2>
                        <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                    <div className="flex flex-col items-end">
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value as any)}
                            className="text-xs font-bold bg-violet-50 text-violet-700 border border-violet-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-violet-500"
                        >
                            <option value="client_admin">Administrador</option>
                            <option value="supervisor">Supervisor</option>
                            <option value="jefe_marca">Jefe de Marca</option>
                            <option value="recruiter">Recruiter</option>
                            <option value="store_manager">Gerente de Tienda</option>
                            <option value="compensaciones">Compensaciones</option>
                            <option value="jefe_zonal">Jefe Zonal</option>
                            <option value="hrbp">HRBP</option>
                        </select>
                        <p className="text-[10px] text-gray-400 mt-1 uppercase font-black tracking-widest">Rol Actual: {getRoleLabel(user.role)}</p>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {/* Display Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Nombre
                        </label>
                        <input
                            type="text"
                            value={displayName}
                            onChange={e => setDisplayName(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-violet-500 focus:border-violet-500"
                        />
                    </div>

                    {/* Supervisor: Store Selection */}
                    {role === 'supervisor' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Tiendas Asignadas
                            </label>

                            {/* Show assigned brand (read-only for supervisors) */}
                            <div className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg mb-3 text-gray-700">
                                🏢 Marca: <strong>{marcas.find(m => m.id === userMarcaId)?.nombre || 'Sin marca asignada'}</strong>
                                <span className="text-xs text-gray-500 ml-2">(Solo tiendas de esta marca)</span>
                            </div>


                            <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
                                {filteredStores.length === 0 ? (
                                    <p className="text-center py-4 text-gray-500">No hay tiendas disponibles</p>
                                ) : (
                                    filteredStores.map(store => (
                                        <label
                                            key={store.id}
                                            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedStores.includes(store.id)}
                                                onChange={() => toggleStore(store.id)}
                                                className="w-4 h-4 text-violet-600 rounded focus:ring-violet-500"
                                            />
                                            <div>
                                                <p className="font-medium text-gray-900">{store.nombre}</p>
                                                <p className="text-xs text-gray-500">
                                                    {marcas.find(m => m.id === store.marcaId)?.nombre || 'Sin marca'}
                                                </p>
                                            </div>
                                        </label>
                                    ))
                                )}
                            </div>
                            <p className="text-sm text-gray-500 mt-2">
                                {selectedStores.length} tienda(s) seleccionada(s)
                            </p>
                        </div>
                    )}

                    {/* Jefe de Marca: Single Marca Selection */}
                    {role === 'jefe_marca' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Marca Asignada
                            </label>
                            <select
                                value={marcaId}
                                onChange={e => setMarcaId(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-violet-500 focus:border-violet-500"
                            >
                                <option value="">Selecciona una marca</option>
                                {marcas.map(marca => (
                                    <option key={marca.id} value={marca.id}>
                                        {marca.nombre}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Recruiter: Multi-Marca Selection */}
                    {role === 'recruiter' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Marcas Asignadas (puede seleccionar varias)
                            </label>
                            <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
                                {marcas.length === 0 ? (
                                    <p className="text-center py-4 text-gray-500">No hay marcas disponibles</p>
                                ) : (
                                    marcas.map(marca => (
                                        <label
                                            key={marca.id}
                                            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedMarcas.includes(marca.id)}
                                                onChange={() => toggleMarca(marca.id)}
                                                className="w-4 h-4 text-violet-600 rounded focus:ring-violet-500"
                                            />
                                            <span className="font-medium text-gray-900">{marca.nombre}</span>
                                        </label>
                                    ))
                                )}
                            </div>
                            <p className="text-sm text-gray-500 mt-2">
                                {selectedMarcas.length} marca(s) seleccionada(s)
                            </p>
                        </div>
                    )}

                    {/* Store Manager: Single Store Selection */}
                    {role === 'store_manager' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Tienda Asignada
                            </label>

                            {/* Show assigned brand (read-only for store managers) */}
                            <div className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg mb-3 text-gray-700">
                                🏢 Marca: <strong>{marcas.find(m => m.id === userMarcaId)?.nombre || 'Sin marca asignada'}</strong>
                            </div>

                            <select
                                value={storeId}
                                onChange={e => setStoreId(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-violet-500 focus:border-violet-500"
                            >
                                <option value="">Selecciona una tienda</option>
                                {filteredStores.map(store => (
                                    <option key={store.id} value={store.id}>
                                        {store.nombre}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Jefe Zonal / HRBP: Zone Selection */}
                    {(role === 'jefe_zonal' || role === 'hrbp') && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Zonas Asignadas ({selectedZonas.length} seleccionadas)
                            </label>
                            {zonas.length === 0 ? (
                                <div className="p-4 bg-gray-50 rounded-lg text-center font-medium">
                                    <p className="text-gray-500 text-sm">No hay zonas configuradas</p>
                                    <p className="text-gray-400 text-xs mt-1">Configura las zonas en la pestaña "Zonas"</p>
                                </div>
                            ) : (
                                <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
                                    {zonas.map(zona => (
                                        <label
                                            key={zona.id}
                                            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedZonas.includes(zona.id)}
                                                onChange={() => toggleZona(zona.id)}
                                                className="w-4 h-4 text-violet-600 rounded focus:ring-violet-500"
                                            />
                                            <span className="font-medium text-gray-900">{zona.nombre}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="px-6 py-2 bg-violet-600 text-white rounded-lg font-semibold hover:bg-violet-700 transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </div>
        </div>
    );
}
