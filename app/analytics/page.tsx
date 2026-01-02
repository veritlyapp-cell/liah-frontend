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

// Icons
const ChartIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
);

const UsersIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
);

const ClockIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const CheckIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const TrendUpIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
);

const DocumentIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
);

export default function AnalyticsPage() {
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
        districtIds: []
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
            const holdingId = claims?.holdingId || claims?.tenant_id;
            if (holdingId) {
                const options = await getAnalyticsFilterOptions(holdingId);
                if (options) {
                    setFilterOptions(options);
                }
            }
        }
        loadFilters();
    }, [claims]);

    // Calculate date range
    const getDateRange = (range: string) => {
        const now = new Date();
        const start = new Date(now);
        switch (range) {
            case 'week':
                start.setDate(now.getDate() - 7);
                break;
            case 'month':
                // Set to start of current month
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
                // Default to current month
                start.setDate(1);
                start.setHours(0, 0, 0, 0);
        }
        return { start, end: now };
    };

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
            return;
        }

        // Only load data if we have filters or if we're in mock mode
        if (useMockData || filterOptions.brands.length > 0) {
            loadData();
        }
    }, [user, authLoading, router, useMockData, currentFilters, filterOptions]);

    async function loadData() {
        setLoading(true);
        try {
            if (useMockData) {
                // Use mock data for demo/testing
                const mockData = generateMockDashboardData();
                setData(mockData);
            } else {
                // Load real data from Firestore
                const dateRange = getDateRange(currentFilters.dateRange);
                const holdingId = claims?.holdingId || claims?.tenant_id || '';

                // Force brand filter for recruiters
                const isRecruiter = claims?.role === 'recruiter' || claims?.role === 'brand_recruiter';
                let brandIdsToUse = currentFilters.brandIds;

                // If no brands selected, use all available brands for this user
                if (brandIdsToUse.length === 0 && filterOptions.brands.length > 0) {
                    brandIdsToUse = filterOptions.brands.map(b => b.id);
                }

                if (isRecruiter && claims?.marcaId) {
                    // Recruiters can only see their own brand
                    brandIdsToUse = [claims.marcaId];
                }

                console.log(`Loading analytics for ${holdingId}, Brands: ${brandIdsToUse.length}, Date: ${dateRange.start.toISOString()} to ${dateRange.end.toISOString()}`);
                console.log('🔑 ALL USER CLAIMS:', claims);

                const firestoreData = await loadAnalyticsData({
                    dateRange,
                    holdingId,
                    brandIds: brandIdsToUse,
                    positionIds: currentFilters.positionIds,
                    storeIds: currentFilters.storeIds,
                    districtIds: currentFilters.districtIds
                });

                console.log('Real data result:', {
                    totalRQs: firestoreData.volume.totalRQs,
                    candidates: firestoreData.funnel[0]?.count
                });

                // NO automatic fallback to mock data anymore. 
                // Users want to see real data, even if it's 0.
                setData(firestoreData);
                setUseMockData(false);
            }
        } catch (error) {
            console.error('Error loading analytics:', error);
            // Fallback to mock on error
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

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600" />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <p className="text-gray-500">No hay datos disponibles</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Dashboard de Analítica</h1>
                            <div className="flex items-center gap-2">
                                <p className="text-sm text-gray-500">Métricas de reclutamiento en tiempo real</p>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${useMockData ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                                    }`}>
                                    {useMockData ? 'Modo Demo' : 'Datos Reales'}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* Export Dropdown */}
                            <div className="relative group">
                                <button className="px-4 py-2 text-sm bg-gradient-to-r from-violet-600 to-cyan-500 text-white rounded-lg hover:opacity-90 transition-all flex items-center gap-2">
                                    📥 Exportar
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
                                    <button
                                        onClick={() => data && downloadExcel(data)}
                                        className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-violet-50 hover:text-violet-700 flex items-center gap-2 rounded-t-lg"
                                    >
                                        📊 Descargar Excel
                                    </button>
                                    <button
                                        onClick={() => data && downloadCSV(data)}
                                        className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-violet-50 hover:text-violet-700 flex items-center gap-2"
                                    >
                                        📄 Descargar CSV
                                    </button>
                                    <button
                                        onClick={exportToPDF}
                                        className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-violet-50 hover:text-violet-700 flex items-center gap-2 rounded-b-lg"
                                    >
                                        🖨️ Imprimir / PDF
                                    </button>
                                </div>
                            </div>
                            <button
                                onClick={() => router.back()}
                                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                ← Volver
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
                {/* Filters */}
                <FiltersBar
                    brands={filterOptions.brands}
                    positions={filterOptions.positions}
                    stores={filterOptions.stores}
                    districts={filterOptions.districts}
                    onFilterChange={handleFilterChange}
                    userRole={claims?.role}
                    userBrandIds={claims?.marcaId ? [claims.marcaId] : []}
                />

                {/* Tabs */}
                <div className="flex gap-2 border-b border-gray-200 pb-2">
                    {[
                        { key: 'overview', label: 'Resumen' },
                        { key: 'funnel', label: 'Funnel' },
                        { key: 'sources', label: 'Fuentes' },
                        { key: 'demographics', label: 'Demografía' }
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key as typeof activeTab)}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === tab.key
                                ? 'bg-violet-100 text-violet-700'
                                : 'text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <>
                        {/* KPI Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                            <KPICard
                                title="Total RQs"
                                value={data.volume.totalRQs}
                                icon={<DocumentIcon />}
                                color="violet"
                                trend={{ value: 12, isPositive: true }}
                            />
                            <KPICard
                                title="RQs Abiertos"
                                value={data.volume.openRQs}
                                icon={<ChartIcon />}
                                color="amber"
                            />
                            <KPICard
                                title="RQs Cubiertos"
                                value={data.volume.filledRQs}
                                icon={<CheckIcon />}
                                color="green"
                            />
                            <KPICard
                                title="Tasa Aptos"
                                value={`${data.efficiency.tasaAptos.toFixed(1)}%`}
                                icon={<TrendUpIcon />}
                                color="cyan"
                                trend={{ value: 5, isPositive: true }}
                            />
                            <KPICard
                                title="Tasa Ingresos"
                                value={`${data.efficiency.tasaIngresos.toFixed(1)}%`}
                                icon={<UsersIcon />}
                                color="blue"
                            />
                            <KPICard
                                title="Días Promedio"
                                value={data.efficiency.avgTimeToFill.toFixed(1)}
                                subtitle="Tiempo de cobertura"
                                icon={<ClockIcon />}
                                color="violet"
                            />
                        </div>

                        {/* Charts Row 1 */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <FunnelChart data={data.funnel} title="Funnel de Candidatos" />
                            <DropoffChart data={data.dropoffs} title="Razones de Rechazo" />
                        </div>

                        {/* Time Series Chart */}
                        {data.timeSeries && data.timeSeries.length > 0 && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <TimeSeriesChart
                                    data={data.timeSeries}
                                    title="📈 Tendencia de Candidatos"
                                    metric="candidates"
                                />
                                <TimeSeriesChart
                                    data={data.timeSeries}
                                    title="✅ Tendencia de Contrataciones"
                                    metric="hires"
                                />
                            </div>
                        )}

                        {/* Charts Row 2 */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <RankingTable
                                data={data.topStores}
                                title="🏆 Top Tiendas por Fill Rate"
                                type="stores"
                            />
                            <RankingTable
                                data={data.difficultPositions}
                                title="⚠️ Posiciones Difíciles"
                                type="positions"
                            />
                        </div>
                    </>
                )}

                {/* Funnel Tab */}
                {activeTab === 'funnel' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <FunnelChart data={data.funnel} title="Funnel Completo de Candidatos" />
                        <DropoffChart data={data.dropoffs} title="Análisis de Caídas" />
                    </div>
                )}

                {/* Sources Tab */}
                {activeTab === 'sources' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <SourceChart data={data.sources} title="Fuentes de Reclutamiento" />
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Recomendaciones</h3>
                            <div className="space-y-4">
                                <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                                    <p className="text-sm font-medium text-green-700">📱 WhatsApp es tu mejor canal</p>
                                    <p className="text-xs text-green-600 mt-1">
                                        Tiene la mayor tasa de conversión. Considera invertir más en este canal.
                                    </p>
                                </div>
                                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                                    <p className="text-sm font-medium text-amber-700">🤝 Programa de Referidos</p>
                                    <p className="text-xs text-amber-600 mt-1">
                                        Los referidos tienen mejor retención. Implementa incentivos para empleados.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Demographics Tab */}
                {activeTab === 'demographics' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <DemographicsChart data={data.demographics} title="Perfil Demográfico" />
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Insights Demográficos</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-violet-50 rounded-xl">
                                    <span className="text-sm text-violet-700">Rango de edad más común</span>
                                    <span className="font-bold text-violet-900">
                                        {data.demographics.ageDistribution.sort((a, b) => b.count - a.count)[0]?.range}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl">
                                    <span className="text-sm text-blue-700">Candidatos con experiencia</span>
                                    <span className="font-bold text-blue-900">
                                        {data.demographics.experienceRate.toFixed(1)}%
                                    </span>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-cyan-50 rounded-xl">
                                    <span className="text-sm text-cyan-700">Edad promedio</span>
                                    <span className="font-bold text-cyan-900">
                                        {data.demographics.averageAge.toFixed(1)} años
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
