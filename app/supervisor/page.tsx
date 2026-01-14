'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserAssignment } from '@/lib/firestore/user-assignments';
import type { UserAssignment } from '@/lib/firestore/user-assignments';
import SupervisorStatsCards from '@/components/supervisor/SupervisorStatsCards';
import PendingRQsView from '@/components/supervisor/PendingRQsView';
import ApprovedRQsView from '@/components/supervisor/ApprovedRQsView';
import SupervisorCreateRQView from '@/components/supervisor/SupervisorCreateRQView';
import ConfigurationView from '@/components/ConfigurationView';
import DashboardHeader from '@/components/DashboardHeader';
import CandidatesListView from '@/components/CandidatesListView';

export default function SupervisorDashboard() {
    const { user } = useAuth();
    const [assignment, setAssignment] = useState<UserAssignment | null>(null);
    const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'create' | 'candidates' | 'configuracion'>('pending');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadAssignment() {
            if (!user) return;

            try {
                const userAssignment = await getUserAssignment(user.uid);
                setAssignment(userAssignment);
            } catch (error) {
                console.error('Error loading assignment:', error);
            } finally {
                setLoading(false);
            }
        }

        loadAssignment();
    }, [user]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Cargando...</p>
                </div>
            </div>
        );
    }

    if (!assignment || assignment.role !== 'supervisor') {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Acceso Denegado</h2>
                    <p className="text-gray-600">No tienes permisos de Supervisor.</p>
                </div>
            </div>
        );
    }

    const assignedStoreIds = assignment.assignedStores?.map(s => s.tiendaId) || [];
    const assignedStoreNames = assignment.assignedStores?.map(s => s.tiendaNombre) || [];
    const firstMarcaId = assignment.assignedStores?.[0]?.marcaId || '';

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Unified Header */}
            <DashboardHeader
                title="Dashboard Supervisor"
                subtitle={`${assignment.displayName} • ${assignment.assignedStores?.length || 0} tiendas asignadas`}
                holdingId={assignment.holdingId}
                marcaId={firstMarcaId}
                onConfigClick={() => setActiveTab('configuracion')}
            />

            {/* Content Container */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Stats Cards - Hide if in config */}
                {activeTab !== 'configuracion' && <SupervisorStatsCards storeIds={assignedStoreIds} />}

                {/* Tabs */}
                <div className="bg-white rounded-lg shadow-lg overflow-hidden mt-8">
                    <div className="border-b border-gray-200">
                        <nav className="flex -mb-px">
                            <button
                                onClick={() => setActiveTab('pending')}
                                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'pending'
                                    ? 'border-violet-600 text-violet-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                ⏳ RQs Pendientes
                            </button>
                            <button
                                onClick={() => setActiveTab('approved')}
                                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'approved'
                                    ? 'border-violet-600 text-violet-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                ✅ RQs Aprobados
                            </button>
                            <button
                                onClick={() => setActiveTab('create')}
                                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'create'
                                    ? 'border-violet-600 text-violet-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                ➕ Crear RQ
                            </button>
                            <button
                                onClick={() => setActiveTab('candidates')}
                                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'candidates'
                                    ? 'border-violet-600 text-violet-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                👥 Candidatos
                            </button>
                        </nav>
                    </div>

                    <div className="p-6">
                        {activeTab === 'pending' && (
                            <PendingRQsView
                                storeIds={assignedStoreIds}
                                storeNames={assignedStoreNames}
                                supervisorId={user?.uid || ''}
                                supervisorName={assignment.displayName}
                            />
                        )}
                        {activeTab === 'approved' && (
                            <ApprovedRQsView
                                storeIds={assignedStoreIds}
                                storeNames={assignedStoreNames}
                            />
                        )}
                        {activeTab === 'create' && assignment && (
                            <SupervisorCreateRQView
                                supervisorId={user?.uid || ''}
                                supervisorName={assignment.displayName}
                                assignedStores={assignment.assignedStores || []}
                                holdingId={assignment.holdingId}
                            />
                        )}
                        {activeTab === 'candidates' && (
                            <div className="space-y-6">
                                <CandidatesListView storeIds={assignedStoreIds} />
                            </div>
                        )}
                        {activeTab === 'configuracion' && (
                            <ConfigurationView />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
