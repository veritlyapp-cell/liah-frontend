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
import { LayoutDashboard, Building2, Users, ShieldCheck, BarChart3, Search, Settings, FileText, Sparkles, Plus, Trash2, ChevronRight } from 'lucide-react';
import DashboardLayout from '@/components/layouts/DashboardLayout';

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
            const seenIds = new Set();
            const uniqueHoldings: any[] = [];

            snapshot.docs.forEach(doc => {
                const data = doc.data() as any;
                const hId = data.id || doc.id;

                if (!seenIds.has(hId)) {
                    seenIds.add(hId);
                    uniqueHoldings.push({
                        ...data,
                        firestoreId: doc.id
                    });
                } else {
                    console.warn('⚠️ Duplicate holding skipping:', hId, doc.id);
                }
            });

            setHoldings(uniqueHoldings);
            console.log('✅ Holdings únicos cargados:', uniqueHoldings.length);
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

    const sidebarItems = [
        { id: 'empresas', label: 'Empresas', icon: <Building2 /> },
        { id: 'usuarios', label: 'Usuarios', icon: <Users /> },
        { id: 'pending', label: 'Activaciones', icon: <ShieldCheck /> },
        { id: 'candidatos', label: 'Candidatos', icon: <Search /> },
        { id: 'logs', label: 'Auditoría', icon: <BarChart3 /> },
        { id: 'configuracion', label: 'Configuración', icon: <Settings />, hidden: true },
    ];

    if (loading || !user) return null;

    return (
        <DashboardLayout
            items={sidebarItems}
            activeTab={activeTab}
            onTabChange={(id) => setActiveTab(id as Tab)}
            title="Super Admin"
            subtitle="Plataforma de Control Global"
            onConfigClick={() => setActiveTab('configuracion')}
            brandColor="#0f172a"
        >
            {/* Global Context Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 mb-6 md:mb-8">
                <div className="w-full">
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase italic mb-1 md:mb-1.5 leading-[1.1] break-words">
                        Control Central
                    </h2>
                    <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                        Gestión global de infraestructura y multitenancy
                    </p>
                </div>

                {activeTab !== 'empresas' && activeTab !== 'configuracion' && (
                    <div className="flex items-center gap-3 animate-fade-in">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Filtrar Holding:</label>
                        <div className="relative group">
                            <select
                                value={holdingFilter}
                                onChange={(e) => setHoldingFilter(e.target.value)}
                                className="pl-4 pr-10 py-2.5 bg-white border border-slate-100 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 outline-none hover:bg-slate-50 transition-all appearance-none shadow-sm"
                            >
                                <option value="todos">📊 Todos</option>
                                {holdings.map(h => (
                                    <option key={h.id} value={h.nombre}>{h.nombre}</option>
                                ))}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                <ChevronRight size={14} className="rotate-90" />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Navigation Tabs - Modern Segmented Control (Desktop Only) */}
            <div className="hidden md:flex items-center gap-1.5 p-1.5 bg-slate-100/50 rounded-2xl w-fit mb-10 border border-slate-100 overflow-x-auto hide-scrollbar">
                {[
                    { id: 'empresas', label: 'Empresas', icon: <Building2 size={14} /> },
                    { id: 'usuarios', label: 'Usuarios', icon: <Users size={14} /> },
                    { id: 'pending', label: 'Activaciones', icon: <ShieldCheck size={14} /> },
                    { id: 'logs', label: 'Auditoría', icon: <BarChart3 size={14} /> },
                    { id: 'candidatos', label: 'Candidatos', icon: <Search size={14} /> },
                ].map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as Tab)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${isActive
                                ? 'bg-white text-slate-900 shadow-md shadow-slate-200/50'
                                : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
                                }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab: Empresas */}
            {activeTab === 'empresas' && (
                <div className="space-y-10">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                        <div>
                            <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tight flex items-center gap-3 mb-1">
                                <span className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center flex-shrink-0">
                                    <Building2 size={20} />
                                </span>
                                Empresas Clientes
                            </h2>
                            <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest ml-[52px]">Directorio de tenants corporativos</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    if (holdingFilter === 'todos') {
                                        alert('Por favor selecciona un Holding primero para importar tiendas.');
                                        return;
                                    }
                                    const h = holdings.find(h => h.nombre === holdingFilter);
                                    if (h) {
                                        setSelectedHoldingIdForUpload(h.id || h.firestoreId);
                                        setShowBulkStoreModal(true);
                                    }
                                }}
                                className="px-5 py-2.5 bg-emerald-50 text-emerald-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all border border-emerald-100 flex items-center gap-2"
                            >
                                <Building2 size={14} />
                                Importar Tiendas
                            </button>
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="hidden md:flex px-6 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-xl shadow-slate-900/20 items-center gap-2"
                            >
                                <Plus size={14} strokeWidth={3} />
                                Nueva Empresa
                            </button>
                            {/* Mobile FAB */}
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="md:hidden fixed bottom-[88px] right-6 w-14 h-14 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-2xl shadow-slate-900/40 z-[60] hover:scale-105 active:scale-95 transition-transform"
                                style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
                            >
                                <Plus size={24} strokeWidth={2.5} />
                            </button>
                        </div>
                    </div>

                    {/* KPIs - Premium Style */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {[
                            { label: 'Empresas', val: holdings.length, color: 'slate' },
                            { label: 'Activas', val: holdings.filter(h => h.activo).length, color: 'emerald' },
                            { label: 'Marcas', val: Object.values(brandCounts).reduce((a, b) => a + b, 0), color: 'cyan' },
                            { label: 'Tiendas', val: Object.values(storeCounts).reduce((a, b) => a + b, 0), color: 'amber' },
                            { label: 'Usuarios', val: holdings.reduce((s, h) => s + (h.config?.maxUsuarios || h.usuarios || 0), 0), color: 'violet' },
                        ].map((stat, i) => (
                            <div key={i} className="white-label-card p-6 flex flex-col items-center justify-center text-center group hover:border-brand/30 transition-all">
                                <span className={`text-3xl font-black italic tracking-tighter text-${stat.color}-500 mb-1 group-hover:scale-110 transition-transform`}>
                                    {stat.val}
                                </span>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{stat.label}</span>
                            </div>
                        ))}
                    </div>

                    {/* Trial Credentials Feature Box */}
                    <div className="white-label-card p-8 bg-slate-900 text-white relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-brand/10 blur-[100px] rounded-full" />
                        <div className="relative z-10">
                            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-brand mb-4 flex items-center gap-2">
                                <Sparkles size={16} />
                                Trial Accounts Sandbox
                            </h3>
                            <p className="text-slate-400 text-xs font-medium mb-6 max-w-2xl leading-relaxed">
                                Al habilitar el modo **Trial**, el sistema aprovisiona automáticamente un entorno preconfigurado con 4 roles base.
                                Clave maestra temporal: <span className="bg-white/10 px-2 py-1 rounded text-white font-mono">DemoLiah2026!</span>
                            </p>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                {[
                                    { r: 'Admin', e: 'admin@[id].com' },
                                    { r: 'Jefe Marca', e: 'jefe@[id].com' },
                                    { r: 'Supervisor', e: 'supervisor@[id].com' },
                                    { r: 'Manager', e: 'sm@[id].com' }
                                ].map((cred, i) => (
                                    <div key={i} className="bg-white/5 border border-white/5 p-4 rounded-2xl hover:bg-white/10 transition-colors">
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{cred.r}</p>
                                        <p className="text-[11px] font-mono text-slate-300 truncate">{cred.e}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Holdings List - Detailed Cards */}
                    <div className="grid grid-cols-1 gap-4">
                        {holdings.map(holding => (
                            <div key={holding.firestoreId} className="white-label-card p-5 md:p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 md:gap-8 group hover:border-brand/30">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 md:gap-6 flex-1 w-full overflow-hidden">
                                    <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl md:rounded-[1.5rem] flex-shrink-0 bg-slate-50 border border-slate-100 flex items-center justify-center text-lg md:text-xl font-black text-slate-400 italic group-hover:bg-brand/10 group-hover:text-brand transition-all">
                                        {holding.logo ? (
                                            <img src={holding.logo} alt={holding.nombre} className="w-full h-full object-contain p-2" />
                                        ) : (
                                            holding.nombre.substring(0, 2).toUpperCase()
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0 w-full">
                                        <div className="flex flex-wrap items-center gap-2 mb-2">
                                            <h3 className="text-base md:text-lg font-black text-slate-900 uppercase italic tracking-tight truncate max-w-full">{holding.nombre}</h3>
                                            <span className={holding.activo ? 'soft-badge-emerald' : 'soft-badge-slate'}>
                                                {holding.activo ? <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> : null}
                                                {holding.activo ? 'Activo' : 'Inactivo'}
                                            </span>
                                            {holding.isTrial && <span className="soft-badge-amber">Trial Account</span>}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                            <span className="flex items-center gap-1.5">
                                                <div className="w-1 h-1 rounded-full bg-slate-200" />
                                                {brandCounts[holding.id] || 0} Marcas
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <div className="w-1 h-1 rounded-full bg-slate-200" />
                                                {storeCounts[holding.id] || 0} Tiendas
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <div className="w-1 h-1 rounded-full bg-slate-200" />
                                                {holding.plan === 'full_stack' ? 'Enterprise' : 'Estandar'}
                                            </span>
                                            <span className="text-emerald-500 font-black">
                                                ${holding.config?.precioMensual || 499} USD/MES
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col md:flex-row items-center gap-3 w-full lg:w-auto mt-6 lg:mt-0 border-t lg:border-t-0 border-slate-100 pt-6 lg:pt-0">
                                    <button
                                        onClick={() => router.push(`/admin?holdingId=${holding.id || holding.firestoreId}`)}
                                        className="w-full lg:w-auto px-6 py-3.5 md:py-3 bg-slate-900 text-white rounded-2xl text-[11px] md:text-[10px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-slate-900/10 flex items-center justify-center gap-2"
                                    >
                                        🚀 Gestionar Tenant
                                    </button>
                                    <div className="flex gap-2 w-full lg:w-auto">
                                        <button
                                            onClick={() => handleEditHolding(holding)}
                                            className="flex-1 lg:flex-none p-3.5 md:p-3 bg-slate-50 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-2xl transition-all border border-transparent flex items-center justify-center"
                                            title="Configurar"
                                        >
                                            <Settings size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteHolding(holding)}
                                            className="flex-1 lg:flex-none p-3.5 md:p-3 bg-rose-50 text-rose-400 hover:text-rose-600 hover:bg-rose-100 rounded-2xl transition-all border border-transparent flex items-center justify-center"
                                            title="Eliminar"
                                        >
                                            <Trash2 size={18} />
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
                <div className="space-y-10">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                        <div>
                            <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tight flex items-center gap-3 mb-1">
                                <span className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center flex-shrink-0">
                                    <Users size={20} />
                                </span>
                                Gestión de Usuarios
                            </h2>
                            <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest ml-[52px]">Directorio cross-tenant</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowBulkUserModal(true)}
                                className="px-5 py-2.5 bg-emerald-50 text-emerald-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all border border-emerald-100 flex items-center gap-2"
                            >
                                <ShieldCheck size={14} />
                                Importar Usuarios
                            </button>
                            <button
                                onClick={() => setShowCreateUserModal(true)}
                                className="hidden md:flex px-6 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-xl shadow-slate-900/20 items-center gap-2"
                            >
                                <Plus size={14} strokeWidth={3} />
                                Nuevo Usuario
                            </button>
                            {/* Mobile FAB */}
                            <button
                                onClick={() => setShowCreateUserModal(true)}
                                className="md:hidden fixed bottom-[88px] right-6 w-14 h-14 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-2xl shadow-slate-900/40 z-[60] hover:scale-105 active:scale-95 transition-transform"
                                style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
                            >
                                <Plus size={24} strokeWidth={2.5} />
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4 md:space-y-0">
                        {/* Mobile Stacked Cards */}
                        <div className="md:hidden flex flex-col gap-4">
                            {users.filter(u => holdingFilter === 'todos' || u.tenant.toLowerCase().includes(holdingFilter.toLowerCase())).map(usuario => (
                                <div key={usuario.id} className="white-label-card p-5 flex flex-col gap-4 shadow-sm">
                                    <div className="flex justify-between items-start">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-900">{usuario.nombre}</span>
                                            <span className="text-[11px] text-slate-400 font-medium">{usuario.email}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleEditUser(usuario)} className="p-2.5 bg-slate-50 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all">
                                                <Settings size={16} />
                                            </button>
                                            <button onClick={() => handleDeleteUser(usuario.id, usuario.email)} className="p-2.5 bg-rose-50 text-rose-400 hover:text-rose-600 hover:bg-rose-100 rounded-xl transition-all">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rol</span>
                                            <div><span className="soft-badge-brand text-[10px]">{usuario.rol}</span></div>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estatus</span>
                                            <div>
                                                <span className={usuario.activo ? 'soft-badge-emerald text-[10px]' : 'soft-badge-rose text-[10px]'}>
                                                    {usuario.activo ? 'Activo' : 'Inactivo'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="col-span-2 flex flex-col gap-1">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tenant</span>
                                            <span className="text-xs font-bold text-slate-700 truncate">{usuario.tenant}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Desktop Table */}
                        <div className="hidden md:block white-label-card overflow-hidden">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-slate-50/50">
                                        <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Usuario</th>
                                        <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Rol</th>
                                        <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Tenant</th>
                                        <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Estatus</th>
                                        <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Gestión</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {users.filter(u => holdingFilter === 'todos' || u.tenant.toLowerCase().includes(holdingFilter.toLowerCase())).map(usuario => (
                                        <tr key={usuario.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-8 py-5">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-900 group-hover:text-brand transition-colors">{usuario.nombre}</span>
                                                    <span className="text-xs text-slate-400 font-medium">{usuario.email}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className="soft-badge-brand">{usuario.rol}</span>
                                            </td>
                                            <td className="px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest truncate max-w-[150px]">
                                                {usuario.tenant}
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className={usuario.activo ? 'soft-badge-emerald' : 'soft-badge-rose'}>
                                                    {usuario.activo ? 'Activo' : 'Inactivo'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => handleEditUser(usuario)} className="p-2.5 bg-slate-50 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all">
                                                        <Settings size={16} />
                                                    </button>
                                                    <button onClick={() => handleDeleteUser(usuario.id, usuario.email)} className="p-2.5 bg-rose-50 text-rose-400 hover:text-rose-600 hover:bg-rose-100 rounded-xl transition-all">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

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

            <div className="space-y-12">

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
        </DashboardLayout>
    );
}
