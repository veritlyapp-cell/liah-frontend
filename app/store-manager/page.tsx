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

export default function StoreManagerDashboard() {
    const { user, claims, signOut } = useAuth();
    const [assignment, setAssignment] = useState<UserAssignment | null>(null);
    const [marcaNombre, setMarcaNombre] = useState<string>('');
    const [isRQLocked, setIsRQLocked] = useState(false);
    const [loadingAssignment, setLoadingAssignment] = useState(true);
    const [showCreateRQModal, setShowCreateRQModal] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [activeTab, setActiveTab] = useState<'rqs' | 'candidates' | 'entrevistas' | 'aptos' | 'configuracion'>('rqs');

    // Load user assignment to get assigned store
    useEffect(() => {
        async function loadAssignment() {
            if (!user) return;
            try {
                const userAssignment = await getUserAssignment(user.uid);
                setAssignment(userAssignment);

                // Fetch marca name if we have a marcaId
                if (userAssignment?.assignedStore?.marcaId) {
                    const marcaDoc = await getDoc(doc(db, 'marcas', userAssignment.assignedStore.marcaId));
                    if (marcaDoc.exists()) {
                        setMarcaNombre(marcaDoc.data().nombre || 'Sin Marca');
                    }
                }

                // Check for global RQ lock
                if (userAssignment?.holdingId) {
                    const holdingDoc = await getDoc(doc(db, 'holdings', userAssignment.holdingId));
                    if (holdingDoc.exists()) {
                        setIsRQLocked(holdingDoc.data().blockRQCreation || false);
                        console.log('🔒 RQ Creation Lock state:', holdingDoc.data().blockRQCreation);
                    }
                }
            } catch (error) {
                console.error('Error loading assignment:', error);
            } finally {
                setLoadingAssignment(false);
            }
        }
        loadAssignment();
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
                subtitle="Store Manager Dashboard"
                holdingId={assignment?.holdingId}
                marcaId={MARCA_ID}
                marcaName={marcaNombre}
            />

            {/* Action Buttons Bar */}
            <div className="bg-white border-b border-gray-200 px-4 py-2">
                <div className="max-w-7xl mx-auto flex items-center justify-end gap-3">
                    <button
                        onClick={() => setShowInviteModal(true)}
                        className="px-3 py-1.5 bg-cyan-600 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                    >
                        ➕ Invitar Candidato
                    </button>
                    {!isRQLocked && (
                        <button
                            onClick={() => setShowCreateRQModal(true)}
                            className="px-3 py-1.5 gradient-bg text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                        >
                            📋 Crear RQ
                        </button>
                    )}
                </div>
            </div>

            {/* Lock Notice Banner */}
            {isRQLocked && (
                <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
                    <div className="max-w-7xl mx-auto flex items-center gap-3 text-amber-800">
                        <span className="text-xl">🔒</span>
                        <div>
                            <p className="font-semibold">Creación de RQs deshabilitada temporalmente</p>
                            <p className="text-sm">El administrador ha bloqueado la creación de nuevos requerimientos. Contacta a soporte para más información.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Navigation Tabs */}
            <div className="bg-white border-b border-gray-200 px-4">
                <div className="flex gap-4">
                    <button
                        onClick={() => setActiveTab('rqs')}
                        className={`px-4 py-3 font-medium transition-colors border-b-2 ${activeTab === 'rqs'
                            ? 'border-violet-600 text-violet-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        📋 Mis Requerimientos
                        {stats.total > 0 && (
                            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${activeTab === 'rqs' ? 'bg-violet-100' : 'bg-gray-100'
                                }`}>
                                {stats.total}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('candidates')}
                        className={`px-4 py-3 font-medium transition-colors border-b-2 ${activeTab === 'candidates'
                            ? 'border-violet-600 text-violet-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        👥 Candidatos
                    </button>
                    <button
                        onClick={() => setActiveTab('entrevistas')}
                        className={`px-4 py-3 font-medium transition-colors border-b-2 ${activeTab === 'entrevistas'
                            ? 'border-violet-600 text-violet-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <span className="flex items-center gap-2">
                            📅 Entrevistas
                            {/* Optional: Add count badge if available */}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('aptos')}
                        className={`px-4 py-3 font-medium transition-colors border-b-2 ${activeTab === 'aptos'
                            ? 'border-violet-600 text-violet-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <span className="flex items-center gap-2">
                            Candidatos Seleccionados
                            <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800">
                                Para Ingreso
                            </span>
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('configuracion')}
                        className={`px-4 py-3 font-medium transition-colors border-b-2 ${activeTab === 'configuracion'
                            ? 'border-violet-600 text-violet-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        ⚙️ Configuración
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="p-4">
                {activeTab === 'rqs' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-gray-900">Mis Requerimientos</h2>
                        </div>

                        {loading ? (
                            <div className="text-center py-12">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto mb-4"></div>
                                <p className="text-gray-500">Cargando requerimientos...</p>
                            </div>
                        ) : (
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
                        )}
                    </div>
                )}

                {activeTab === 'candidates' && (
                    <div>
                        <CandidatesListView
                            storeId={STORE_ID}
                        // No filter, changes show default pending
                        />
                    </div>
                )}

                {activeTab === 'entrevistas' && (
                    <div>
                        <div className="mb-4 bg-purple-50 p-4 rounded-lg border border-purple-100 flex items-center gap-3">
                            <span className="text-2xl">📅</span>
                            <div>
                                <h3 className="font-semibold text-purple-900">Agenda de Entrevistas</h3>
                                <p className="text-sm text-purple-700">Aquí verás a los candidatos que el Bot ha agendado automáticamente.</p>
                            </div>
                        </div>
                        <CandidatesListView
                            storeId={STORE_ID}
                            filterStatus="interview_scheduled"
                        />
                    </div>
                )}

                {activeTab === 'aptos' && (
                    <div>
                        <CandidatosAptosView storeId={STORE_ID} marcaId={MARCA_ID} />
                    </div>
                )}

                {activeTab === 'configuracion' && (
                    <ConfigurationView />
                )}
            </div>

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
            />
        </div>
    );
}
