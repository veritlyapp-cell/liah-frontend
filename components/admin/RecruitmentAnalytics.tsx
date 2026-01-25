'use client';

import { useState, useEffect } from 'react';
import { loadAnalyticsData } from '@/lib/analytics-firestore';
import { AnalyticsDashboardData } from '@/types/analytics';
import { FilterValues } from '../analytics/FiltersBar';
import FunnelChart from '../analytics/FunnelChart';
import DropoffChart from '../analytics/DropoffChart';
import SourceChart from '../analytics/SourceChart';

interface RecruitmentAnalyticsProps {
    holdingId: string;
    filters: FilterValues;
}

export default function RecruitmentAnalytics({ holdingId, filters }: RecruitmentAnalyticsProps) {
    const [data, setData] = useState<AnalyticsDashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Map FilterValues to AnalyticsFilters
                const analyticsFilters = {
                    dateRange: {
                        start: filters.customStartDate ? new Date(filters.customStartDate) : getStartDate(filters.dateRange),
                        end: filters.customEndDate ? new Date(filters.customEndDate) : new Date()
                    },
                    brandIds: filters.brandIds,
                    positionIds: filters.positionIds,
                    storeIds: filters.storeIds,
                    districtIds: filters.districtIds, // Will be combined with zone districts in the engine
                    zoneId: filters.zoneId,
                    holdingId,
                    category: filters.category
                };

                const result = await loadAnalyticsData(analyticsFilters);
                setData(result);
            } catch (error) {
                console.error('Error loading recruitment analytics:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [holdingId, filters]);

    function getStartDate(range: string): Date {
        const now = new Date();
        switch (range) {
            case 'week': return new Date(now.setDate(now.getDate() - 7));
            case 'month': return new Date(now.setMonth(now.getMonth() - 1));
            case 'quarter': return new Date(now.setMonth(now.getMonth() - 3));
            case 'year': return new Date(now.setFullYear(now.getFullYear() - 1));
            default: return new Date(now.setMonth(now.getMonth() - 1));
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mb-4"></div>
                <p className="text-gray-500 font-medium">Analizando datos de reclutamiento...</p>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="space-y-8 animate-fade-in">
            {/* KPI Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Postulaciones</p>
                    <p className="text-3xl font-black text-gray-900">{data.volume.totalRQs + data.volume.filledRQs > 0 ? data.funnel[0].count : 0}</p>
                    <p className="text-xs text-green-500 font-bold mt-2">↑ Total histórico</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Tasa de Aptos</p>
                    <p className="text-3x font-black text-violet-600">{data.efficiency.tasaAptos.toFixed(1)}%</p>
                    <p className="text-xs text-gray-400 mt-2">Efectividad de filtro</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Ingresos</p>
                    <p className="text-3xl font-black text-green-600">{data.funnel[data.funnel.length - 1].count}</p>
                    <p className="text-xs text-gray-400 mt-2">Candidatos contratados</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Tiempo de Cobertura</p>
                    <p className="text-3xl font-black text-amber-600">{data.efficiency.avgTimeToFill.toFixed(0)}d</p>
                    <p className="text-xs text-gray-400 mt-2">Promedio días/vacante</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Funnel Chart */}
                <FunnelChart
                    data={data.funnel}
                    title="Embudo de Conversión"
                />

                {/* Drop-off Chart */}
                <DropoffChart
                    data={data.dropoffs}
                    title="Motivos de Rechazo"
                />
            </div>

            {/* Source Chart */}
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                    🎯 Rendimiento por Fuente
                </h3>
                <SourceChart data={data.sources} />
            </div>
        </div>
    );
}
