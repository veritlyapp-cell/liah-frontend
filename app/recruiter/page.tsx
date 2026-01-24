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

export default function RecruiterDashboard() {
    const { user } = useAuth();
    const router = useRouter();
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [filteredCandidates, setFilteredCandidates] = useState<Candidate[]>([]);
    const [loading, setLoading] = useState(true);
    const [positions, setPositions] = useState<string[]>([]);
    const [stores, setStores] = useState<Array<{ id: string, nombre: string }>>([]);

    // Filters state
    const [selectedStores, setSelectedStores] = useState<string[]>([]);
    const [selectedPosition, setSelectedPosition] = useState<string>('');
    const [selectedCULStatus, setSelectedCULStatus] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'candidatos' | 'requerimientos' | 'analitica' | 'configuracion'>('requerimientos');

    // Marcas from user assignment (can be multiple)
    const [marcas, setMarcas] = useState<{ id: string; nombre: string }[]>([]);
    const [selectedMarca, setSelectedMarca] = useState<string>('all');
    const [loadingAssignment, setLoadingAssignment] = useState(true);
    const [holdingId, setHoldingId] = useState<string>('');

    // Load user assignment to get marcas
    useEffect(() => {
        async function loadAssignment() {
            if (!user) return;
            try {
                const { getUserAssignment } = await import('@/lib/firestore/user-assignments');
                const assignment = await getUserAssignment(user.uid);

                const loadedMarcas: { id: string; nombre: string }[] = [];

                // Get from assignedMarca (primary)
                if (assignment?.assignedMarca?.marcaId) {
                    loadedMarcas.push({
                        id: assignment.assignedMarca.marcaId,
                        nombre: assignment.assignedMarca.marcaNombre || 'Marca'
                    });
                }

                // Also get from assignedStores (additional marcas)
                if (assignment?.assignedStores) {
                    assignment.assignedStores.forEach(store => {
                        if (store.marcaId && !loadedMarcas.some(m => m.id === store.marcaId)) {
                            loadedMarcas.push({
                                id: store.marcaId,
                                nombre: store.marcaId // Will be replaced if we have the name
                            });
                        }
                    });
                }

                setMarcas(loadedMarcas);
                if (assignment?.holdingId) {
                    setHoldingId(assignment.holdingId);
                }
                console.log('✅ Recruiter marcas loaded:', loadedMarcas.length);
            } catch (error) {
                console.error('Error loading assignment:', error);
            } finally {
                setLoadingAssignment(false);
            }
        }
        loadAssignment();
    }, [user]);

    useEffect(() => {
        if (marcas.length > 0) {
            loadData();
        }
    }, [marcas, selectedMarca]);

    useEffect(() => {
        applyFilters();
    }, [candidates, selectedStores, selectedPosition, selectedCULStatus]);

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

                allCandidates.push(...candidatesData);
                positionsData.forEach(p => allPositions.add(p));
                storesData.forEach(s => {
                    if (!allStores.some(existing => existing.id === s.id)) {
                        allStores.push(s);
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
        // Removed hard exclusion of 'apto' so they appear in "Todos" list as requested.

        setFilteredCandidates(filtered);
    }

    function clearFilters() {
        setSelectedStores([]);
        setSelectedPosition('');
        setSelectedCULStatus('');
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
                        className="w-full py-3 px-4 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700 transition-colors"
                    >
                        Volver al Selector
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <DashboardHeader
                title="Dashboard Recruiter"
                marcaId={selectedMarca !== 'all' ? selectedMarca : marcas[0]?.id}
                onConfigClick={() => setActiveTab('configuracion')}
            />

            {/* Navigation Tabs */}
            <div className="bg-white border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex gap-4">
                        <button
                            onClick={() => setActiveTab('requerimientos')}
                            className={`px-4 py-3 font-medium transition-colors border-b-2 ${activeTab === 'requerimientos'
                                ? 'border-violet-600 text-violet-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            📋 Requerimientos
                        </button>
                        <button
                            onClick={() => setActiveTab('candidatos')}
                            className={`px-4 py-3 font-medium transition-colors border-b-2 ${activeTab === 'candidatos'
                                ? 'border-violet-600 text-violet-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            👥 Candidatos
                        </button>
                        <button
                            onClick={() => setActiveTab('analitica')}
                            className={`px-4 py-3 font-medium transition-colors border-b-2 ${activeTab === 'analitica'
                                ? 'border-violet-600 text-violet-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            📊 Analítica
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Container */}
            <main className="container-main py-20 space-y-12">
                {/* Multi-Brand Selector */}
                {
                    marcas.length > 1 && (
                        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                            <div className="flex items-center gap-3">
                                <label className="text-sm font-medium text-gray-700">
                                    🏪 Filtrar por Marca:
                                </label>
                                <select
                                    value={selectedMarca}
                                    onChange={(e) => setSelectedMarca(e.target.value)}
                                    className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white min-w-[200px]"
                                >
                                    <option value="all">📊 Todas las Marcas ({marcas.length})</option>
                                    {marcas.map(m => (
                                        <option key={m.id} value={m.id}>{m.nombre}</option>
                                    ))}
                                </select>
                                {selectedMarca !== 'all' && (
                                    <button
                                        onClick={() => setSelectedMarca('all')}
                                        className="text-sm text-violet-600 hover:text-violet-700 font-medium"
                                    >
                                        Mostrar todas
                                    </button>
                                )}
                            </div>
                        </div>
                    )
                }

                {
                    activeTab === 'candidatos' && (
                        <div className="space-y-8">
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                <div className="bg-white rounded-lg border border-gray-200 p-4">
                                    <p className="text-sm text-gray-600">Total Candidatos</p>
                                    <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                                </div>
                                <div className="bg-white rounded-lg border border-gray-200 p-4">
                                    <p className="text-sm text-gray-600">Aprobados por SM</p>
                                    <p className="text-3xl font-bold text-blue-600">{stats.approved}</p>
                                    <p className="text-xs text-gray-500 mt-1">Esperando evaluación CUL</p>
                                </div>
                                <div className="bg-white rounded-lg border border-gray-200 p-4">
                                    <p className="text-sm text-gray-600">CUL Aptos</p>
                                    <p className="text-3xl font-bold text-green-600">{stats.culAptos}</p>
                                    <p className="text-xs text-gray-500 mt-1">Listos para ingresar</p>
                                </div>
                                <div className="bg-white rounded-lg border border-gray-200 p-4">
                                    <p className="text-sm text-gray-600">CUL No Aptos</p>
                                    <p className="text-3xl font-bold text-red-600">{stats.culNoAptos}</p>
                                    <p className="text-xs text-gray-500 mt-1">No pueden ingresar</p>
                                </div>
                                <div className="bg-white rounded-lg border border-emerald-200 p-4 shadow-sm">
                                    <p className="text-sm text-emerald-700 font-medium">🎯 Seleccionados</p>
                                    <p className="text-3xl font-bold text-emerald-600">{stats.selected}</p>
                                    <p className="text-xs text-emerald-600 mt-1">Listos para exportar</p>
                                </div>
                            </div>

                            {/* Hiring Stats Row */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg border border-yellow-200 p-4">
                                    <p className="text-sm text-yellow-700 font-medium">⏳ Pendientes Ingreso</p>
                                    <p className="text-3xl font-bold text-yellow-900">{stats.pendingHire}</p>
                                    <p className="text-xs text-yellow-600 mt-1">Aptos esperando confirmación</p>
                                </div>
                                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200 p-4">
                                    <p className="text-sm text-green-700 font-medium">✅ Ingresaron</p>
                                    <p className="text-3xl font-bold text-green-900">{stats.hired}</p>
                                    <p className="text-xs text-green-600 mt-1">Confirmado por SM</p>
                                </div>
                                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200 p-4">
                                    <p className="text-sm text-gray-700 font-medium">❌ No Ingresaron</p>
                                    <p className="text-3xl font-bold text-gray-900">{stats.notHired}</p>
                                    <p className="text-xs text-gray-600 mt-1">Desistieron o rechazados</p>
                                </div>
                            </div>

                            {/* Main Content */}
                            <div className="flex gap-6">
                                {/* Filtros Sidebar */}
                                <FiltersSidebar
                                    stores={stores}
                                    positions={positions}
                                    selectedStores={selectedStores}
                                    setSelectedStores={setSelectedStores}
                                    selectedPosition={selectedPosition}
                                    setSelectedPosition={setSelectedPosition}
                                    selectedCULStatus={selectedCULStatus}
                                    setSelectedCULStatus={setSelectedCULStatus}
                                    onClearFilters={clearFilters}
                                />

                                {/* Candidates List */}
                                <div className="flex-1">
                                    <RecruiterCandidatesView
                                        candidates={filteredCandidates}
                                        onRefresh={loadData}
                                    />
                                </div>
                            </div>
                        </div>
                    )
                }

                {
                    activeTab === 'requerimientos' && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                            <RQTrackingView
                                holdingId=""
                                marcas={marcas}
                            />
                        </div>
                    )
                }

                {
                    activeTab === 'analitica' && (
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
                            <div className="text-6xl mb-4">📊</div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Dashboard de Analítica</h2>
                            <p className="text-gray-600 mb-6 max-w-md mx-auto">
                                Visualiza métricas de reclutamiento, funnel de candidatos y tendencias operativas.
                            </p>
                            <a
                                href="/analytics"
                                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-violet-600 to-cyan-500 text-white rounded-xl font-bold hover:shadow-lg transition-all active:scale-95"
                            >
                                Abrir Dashboard Completo →
                            </a>
                        </div>
                    )
                }

                {
                    activeTab === 'configuracion' && (
                        <div className="space-y-8">
                            {holdingId && <EmailTemplatesConfig holdingId={holdingId} />}
                            <ConfigurationView />
                        </div>
                    )
                }
            </main>
        </div>
    );
}
