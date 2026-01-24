'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import DashboardHeader from '@/components/DashboardHeader';
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
import AdminCandidatesView from '@/components/admin/AdminCandidatesView';
import AdminRQAnalyticsView from '@/components/admin/AdminRQAnalyticsView';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where, doc, deleteDoc, updateDoc, getDoc, getDocs } from 'firebase/firestore';
import DocumentsConfigView from '@/components/admin/DocumentsConfigView';
import AlertsConfigView from '@/components/admin/AlertsConfigView';
import RoleMatrixConfig from '@/components/admin/RoleMatrixConfig';
import AdvancedAnalyticsDashboard from '@/components/admin/AdvancedAnalyticsDashboard';

// Redundant mock data removed to fix lint warning

export default function AdminDashboard() {
    const { user, claims, loading } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'marcas' | 'usuarios' | 'tiendas' | 'perfiles' | 'configuracion' | 'rqs' | 'candidatos' | 'reportes' | 'analitica'>('marcas');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [brands, setBrands] = useState<any[]>([]);
    const [candidateCounts, setCandidateCounts] = useState<Record<string, number>>({});
    const [interviewCounts, setInterviewCounts] = useState<Record<string, number>>({});
    const [rqCounts, setRqCounts] = useState<Record<string, number>>({});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [stores, setStores] = useState<any[]>([]);
    const [loadingBrands, setLoadingBrands] = useState(true);
    const [loadingStores, setLoadingStores] = useState(true);
    const [showCreateBrandModal, setShowCreateBrandModal] = useState(false);
    const [showCreateStoreModal, setShowCreateStoreModal] = useState(false);
    const [showEditStoreModal, setShowEditStoreModal] = useState(false);
    const [showBulkStoreModal, setShowBulkStoreModal] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [selectedStore, setSelectedStore] = useState<any | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [selectedBrand, setSelectedBrand] = useState<any | null>(null);
    const [showEditBrandModal, setShowEditBrandModal] = useState(false);
    const [holdingId, setHoldingId] = useState<string>('');

    const [storeCounts, setStoreCounts] = useState<Record<string, number>>({});
    const [holdingInfo, setHoldingInfo] = useState<{ nombre: string; plan: string; logo?: string } | null>(null);

    // Features based on plan
    const currentPlan = holdingInfo?.plan || 'full_stack';
    const hasRQFeature = currentPlan === 'rq_only' || currentPlan === 'full_stack';

    useEffect(() => {
        const allowedRoles = ['client_admin', 'admin', 'gerente'];
        if (!loading && (!user || !allowedRoles.includes(claims?.role || ''))) {
            router.push('/login');
        }
    }, [user, claims, loading, router]);

    // Load user's holdingId and holding info
    useEffect(() => {
        async function loadUserHolding() {
            if (!user) return;
            try {
                let foundHoldingId: string | null = null;

                // First try user_assignments
                const { getUserAssignment } = await import('@/lib/firestore/user-assignments');
                const assignment = await getUserAssignment(user.uid);
                if (assignment?.holdingId) {
                    foundHoldingId = assignment.holdingId;
                }

                // If not found, try talent_users (for users who are talent admins)
                if (!foundHoldingId && user.email) {
                    const talentUsersRef = collection(db, 'talent_users');
                    const q = query(talentUsersRef, where('email', '==', user.email.toLowerCase()));
                    const snap = await getDocs(q);
                    if (!snap.empty) {
                        const talentUser = snap.docs[0].data();
                        if (talentUser.holdingId) {
                            foundHoldingId = talentUser.holdingId;
                        }
                    }
                }

                if (foundHoldingId) {
                    setHoldingId(foundHoldingId);

                    const holdingDoc = await getDoc(doc(db, 'holdings', foundHoldingId));
                    if (holdingDoc.exists()) {
                        const data = holdingDoc.data();
                        setHoldingInfo({
                            nombre: data.nombre || foundHoldingId,
                            plan: data.plan || 'full_stack',
                            logo: data.logo
                        });
                    } else {
                        setHoldingInfo({
                            nombre: foundHoldingId,
                            plan: 'full_stack',
                            logo: undefined
                        });
                    }
                }
            } catch (error) {
                console.error('Error loading user holding:', error);
            }
        }
        loadUserHolding();
    }, [user]);

    // Load brands from Firestore
    useEffect(() => {
        if (!user || !holdingId) return;

        const marcasRef = collection(db, 'marcas');
        const q = query(marcasRef, where('holdingId', '==', holdingId));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const loadedBrands = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setBrands(loadedBrands);
            setLoadingBrands(false);
        }, (error) => {
            console.error('Error cargando marcas:', error);
            setLoadingBrands(false);
        });

        return () => unsubscribe();
    }, [user, holdingId]);

    // Aggregate Candidate and Interview counts per brand
    useEffect(() => {
        if (!user || !holdingId) return;

        const candidatesRef = collection(db, 'candidates');
        const q = query(candidatesRef, where('holdingId', '==', holdingId));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const cCounts: Record<string, number> = {};
            const iCounts: Record<string, number> = {};

            snapshot.docs.forEach(doc => {
                const data = doc.data();
                // Brand ID can be at top level OR inside the first assignment
                const marcaId = data.marcaId || (data.assignments && data.assignments.length > 0 ? data.assignments[0].marcaId : null);

                if (marcaId) {
                    cCounts[marcaId] = (cCounts[marcaId] || 0) + 1;
                    if (data.status === 'interview_scheduled' || data.status === 'hired' || data.selectionStatus === 'selected') {
                        iCounts[marcaId] = (iCounts[marcaId] || 0) + 1;
                    }
                }
            });

            setCandidateCounts(cCounts);
            setInterviewCounts(iCounts);
        });

        return () => unsubscribe();
    }, [user, holdingId]);

    // Aggregate RQ counts per brand
    useEffect(() => {
        if (!user || !holdingId) return;

        const rqsRef = collection(db, 'rqs');
        const q = query(rqsRef, where('holdingId', '==', holdingId));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const countMap: Record<string, number> = {};

            snapshot.docs.forEach(doc => {
                const data = doc.data();
                const marcaId = data.marcaId;
                if (marcaId) {
                    countMap[marcaId] = (countMap[marcaId] || 0) + 1;
                }
            });

            setRqCounts(countMap);
        });

        return () => unsubscribe();
    }, [user, holdingId]);

    // Load stores from Firestore
    useEffect(() => {
        if (!user || !holdingId) return;

        const tiendasRef = collection(db, 'tiendas');
        const q = query(tiendasRef, where('holdingId', '==', holdingId));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const loadedStores = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setStores(loadedStores);
            setLoadingStores(false);
        }, (error) => {
            console.error('Error cargando tiendas:', error);
            setLoadingStores(false);
        });

        return () => unsubscribe();
    }, [user, holdingId]);

    // Count stores per brand
    useEffect(() => {
        if (!user || !holdingId) return;

        const tiendasRef = collection(db, 'tiendas');
        const q = query(tiendasRef, where('holdingId', '==', holdingId));

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
        }, (error) => {
            console.error('Error contando tiendas:', error);
        });

        return () => unsubscribe();
    }, [user, holdingId]);

    async function handleDeleteStore(storeId: string, storeName: string, marcaId: string) {
        try {
            await deleteDoc(doc(db, 'tiendas', storeId));
            const marcaRef = doc(db, 'marcas', marcaId);
            const marcaSnap = await getDoc(marcaRef);
            const currentCount = marcaSnap.data()?.tiendasActivas || 0;

            if (currentCount > 0) {
                await updateDoc(marcaRef, { tiendasActivas: currentCount - 1 });
            }
            alert(`✅ Tienda "${storeName}" eliminada exitosamente`);
        } catch (error) {
            console.error('Error eliminando tienda:', error);
        }
    }

    if (loading || !user) return null;

    return (
        <div className="min-h-screen bg-gray-50">
            <DashboardHeader
                title={holdingInfo?.nombre || 'Admin Dashboard'}
                subtitle={`${user?.displayName || user?.email?.split('@')[0] || 'Admin'} • Admin Empresa`}
                holdingId={holdingId}
                onConfigClick={() => setActiveTab('configuracion')}
                showProductSwitcher={true}
            />

            {/* Content Container */}
            <main className="container-main py-20 space-y-12">
                <div className="flex gap-2 border-b border-gray-200 overflow-x-auto pb-1">
                    <button
                        onClick={() => setActiveTab('marcas')}
                        className={`px-4 py-2 font-medium whitespace-nowrap transition-colors border-b-2 ${activeTab === 'marcas' ? 'border-violet-600 text-violet-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        🏪 Marcas
                    </button>
                    <button
                        onClick={() => setActiveTab('tiendas')}
                        className={`px-4 py-2 font-medium whitespace-nowrap transition-colors border-b-2 ${activeTab === 'tiendas' ? 'border-violet-600 text-violet-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        🏬 Tiendas
                    </button>
                    <button
                        onClick={() => setActiveTab('usuarios')}
                        className={`px-4 py-2 font-medium whitespace-nowrap transition-colors border-b-2 ${activeTab === 'usuarios' ? 'border-violet-600 text-violet-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        👥 Gestión de Usuarios
                    </button>
                    {hasRQFeature && (
                        <button
                            onClick={() => setActiveTab('rqs')}
                            className={`px-4 py-2 font-medium whitespace-nowrap transition-colors border-b-2 ${activeTab === 'rqs' ? 'border-violet-600 text-violet-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            📋 RQs
                        </button>
                    )}
                    <button
                        onClick={() => setActiveTab('candidatos')}
                        className={`px-4 py-2 font-medium whitespace-nowrap transition-colors border-b-2 ${activeTab === 'candidatos' ? 'border-violet-600 text-violet-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        👥 Candidatos
                    </button>
                    <button
                        onClick={() => setActiveTab('perfiles')}
                        className={`px-4 py-2 font-medium whitespace-nowrap transition-colors border-b-2 ${activeTab === 'perfiles' ? 'border-violet-600 text-violet-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        📝 Perfiles de Puesto
                    </button>
                    <button
                        onClick={() => setActiveTab('reportes')}
                        className={`px-4 py-2 font-medium whitespace-nowrap transition-colors border-b-2 ${activeTab === 'reportes' ? 'border-violet-600 text-violet-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        📋 Logs
                    </button>
                    <button
                        onClick={() => setActiveTab('analitica')}
                        className={`px-4 py-2 font-bold whitespace-nowrap transition-colors border-b-2 ${activeTab === 'analitica' ? 'border-violet-600 text-violet-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        🚀 Analítica Pro
                    </button>
                </div>

                {activeTab === 'marcas' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-gray-900">Gestión de Marcas</h2>
                            <button onClick={() => setShowCreateBrandModal(true)} className="px-4 py-2 gradient-bg text-white rounded-xl font-medium hover:opacity-90 transition-opacity">
                                + Nueva Marca
                            </button>
                        </div>
                        {loadingBrands ? (
                            <div className="text-center py-12">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto"></div>
                                <p className="mt-4 text-gray-600">Cargando marcas...</p>
                            </div>
                        ) : brands.length === 0 ? (
                            <div className="text-center py-12 bg-gray-50 rounded-lg">
                                <p className="text-gray-500">No hay marcas creadas</p>
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
                                            <span className={`px-2 py-1 rounded-lg text-xs font-medium ${brand.activa ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                                {brand.activa ? '✓ Activa' : '○ Inactiva'}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-3 mb-4">
                                            <div className="text-center">
                                                <p className="text-2xl font-bold text-violet-600">{candidateCounts[brand.id] || 0}</p>
                                                <p className="text-xs text-gray-500">Candidatos</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-2xl font-bold text-cyan-600">{interviewCounts[brand.id] || 0}</p>
                                                <p className="text-xs text-gray-500">Entrevistas</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-2xl font-bold text-amber-600">{rqCounts[brand.id] || 0}</p>
                                                <p className="text-xs text-gray-500">RQs</p>
                                            </div>
                                        </div>
                                        <button onClick={() => { setSelectedBrand(brand); setShowEditBrandModal(true); }} className="w-full px-4 py-2 border border-violet-300 text-violet-600 rounded-lg font-medium hover:bg-violet-50 transition-colors">
                                            Administrar
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'tiendas' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-gray-900">Gestión de Tiendas</h2>
                            <div className="flex gap-3">
                                <button onClick={() => setShowBulkStoreModal(true)} className="px-6 py-2 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors flex items-center gap-2">
                                    📁 Importar Tiendas
                                </button>
                                <button onClick={() => setShowCreateStoreModal(true)} className="px-6 py-2 gradient-bg text-white rounded-xl font-semibold hover:opacity-90 transition-opacity">
                                    + Nueva Tienda
                                </button>
                            </div>
                        </div>
                        {loadingStores ? (
                            <div className="text-center py-12">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto"></div>
                                <p className="mt-4 text-gray-600">Cargando tiendas...</p>
                            </div>
                        ) : stores.length === 0 ? (
                            <div className="text-center py-12 bg-gray-50 rounded-lg">
                                <p className="text-gray-500">No hay tiendas creadas</p>
                            </div>
                        ) : (
                            <div className="glass-card rounded-xl overflow-x-auto">
                                <table className="w-full min-w-[800px]">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tienda</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Marca</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ubicación</th>
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
                                                <td className="px-6 py-4 text-sm text-gray-600">{store.distrito}, {store.provincia}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${store.activa ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                                        {store.activa ? '✓ Activa' : '○ Inactiva'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex gap-2">
                                                        <button onClick={() => { setSelectedStore(store); setShowEditStoreModal(true); }} className="text-violet-600 hover:text-violet-700 text-sm font-medium">✏️ Editar</button>
                                                        <button onClick={async () => { if (confirm(`¿Eliminar tienda "${store.nombre}"?`)) await handleDeleteStore(store.id, store.nombre, store.marcaId); }} className="text-red-600 hover:text-red-700 text-sm font-medium">🗑️ Eliminar</button>
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

                {activeTab === 'usuarios' && <UserManagementView holdingId={holdingId} />}
                {activeTab === 'rqs' && hasRQFeature && <RQTrackingView holdingId={holdingId} marcas={brands.map(b => ({ id: b.id, nombre: b.nombre }))} />}
                {activeTab === 'candidatos' && <AdminCandidatesView holdingId={holdingId} marcas={brands.map(b => ({ id: b.id, nombre: b.nombre }))} tiendas={stores.map(s => ({ id: s.id, nombre: s.nombre, marcaId: s.marcaId }))} />}
                {activeTab === 'perfiles' && <JobProfilesManagement holdingId={holdingId} marcas={brands.map(b => ({ id: b.id, nombre: b.nombre }))} />}

                {activeTab === 'reportes' && (
                    <div className="space-y-8">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-gray-900">Logs de Actividad</h2>
                        </div>
                        <AdminRQAnalyticsView holdingId={holdingId} marcas={brands.map(b => ({ id: b.id, nombre: b.nombre }))} />
                    </div>
                )}

                {activeTab === 'analitica' && (
                    <div className="space-y-8">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Analítica Avanzada: Rotación e Impacto</h2>
                                <p className="text-sm text-gray-500 mt-1">Transformando la rotación en indicadores financieros y operativos</p>
                            </div>
                        </div>
                        <AdvancedAnalyticsDashboard holdingId={holdingId} />
                    </div>
                )}

                {activeTab === 'configuracion' && (
                    <div className="space-y-6">
                        <RoleMatrixConfig holdingId={holdingId} />
                        <HoldingLogoUpload holdingId={holdingId} />
                        <AlertsConfigView holdingId={holdingId} />
                        <DocumentsConfigView holdingId={holdingId} />
                        <ConfigurationView />
                    </div>
                )}
            </main>

            <CreateBrandModal show={showCreateBrandModal} holdingId={holdingId} onCancel={() => setShowCreateBrandModal(false)} onSave={() => setShowCreateBrandModal(false)} />
            <CreateStoreModal show={showCreateStoreModal} holdingId={holdingId} onCancel={() => setShowCreateStoreModal(false)} onSave={() => setShowCreateStoreModal(false)} />
            <EditStoreModal show={showEditStoreModal} store={selectedStore} onCancel={() => { setShowEditStoreModal(false); setSelectedStore(null); }} onSave={() => { setShowEditStoreModal(false); setSelectedStore(null); }} />
            {showEditBrandModal && selectedBrand && <EditBrandModal brand={selectedBrand} onClose={() => { setShowEditBrandModal(false); setSelectedBrand(null); }} onSave={() => { setShowEditBrandModal(false); setSelectedBrand(null); }} />}
            <BulkUploadStoresModal show={showBulkStoreModal} holdingId={holdingId} onCancel={() => setShowBulkStoreModal(false)} onComplete={(result) => { setShowBulkStoreModal(false); alert(`Importación completada: ${result.success} exitos`); }} />
        </div>
    );
}
