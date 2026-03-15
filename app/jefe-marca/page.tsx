'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserAssignment } from '@/lib/firestore/user-assignments';
import type { UserAssignment } from '@/lib/firestore/user-assignments';
import MarcaStatsCards from '@/components/jefe-marca/MarcaStatsCards';
import MarcaPendingRQsView from '@/components/jefe-marca/MarcaPendingRQsView';
import MarcaApprovedRQsView from '@/components/jefe-marca/MarcaApprovedRQsView';
import DashboardHeader from '@/components/DashboardHeader';
import CandidatesListView from '@/components/CandidatesListView';
import ConfigurationView from '@/components/ConfigurationView';
import CompensacionesTab from '@/components/talent/CompensacionesTab';
import DashboardLayout from '@/components/layouts/DashboardLayout';

export default function JefeMarcaDashboard() {
    const { user, claims, signOut } = useAuth();
    const [assignment, setAssignment] = useState<UserAssignment | null>(null);
    const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'candidates' | 'compensaciones' | 'configuracion'>('pending');
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

    if (!assignment || assignment.role !== 'jefe_marca') {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Acceso Denegado</h2>
                    <p className="text-gray-600 mb-6">No tienes permisos de Jefe de Marca.</p>
                    <button
                        onClick={signOut}
                        className="w-full py-3 px-4 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700 transition-colors"
                    >
                        Cerrar Sesión
                    </button>
                </div>
            </div>
        );
    }

    const marcaId = assignment.assignedMarca?.marcaId || '';
    const marcaNombre = assignment.assignedMarca?.marcaNombre || '';

    const sidebarItems = [
        { id: 'pending', label: 'Pendientes', icon: '⏳' },
        { id: 'approved', label: 'Aprobados', icon: '✅' },
        { id: 'candidates', label: 'Candidatos', icon: '👥' },
        { id: 'compensaciones', label: 'Compensas', icon: '📑' },
        { id: 'configuracion', label: 'Config', icon: '⚙️', hidden: true },
    ];

    return (
        <DashboardLayout
            items={sidebarItems}
            activeTab={activeTab}
            onTabChange={(id) => setActiveTab(id as any)}
            title="Dashboard Jefe de Marca"
            subtitle={`${assignment.displayName}`}
            holdingId={assignment.holdingId}
            marcaId={marcaId}
            marcaName={marcaNombre}
            onConfigClick={() => setActiveTab('configuracion')}
        >
            <div className="space-y-12">
                {/* Stats Cards - Hide if in config */}
                {activeTab !== 'configuracion' && <MarcaStatsCards marcaId={marcaId} />}

                {/* Content */}
                <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                    <div className="p-4 md:p-8">
                        {activeTab === 'pending' && (
                            <MarcaPendingRQsView
                                marcaId={marcaId}
                                jefeId={user?.uid || ''}
                                jefeNombre={assignment.displayName}
                            />
                        )}
                        {activeTab === 'approved' && (
                            <MarcaApprovedRQsView marcaId={marcaId} />
                        )}
                        {activeTab === 'candidates' && (
                            <div className="space-y-6">
                                <CandidatesListView marcaId={marcaId} />
                            </div>
                        )}
                        {activeTab === 'compensaciones' && (
                            <div className="bg-white rounded-2xl">
                                <CompensacionesTab
                                    holdingId={assignment.holdingId}
                                    marcaId={marcaId}
                                />
                            </div>
                        )}
                        {activeTab === 'configuracion' && (
                            <div className="space-y-8">
                                <ConfigurationView />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
