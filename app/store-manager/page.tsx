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

export default function StoreManagerDashboard() {
    const { user, claims, signOut } = useAuth();
    const [assignment, setAssignment] = useState<UserAssignment | null>(null);
    const [marcaNombre, setMarcaNombre] = useState<string>('');
    const [isRQLocked, setIsRQLocked] = useState(false);
    const [loadingAssignment, setLoadingAssignment] = useState(true);
    const [showCreateRQModal, setShowCreateRQModal] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [showBajaModal, setShowBajaModal] = useState(false);
    const [activeTab, setActiveTab] = useState<'rqs' | 'selection' | 'aptos' | 'bajas' | 'configuracion'>('rqs');

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

                // Check for global RQ lock
                if (userAssignment?.holdingId) {
                    console.log('[StoreManager] 🏢 Fetching holding info for ID:', userAssignment.holdingId);
                    const holdingDoc = await getDoc(doc(db, 'holdings', userAssignment.holdingId));
                    if (holdingDoc.exists()) {
                        const hData = holdingDoc.data();
                        console.log('[StoreManager] ✅ Holding found, blockRQ:', hData.blockRQCreation);
                        if (isMounted) setIsRQLocked(hData.blockRQCreation || false);
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

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Unified Header */}
            <DashboardHeader
                title={STORE_NAME}
                subtitle="Gerente de Tienda"
                holdingId={assignment?.holdingId}
                marcaId={MARCA_ID}
                marcaName={marcaNombre}
                storeId={STORE_ID}
                onConfigClick={() => setActiveTab('configuracion')}
            />

            {/* Lock Notice Banner */}
            {isRQLocked && (
                <div className="bg-amber-50 border-b border-amber-200">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3 text-amber-800">
                        <span className="text-xl">🔒</span>
                        <div>
                            <p className="font-semibold">Creación de RQs deshabilitada temporalmente</p>
                            <p className="text-sm">El administrador ha bloqueado la creación de nuevos requerimientos. Contacta a soporte para más información.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Navigation Tabs */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex gap-4">
                        <button
                            onClick={() => setActiveTab('rqs')}
                            className={`px-4 py-3 font-medium transition-colors border-b-2 ${activeTab === 'rqs'
                                ? 'border-violet-600 text-violet-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            📋 RQs Pendientes
                            {stats.total > 0 && (
                                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${activeTab === 'rqs' ? 'bg-violet-100' : 'bg-gray-100'
                                    }`}>
                                    {stats.total}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('selection')}
                            className={`px-4 py-3 font-medium transition-colors border-b-2 ${activeTab === 'selection'
                                ? 'border-violet-600 text-violet-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            🎯 Selección
                        </button>
                        <button
                            onClick={() => setActiveTab('aptos')}
                            className={`px-4 py-3 font-medium transition-colors border-b-2 ${activeTab === 'aptos'
                                ? 'border-violet-600 text-violet-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <span className="flex items-center gap-2">
                                ⏳ Pre-Ingreso (Aptos)
                                <span className="px-2 py-0.5 rounded-full text-[10px] bg-green-100 text-green-800 font-bold">
                                    CONTROL
                                </span>
                            </span>
                        </button>
                        <button
                            onClick={() => setActiveTab('bajas')}
                            className={`px-4 py-3 font-medium transition-colors border-b-2 ${activeTab === 'bajas'
                                ? 'border-violet-600 text-violet-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            📤 Bajas
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Container */}
            <main className="container-main py-20 space-y-12">
                {/* Action Buttons Bar */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        <span className="text-sm font-medium text-gray-600">Acciones Directas</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowInviteModal(true)}
                            className="px-4 py-2 bg-cyan-600 text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity shadow-sm"
                        >
                            ➕ Invitar Candidato
                        </button>
                        {!isRQLocked && (
                            <button
                                onClick={() => setShowCreateRQModal(true)}
                                className="px-4 py-2 gradient-bg text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity shadow-sm"
                            >
                                📋 Crear RQ
                            </button>
                        )}
                        <button
                            onClick={() => setShowBajaModal(true)}
                            className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-colors shadow-sm"
                        >
                            📤 Reportar Baja
                        </button>
                    </div>
                </div>

                <div className="space-y-8">
                    {activeTab === 'rqs' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-gray-900">📋 Mis Requerimientos Activos</h2>
                            </div>

                            {loading ? (
                                <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto mb-4"></div>
                                    <p className="text-gray-500 font-medium">Cargando requerimientos...</p>
                                </div>
                            ) : (
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                                    <RQListView
                                        rqs={rqs}
                                        userRole={userRole}
                                        pendingCount={stats.pending}
                                        unfilledCount={stats.unfilled}
                                        onDelete={(rqId, reason) => {
                                            if (confirm('¿Eliminar este RQ? Esta acción no se puede deshacer.')) {
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

                    {activeTab === 'selection' && (
                        <div className="space-y-6">
                            <div className="flex gap-4 mb-4 border-b border-gray-100">
                                <h2 className="text-xl font-bold text-gray-900 pb-2">🎯 Proceso de Selección</h2>
                            </div>

                            {/* Candidates and Interviews grouped under Selection */}
                            <div className="grid grid-cols-1 gap-8">
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                        <span>👥</span> Candidatos Disponibles
                                    </h3>
                                    <CandidatesListView storeId={STORE_ID} />
                                </div>

                                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                        <span>📅</span> Entrevistas Agendadas (Bot)
                                    </h3>
                                    <CandidatesListView
                                        storeId={STORE_ID}
                                        filterStatus="interview_scheduled"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'aptos' && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold text-gray-900">⏳ Control de Ingresos (Aptos)</h2>
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                                <CandidatosAptosView storeId={STORE_ID} marcaId={MARCA_ID} />
                            </div>
                        </div>
                    )}

                    {activeTab === 'bajas' && (
                        <div className="space-y-6">
                            <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-red-900">
                                <div className="flex items-center gap-4 mb-4">
                                    <span className="text-3xl">📤</span>
                                    <div>
                                        <h3 className="font-bold text-lg">Reporte de Bajas y T-Registro</h3>
                                        <p className="text-sm opacity-80">Registra las salidas de personal para automatizar el cumplimiento legal y la encuesta de salida neutral.</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowBajaModal(true)}
                                    className="px-6 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors shadow-sm"
                                >
                                    Reportar Nueva Baja
                                </button>
                            </div>

                            {/* History or list of recently reported bajas could go here */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
                                <p className="text-gray-500 italic text-sm">El historial de bajas procesadas se encuentra en el portal de Compensaciones.</p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'configuracion' && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                            <ConfigurationView />
                        </div>
                    )}
                </div>
            </main>

            {/* Modals */}
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
        </div >
    );
}
