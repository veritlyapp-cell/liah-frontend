'use client';

import { useState, useEffect } from 'react';
import AdminRQAnalyticsView from './AdminRQAnalyticsView';
import AdvancedAnalyticsDashboard from './AdvancedAnalyticsDashboard';
import FiltersBar, { FilterValues } from '../analytics/FiltersBar';
import DemographicsChart from '../analytics/DemographicsChart';
import RecruitmentAnalytics from './RecruitmentAnalytics';
import { loadAnalyticsData } from '@/lib/analytics-firestore';
import { DemographicMetrics } from '@/types/analytics';

interface UnifiedAnalyticsProps {
    holdingId: string;
    marcas: { id: string; nombre: string }[];
}

type AnalyticsTab = 'reclutamiento' | 'demografia' | 'impacto';

export default function UnifiedAnalytics({ holdingId, marcas }: UnifiedAnalyticsProps) {
    const [activeTab, setActiveTab] = useState<AnalyticsTab>('reclutamiento');
    const [filters, setFilters] = useState<FilterValues>({
        dateRange: 'month',
        brandIds: [],
        positionIds: [],
        storeIds: [],
        districtIds: [],
        zoneId: '',
        category: 'all'
    });

    const [demoData, setDemoData] = useState<DemographicMetrics | null>(null);
    const [loadingDemo, setLoadingDemo] = useState(false);

    useEffect(() => {
        if (activeTab === 'demografia') {
            const fetchDemo = async () => {
                setLoadingDemo(true);
                try {
                    const result = await loadAnalyticsData({
                        dateRange: {
                            start: filters.customStartDate ? new Date(filters.customStartDate) : getStartDate(filters.dateRange),
                            end: filters.customEndDate ? new Date(filters.customEndDate) : new Date()
                        },
                        brandIds: filters.brandIds,
                        zoneId: filters.zoneId,
                        category: filters.category,
                        holdingId
                    });
                    setDemoData(result.demographics);
                } catch (e) {
                    console.error('Error loading demo data:', e);
                } finally {
                    setLoadingDemo(false);
                }
            };
            fetchDemo();
        }
    }, [activeTab, filters, holdingId]);

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

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Centro de Analítica Avanzada</h2>
                    <p className="text-gray-500 text-sm">Monitoreo integral de requerimientos, demografía e impacto financiero.</p>
                </div>

                <div className="flex bg-gray-100 p-1 rounded-xl w-fit">
                    <button
                        onClick={() => setActiveTab('reclutamiento')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'reclutamiento'
                            ? 'bg-white text-violet-600 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        🎯 Reclutamiento
                    </button>
                    <button
                        onClick={() => setActiveTab('demografia')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'demografia'
                            ? 'bg-white text-violet-600 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        👥 Demografía
                    </button>
                    <button
                        onClick={() => setActiveTab('impacto')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'impacto'
                            ? 'bg-white text-violet-600 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        💰 Impacto & ROI
                    </button>
                </div>
            </div>

            {/* Global Filters */}
            <FiltersBar
                brands={marcas.map(m => ({ id: m.id, name: m.nombre }))}
                positions={[]} // Will be loaded dynamically if needed
                stores={[]}
                districts={[]}
                onFilterChange={setFilters}
                initialFilters={filters}
                holdingId={holdingId}
            />

            <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100">
                {activeTab === 'reclutamiento' && (
                    <div className="space-y-8">
                        <div>
                            <h3 className="text-lg font-extrabold text-gray-900 mb-2">Análisis de Reclutamiento</h3>
                            <p className="text-gray-500 text-xs mb-6 uppercase tracking-wider font-bold">Funnel de conversión y motivos de rechazo</p>
                        </div>
                        <RecruitmentAnalytics holdingId={holdingId} filters={filters} />
                    </div>
                )}

                {activeTab === 'demografia' && (
                    <div className="space-y-8">
                        <div>
                            <h3 className="text-lg font-extrabold text-gray-900 mb-2">Demografía de Talentos</h3>
                            <p className="text-gray-500 text-xs mb-6 uppercase tracking-wider font-bold">Distribución de perfiles por edad y experiencia</p>
                        </div>
                        <div className="bg-gray-50 rounded-2xl p-6 min-h-[400px]">
                            {loadingDemo ? (
                                <div className="flex flex-col items-center justify-center py-20">
                                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600 mb-3"></div>
                                    <p className="text-gray-400 text-sm italic">Cargando perfiles demográficos...</p>
                                </div>
                            ) : demoData ? (
                                <DemographicsChart data={demoData} />
                            ) : (
                                <div className="text-center py-20 text-gray-400">
                                    No se encontraron datos demográficos para los filtros seleccionados.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'impacto' && (
                    <div className="space-y-8">
                        <div>
                            <h3 className="text-lg font-extrabold text-gray-900 mb-2">Analítica de Retención y ROI</h3>
                            <p className="text-gray-500 text-xs mb-6 uppercase tracking-wider font-bold">Impacto financiero de la rotación temprana y permanencia</p>
                        </div>
                        <AdvancedAnalyticsDashboard holdingId={holdingId} />
                    </div>
                )}
            </div>
        </div>
    );
}
