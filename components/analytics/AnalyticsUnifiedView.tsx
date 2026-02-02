'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import KPICard from '@/components/analytics/KPICard';
import FunnelChart from '@/components/analytics/FunnelChart';
import DropoffChart from '@/components/analytics/DropoffChart';
import SourceChart from '@/components/analytics/SourceChart';
import DemographicsChart from '@/components/analytics/DemographicsChart';
import RankingTable from '@/components/analytics/RankingTable';
import FiltersBar, { FilterValues } from '@/components/analytics/FiltersBar';
import TimeSeriesChart from '@/components/analytics/TimeSeriesChart';
import { generateMockDashboardData } from '@/lib/analytics-mock';
import { loadAnalyticsData, getAnalyticsFilterOptions } from '@/lib/analytics-firestore';
import { downloadExcel, downloadCSV, exportToPDF } from '@/lib/analytics-export';
import { AnalyticsDashboardData } from '@/types/analytics';

interface AnalyticsUnifiedViewProps {
    isEmbedded?: boolean;
    initialHoldingId?: string;
}

export default function AnalyticsUnifiedView({ isEmbedded = false, initialHoldingId }: AnalyticsUnifiedViewProps) {
    const { user, loading: authLoading, claims } = useAuth();
    const router = useRouter();
    const [data, setData] = useState<AnalyticsDashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'funnel' | 'sources' | 'demographics'>('overview');
    const [useMockData, setUseMockData] = useState(false);
    const [currentFilters, setCurrentFilters] = useState<FilterValues>({
        dateRange: 'month',
        brandIds: [],
        positionIds: [],
        storeIds: [],
        districtIds: [],
        category: 'all'
    });

    const [filterOptions, setFilterOptions] = useState({
        brands: [] as { id: string, name: string }[],
        positions: [] as { id: string, name: string }[],
        stores: [] as { id: string, name: string, brandId?: string }[],
        districts: [] as { id: string, name: string }[]
    });

    // Load real filter options when claims change
    useEffect(() => {
        async function loadFilters() {
            const holdingId = initialHoldingId || claims?.holdingId || claims?.tenant_id;
            if (holdingId) {
                // Determine allowed brands for this user
                const allowedBrandIds: string[] = [];
                if (claims?.marcaId) allowedBrandIds.push(claims.marcaId);
                if (claims?.authorized_entities) {
                    claims.authorized_entities.forEach(id => {
                        if (!allowedBrandIds.includes(id)) allowedBrandIds.push(id);
                    });
                }

                const options = await getAnalyticsFilterOptions(holdingId, allowedBrandIds.length > 0 ? allowedBrandIds : undefined);
                if (options) {
                    setFilterOptions(options);
                }
            }
        }
        loadFilters();
    }, [claims, initialHoldingId]);

    // Calculate date range
    const getDateRange = (range: string) => {
        const now = new Date();
        const start = new Date(now);
        switch (range) {
            case 'week':
                start.setDate(now.getDate() - 7);
                break;
            case 'month':
                start.setDate(1);
                start.setHours(0, 0, 0, 0);
                break;
            case 'quarter':
                start.setMonth(now.getMonth() - 3);
                break;
            case 'year':
                start.setFullYear(now.getFullYear() - 1);
                break;
            default:
                start.setDate(1);
                start.setHours(0, 0, 0, 0);
        }
        return { start, end: now };
    };

    useEffect(() => {
        if (!authLoading && !user && !isEmbedded) {
            router.push('/login');
            return;
        }

        if (useMockData || filterOptions.brands.length > 0 || isEmbedded) {
            loadData();
        }
    }, [user, authLoading, router, useMockData, currentFilters, filterOptions, isEmbedded]);

    async function loadData() {
        setLoading(true);
        try {
            if (useMockData) {
                const mockData = generateMockDashboardData();
                setData(mockData);
            } else {
                const holdingId = initialHoldingId || claims?.holdingId || claims?.tenant_id || '';
                const dateRange = getDateRange(currentFilters.dateRange);

                // Force brand filter for recruiters
                const isRecruiter = claims?.role === 'recruiter' || claims?.role === 'brand_recruiter' || claims?.role === 'lider_reclutamiento';
                let brandIdsToUse = currentFilters.brandIds;

                if (brandIdsToUse.length === 0 && filterOptions.brands.length > 0) {
                    brandIdsToUse = filterOptions.brands.map(b => b.id);
                }

                if (isRecruiter) {
                    const assignedBrandIds: string[] = [];
                    if (claims?.marcaId) assignedBrandIds.push(claims.marcaId);
                    if (claims?.authorized_entities) {
                        claims.authorized_entities.forEach(id => {
                            if (!assignedBrandIds.includes(id)) assignedBrandIds.push(id);
                        });
                    }

                    if (assignedBrandIds.length > 0) {
                        brandIdsToUse = brandIdsToUse.filter(id => assignedBrandIds.includes(id));
                        if (brandIdsToUse.length === 0) brandIdsToUse = assignedBrandIds;
                    }
                }

                const firestoreData = await loadAnalyticsData({
                    dateRange,
                    holdingId,
                    brandIds: brandIdsToUse,
                    positionIds: currentFilters.positionIds,
                    storeIds: currentFilters.storeIds || [],
                    districtIds: currentFilters.districtIds || [],
                    category: currentFilters.category as any
                });

                setData(firestoreData);
                setUseMockData(false);
            }
        } catch (error) {
            console.error('Error loading analytics:', error);
            const mockData = generateMockDashboardData();
            setData(mockData);
            setUseMockData(true);
        } finally {
            setLoading(false);
        }
    }

    const handleFilterChange = (filters: FilterValues) => {
        setCurrentFilters(filters);
    };

    if (authLoading || (loading && !data)) {
        return (
            <div className={`flex items-center justify-center ${isEmbedded ? 'h-64' : 'min-h-screen bg-gray-50'}`}>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600" />
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className={isEmbedded ? '' : 'min-h-screen bg-gray-50'}>
            {!isEmbedded && (
                <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Dashboard de Analítica</h1>
                                <div className="flex items-center gap-2">
                                    <p className="text-sm text-gray-500">Métricas de reclutamiento en tiempo real</p>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${useMockData ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                        {useMockData ? 'Modo Demo' : 'Datos Reales'}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button className="px-4 py-2 text-sm bg-gradient-to-r from-violet-600 to-cyan-500 text-white rounded-lg hover:opacity-90 transition-all">📥 Exportar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className={isEmbedded ? '' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'}>
                {isEmbedded && (
                    <div className="mb-6 flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Métricas de Reclutamiento</h2>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${useMockData ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                {useMockData ? 'Modo Demo' : 'Datos Reales'}
                            </span>
                        </div>
                    </div>
                )}

                <FiltersBar
                    brands={filterOptions.brands}
                    positions={filterOptions.positions}
                    stores={filterOptions.stores}
                    districts={filterOptions.districts}
                    initialFilters={currentFilters}
                    onFilterChange={handleFilterChange}
                    holdingId={(initialHoldingId || claims?.holdingId || claims?.tenant_id) ?? undefined}
                />

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 mt-8">
                    <KPICard title="Total RQs" value={data.volume.totalRQs} trend={{ value: 12, isPositive: true }} subtitle="Periodo seleccionado" color="blue" />
                    <KPICard title="Postulados" value={data.funnel[0]?.count || 0} trend={{ value: 5.4, isPositive: true }} subtitle="Conversión: 100%" color="violet" />
                    <KPICard title="Tasa de Ingresos" value={`${data.efficiency.tasaIngresos.toFixed(1)}%`} trend={{ value: 2.1, isPositive: true }} subtitle="Sobre total vacantes" color="green" />
                    <KPICard title="Días para Cubrir" value={data.efficiency.avgTimeToFill.toFixed(1)} trend={{ value: 1.5, isPositive: false }} subtitle="Promedio por vacante" color="amber" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        <FunnelChart data={data.funnel} />
                        <TimeSeriesChart data={data.timeSeries} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <SourceChart data={data.sources} />
                            <DropoffChart data={data.dropoffs} />
                        </div>
                    </div>
                    <div className="space-y-8">
                        <DemographicsChart data={data.demographics} />
                        <RankingTable title="Rendimiento por Tienda" data={data.topStores} type="stores" />
                        <RankingTable title="Positions demandadas" data={data.difficultPositions} type="positions" />
                    </div>
                </div>
            </div>
        </div>
    );
}
