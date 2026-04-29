'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getCandidatesByMarca, getFilteredCandidates, getPositionsByMarca, getStoresByMarca } from '@/lib/firestore/recruiter-queries';
import type { Candidate } from '@/lib/firestore/candidates';
import RecruiterCandidatesView from '@/components/RecruiterCandidatesView';
import DashboardHeader from '@/components/DashboardHeader';
import FiltersSidebar from '@/components/FiltersSidebar';
import ConfigurationView from '@/components/ConfigurationView';
import RQTrackingView from '@/components/admin/RQTrackingView';
import EmailTemplatesConfig from '@/components/admin/EmailTemplatesConfig';
import { useRouter } from 'next/navigation';
import UnifiedAnalytics from '@/components/admin/UnifiedAnalytics';
import ApprovedRQSummary from '@/components/admin/ApprovedRQSummary';
import { subscribeToAllRQs, type RQ } from '@/lib/firestore/rqs';
import InterviewAgenda from '@/components/store-manager/InterviewAgenda';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import SidebarNav from '@/components/SidebarNav';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import CandidateActivationPanel from '@/components/recruiter/CandidateActivationPanel';

export default function RecruiterDashboard() {
    const { user, claims, loading: authLoading, signOut } = useAuth();
    const [isMobile, setIsMobile] = useState(true);

    useEffect(() => {
        const check = () => typeof window !== 'undefined' && setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    const router = useRouter();
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [filteredCandidates, setFilteredCandidates] = useState<Candidate[]>([]);
    const [loading, setLoading] = useState(true);
    const [positions, setPositions] = useState<string[]>([]);
    const [stores, setStores] = useState<Array<{ id: string, nombre: string }>>([]);

    // Role protection and redirection
    useEffect(() => {
        if (!authLoading && user) {
            const role = claims?.role || '';
            // ONLY redirect if we explicitly have a role AND it's NOT a recruiter role
            if (role && !['recruiter', 'brand_recruiter', 'jefe_zonal', 'hrbp', 'client_admin', 'admin', 'super_admin'].includes(role)) {
                console.log('🛡️ Recruiter Guard: Unauthorized role detected:', role, '- redirecting to /launcher');
                router.push('/launcher');
            }
        } else if (!authLoading && !user) {
            console.log('🛡️ Recruiter Guard: No user, redirecting to /login');
            router.push('/login');
        }
    }, [user, claims, authLoading, router]);

    // Filters state
    const [selectedStores, setSelectedStores] = useState<string[]>([]);
    const [selectedPosition, setSelectedPosition] = useState<string>('');
    const [selectedCULStatus, setSelectedCULStatus] = useState<string>('');
    const [selectedDateFilter, setSelectedDateFilter] = useState<'semana' | 'mes' | 'todos'>('semana'); // Default to last week
    const [activeTab, setActiveTab] = useState<'candidatos' | 'requerimientos' | 'analitica' | 'configuracion' | 'entrevistas' | 'activacion' | 'plantillas'>('requerimientos');

    // Marcas from user assignment (can be multiple)
    const [marcas, setMarcas] = useState<{ id: string; nombre: string }[]>([]);
    const [assignedZones, setAssignedZones] = useState<string[]>([]);
    const [selectedMarca, setSelectedMarca] = useState<string>('all');
    const [loadingAssignment, setLoadingAssignment] = useState(true);
    const [holdingId, setHoldingId] = useState<string>('');
    const [holdingName, setHoldingName] = useState<string>('');
    const [enableInterviews, setEnableInterviews] = useState(true);
    const [allRQs, setAllRQs] = useState<RQ[]>([]);

    // 1. Separate Effect: Load Assignment
    useEffect(() => {
        async function loadAssignment() {
            if (!user) return;
            try {
                const { getUserAssignment } = await import('@/lib/firestore/user-assignments');
                const assignment = await getUserAssignment(user.uid);
                console.log('🔍 Recruiter: Raw assignment data:', JSON.stringify(assignment, null, 2));

                if (!assignment) {
                    console.log('❌ Recruiter: No assignment found for user');
                    setLoading(false);
                    setLoadingAssignment(false);
                    return;
                }

                const loadedMarcas: { id: string; nombre: string }[] = [];

                // 1. Get from assignedMarca (singular)
                const am = assignment.assignedMarca;
                if (am && (am.marcaId || (am as any).id)) {
                    loadedMarcas.push({
                        id: am.marcaId || (am as any).id,
                        nombre: am.marcaNombre || (am as any).nombre || 'Marca'
                    });
                }

                // 2. Get from assignedMarcas (plural array)
                const ams = assignment.assignedMarcas || (assignment as any).assignedBrands || (assignment as any).marcasAsignadas;
                if (ams && Array.isArray(ams)) {
                    ams.forEach((m: any) => {
                        const mid = m.marcaId || m.id || m.brandId;
                        if (mid && !loadedMarcas.some(lm => lm.id === mid)) {
                            loadedMarcas.push({
                                id: mid,
                                nombre: m.marcaNombre || m.nombre || m.brandName || mid
                            });
                        }
                    });
                }

                // 3. Get from top-level Fields
                const topMid = assignment.marcaId || (assignment as any).idMarca || (assignment as any).brandId || (assignment as any).brand_id;
                if (topMid && !loadedMarcas.some(lm => lm.id === topMid)) {
                    loadedMarcas.push({
                        id: topMid,
                        nombre: (assignment as any).marcaNombre || (assignment as any).nombreMarca || (assignment as any).brandName || topMid
                    });
                }

                // 4. Get from assignedStores (array)
                const aStores = assignment.assignedStores || (assignment as any).tiendasAsignadas;
                if (aStores && Array.isArray(aStores)) {
                    aStores.forEach((store: any) => {
                        if (store && typeof store !== 'string') {
                            const mid = store.marcaId || store.brandId || store.idMarca || store.brand_id;
                            if (mid && !loadedMarcas.some(lm => lm.id === mid)) {
                                loadedMarcas.push({
                                    id: mid,
                                    nombre: store.marcaNombre || store.nombreMarca || store.brandName || mid
                                });
                            }
                        }
                    });
                }

                // 5. Fallback for admins
                const role = claims?.role || assignment.role || '';
                const isAdmin = ['super_admin', 'admin', 'client_admin'].includes(role);
                const hasAnyAssignment = loadedMarcas.length > 0 || (aStores && aStores.length > 0) || assignment.tiendaId || (assignment as any).storeId || assignment.marcaId || assignment.assignedStore || assignment.assignedMarca;

                if (loadedMarcas.length === 0 && (isAdmin || hasAnyAssignment) && assignment.holdingId) {
                    loadedMarcas.push({ id: 'all_holding', nombre: 'Todas las Marcas (vía fallback)' });
                }

                setMarcas(loadedMarcas);
                
                if (assignment.holdingId) {
                    setHoldingId(assignment.holdingId);
                    try {
                        const hDoc = await getDoc(doc(db, 'holdings', assignment.holdingId));
                        if (hDoc.exists()) {
                            const data = hDoc.data();
                            if (data.nombre) setHoldingName(data.nombre);
                            const responsible = data.interviewResponsible || 'store_manager';
                            setEnableInterviews(responsible === 'recruiter');
                        }
                    } catch (e) {
                        console.error('Error loading holding config:', e);
                    }
                }
                
                if (assignment.assignedZones && Array.isArray(assignment.assignedZones)) {
                    setAssignedZones(assignment.assignedZones.map((z: any) => z.zoneId || z.id || z));
                }

                console.log('✅ Recruiter brands final selection:', loadedMarcas);
                setLoadingAssignment(false);
                setLoading(false);
            } catch (error) {
                console.error('Error loading assignment:', error);
                setLoadingAssignment(false);
                setLoading(false);
            }
        }
        loadAssignment();
    }, [user, claims?.role]);

    // 2. Separate Effect: Subscribe to RQs
    useEffect(() => {
        if (holdingId && marcas.length > 0) {
            const unsubscribe = subscribeToAllRQs(holdingId, (loadedRQs) => {
                const allowedMarcaIds = new Set(marcas.map(m => m.id));
                const allowedStoreIds = new Set(stores.map(s => s.id));
                
                const filtered = loadedRQs.filter(rq => {
                    const matchesMarca = allowedMarcaIds.has(rq.marcaId || '') || allowedMarcaIds.has('all_holding');
                    const matchesStore = allowedStoreIds.size === 0 || allowedStoreIds.has(rq.tiendaId || '');
                    return matchesMarca && matchesStore;
                });
                setAllRQs(filtered);
            });
            return () => unsubscribe();
        }
    }, [holdingId, marcas, stores]);

    useEffect(() => {
        if (marcas.length > 0) {
            loadData();
        }
    }, [marcas, selectedMarca]);

    useEffect(() => {
        applyFilters();
    }, [candidates, selectedStores, selectedPosition, selectedCULStatus, selectedDateFilter]);

    async function loadData() {
        if (marcas.length === 0) return;
        setLoading(true);
        try {
            // Determine which marcas to load
            const marcasToLoad = selectedMarca === 'all'
                ? marcas
                : marcas.filter(m => m.id === selectedMarca);

            // Load data for all selected marcas and combine
            const allCandidates: Candidate[] = [];
            const allPositions: Set<string> = new Set();
            const allStores: Array<{ id: string, nombre: string }> = [];

            for (const marca of marcasToLoad) {
                const [candidatesData, positionsData, storesData] = await Promise.all([
                    getCandidatesByMarca(marca.id),
                    getPositionsByMarca(marca.id),
                    getStoresByMarca(marca.id)
                ]);

                let filteredStoresData = storesData;
                if (assignedZones.length > 0) {
                    filteredStoresData = storesData.filter((s: any) => assignedZones.includes(s.zonaId));
                }
                const allowedStoreIds = new Set(filteredStoresData.map(s => s.id));

                let filteredCandidatesData = candidatesData;
                if (assignedZones.length > 0) {
                    filteredCandidatesData = candidatesData.filter(c => c.applications?.some(app => allowedStoreIds.has(app.tiendaId)));
                }

                allCandidates.push(...filteredCandidatesData);
                positionsData.forEach(p => allPositions.add(p));
                filteredStoresData.forEach(s => {
                    if (!allStores.some(existing => existing.id === s.id)) {
                        allStores.push(s as any);
                    }
                });
            }

            setCandidates(allCandidates);
            setFilteredCandidates(allCandidates);
            setPositions(Array.from(allPositions));
            setStores(allStores);
        } catch (error) {
            console.error('Error loading recruiter data:', error);
        } finally {
            setLoading(false);
        }
    }

    function applyFilters() {
        let filtered = [...candidates];

        // Filter by stores
        if (selectedStores.length > 0) {
            filtered = filtered.filter(c =>
                c.applications?.some(app => selectedStores.includes(app.tiendaId))
            );
        }

        // Filter by position
        if (selectedPosition) {
            filtered = filtered.filter(c =>
                c.applications?.some(app => app.posicion === selectedPosition)
            );
        }

        // Filter by CUL status
        if (selectedCULStatus) {
            filtered = filtered.filter(c => c.culStatus === selectedCULStatus);
        }

        // Filter by date
        if (selectedDateFilter !== 'todos') {
            filtered = filtered.filter(c => {
                const createdAt = c.createdAt?.toDate ? c.createdAt.toDate() : new Date(c.createdAt);
                const now = new Date();
                const diffDays = (now.getTime() - createdAt.getTime()) / (1000 * 3600 * 24);
                if (selectedDateFilter === 'semana' && diffDays > 7) return false;
                if (selectedDateFilter === 'mes' && diffDays > 30) return false;
                return true;
            });
        }
        // Removed hard exclusion of 'apto' so they appear in "Todos" list as requested.

        setFilteredCandidates(filtered);
    }

    function clearFilters() {
        setSelectedStores([]);
        setSelectedPosition('');
        setSelectedCULStatus('');
        setSelectedDateFilter('semana');
    }

    // Calculate stats
    const stats = {
        total: candidates.length,
        pending: candidates.filter(c =>
            c.applications?.some(app => app.status === 'completed')
        ).length,
        approved: candidates.filter(c =>
            c.applications?.some(app => app.status === 'approved')
        ).length,
        culAptos: candidates.filter(c => c.culStatus === 'apto').length,
        culNoAptos: candidates.filter(c => c.culStatus === 'no_apto').length,
        hired: candidates.filter(c =>
            c.applications?.some(app => app.hiredStatus === 'hired')
        ).length,
        notHired: candidates.filter(c =>
            c.applications?.some(app => app.hiredStatus === 'not_hired')
        ).length,
        pendingHire: candidates.filter(c =>
            c.culStatus === 'apto' && !c.applications?.some(app => app.hiredStatus)
        ).length,
        selected: candidates.filter(c => c.selectionStatus === 'selected').length
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto mb-4" />
                    <p className="text-gray-600">Cargando candidatos...</p>
                </div>
            </div>
        );
    }

    if (marcas.length === 0 && !loadingAssignment) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center max-w-md">
                    <div className="text-6xl mb-4">🏪</div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Sin Marcas Asignadas</h2>
                    <p className="text-gray-600 mb-6">
                        No hemos encontrado marcas asociadas a tu cuenta de Flow.
                        Si crees que esto es un error, contacta a tu administrador.
                    </p>
                    <button
                        onClick={() => router.push('/launcher')}
                        className="w-full py-3 px-4 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700 transition-colors mb-3"
                    >
                        Volver al Selector
                    </button>

                    <button
                        onClick={() => signOut()}
                        className="w-full py-3 px-4 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                    >
                        Cerrar Sesión
                    </button>

                    <div className="mt-8 pt-6 border-t border-gray-100 text-left">
                        <p className="text-[10px] uppercase font-bold text-gray-400 mb-2 tracking-widest">Diagnóstico para Soporte</p>
                        <div className="bg-gray-50 p-3 rounded-lg font-mono text-[10px] text-gray-500 space-y-1 overflow-hidden">
                            <p>Rol: {claims?.role || 'No detectado'}</p>
                            <p>Holding: {holdingId || 'No detectado'}</p>
                            <p>UID: {user?.uid.slice(0, 8)}...</p>
                            <p>Email: {user?.email}</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const sidebarItems = [
        { id: 'requerimientos', label: 'Requerimientos', icon: '📋' },
        { id: 'candidatos', label: 'Candidatos', icon: '👥' },
        { id: 'activacion', label: 'Exportar / SMS', icon: '📤' },
        { id: 'plantillas', label: 'Plantillas de Correo', icon: '📧' },
        { id: 'entrevistas', label: 'Entrevistas', icon: '📅', hidden: !enableInterviews },
        { id: 'analitica', label: 'Analítica', icon: '📊' },
        { id: 'configuracion', label: 'Configuración', icon: '⚙️', hidden: true },
    ];



    return (
        <DashboardLayout
            items={sidebarItems}
            activeTab={activeTab}
            onTabChange={(id) => setActiveTab(id as any)}
            title={activeTab.charAt(0).toUpperCase() + activeTab.slice(1).replace('requerimientos', 'Requerimientos').replace('plantillas', 'Plantillas')}
            marcaId={selectedMarca !== 'all' ? selectedMarca : undefined}
            marcaName={selectedMarca === 'all' ? holdingName : undefined}
            holdingSubtitle={selectedMarca === 'all' ? 'Portal Corporativo' : holdingName}
            onConfigClick={() => setActiveTab('configuracion')}
        >
            <div className="space-y-8 pb-20">
                {/* Multi-Brand Selector */}
                {marcas.length > 1 && (
                    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                                🏪 Filtrar Marca:
                            </label>
                            <select
                                value={selectedMarca}
                                onChange={(e) => setSelectedMarca(e.target.value)}
                                className="w-full sm:w-auto px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                            >
                                <option value="all">📊 Todas las Marcas ({marcas.length})</option>
                                {marcas.map(m => (
                                    <option key={m.id} value={m.id}>{m.nombre}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                {activeTab === 'candidatos' && (
                    <div className="space-y-8">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Total</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                            </div>
                            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                                <p className="text-[10px] font-black uppercase text-blue-400 tracking-widest mb-1">Aprobados</p>
                                <p className="text-2xl font-bold text-blue-600">{stats.approved}</p>
                            </div>
                            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                                <p className="text-[10px] font-black uppercase text-green-400 tracking-widest mb-1">CUL Aptos</p>
                                <p className="text-2xl font-bold text-green-600">{stats.culAptos}</p>
                            </div>
                            <div className="bg-white rounded-xl border border-emerald-200 p-4 shadow-sm">
                                <p className="text-[10px] font-black uppercase text-emerald-400 tracking-widest mb-1">Seleccion</p>
                                <p className="text-2xl font-bold text-emerald-600">{stats.selected}</p>
                            </div>
                        </div>

                        {/* Main Content */}
                        <div className="flex flex-col lg:flex-row gap-6">
                            {/* Filtros Sidebar */}
                            <div className="w-full lg:w-64 flex-shrink-0">
                                <FiltersSidebar
                                    stores={stores}
                                    positions={positions}
                                    selectedStores={selectedStores}
                                    setSelectedStores={setSelectedStores}
                                    selectedPosition={selectedPosition}
                                    setSelectedPosition={setSelectedPosition}
                                    selectedCULStatus={selectedCULStatus}
                                    setSelectedCULStatus={setSelectedCULStatus}
                                    selectedDateFilter={selectedDateFilter}
                                    setSelectedDateFilter={setSelectedDateFilter}
                                    onClearFilters={clearFilters}
                                />
                            </div>

                            {/* Candidates List */}
                            <div className="flex-1 overflow-hidden">
                                <RecruiterCandidatesView
                                    candidates={filteredCandidates}
                                    onRefresh={loadData}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'activacion' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-8">
                        <CandidateActivationPanel 
                            candidates={candidates} 
                            allowedMarcaIds={marcas.map(m => m.id)}
                        />
                    </div>
                )}

                {activeTab === 'plantillas' && (
                    <div className="space-y-6">
                        <EmailTemplatesConfig holdingId={holdingId} />
                    </div>
                )}

                {enableInterviews && activeTab === 'entrevistas' && (
                    <div className="space-y-6">
                        <h2 className="text-lg font-bold text-gray-900">📅 Entrevistas Agendadas</h2>
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-6">
                            <InterviewAgenda
                                marcaIds={selectedMarca !== 'all' ? [selectedMarca] : marcas.map(m => m.id)}
                                allowedStoreIds={assignedZones.length > 0 ? stores.map(s => s.id) : undefined}
                                holdingId={holdingId}
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'requerimientos' && (
                    <div className="space-y-6">
                        {/* Consolidado Summary */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="flex-1 h-[1px] bg-slate-200"></span>
                                <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] whitespace-nowrap">
                                    Resumen de Vacantes Aprobadas
                                </h3>
                                <span className="flex-1 h-[1px] bg-slate-200"></span>
                            </div>
                            <ApprovedRQSummary 
                                rqs={allRQs} 
                                showMarca={selectedMarca === 'all'} 
                                showTienda={true} 
                            />
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-6 overflow-hidden">
                            <RQTrackingView
                                holdingId={holdingId}
                                marcas={marcas}
                                allowedStoreIds={assignedZones.length > 0 ? stores.map(s => s.id) : undefined}
                                selectedMarcaId={selectedMarca}
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'analitica' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-4 md:p-6">
                            <UnifiedAnalytics
                                holdingId={holdingId}
                                marcas={marcas}
                                hasExitAnalytics={true}
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'configuracion' && (
                    <div className="space-y-8">
                        {holdingId && <EmailTemplatesConfig holdingId={holdingId} />}
                        <ConfigurationView />
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
