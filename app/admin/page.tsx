'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';
import UserManagementView from '@/components/admin/UserManagementView';
import CreateBrandModal from '@/components/admin/CreateBrandModal';
import EditBrandModal from '@/components/admin/EditBrandModal';
import CreateStoreModal from '@/components/admin/CreateStoreModal';
import EditStoreModal from '@/components/admin/EditStoreModal';
import BulkUploadStoresModal from '@/components/admin/BulkUploadStoresModal';
import ConfigurationView from '@/components/ConfigurationView';
import HoldingLogoUpload from '@/components/admin/HoldingLogoUpload';
import JobProfilesManagement from '@/components/admin/JobProfilesManagement';
import RQTrackingView from '@/components/admin/RQTrackingView';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where, orderBy, doc, deleteDoc, updateDoc, getDoc } from 'firebase/firestore';
import DocumentsConfigView from '@/components/admin/DocumentsConfigView';
import AlertsConfigView from '@/components/admin/AlertsConfigView';

// Mock data
const MOCK_HOLDING_INFO = {
    id: 'ngr',
    nombre: 'NGR Holding',
    plan: 'full_stack' as const,
    logo: 'NGR'
};

const MOCK_BRANDS = [
    {
        id: 'pj',
        nombre: 'Papa John\'s',
        logo: '🍕',
        candidatos: 45,
        entrevistas: 12,
        rqs: 3,
        tiendasActivas: 8,
        activa: true
    },
    {
        id: 'cw',
        nombre: 'China Wok',
        logo: '🥡',
        candidatos: 28,
        entrevistas: 8,
        rqs: 2,
        tiendasActivas: 5,
        activa: true
    },
    {
        id: 'cb',
        nombre: 'Caribou Coffee',
        logo: '☕',
        candidatos: 15,
        entrevistas: 4,
        rqs: 1,
        tiendasActivas: 3,
        activa: true
    },
];

const MOCK_RECRUITERS = [
    {
        id: '1',
        nombre: 'Ana García',
        email: 'ana@papajohns.pe',
        rol: 'brand_recruiter',
        marcas: ['Papa John\'s'],
        activo: true,
        ultimoAcceso: '2025-12-21 09:30'
    },
    {
        id: '2',
        nombre: 'Carlos Ruiz',
        email: 'carlos@chinawok.pe',
        rol: 'brand_recruiter',
        marcas: ['China Wok'],
        activo: true,
        ultimoAcceso: '2025-12-21 08:15'
    },
];

type Tab = 'marcas' | 'usuarios' | 'rqs' | 'reportes' | 'users';

