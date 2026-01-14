'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import DashboardHeader from '@/components/DashboardHeader';
import EditHoldingModal from '@/components/EditHoldingModal';
import ConfigurationView from '@/components/ConfigurationView';
import CreateHoldingModal from '@/components/CreateHoldingModal';
import CreateUserModalSuperAdmin from '@/components/CreateUserModalSuperAdmin';
import EditUserModalSuperAdmin from '@/components/EditUserModalSuperAdmin';
import PendingUsersActivation from '@/components/admin/PendingUsersActivation';
import BulkUploadStoresModal from '@/components/admin/BulkUploadStoresModal';
import BulkUploadUsersModal from '@/components/admin/BulkUploadUsersModal';
import { db } from '@/lib/firebase';
import { collection, getDocs, onSnapshot, query, orderBy, where, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import GlobalCandidatesView from '@/components/admin/GlobalCandidatesView';

// Mock data removed to avoid duplicates with Firestore
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MOCK_LOGS: any[] = [];

type Tab = 'empresas' | 'usuarios' | 'candidatos' | 'logs' | 'pending' | 'configuracion';

export default function SuperAdminDashboard() {
    const { user, claims, loading } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<Tab>('empresas');
    const [holdingFilter, setHoldingFilter] = useState<string>('todos');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [holdings, setHoldings] = useState<any[]>([]);

    // Real-time counters for brands and stores
    const [brandCounts, setBrandCounts] = useState<Record<string, number>>({});
    const [storeCounts, setStoreCounts] = useState<Record<string, number>>({});

    // Edit modal
    const [showEditModal, setShowEditModal] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [selectedHolding, setSelectedHolding] = useState<any | null>(null);

    // Create modal
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Create user modal
    const [showCreateUserModal, setShowCreateUserModal] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [users, setUsers] = useState<any[]>([]);

    // Edit user modal
    const [showEditUserModal, setShowEditUserModal] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [selectedUser, setSelectedUser] = useState<any>(null);

    // Bulk upload modals
    const [showBulkStoreModal, setShowBulkStoreModal] = useState(false);
    const [showBulkUserModal, setShowBulkUserModal] = useState(false);
    const [selectedHoldingIdForUpload, setSelectedHoldingIdForUpload] = useState<string>('');

    useEffect(() => {
        if (!loading && (!user || claims?.role !== 'super_admin')) {
            router.push('/login');
        }
    }, [user, claims, loading, router]);

    // Load holdings from Firestore in real-time
    useEffect(() => {
        const holdingsRef = collection(db, 'holdings');
        const q = query(holdingsRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const loadedHoldings = snapshot.docs.map(doc => ({
                ...doc.data(),
                firestoreId: doc.id
            }));
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setHoldings(loadedHoldings as any);
            console.log('✅ Holdings cargados desde Firestore:', loadedHoldings.length);
        }, (error) => {
            console.error('Error cargando holdings:', error);
        });

        return () => unsubscribe();
    }, []);

    // Count brands per holding in real-time
    useEffect(() => {
        const marcasRef = collection(db, 'marcas');

        const unsubscribe = onSnapshot(marcasRef, (snapshot) => {
            const counts: Record<string, number> = {};

            snapshot.docs.forEach(doc => {
                const data = doc.data();
                const holdingId = data.holdingId;
                if (holdingId) {
                    counts[holdingId] = (counts[holdingId] || 0) + 1;
                }
            });

            setBrandCounts(counts);
            console.log('✅ Conteo de marcas actualizado:', counts);
        }, (error) => {
            console.error('Error contando marcas:', error);
        });

        return () => unsubscribe();
    }, []);

    // Count stores per holding in real-time
    useEffect(() => {
        const tiendasRef = collection(db, 'tiendas');

        const unsubscribe = onSnapshot(tiendasRef, (snapshot) => {
            const counts: Record<string, number> = {};

            snapshot.docs.forEach(doc => {
                const data = doc.data();
                const holdingId = data.holdingId;
                if (holdingId) {
                    counts[holdingId] = (counts[holdingId] || 0) + 1;
                }
            });

            setStoreCounts(counts);
            console.log('✅ Conteo de tiendas actualizado:', counts);
        }, (error) => {
            console.error('Error contando tiendas:', error);
        });

        return () => unsubscribe();
    }, []);

    // Load users from Firestore in real-time
    useEffect(() => {
        const usersRef = collection(db, 'userAssignments');
        const q = query(usersRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const loadedUsers = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    email: data.email,
                    nombre: data.displayName,
                    rol: data.role,
                    tenant: data.holdingId || 'Sin asignar',
                    activo: data.active
                };
            });
            setUsers(loadedUsers);
            console.log('✅ Usuarios cargados desde Firestore:', loadedUsers.length);
        }, (error) => {
            console.error('Error cargando usuarios:', error);
        });

        return () => unsubscribe();
    }, []);

    if (loading || !user) {
        return null;
    }

    // Filtrar datos según holding seleccionado
    // Removed unused filteredUsers and filteredLogs to fix lint errors

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleEditHolding = (holding: any) => {
        setSelectedHolding(holding);
        setShowEditModal(true);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleSaveHolding = async (updatedHolding: any) => {
        try {
            // Save to Firestore
            const holdingId = updatedHolding.id || updatedHolding.firestoreId;
            if (holdingId) {
                const holdingRef = doc(db, 'holdings', holdingId);
                await updateDoc(holdingRef, {
                    plan: updatedHolding.plan,
                    activo: updatedHolding.activo,
                    config: updatedHolding.config
                });
                console.log('✅ Holding guardado en Firestore:', holdingId);
            }

            // Actualizar el holding en la lista local
            setHoldings(holdings.map(h =>
                (h.id === updatedHolding.id || h.firestoreId === updatedHolding.firestoreId)
                    ? {
                        ...h,
                        plan: updatedHolding.plan,
                        activo: updatedHolding.activo,
                        config: updatedHolding.config
                    }
                    : h
            ));

            console.log('✅ Holding actualizado:', updatedHolding);
            console.log('📊 Config guardada:', updatedHolding.config);
            setShowEditModal(false);
        } catch (error) {
            console.error('Error guardando holding:', error);
            alert('Error guardando cambios. Ver consola para detalles.');
        }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleCreateHolding = (newHolding: any) => {
        setHoldings([...holdings, newHolding]);
        console.log('✅ Nueva empresa creada:', newHolding);
        setShowCreateModal(false);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleDeleteHolding = async (holding: any) => {
        if (!confirm(`¿Eliminar la empresa "${holding.nombre}"?\n\nEsta acción eliminará también todas las marcas y tiendas asociadas.`)) {
            return;
        }

        try {
            // Delete the holding document
            await deleteDoc(doc(db, 'holdings', holding.id));

            // Update local state
            setHoldings(holdings.filter(h => h.id !== holding.id));

            alert(`✅ Empresa "${holding.nombre}" eliminada exitosamente`);
            console.log('✅ Empresa eliminada:', holding.id);
        } catch (error) {
            console.error('Error eliminando empresa:', error);
            alert('❌ Error eliminando empresa. Ver consola para detalles.');
        }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleCreateUser = (newUser: any) => {
        const userWithId = { ...newUser, id: String(users.length + 1) };
        setUsers([...users, userWithId]);
        console.log('✅ Nuevo usuario creado:', userWithId);
        setShowCreateUserModal(false);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleEditUser = (user: any) => {
        setSelectedUser(user);
        setShowEditUserModal(true);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleSaveUser = (updatedUser: any) => {
        setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
        console.log('✅ Usuario actualizado:', updatedUser);
        setShowEditUserModal(false);
    };

    const handleDeleteUser = async (userId: string, userEmail: string) => {
        if (!confirm(`¿Eliminar usuario ${userEmail}?`)) return;

        try {
            // Delete from Firestore
            const assignmentsRef = collection(db, 'userAssignments');
            const q = query(assignmentsRef, where('email', '==', userEmail));
            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                const docRef = doc(db, 'userAssignments', snapshot.docs[0].id);
                await deleteDoc(docRef);

                // Update local state
                setUsers(users.filter(u => u.id !== userId));
                console.log('✅ Usuario eliminado');
                alert('Usuario eliminado exitosamente');
            }
        } catch (error) {
            console.error('Error eliminando usuario:', error);
            alert('Error al eliminar usuario');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Standardized Header */}
            <DashboardHeader
                title="Super Admin"
                subtitle="Control Total del Sistema"
                onConfigClick={() => setActiveTab('configuracion')}
            />

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* Filtro Global de Holding */}
                {activeTab !== 'empresas' && activeTab !== 'configuracion' && (
                    <div className="flex items-center gap-3 animate-fade-in mb-6">
                        <label className="text-sm font-medium text-gray-700">Filtrar por Holding:</label>
                        <select
                            value={holdingFilter}
                            onChange={(e) => setHoldingFilter(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                        >
                            <option value="todos">📊 Todos los Holdings</option>
                            {holdings.map(h => (
                                <option key={h.id} value={h.nombre}>{h.nombre}</option>
                            ))}
                        </select>
                        {holdingFilter !== 'todos' && (
                            <button
                                onClick={() => setHoldingFilter('todos')}
                                className="text-sm text-violet-600 hover:text-violet-700 font-medium"
                            >
                                Limpiar filtro
                            </button>
                        )}
                    </div>
                )}
                {/* Navigation Tabs */}
                <div className="flex gap-2 border-b border-gray-200 mb-8">
                    <button
                        onClick={() => setActiveTab('empresas')}
                        className={`px-4 py-2 font-medium transition-colors border-b-2 ${activeTab === 'empresas'
                            ? 'border-violet-600 text-violet-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        🏢 Empresas
                    </button>
                    <button
                        onClick={() => setActiveTab('usuarios')}
                        className={`px-4 py-2 font-medium transition-colors border-b-2 ${activeTab === 'usuarios'
                            ? 'border-violet-600 text-violet-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        👥 Usuarios
                    </button>
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={`px-4 py-2 font-medium transition-colors border-b-2 ${activeTab === 'pending'
                            ? 'border-amber-600 text-amber-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        ⏳ Activar Usuarios
                    </button>
                    <button
                        onClick={() => setActiveTab('logs')}
                        className={`px-4 py-2 font-medium transition-colors border-b-2 ${activeTab === 'logs'
                            ? 'border-violet-600 text-violet-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        📊 Logs
                    </button>
                    <button
                        onClick={() => setActiveTab('candidatos')}
                        className={`px-4 py-2 font-medium transition-colors border-b-2 ${activeTab === 'candidatos'
                            ? 'border-green-600 text-green-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        👥 Candidatos (Global)
                    </button>
                </div>

                {/* Tab: Empresas */}
                {activeTab === 'empresas' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-gray-900">Empresas Clientes</h2>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        if (holdingFilter === 'todos') {
                                            alert('Por favor selecciona un Holding primero para importar tiendas.');
                                            return;
                                        }
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        const h = holdings.find(h => h.nombre === holdingFilter);
                                        if (h) {
                                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                            setSelectedHoldingIdForUpload((h as any).id || (h as any).firestoreId);
                                            setShowBulkStoreModal(true);
                                        }
                                    }}
                                    className="px-4 py-2 border border-green-600 text-green-700 rounded-xl font-medium hover:bg-green-50 transition-colors flex items-center gap-2"
                                >
                                    📁 Importar Tiendas
                                </button>
                                <button
                                    onClick={() => setShowCreateModal(true)}
                                    className="px-4 py-2 gradient-bg text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
                                >
                                    + Nueva Empresa
                                </button>
                            </div>
                        </div>

                        {/* KPIs */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="glass-card rounded-xl p-4">
                                <p className="text-sm text-gray-600 mb-1">Total Empresas</p>
                                <p className="text-3xl font-bold gradient-primary">{holdings.length}</p>
                            </div>
                            <div className="glass-card rounded-xl p-4">
                                <p className="text-sm text-gray-600 mb-1">Activos</p>
                                <p className="text-3xl font-bold text-green-600">{holdings.filter(h => h.activo).length}</p>
                            </div>
                            <div className="glass-card rounded-xl p-4">
                                <p className="text-sm text-gray-600 mb-1">Total Marcas</p>
                                <p className="text-3xl font-bold text-cyan-600">{Object.values(brandCounts).reduce((sum, count) => sum + count, 0)}</p>
                            </div>
                            <div className="glass-card rounded-xl p-4">
                                <p className="text-sm text-gray-600 mb-1">Total Tiendas</p>
                                <p className="text-3xl font-bold text-amber-600">{Object.values(storeCounts).reduce((sum, count) => sum + count, 0)}</p>
                            </div>
                            <div className="glass-card rounded-xl p-4">
                                <p className="text-sm text-gray-600 mb-1">Total Usuarios</p>
                                <p className="text-3xl font-bold text-violet-600">{holdings.reduce((sum, h) => sum + h.usuarios, 0)}</p>
                            </div>
                        </div>

                        {/* Holdings List */}
                        <div className="space-y-3">
                            {holdings.map(holding => (
                                <div key={holding.id} className="glass-card rounded-xl p-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-white font-bold">
                                                {holding.nombre.substring(0, 2)}
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-900">{holding.nombre}</h3>
                                                <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                                                    <span>{brandCounts[holding.id] || 0} marcas</span>
                                                    <span>•</span>
                                                    <span>{storeCounts[holding.id] || 0} tiendas</span>
                                                    <span>•</span>
                                                    <span>{(holding as any).config?.maxUsuarios || holding.usuarios} usuarios</span>
                                                    <span>•</span>
                                                    <span className="px-2 py-0.5 bg-violet-100 text-violet-700 rounded text-xs font-medium">
                                                        {holding.plan === 'full_stack' ? 'Full Stack' :
                                                            holding.plan === 'rq_only' ? 'RQ Only' : 'Bot Only'}
                                                    </span>
                                                    <span>•</span>
                                                    <span className="font-semibold text-green-600">
                                                        ${(holding as any).config?.precioMensual ||
                                                            (holding.plan === 'full_stack' ? 499 :
                                                                holding.plan === 'rq_only' ? 199 : 99)}/mes
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <span className={`px-3 py-1 rounded-lg text-sm font-medium ${holding.activo
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-gray-100 text-gray-700'
                                                }`}>
                                                {holding.activo ? '✓ Activo' : '○ Inactivo'}
                                            </span>
                                            <button
                                                onClick={() => handleEditHolding(holding)}
                                                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                                            >
                                                Editar
                                            </button>
                                            <button
                                                onClick={() => handleDeleteHolding(holding)}
                                                className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
                                            >
                                                🗑️ Eliminar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Tab: Usuarios */}
                {activeTab === 'usuarios' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h2>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowBulkUserModal(true)}
                                    className="px-4 py-2 border border-green-600 text-green-700 rounded-xl font-medium hover:bg-green-50 transition-colors flex items-center gap-2"
                                >
                                    📁 Importar Usuarios
                                </button>
                                <button
                                    onClick={() => setShowCreateUserModal(true)}
                                    className="px-4 py-2 gradient-bg text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
                                >
                                    + Nuevo Usuario
                                </button>
                            </div>
                        </div>

                        {/* Users Table */}
                        <div className="glass-card rounded-xl overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tenant</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {users.filter(u => holdingFilter === 'todos' || u.tenant.toLowerCase().includes(holdingFilter.toLowerCase())).map(usuario => (
                                        <tr key={usuario.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="font-medium text-gray-900">{usuario.nombre}</p>
                                                    <p className="text-sm text-gray-500">{usuario.email}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-1 bg-cyan-100 text-cyan-700 rounded text-xs font-medium">
                                                    {usuario.rol}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">{usuario.tenant}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${usuario.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                    }`}>
                                                    {usuario.activo ? 'Activo' : 'Inactivo'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex gap-3">
                                                    <button
                                                        onClick={() => handleEditUser(usuario)}
                                                        className="text-violet-600 hover:text-violet-700 text-sm font-medium"
                                                    >
                                                        Editar
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteUser(usuario.id, usuario.email)}
                                                        className="text-red-600 hover:text-red-700 text-sm font-medium"
                                                    >
                                                        Eliminar
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
                }

                {/* Tab: Pending Users Activation */}
                {activeTab === 'pending' && (
                    <PendingUsersActivation />
                )}

                {/* Tab: Logs */}
                {
                    activeTab === 'logs' && (
                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold text-gray-900">Monitoreo Global</h2>

                            {/* KPIs Globales */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Estadísticas Cross-Tenant</h3>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="glass-card rounded-xl p-4">
                                        <p className="text-sm text-gray-600 mb-1">Candidatos Totales</p>
                                        <p className="text-3xl font-bold text-violet-600">1,247</p>
                                        <p className="text-xs text-green-600 mt-1">+15% vs mes anterior</p>
                                    </div>
                                    <div className="glass-card rounded-xl p-4">
                                        <p className="text-sm text-gray-600 mb-1">Entrevistas Hoy</p>
                                        <p className="text-3xl font-bold text-cyan-600">89</p>
                                        <p className="text-xs text-gray-500 mt-1">Across all tenants</p>
                                    </div>
                                    <div className="glass-card rounded-xl p-4">
                                        <p className="text-sm text-gray-600 mb-1">Tasa Aprobación</p>
                                        <p className="text-3xl font-bold text-green-600">68%</p>
                                        <p className="text-xs text-green-600 mt-1">+3% vs promedio</p>
                                    </div>
                                    <div className="glass-card rounded-xl p-4">
                                        <p className="text-sm text-gray-600 mb-1">RQs Activos</p>
                                        <p className="text-3xl font-bold text-amber-600">34</p>
                                        <p className="text-xs text-gray-500 mt-1">12 urgentes</p>
                                    </div>
                                </div>
                            </div>

                            {/* API Usage */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Uso de APIs</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="glass-card rounded-xl p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="font-medium text-gray-900">Gemini API</h4>
                                            <span className="text-sm text-gray-500">Este mes</span>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Usado</span>
                                                <span className="font-medium">8,432 / 10,000 calls</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div className="bg-gradient-to-r from-violet-500 to-cyan-500 h-2 rounded-full" style={{ width: '84%' }}></div>
                                            </div>
                                            <p className="text-xs text-amber-600">⚠️ 84% del límite</p>
                                        </div>
                                    </div>

                                    <div className="glass-card rounded-xl p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="font-medium text-gray-900">WhatsApp API</h4>
                                            <span className="text-sm text-gray-500">Este mes</span>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Usado</span>
                                                <span className="font-medium">12,340 / 50,000 msgs</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full" style={{ width: '25%' }}></div>
                                            </div>
                                            <p className="text-xs text-green-600">✓ 25% del límite</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Tab: Configuración */}
                {activeTab === 'configuracion' && (
                    <ConfigurationView />
                )}

                {/* Tab: Candidatos Global */}
                {activeTab === 'candidatos' && (
                    <GlobalCandidatesView
                        holdings={holdings.map(h => ({ id: h.id || h.firestoreId, nombre: h.nombre }))}
                    />
                )}

            </main>

            {/* Edit Holding Modal */}
            <EditHoldingModal
                show={showEditModal}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                holding={selectedHolding as any}
                onCancel={() => setShowEditModal(false)}
                onSave={handleSaveHolding}
            />

            {/* Create Holding Modal */}
            <CreateHoldingModal
                show={showCreateModal}
                onCancel={() => setShowCreateModal(false)}
                onSave={handleCreateHolding}
            />

            {/* Create User Modal */}
            <CreateUserModalSuperAdmin
                show={showCreateUserModal}
                onCancel={() => setShowCreateUserModal(false)}
                onSave={handleCreateUser}
            />

            {/* Edit User Modal */}
            <EditUserModalSuperAdmin
                show={showEditUserModal}
                user={selectedUser}
                onCancel={() => setShowEditUserModal(false)}
                onSave={handleSaveUser}
            />
            {/* Bulk Store Modal */}
            <BulkUploadStoresModal
                show={showBulkStoreModal}
                holdingId={selectedHoldingIdForUpload}
                onCancel={() => setShowBulkStoreModal(false)}
                onComplete={() => setShowBulkStoreModal(false)}
            />

            {/* Bulk User Modal */}
            <BulkUploadUsersModal
                show={showBulkUserModal}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                holdingId={holdingFilter !== 'todos' ? (holdings.find(h => h.nombre === holdingFilter) as any)?.id || (holdings.find(h => h.nombre === holdingFilter) as any)?.firestoreId : ''}
                onCancel={() => setShowBulkUserModal(false)}
                onComplete={() => setShowBulkUserModal(false)}
            />
        </div>
    );
}
