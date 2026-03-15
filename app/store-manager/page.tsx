'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRQs } from '@/lib/hooks/useRQs';
import { getUserAssignment } from '@/lib/firestore/user-assignments';
import type { UserAssignment } from '@/lib/firestore/user-assignments';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import CreateRQModal from '@/components/CreateRQModal';
import InviteCandidateModal from '@/components/InviteCandidateModal';
import RQListView from '@/components/RQListView';
import CandidatesListView from '@/components/CandidatesListView';
import CandidatosAptosView from '@/components/CandidatosAptosView';
import ConfigurationView from '@/components/ConfigurationView';
import DashboardHeader from '@/components/DashboardHeader';
import ReportarBajaModal from '@/components/talent/ReportarBajaModal';
import StoreScheduleConfig from '@/components/store-manager/StoreScheduleConfig';
import InterviewAgenda from '@/components/store-manager/InterviewAgenda';
import SidebarNav from '@/components/SidebarNav';
import DashboardLayout from '@/components/layouts/DashboardLayout';

export default function StoreManagerDashboard() {
    const { user, claims, signOut } = useAuth();
    const [isMobile, setIsMobile] = useState(true);

    useEffect(() => {
        const check = () => typeof window !== 'undefined' && setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    const [assignment, setAssignment] = useState<UserAssignment | null>(null);
    const [marcaNombre, setMarcaNombre] = useState<string>('');
    const [isRQLocked, setIsRQLocked] = useState(false);
    const [loadingAssignment, setLoadingAssignment] = useState(true);
    const [showCreateRQModal, setShowCreateRQModal] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [showBajaModal, setShowBajaModal] = useState(false);
    const [activeTab, setActiveTab] = useState<'rqs' | 'entrevistas' | 'selection' | 'aptos' | 'bajas' | 'horarios' | 'configuracion'>('rqs');
    const [enableInterviews, setEnableInterviews] = useState(true);
    const [holdingInfo, setHoldingInfo] = useState<{ nombre: string; logo?: string } | null>(null);

    // Load user assignment to get assigned store
    useEffect(() => {
        let isMounted = true;
        console.log('[StoreManager] 🚀 Starting loadAssignment effect');

        // Safety timeout: if it takes more than 10 seconds, force stop loading
        const safetyTimeout = setTimeout(() => {
            if (isMounted && loadingAssignment) {
                console.warn('[StoreManager] ⚠️ Safety timeout triggered! Forcing loading to stop.');
                setLoadingAssignment(false);
            }
        }, 10000);

        async function loadAssignment() {
            if (!user) {
                console.log('[StoreManager] ℹ️ No user yet, skipping loadAssignment');
                return;
            }

            console.log('[StoreManager] 🔍 Loading assignment for user:', user.uid);
            try {
                const userAssignment = await getUserAssignment(user.uid);
                console.log('[StoreManager] ✅ User assignment loaded:', userAssignment ? 'FOUND' : 'NOT FOUND');

                if (isMounted) setAssignment(userAssignment);

                // Fetch marca name if we have a marcaId
                if (userAssignment?.assignedStore?.marcaId) {
                    console.log('[StoreManager] 🏷️ Fetching brand info for ID:', userAssignment.assignedStore.marcaId);
                    const marcaDoc = await getDoc(doc(db, 'marcas', userAssignment.assignedStore.marcaId));
                    if (marcaDoc.exists()) {
                        const mData = marcaDoc.data();
                        console.log('[StoreManager] ✅ Brand found:', mData.nombre);
                        if (isMounted) setMarcaNombre(mData.nombre || 'Sin Marca');
                    } else {
                        console.warn('[StoreManager] ⚠️ Brand document NOT FOUND');
                    }
                }

                // Check for global RQ lock and interview config
                if (userAssignment?.holdingId) {
                    console.log('[StoreManager] 🏢 Fetching holding info for ID:', userAssignment.holdingId);
                    const holdingDoc = await getDoc(doc(db, 'holdings', userAssignment.holdingId));
                    if (holdingDoc.exists()) {
                        const hData = holdingDoc.data();
                        console.log('[StoreManager] ✅ Holding found, blockRQ:', hData.blockRQCreation);
                        if (isMounted) setIsRQLocked(hData.blockRQCreation || false);
                        if (isMounted) setHoldingInfo({ nombre: hData.nombre, logo: hData.logo });
                        const responsible = hData.interviewResponsible || 'store_manager';
                        if (isMounted) setEnableInterviews(responsible === 'store_manager');
                    } else {
                        console.warn('[StoreManager] ⚠️ Holding document NOT FOUND');
                    }
                }
            } catch (error) {
                console.error('[StoreManager] ❌ Error loading assignment:', error);
            } finally {
                console.log('[StoreManager] 🏁 Finishing loadAssignment, setting loadingAssignment to false');
                if (isMounted) setLoadingAssignment(false);
                clearTimeout(safetyTimeout);
            }
        }
        loadAssignment();

        return () => {
            isMounted = false;
            clearTimeout(safetyTimeout);
        };
    }, [user]);

    // Get store info from assignment
    const STORE_ID = assignment?.assignedStore?.tiendaId || '';
    const STORE_NAME = assignment?.assignedStore?.tiendaNombre || 'Mi Tienda';
    const MARCA_ID = assignment?.assignedStore?.marcaId || '';

    // Hook de RQs (scope: store)
    const {
        rqs,
        loading,
        stats,
        deleteDirectly,
        startRecruiting,
        finalize
    } = useRQs({
        scope: 'store',
        storeId: STORE_ID
    });

    const userRole = claims?.role || '';

    const handleCreateRQSuccess = () => {
        // RQs se actualizarán automáticamente por el listener en tiempo real
    };

    // Loading state
    if (loadingAssignment) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Cargando...</p>
                </div>
            </div>
        );
    }

    // Access denied if no store assigned
    if (!assignment || !assignment.assignedStore) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">⚠️ Sin Tienda Asignada</h2>
                    <p className="text-gray-600 mb-4">No tienes una tienda asignada. Contacta a tu administrador.</p>
                    <button
                        onClick={signOut}
                        className="px-6 py-2 bg-violet-600 text-white rounded-lg font-semibold hover:bg-violet-700"
                    >
                        Cerrar Sesión
                    </button>
                </div>
            </div>
        );
    }

    const sidebarItems = [
        { id: 'rqs', label: 'RQs Pendientes', icon: '📋', badge: stats.total > 0 ? stats.total : undefined },
        { id: 'entrevistas', label: 'Entrevistas', icon: '📅', hidden: !enableInterviews },
        { id: 'selection', label: 'Selección', icon: '🎯' },
        { id: 'aptos', label: 'Pre-Ingreso', icon: '⏳' },
        { id: 'bajas', label: 'Bajas', icon: '📤' },
        { id: 'horarios', label: 'Horarios', icon: '🕒' },
        { id: 'configuracion', label: 'Configuración', icon: '⚙️', hidden: true },
    ];



    return (
        <DashboardLayout
            items={sidebarItems}
            activeTab={activeTab}
            onTabChange={(id) => setActiveTab(id as any)}
            title={activeTab.charAt(0).toUpperCase() + activeTab.slice(1).replace('rqs', 'Requerimientos').replace('aptos', 'Personal Apto')}
            subtitle="Gerente de Tienda"
            holdingId={assignment?.holdingId}
            holdingName={STORE_NAME}
            holdingSubtitle={holdingInfo?.nombre}
            marcaId={MARCA_ID}
            marcaName={marcaNombre}
            storeId={STORE_ID}
            onConfigClick={() => setActiveTab('configuracion')}
        >
            <div className="space-y-10">
                {/* Lock Notice Banner */}
                {isRQLocked && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl">
                        <div className="px-6 py-4 flex items-center gap-3 text-amber-800">
                            <span className="text-xl">🔒</span>
                            <div>
                                <p className="font-semibold text-sm">Creación de RQs deshabilitada temporalmente</p>
                                <p className="text-xs">El administrador ha bloqueado la creación de nuevos requerimientos.</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Action Buttons Bar */}
                <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 flex-shrink-0">
                            <span className="text-xl">⚡</span>
                        </div>
                        <div>
                            <p className="text-sm font-black text-gray-900 uppercase tracking-tight">Acciones Rápidas</p>
                            <p className="text-xs text-gray-500">Gestión inmediata</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 md:flex items-center gap-2 md:gap-3 w-full sm:w-auto">
                        <button
                            onClick={() => setShowInviteModal(true)}
                            className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] md:text-xs font-bold hover:bg-slate-800 transition-all shadow-lg flex items-center justify-center gap-2"
                        >
                            <span>➕</span> Invitar
                        </button>
                        {!isRQLocked && (
                            <button
                                onClick={() => setShowCreateRQModal(true)}
                                className="px-4 py-2.5 gradient-bg text-white rounded-xl text-[10px] md:text-xs font-bold hover:opacity-90 transition-all shadow-lg flex items-center justify-center gap-2"
                            >
                                <span>📋</span> Crear RQ
                            </button>
                        )}
                        <button
                            onClick={() => setShowBajaModal(true)}
                            className="col-span-2 md:col-span-1 px-4 py-2.5 bg-red-500 text-white rounded-xl text-[10px] md:text-xs font-bold hover:bg-red-600 transition-all shadow-lg flex items-center justify-center gap-2"
                        >
                            <span>📤</span> Reportar Baja
                        </button>
                    </div>
                </div>

                <div className="space-y-12 pb-20">
                    {activeTab === 'rqs' && (
                        <div className="space-y-6">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <span className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center text-sm">📋</span>
                                Mis Requerimientos
                            </h2>
                            {loading ? (
                                <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600 mx-auto mb-4"></div>
                                    <p className="text-gray-500 text-sm font-medium">Cargando...</p>
                                </div>
                            ) : (
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                                    <RQListView
                                        rqs={rqs}
                                        userRole={userRole}
                                        pendingCount={stats.pending}
                                        unfilledCount={stats.unfilled}
                                        onDelete={(rqId, reason) => {
                                            if (confirm('¿Eliminar este RQ?')) {
                                                deleteDirectly(rqId, reason);
                                            }
                                        }}
                                        onStartRecruitment={startRecruiting}
                                        onFinalize={finalize}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {enableInterviews && activeTab === 'entrevistas' && (
                        <div className="space-y-6">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <span className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center text-sm">📅</span>
                                Entrevistas
                            </h2>
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-6">
                                <InterviewAgenda storeId={STORE_ID} holdingId={assignment?.holdingId} />
                            </div>
                        </div>
                    )}

                    {activeTab === 'selection' && (
                        <div className="space-y-6">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <span className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center text-sm">🎯</span>
                                Selección
                            </h2>
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-6 overflow-hidden">
                                <CandidatesListView storeId={STORE_ID} />
                            </div>
                        </div>
                    )}

                    {activeTab === 'aptos' && (
                        <div className="space-y-6">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <span className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center text-sm">⏳</span>
                                Pre-Ingreso
                            </h2>
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-6 overflow-hidden">
                                <CandidatosAptosView storeId={STORE_ID} marcaId={MARCA_ID} />
                            </div>
                        </div>
                    )}

                    {activeTab === 'bajas' && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 flex-shrink-0">
                                    <span className="text-2xl">📤</span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">Reporte de Bajas</h3>
                                    <p className="text-sm text-gray-500">Gestión de salidas de personal.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowBajaModal(true)}
                                className="w-full md:w-auto px-8 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg"
                            >
                                Reportar Nueva Baja
                            </button>
                        </div>
                    )}

                    {activeTab === 'horarios' && <StoreScheduleConfig storeId={STORE_ID} />}

                    {activeTab === 'configuracion' && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                            <ConfigurationView />
                        </div>
                    )}
                </div>

                <CreateRQModal
                    isOpen={showCreateRQModal}
                    onClose={() => setShowCreateRQModal(false)}
                    onSuccess={handleCreateRQSuccess}
                    storeId={STORE_ID}
                    storeName={STORE_NAME}
                    marcaId={MARCA_ID}
                    marcaNombre={marcaNombre}
                    isLocked={isRQLocked}
                />

                <InviteCandidateModal
                    isOpen={showInviteModal}
                    onClose={() => setShowInviteModal(false)}
                    storeId={STORE_ID}
                    storeName={STORE_NAME}
                    marcaId={MARCA_ID}
                    marcaNombre={marcaNombre}
                    userRole={userRole}
                />

                <ReportarBajaModal
                    isOpen={showBajaModal}
                    onClose={() => setShowBajaModal(false)}
                    holdingId={assignment?.holdingId || 'ngr'}
                    storeId={STORE_ID}
                    storeName={STORE_NAME}
                    marcaId={MARCA_ID}
                    marcaNombre={marcaNombre}
                />
            </div>
        </DashboardLayout>
    );
}