export default function AdminDashboard() {
    const { user, claims, loading, signOut } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'marcas' | 'usuarios' | 'tiendas' | 'perfiles' | 'configuracion' | 'rqs' | 'reportes'>('marcas');
    const [brands, setBrands] = useState<any[]>([]);
    const [stores, setStores] = useState<any[]>([]);
    const [loadingBrands, setLoadingBrands] = useState(true);
    const [loadingStores, setLoadingStores] = useState(true);
    const [showCreateBrandModal, setShowCreateBrandModal] = useState(false);
    const [showCreateStoreModal, setShowCreateStoreModal] = useState(false);
    const [showEditStoreModal, setShowEditStoreModal] = useState(false);
    const [showBulkStoreModal, setShowBulkStoreModal] = useState(false);
    const [selectedStore, setSelectedStore] = useState<any | null>(null);
    const [selectedBrand, setSelectedBrand] = useState<any | null>(null);
    const [showEditBrandModal, setShowEditBrandModal] = useState(false);
    const [holdingId, setHoldingId] = useState('ngr'); // TODO: Get from userAssignments

    const [storeCounts, setStoreCounts] = useState<Record<string, number>>({});
    const [holdingInfo, setHoldingInfo] = useState<{ nombre: string; plan: string; logo?: string } | null>(null);

    // Features based on plan
    const currentPlan = holdingInfo?.plan || 'full_stack';
    const hasRQFeature = currentPlan === 'rq_only' || currentPlan === 'full_stack';
    const hasBotFeature = currentPlan === 'bot_only' || currentPlan === 'full_stack';

    useEffect(() => {
        if (!loading && (!user || claims?.role !== 'client_admin')) {
            router.push('/login');
        }
    }, [user, claims, loading, router]);

    // Load user's holdingId and holding info from userAssignments
    useEffect(() => {
        async function loadUserHolding() {
            if (!user) return;
            try {
                const { getUserAssignment } = await import('@/lib/firestore/user-assignments');
                const assignment = await getUserAssignment(user.uid);
                if (assignment?.holdingId) {
                    setHoldingId(assignment.holdingId);
                    console.log('✅ Admin holdingId loaded:', assignment.holdingId);

                    // Load holding info from Firestore
                    const holdingDoc = await getDoc(doc(db, 'holdings', assignment.holdingId));
                    if (holdingDoc.exists()) {
                        const data = holdingDoc.data();
                        setHoldingInfo({
                            nombre: data.nombre || assignment.holdingId,
                            plan: data.plan || 'full_stack',
                            logo: data.logo
                        });
                        console.log('✅ Holding info loaded:', data.nombre);
                    } else {
                        // Holding document doesn't exist, use holdingId as fallback
                        setHoldingInfo({
                            nombre: assignment.holdingId,
                            plan: 'full_stack',
                            logo: undefined
                        });
                        console.log('⚠️ Holding document not found, using ID as name:', assignment.holdingId);
                    }
                }
            } catch (error) {
                console.error('Error loading user holding:', error);
            }
        }
        loadUserHolding();
    }, [user]);

    // Load brands from Firestore in real-time
    useEffect(() => {
        if (!user) return;

        // Use holdingId from user assignment
        const currentHoldingId = holdingId;

        const marcasRef = collection(db, 'marcas');
        const q = query(
            marcasRef,
            where('holdingId', '==', currentHoldingId)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const loadedBrands = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setBrands(loadedBrands);
            setLoadingBrands(false);
            console.log('✅ Marcas cargadas desde Firestore:', loadedBrands.length);
        }, (error) => {
            console.error('Error cargando marcas:', error);
            setLoadingBrands(false);
        });

        return () => unsubscribe();
    }, [user, holdingId]);

    // Load stores from Firestore in real-time
    useEffect(() => {
        if (!user || !holdingId) return;

        const currentHoldingId = holdingId;

        const tiendasRef = collection(db, 'tiendas');
        const q = query(
            tiendasRef,
            where('holdingId', '==', holdingId)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const loadedStores = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setStores(loadedStores);
            setLoadingStores(false);
            console.log('✅ Tiendas cargadas desde Firestore:', loadedStores.length);
        }, (error) => {
            console.error('Error cargando tiendas:', error);
            setLoadingStores(false);
        });

        return () => unsubscribe();
    }, [user, holdingId]);

    // Count stores per brand in real-time
    useEffect(() => {
        if (!user || !holdingId) return;

        const currentHoldingId = holdingId;

        const tiendasRef = collection(db, 'tiendas');
        const q = query(
            tiendasRef,
            where('holdingId', '==', holdingId)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const counts: Record<string, number> = {};

            snapshot.docs.forEach(doc => {
                const data = doc.data();
                const marcaId = data.marcaId;
                if (marcaId) {
                    counts[marcaId] = (counts[marcaId] || 0) + 1;
                }
            });

            setStoreCounts(counts);
            console.log('✅ Conteo de tiendas por marca:', counts);
        }, (error) => {
            console.error('Error contando tiendas:', error);
        });

        return () => unsubscribe();
    }, [user, holdingId]); // Fixed: use holdingId instead of claims

    // Función para eliminar tienda
    async function handleDeleteStore(storeId: string, storeName: string, marcaId: string) {
        try {
            // Eliminar documento de Firestore
            await deleteDoc(doc(db, 'tiendas', storeId));

            // Actualizar contador en marca
            const marcaRef = doc(db, 'marcas', marcaId);
            const marcaSnap = await getDoc(marcaRef);
            const currentCount = marcaSnap.data()?.tiendasActivas || 0;

            if (currentCount > 0) {
                await updateDoc(marcaRef, {
                    tiendasActivas: currentCount - 1
                });
            }

            alert(`✅ Tienda "${storeName}" eliminada exitosamente`);
        } catch (error) {
            console.error('Error eliminando tienda:', error);
            alert('❌ Error eliminando tienda. Ver consola para detalles.');
        }
    }

    if (loading || !user) {
        return null;
    }

    // KPIs consolidados
    const totalCandidatos = MOCK_BRANDS.reduce((sum, b) => sum + b.candidatos, 0);
    const totalEntrevistas = MOCK_BRANDS.reduce((sum, b) => sum + b.entrevistas, 0);
    const totalRQs = MOCK_BRANDS.reduce((sum, b) => sum + b.rqs, 0);
    const tasaAprobacion = 72; // Mock

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Logo size="sm" />
                            <div>
                                <div className="flex items-center gap-3">
                                    <h1 className="text-xl font-bold text-gray-900">{holdingInfo?.nombre || 'Cargando...'}</h1>
                                    <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${currentPlan === 'full_stack' ? 'bg-violet-100 text-violet-700' :
                                        currentPlan === 'rq_only' ? 'bg-cyan-100 text-cyan-700' :
                                            'bg-blue-100 text-blue-700'
                                        }`}>
                                        {currentPlan === 'full_stack' ? '⚡ Full Stack' :
                                            currentPlan === 'rq_only' ? '📋 RQ Only' : '🤖 Bot Only'}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Admin Dashboard</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-600">{user.email}</span>
                            <button
                                onClick={() => signOut()}
                                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cerrar Sesión
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 py-8">

                {/* Navigation Tabs */}
                <div className="flex gap-2 border-b border-gray-200 mb-8">
                    <button
                        onClick={() => setActiveTab('marcas')}
                        className={`px-4 py-2 font-medium transition-colors border-b-2 ${activeTab === 'marcas'
                            ? 'border-violet-600 text-violet-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        🏪 Marcas
                    </button>
                    <button
                        onClick={() => setActiveTab('tiendas')}
                        className={`px-4 py-2 font-medium transition-colors border-b-2 ${activeTab === 'tiendas'
                            ? 'border-violet-600 text-violet-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        🏬 Tiendas
                    </button>
                    <button
                        onClick={() => setActiveTab('usuarios')}
                        className={`px-4 py-2 font-medium transition-colors border-b-2 ${activeTab === 'usuarios'
                            ? 'border-violet-600 text-violet-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        👥 Gestión de Usuarios
                    </button>
                    {hasRQFeature && (
                        <button
                            onClick={() => setActiveTab('rqs')}
                            className={`px-4 py-2 font-medium transition-colors border-b-2 ${activeTab === 'rqs'
                                ? 'border-violet-600 text-violet-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            📋 RQs Activos
                        </button>
                    )}
                    <button
                        onClick={() => setActiveTab('perfiles')}
                        className={`px-4 py-2 font-medium transition-colors border-b-2 ${activeTab === 'perfiles'
                            ? 'border-violet-600 text-violet-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        📝 Perfiles de Puesto
                    </button>
                    <button
                        onClick={() => setActiveTab('reportes')}
                        className={`px-4 py-2 font-medium transition-colors border-b-2 ${activeTab === 'reportes'
                            ? 'border-violet-600 text-violet-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        📊 Reportes
                    </button>
                    <button
                        onClick={() => setActiveTab('configuracion')}
                        className={`px-4 py-2 font-medium transition-colors border-b-2 ${activeTab === 'configuracion'
                            ? 'border-violet-600 text-violet-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        ⚙️ Configuración
                    </button>
                </div>

                {/* Tab: Marcas */}
                {activeTab === 'marcas' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-gray-900">Gestión de Marcas</h2>
                            <button
                                onClick={() => setShowCreateBrandModal(true)}
                                className="px-4 py-2 gradient-bg text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
                            >
                                + Nueva Marca
                            </button>
                        </div>

                        {/* Brands Grid */}
                        {loadingBrands ? (
                            <div className="text-center py-12">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto"></div>
                                <p className="mt-4 text-gray-600">Cargando marcas...</p>
                            </div>
                        ) : brands.length === 0 ? (
                            <div className="text-center py-12 bg-gray-50 rounded-lg">
                                <p className="text-gray-500">No hay marcas creadas</p>
                                <p className="text-sm text-gray-400 mt-1">Crea tu primera marca con el botón "+ Nueva Marca"</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {brands.map(brand => (
                                    <div key={brand.id} className="glass-card rounded-xl p-6 hover:shadow-lg transition-shadow">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-2xl">
                                                    {brand.logo || brand.nombre.charAt(0)}
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-gray-900">{brand.nombre}</h3>
                                                    <p className="text-xs text-gray-500">{storeCounts[brand.id] || 0} tiendas activas</p>
                                                </div>
                                            </div>
                                            <span className={`px-2 py-1 rounded-lg text-xs font-medium ${brand.activa ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                                }`}>
                                                {brand.activa ? '✓ Activa' : '○ Inactiva'}
                                            </span>
                                        </div>

                                        {/* Stats */}
                                        <div className="grid grid-cols-3 gap-3 mb-4">
                                            <div className="text-center">
                                                <p className="text-2xl font-bold text-violet-600">{brand.candidatos || 0}</p>
                                                <p className="text-xs text-gray-500">Candidatos</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-2xl font-bold text-cyan-600">{brand.entrevistas || 0}</p>
                                                <p className="text-xs text-gray-500">Entrevistas</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-2xl font-bold text-amber-600">{brand.rqs || 0}</p>
                                                <p className="text-xs text-gray-500">RQs</p>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <button
                                            onClick={() => {
                                                setSelectedBrand(brand);
                                                setShowEditBrandModal(true);
                                            }}
                                            className="w-full px-4 py-2 border border-violet-300 text-violet-600 rounded-lg font-medium hover:bg-violet-50 transition-colors"
                                        >
                                            Administrar
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Tab: Tiendas */}
                {activeTab === 'tiendas' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-gray-900">Gestión de Tiendas</h2>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowBulkStoreModal(true)}
                                    className="px-6 py-2 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors flex items-center gap-2"
                                >
                                    📁 Importar Tiendas
                                </button>
                                <button
                                    onClick={() => setShowCreateStoreModal(true)}
                                    className="px-6 py-2 gradient-bg text-white rounded-xl font-semibold hover:opacity-90 transition-opacity"
                                >
                                    + Nueva Tienda
                                </button>
                            </div>
                        </div>

                        {/* Stores List */}
                        {loadingStores ? (
                            <div className="text-center py-12">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto"></div>
                                <p className="mt-4 text-gray-600">Cargando tiendas...</p>
                            </div>
                        ) : stores.length === 0 ? (
                            <div className="text-center py-12 bg-gray-50 rounded-lg">
                                <p className="text-gray-500">No hay tiendas creadas</p>
                                <p className="text-sm text-gray-400 mt-1">Crea tu primera tienda con el botón "+ Nueva Tienda"</p>
                            </div>
                        ) : (
                            <div className="glass-card rounded-xl overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tienda</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Marca</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ubicación</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dirección</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {stores.map(store => (
                                            <tr key={store.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 text-sm font-mono text-violet-600 font-medium">{store.codigo || '-'}</td>
                                                <td className="px-6 py-4 text-sm font-medium text-gray-900">{store.nombre}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600">{store.marcaNombre}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600">
                                                    {store.distrito}, {store.provincia}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{store.direccion}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${store.activa ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                                        {store.activa ? '✓ Activa' : '○ Inactiva'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => {
                                                                setSelectedStore(store);
                                                                setShowEditStoreModal(true);
                                                            }}
                                                            className="text-violet-600 hover:text-violet-700 text-sm font-medium"
                                                        >
                                                            ✏️ Editar
                                                        </button>
                                                        <button
                                                            onClick={async () => {
                                                                if (confirm(`¿Eliminar tienda "${store.nombre}"?\n\nEsta acción no se puede deshacer.`)) {
                                                                    await handleDeleteStore(store.id, store.nombre, store.marcaId);
                                                                }
                                                            }}
                                                            className="text-red-600 hover:text-red-700 text-sm font-medium"
                                                        >
                                                            🗑️ Eliminar
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Tab: Usuarios */}
                {activeTab === 'usuarios' && (
                    <UserManagementView holdingId={holdingId} />
                )}

                {/* Tab: RQs - Solo si tiene el feature */}
                {activeTab === 'rqs' && hasRQFeature && (
                    <RQTrackingView
                        holdingId={holdingId}
                        marcas={brands.map(b => ({ id: b.id, nombre: b.nombre }))}
                    />
                )}

                {/* Tab: Reportes */}
                {activeTab === 'reportes' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-gray-900">Reportes y Métricas</h2>
                            <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                                📥 Exportar Reporte
                            </button>
                        </div>
                        <div className="glass-card rounded-xl p-8 text-center">
                            <p className="text-gray-500">Tab Reportes - En desarrollo</p>
                        </div>
                    </div>
                )}

                {/* Tab: Perfiles de Puesto */}
                {activeTab === 'perfiles' && (
                    <JobProfilesManagement
                        holdingId={holdingId}
                        marcas={brands.map(b => ({ id: b.id, nombre: b.nombre }))}
                    />
                )}

                {/* Tab: Reportes / Analítica */}
                {activeTab === 'reportes' && (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-gray-900">Reportes y Analítica</h2>
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
                            <div className="text-6xl mb-4">📊</div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Dashboard de Analítica Completo</h3>
                            <p className="text-gray-600 mb-6 max-w-xl mx-auto">
                                Visualiza métricas de reclutamiento, funnel de candidatos, razones de rechazo,
                                fuentes de reclutamiento, demografía y tendencias.
                            </p>
                            <a
                                href="/analytics"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-cyan-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                            >
                                Abrir Dashboard de Analítica →
                            </a>
                        </div>
                    </div>
                )}

                {/* Tab: Configuración */}
                {activeTab === 'configuracion' && (
                    <div className="space-y-6">
                        <HoldingLogoUpload holdingId={holdingId} />
                        <AlertsConfigView holdingId={holdingId} />
                        <DocumentsConfigView holdingId={holdingId} />
                        <ConfigurationView />
                    </div>
                )}

            </main>

            {/* Create Brand Modal */}
            <CreateBrandModal
                show={showCreateBrandModal}
                holdingId={holdingId}
                onCancel={() => setShowCreateBrandModal(false)}
                onSave={() => {
                    setShowCreateBrandModal(false);
                    // Brands will auto-update via onSnapshot
                }}
            />

            {/* Create Store Modal */}
            <CreateStoreModal
                show={showCreateStoreModal}
                holdingId={holdingId}
                onCancel={() => setShowCreateStoreModal(false)}
                onSave={() => {
                    setShowCreateStoreModal(false);
                    // Stores will auto-update via onSnapshot
                }}
            />

            {/* Edit Store Modal */}
            <EditStoreModal
                show={showEditStoreModal}
                store={selectedStore}
                onCancel={() => {
                    setShowEditStoreModal(false);
                    setSelectedStore(null);
                }}
                onSave={() => {
                    setShowEditStoreModal(false);
                    setSelectedStore(null);
                    // Stores will auto-update via onSnapshot
                }}
            />

            {/* Edit Brand Modal */}
            {showEditBrandModal && selectedBrand && (
                <EditBrandModal
                    brand={selectedBrand}
                    onClose={() => {
                        setShowEditBrandModal(false);
                        setSelectedBrand(null);
                    }}
                    onSave={() => {
                        setShowEditBrandModal(false);
                        setSelectedBrand(null);
                        // Brands will auto-update via onSnapshot
                    }}
                />
            )}

            {/* Bulk Upload Stores Modal */}
            <BulkUploadStoresModal
                show={showBulkStoreModal}
                holdingId={holdingId}
                onCancel={() => setShowBulkStoreModal(false)}
                onComplete={(result) => {
                    setShowBulkStoreModal(false);
                    alert(`✅ Importación completada: ${result.success} tiendas creadas, ${result.errors} errores`);
                }}
            />
        </div>
    );
}

