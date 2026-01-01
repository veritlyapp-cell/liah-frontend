'use client';

import { useState, useEffect } from 'react';
import { calculateMarcaMetrics } from '@/lib/analytics/recruitment-metrics';
import type { RecruitmentMetrics, DateRange } from '@/lib/analytics/recruitment-metrics';
import FunnelChart from '@/components/metrics/FunnelChart';
import TimeMetricsCards from '@/components/metrics/TimeMetricsCards';
import DateRangeFilter from '@/components/metrics/DateRangeFilter';

interface RecruiterMetricsViewProps {
    marcaId: string;
    marcaNombre: string;
}

export default function RecruiterMetricsView({ marcaId, marcaNombre }: RecruiterMetricsViewProps) {
    const [metrics, setMetrics] = useState<RecruitmentMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState<DateRange>({});

    useEffect(() => {
        loadMetrics();
    }, [marcaId, dateRange]);

    async function loadMetrics() {
        setLoading(true);
        try {
            const data = await calculateMarcaMetrics(marcaId, dateRange);
            setMetrics(data);
        } catch (error) {
            console.error('Error loading metrics:', error);
        } finally {
            setLoading(false);
        }
    }

    function handleDateRangeChange(range: DateRange) {
        setDateRange(range);
    }

    function exportToCSV() {
        if (!metrics) return;

        const csv = [
            ['Métrica', 'Valor'],
            ['RQs Creados', metrics.funnel.rqsCreated],
            ['Aplicaciones Completadas', metrics.funnel.applicationsCompleted],
            ['SM Aprobados', metrics.funnel.smApproved],
            ['CUL Aptos', metrics.funnel.culAptos],
            ['Ingresaron', metrics.funnel.hired],
            ['Tasa Aprobados → Aptos (%)', metrics.funnel.approvedToApto.toFixed(2)],
            ['Tasa Aptos → Ingresaron (%)', metrics.funnel.aptoToHired.toFixed(2)],
            ['Conversión General (%)', metrics.funnel.overallConversion.toFixed(2)],
            [''],
            ['Tiempo Promedio (días)', ''],
            ['RQ → Primera Invitación', metrics.time.avgRQToFirstInvite.toFixed(1)],
            ['Aprobado → CUL Apto', metrics.time.avgApprovalToApto.toFixed(1)],
            ['CUL Apto → Ingreso', metrics.time.avgAptoToHired.toFixed(1)],
            ['RQ → Ingreso (Total)', metrics.time.avgRQToHired.toFixed(1)]
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `metricas_${marcaNombre.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    }

    if (loading) {
        return (
            <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Cargando métricas...</p>
            </div>
        );
    }

    if (!metrics) {
        return (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
                <p className="text-gray-500">No se pudieron cargar las métricas</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Métricas de Reclutamiento</h2>
                    <p className="text-sm text-gray-600">Marca: {marcaNombre}</p>
                </div>
                <button
                    onClick={exportToCSV}
                    className="px-4 py-2 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 transition-colors"
                >
                    📥 Exportar CSV
                </button>
            </div>

            {/* Date Range Filter */}
            <DateRangeFilter onChange={handleDateRangeChange} defaultRange="all" />

            {/* Period Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                    📊 Período analizado: {
                        metrics.period.start
                            ? `${metrics.period.start.toLocaleDateString()} - ${metrics.period.end.toLocaleDateString()}`
                            : `Todo el histórico hasta ${metrics.period.end.toLocaleDateString()}`
                    }
                </p>
            </div>

            {/* Time Metrics Cards */}
            <TimeMetricsCards metrics={metrics.time} />

            {/* Funnel Chart */}
            <FunnelChart metrics={metrics.funnel} />

            {/* Summary Table */}
            <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen Detallado</h3>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200">
                                <th className="text-left py-2 px-4 text-sm font-semibold text-gray-700">Métrica</th>
                                <th className="text-right py-2 px-4 text-sm font-semibold text-gray-700">Valor</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-gray-100">
                                <td className="py-2 px-4 text-sm text-gray-800">RQs Creados</td>
                                <td className="py-2 px-4 text-sm text-gray-900 font-medium text-right">{metrics.funnel.rqsCreated}</td>
                            </tr>
                            <tr className="border-b border-gray-100">
                                <td className="py-2 px-4 text-sm text-gray-800">Aplicaciones Completadas</td>
                                <td className="py-2 px-4 text-sm text-gray-900 font-medium text-right">{metrics.funnel.applicationsCompleted}</td>
                            </tr>
                            <tr className="border-b border-gray-100">
                                <td className="py-2 px-4 text-sm text-gray-800">SM Aprobados</td>
                                <td className="py-2 px-4 text-sm text-gray-900 font-medium text-right">{metrics.funnel.smApproved}</td>
                            </tr>
                            <tr className="border-b border-gray-100">
                                <td className="py-2 px-4 text-sm text-gray-800">CUL Aptos</td>
                                <td className="py-2 px-4 text-sm text-gray-900 font-medium text-right">{metrics.funnel.culAptos}</td>
                            </tr>
                            <tr className="border-b border-gray-100">
                                <td className="py-2 px-4 text-sm text-gray-800 font-semibold">Ingresaron</td>
                                <td className="py-2 px-4 text-sm text-green-600 font-bold text-right">{metrics.funnel.hired}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
