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
    const [marcaId, setMarcaId] = useState(user.assignedMarca?.marcaId || '');
    const [storeId, setStoreId] = useState(user.assignedStore?.tiendaId || '');
    const [selectedStores, setSelectedStores] = useState<string[]>(
        user.assignedStores?.map(s => s.tiendaId) || []
    );
    // Multi-brand selection for Recruiters
    const [selectedMarcas, setSelectedMarcas] = useState<string[]>(
        user.assignedMarcas?.map(m => m.marcaId) || (user.assignedMarca ? [user.assignedMarca.marcaId] : [])
    );

    const [marcas, setMarcas] = useState<{ id: string, nombre: string }[]>([]);
    const [availableStores, setAvailableStores] = useState<{ id: string, nombre: string, marcaId: string }[]>([]);
    const [loading, setLoading] = useState(false);

    // Load marcas and stores
    useEffect(() => {
        loadMarcas();
        loadStores();
    }, []);

    async function loadMarcas() {
        try {
            const marcasRef = collection(db, 'marcas');
            const q = query(marcasRef, where('holdingId', '==', holdingId));
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
            const q = query(storesRef, where('holdingId', '==', holdingId));
            const snapshot = await getDocs(q);

            const loadedStores = snapshot.docs.map(doc => ({
                id: doc.id,
                nombre: doc.data().nombre,
                marcaId: doc.data().marcaId
            }));

            setAvailableStores(loadedStores);
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

    async function handleSave() {
        setLoading(true);
        try {
            const updateData: Partial<UserAssignment> = {
                displayName,
            };

            // Update role-specific assignments
            if (user.role === 'supervisor') {
                const assignedStores = selectedStores.map(sid => {
                    const store = availableStores.find(s => s.id === sid);
                    return {
                        tiendaId: sid,
                        tiendaNombre: store?.nombre || sid,
                        marcaId: store?.marcaId || ''
                    };
                });
                updateData.assignedStores = assignedStores;
            } else if (user.role === 'jefe_marca') {
                if (marcaId) {
                    const marca = marcas.find(m => m.id === marcaId);
                    updateData.assignedMarca = {
                        marcaId,
                        marcaNombre: marca?.nombre || marcaId
                    };
                }
            } else if (user.role === 'recruiter') {
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
                }
            } else if (user.role === 'store_manager') {
                if (storeId) {
                    const store = availableStores.find(s => s.id === storeId);
                    updateData.assignedStore = {
                        tiendaId: storeId,
                        tiendaNombre: store?.nombre || storeId,
                        marcaId: store?.marcaId || ''
                    };
                }
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
            store_manager: 'Store Manager'
        };
        return labels[role] || role;
    };

    // Filter stores by marca for supervisor
    const filteredStores = marcaId
        ? availableStores.filter(s => s.marcaId === marcaId)
        : availableStores;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Editar Usuario</h2>
                        <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                    <span className="px-3 py-1 bg-violet-100 text-violet-700 rounded-full text-sm font-medium">
                        {getRoleLabel(user.role)}
                    </span>
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
                    {user.role === 'supervisor' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Tiendas Asignadas
                            </label>

                            {/* Optional: Filter by Marca */}
                            <select
                                value={marcaId}
                                onChange={e => setMarcaId(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-3 focus:ring-violet-500 focus:border-violet-500"
                            >
                                <option value="">Todas las marcas</option>
                                {marcas.map(marca => (
                                    <option key={marca.id} value={marca.id}>
                                        {marca.nombre}
                                    </option>
                                ))}
                            </select>

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
                    {user.role === 'jefe_marca' && (
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
                    {user.role === 'recruiter' && (
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
                    {user.role === 'store_manager' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Tienda Asignada
                            </label>
                            <select
                                value={storeId}
                                onChange={e => setStoreId(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-violet-500 focus:border-violet-500"
                            >
                                <option value="">Selecciona una tienda</option>
                                {availableStores.map(store => (
                                    <option key={store.id} value={store.id}>
                                        {store.nombre} ({marcas.find(m => m.id === store.marcaId)?.nombre || 'Sin marca'})
                                    </option>
                                ))}
                            </select>
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
