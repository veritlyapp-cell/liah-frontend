'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
// // import { autoCreateUserAction } from '@/lib/actions/user-actions';
import { createUserAssignment } from '@/lib/firestore/user-assignment-actions';
import type { UserAssignment } from '@/lib/firestore/user-assignments';
import { db, auth } from '@/lib/firebase';

interface CreateUserModalProps {
    holdingId: string;
    onClose: () => void;
    onSuccess: () => void;
}

export default function CreateUserModal({ holdingId, onClose, onSuccess }: CreateUserModalProps) {
    const [step, setStep] = useState<'role' | 'details' | 'assignment'>('role');
    const [role, setRole] = useState<UserAssignment['role']>('supervisor');
    const [email, setEmail] = useState('');
    const [displayName, setDisplayName] = useState('');

    // For assignments
    const [marcaId, setMarcaId] = useState('');
    const [storeId, setStoreId] = useState(''); // For store_manager
    const [marcas, setMarcas] = useState<{ id: string, nombre: string }[]>([]);
    const [selectedStores, setSelectedStores] = useState<string[]>([]);
    const [selectedMarcas, setSelectedMarcas] = useState<string[]>([]); // For recruiters
    const [availableStores, setAvailableStores] = useState<{ id: string, nombre: string, marcaId: string, isClaimedBySupervisor?: boolean, isClaimedByManager?: boolean }[]>([]);

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
            console.log('[CreateUserModal] Loading stores for holdingId:', holdingId);

            const storesRef = collection(db, 'tiendas');
            // Query by holdingId - also try 'ngr' as fallback for legacy data
            const q = query(storesRef, where('holdingId', 'in', [holdingId, 'ngr']));
            const snapshot = await getDocs(q);

            const loadedStores = snapshot.docs.map(doc => ({
                id: doc.id,
                nombre: doc.data().nombre,
                marcaId: doc.data().marcaId
            }));


            // Fetch all user assignments to identify claimed stores
            const assignmentsRef = collection(db, 'userAssignments');
            const assignmentsSnap = await getDocs(assignmentsRef);

            const claimedBySupervisor = new Set<string>();
            const claimedByManager = new Set<string>();

            assignmentsSnap.docs.forEach(doc => {
                const data = doc.data();
                if (data.active !== false && data.isActive !== false) {
                    if (data.role === 'supervisor' && data.assignedStores) {
                        data.assignedStores.forEach((s: any) => claimedBySupervisor.add(s.tiendaId));
                    }
                    if (data.role === 'store_manager' && (data.tiendaId || data.assignedStore?.tiendaId)) {
                        claimedByManager.add(data.tiendaId || data.assignedStore.tiendaId);
                    }
                }
            });

            setAvailableStores(loadedStores.map(s => ({
                ...s,
                isClaimedBySupervisor: claimedBySupervisor.has(s.id),
                isClaimedByManager: claimedByManager.has(s.id)
            })));

            console.log('[CreateUserModal] Loaded stores:', loadedStores.length, loadedStores.map(s => ({ id: s.id, nombre: s.nombre, marcaId: s.marcaId })));
            console.log('[CreateUserModal] Claimed by supervisor:', Array.from(claimedBySupervisor));
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

    async function handleSubmit() {
        if (!email || !displayName) {
            alert('Por favor completa todos los campos');
            return;
        }

        setLoading(true);
        try {
            // Build the request payload
            const payload: any = {
                email,
                displayName,
                role,
                holdingId,
            };

            // Add role-specific assignments
            if (role === 'supervisor') {
                if (selectedStores.length === 0) {
                    alert('Selecciona al menos una tienda para el Supervisor');
                    setLoading(false);
                    return;
                }
                payload.assignedStores = selectedStores.map(sid => {
                    const store = availableStores.find(s => s.id === sid);
                    const marca = marcas.find(m => m.id === store?.marcaId);
                    return {
                        tiendaId: sid,
                        tiendaNombre: store?.nombre || sid,
                        marcaId: store?.marcaId || '',
                        marcaNombre: marca?.nombre || ''
                    };
                });
                // Legacy primary identifier
                payload.marcaId = payload.assignedStores[0].marcaId;
                payload.marcaNombre = payload.assignedStores[0].marcaNombre;
            } else if (role === 'jefe_marca') {
                if (!marcaId) {
                    alert('Selecciona una marca');
                    setLoading(false);
                    return;
                }
                const marca = marcas.find(m => m.id === marcaId);
                payload.marcaId = marcaId;
                payload.marcaNombre = marca?.nombre;
            } else if (role === 'recruiter') {
                if (selectedMarcas.length === 0) {
                    alert('Selecciona al menos una marca para el Recruiter');
                    setLoading(false);
                    return;
                }
                payload.assignedMarcas = selectedMarcas.map(mid => ({
                    marcaId: mid,
                    marcaNombre: marcas.find(m => m.id === mid)?.nombre || mid
                }));
                payload.marcaId = selectedMarcas[0];
                payload.marcaNombre = payload.assignedMarcas[0].marcaNombre;
            } else if (role === 'store_manager') {
                if (!storeId) {
                    alert('Selecciona una tienda para el Store Manager');
                    setLoading(false);
                    return;
                }
                const store = availableStores.find(s => s.id === storeId);
                const marca = marcas.find(m => m.id === store?.marcaId);
                payload.tiendaId = storeId;
                payload.tiendaNombre = store?.nombre;
                payload.marcaId = store?.marcaId;
                payload.marcaNombre = marca?.nombre;
                payload.assignedStore = {
                    tiendaId: storeId,
                    tiendaNombre: store?.nombre || storeId,
                    marcaId: store?.marcaId || '',
                    marcaNombre: marca?.nombre || ''
                };
            }

            // Get auth token for API authorization
            const currentUser = auth.currentUser;
            if (!currentUser) {
                alert('❌ No estás autenticado. Por favor, vuelve a iniciar sesión.');
                setLoading(false);
                return;
            }
            const idToken = await currentUser.getIdToken();

            // Call the API route
            const response = await fetch('/api/admin/create-user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Error al crear usuario');
            }

            alert(`✅ ${result.message}`);
            onSuccess();

        } catch (error: any) {
            console.error('Error creating user:', error);
            alert(error.message || 'Error al crear usuario');
        } finally {
            setLoading(false);
        }
    }

    const storesForRole = role === 'supervisor'
        ? availableStores.filter(s => !s.isClaimedBySupervisor)
        : role === 'store_manager'
            ? availableStores.filter(s => !s.isClaimedByManager)
            : availableStores;

    const filteredStores = marcaId
        ? storesForRole.filter(s => s.marcaId === marcaId)
        : storesForRole;

    // Debug logging
    console.log('[CreateUserModal] Role:', role, '| MarcaId selected:', marcaId);
    console.log('[CreateUserModal] storesForRole:', storesForRole.length, 'stores');
    console.log('[CreateUserModal] filteredStores:', filteredStores.length, filteredStores.map(s => s.nombre));


    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">Crear Usuario</h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            ✕
                        </button>
                    </div>

                    {/* Step 1: Select Role */}
                    {step === 'role' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Selecciona el rol
                            </label>
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { value: 'compensaciones', label: '💰 Compensaciones', desc: 'Gestión de Altas, Bajas y SUNAT' },
                                    { value: 'supervisor', label: '👔 Supervisor', desc: 'Gestiona múltiples tiendas' },
                                    { value: 'jefe_marca', label: '🎯 Jefe de Marca', desc: 'Gestiona una marca completa' },
                                    { value: 'recruiter', label: '🔍 Recruiter', desc: 'Evalúa candidatos de una marca' },
                                    { value: 'store_manager', label: '🏪 Gerente de Tienda', desc: 'Gestiona una tienda' }
                                ].map(r => (
                                    <button
                                        key={r.value}
                                        onClick={() => setRole(r.value as UserAssignment['role'])}
                                        className={`p-4 rounded-lg border-2 text-left transition-colors ${role === r.value
                                            ? 'border-violet-600 bg-violet-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <p className="font-semibold text-gray-900">{r.label}</p>
                                        <p className="text-sm text-gray-500">{r.desc}</p>
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={() => setStep('details')}
                                className="mt-6 w-full px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
                            >
                                Siguiente
                            </button>
                        </div>
                    )}

                    {/* Step 2: User Details */}
                    {step === 'details' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-violet-500 focus:border-violet-500"
                                    placeholder="correo@ejemplo.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo *</label>
                                <input
                                    type="text"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-violet-500 focus:border-violet-500"
                                    placeholder="Juan Pérez"
                                />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setStep('role')}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                                >
                                    Atrás
                                </button>
                                <button
                                    onClick={() => {
                                        if (role === 'compensaciones') {
                                            handleSubmit();
                                        } else {
                                            setStep('assignment');
                                        }
                                    }}
                                    className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
                                >
                                    {role === 'compensaciones' ? (loading ? 'Creando...' : '✅ Crear Usuario') : 'Siguiente'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Assignment */}
                    {step === 'assignment' && (
                        <div className="space-y-4">
                            {role === 'supervisor' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Selecciona marca *
                                        </label>
                                        <select
                                            value={marcaId}
                                            onChange={(e) => {
                                                setMarcaId(e.target.value);
                                                setSelectedStores([]); // Clear stores when marca changes
                                            }}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                        >
                                            <option value="">Seleccionar marca...</option>
                                            {marcas.map(m => (
                                                <option key={m.id} value={m.id}>{m.nombre}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {marcaId ? (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Selecciona tiendas ({selectedStores.length} seleccionadas)
                                            </label>
                                            {filteredStores.length === 0 ? (
                                                <div className="p-4 bg-gray-50 rounded-lg text-center">
                                                    <p className="text-gray-500 text-sm">No hay tiendas para esta marca</p>
                                                    <p className="text-gray-400 text-xs mt-1">Primero crea tiendas en la pestaña "Tiendas"</p>
                                                </div>
                                            ) : (
                                                <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-2">
                                                    {filteredStores.map((store: any) => (
                                                        <label key={store.id} className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedStores.includes(store.id)}
                                                                onChange={() => toggleStore(store.id)}
                                                                className="mr-3"
                                                            />
                                                            <span className="text-sm">{store.nombre}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="p-4 bg-blue-50 rounded-lg text-center">
                                            <p className="text-blue-600 text-sm">↑ Primero selecciona una marca</p>
                                        </div>
                                    )}
                                </>
                            )}

                            {role === 'jefe_marca' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Selecciona marca</label>
                                    <select
                                        value={marcaId}
                                        onChange={(e) => setMarcaId(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                    >
                                        <option value="">Seleccionar...</option>
                                        {marcas.map(m => (
                                            <option key={m.id} value={m.id}>{m.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {role === 'recruiter' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Selecciona marcas ({selectedMarcas.length} seleccionadas)
                                    </label>
                                    <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-2">
                                        {marcas.map(marca => (
                                            <label key={marca.id} className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedMarcas.includes(marca.id)}
                                                    onChange={() => toggleMarca(marca.id)}
                                                    className="mr-3 w-4 h-4 text-violet-600 rounded focus:ring-violet-500"
                                                />
                                                <span className="text-sm font-medium">{marca.nombre}</span>
                                            </label>
                                        ))}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">
                                        El Recruiter podrá ver candidatos y RQs de todas las marcas seleccionadas
                                    </p>
                                </div>
                            )}

                            {role === 'store_manager' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Selecciona marca *
                                        </label>
                                        <select
                                            value={marcaId}
                                            onChange={(e) => {
                                                setMarcaId(e.target.value);
                                                setStoreId(''); // Clear store when marca changes
                                            }}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                        >
                                            <option value="">Seleccionar marca...</option>
                                            {marcas.map(m => (
                                                <option key={m.id} value={m.id}>{m.nombre}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {marcaId ? (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Selecciona tienda *</label>
                                            {availableStores.filter(s => s.marcaId === marcaId).length === 0 ? (
                                                <div className="p-4 bg-gray-50 rounded-lg text-center">
                                                    <p className="text-gray-500 text-sm">No hay tiendas para esta marca</p>
                                                    <p className="text-gray-400 text-xs mt-1">Primero crea tiendas en la pestaña "Tiendas"</p>
                                                </div>
                                            ) : (
                                                <select
                                                    value={storeId}
                                                    onChange={(e) => setStoreId(e.target.value)}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                                >
                                                    <option value="">Seleccionar tienda...</option>
                                                    {filteredStores.map(s => (
                                                        <option key={s.id} value={s.id}>
                                                            {s.nombre} {s.isClaimedByManager ? '(Asignada)' : ''}
                                                        </option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="p-4 bg-blue-50 rounded-lg text-center">
                                            <p className="text-blue-600 text-sm">↑ Primero selecciona una marca</p>
                                        </div>
                                    )}
                                </>
                            )}

                            <div className="flex gap-2">
                                <button
                                    onClick={() => setStep('details')}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                                >
                                    Atrás
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50"
                                >
                                    {loading ? 'Creando...' : '✅ Crear Usuario'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
