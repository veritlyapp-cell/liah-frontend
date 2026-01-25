'use client';

import { useState } from 'react';
import AdminRQAnalyticsView from './AdminRQAnalyticsView';
import AdvancedAnalyticsDashboard from './AdvancedAnalyticsDashboard';

interface UnifiedAnalyticsProps {
    holdingId: string;
    marcas: { id: string; nombre: string }[];
}

type AnalyticsTab = 'operaciones' | 'candidatos' | 'impacto';

export default function UnifiedAnalytics({ holdingId, marcas }: UnifiedAnalyticsProps) {
    const [activeTab, setActiveTab] = useState<AnalyticsTab>('operaciones');

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Centro de Analítica Avanzada</h2>
                    <p className="text-gray-500 text-sm">Monitoreo integral de requerimientos, demografía e impacto financiero.</p>
                </div>

                <div className="flex bg-gray-100 p-1 rounded-xl w-fit">
                    <button
                        onClick={() => setActiveTab('operaciones')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'operaciones'
                                ? 'bg-white text-violet-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        📋 Operaciones (RQs)
                    </button>
                    <button
                        onClick={() => setActiveTab('candidatos')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'candidatos'
                                ? 'bg-white text-violet-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        👥 Perfil Candidatos
                    </button>
                    <button
                        onClick={() => setActiveTab('impacto')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'impacto'
                                ? 'bg-white text-violet-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        💰 Impacto & Rotación
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100">
                {activeTab === 'operaciones' && (
                    <div className="space-y-8">
                        <div>
                            <h3 className="text-lg font-extrabold text-gray-900 mb-2">Estadísticas de Cobertura y RQs</h3>
                            <p className="text-gray-500 text-xs mb-6 uppercase tracking-wider font-bold">Resumen de capacidad operativa y tiempos de respuesta</p>
                        </div>
                        <AdminRQAnalyticsView holdingId={holdingId} marcas={marcas} />
                    </div>
                )}

                {activeTab === 'candidatos' && (
                    <div className="space-y-8">
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-16 h-16 bg-violet-100 rounded-full flex items-center justify-center text-3xl mb-4">📊</div>
                            <h3 className="text-xl font-bold text-gray-900">Demografía de Candidatos</h3>
                            <p className="text-gray-500 max-w-md mt-2">Estamos consolidando los datos de edad y género para ofrecerte una visión completa de tus prospectos.</p>
                            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
                                <div className="p-6 border-2 border-dashed border-gray-200 rounded-2xl">
                                    <p className="text-sm font-bold text-gray-400">DISTRIBUCIÓN POR GÉNERO</p>
                                    <div className="h-40 flex items-center justify-center text-gray-300">Próximamente</div>
                                </div>
                                <div className="p-6 border-2 border-dashed border-gray-200 rounded-2xl">
                                    <p className="text-sm font-bold text-gray-400">RANGOS DE EDAD</p>
                                    <div className="h-40 flex items-center justify-center text-gray-300">Próximamente</div>
                                </div>
                            </div>
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
