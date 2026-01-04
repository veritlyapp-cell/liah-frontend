'use client';

import { SourceMetric } from '@/types/analytics';

interface SourceChartProps {
    data: SourceMetric[];
    title?: string;
}

const sourceColors: Record<string, { bg: string; border: string }> = {
    whatsapp: { bg: 'bg-green-500', border: 'border-green-500' },
    link: { bg: 'bg-blue-500', border: 'border-blue-500' },
    referral: { bg: 'bg-purple-500', border: 'border-purple-500' },
    facebook: { bg: 'bg-blue-600', border: 'border-blue-600' },
    instagram: { bg: 'bg-pink-500', border: 'border-pink-500' },
    tiktok: { bg: 'bg-gray-900', border: 'border-gray-900' },
    linkedin: { bg: 'bg-blue-700', border: 'border-blue-700' },
    computrabajo: { bg: 'bg-orange-500', border: 'border-orange-500' },
    bumeran: { bg: 'bg-red-500', border: 'border-red-500' },
    indeed: { bg: 'bg-indigo-600', border: 'border-indigo-600' },
    volante: { bg: 'bg-yellow-500', border: 'border-yellow-500' },
    radio: { bg: 'bg-amber-600', border: 'border-amber-600' },
    evento: { bg: 'bg-teal-500', border: 'border-teal-500' },
    other: { bg: 'bg-gray-500', border: 'border-gray-500' }
};

const sourceIcons: Record<string, string> = {
    whatsapp: '📱',
    link: '🔗',
    referral: '🤝',
    facebook: '👍',
    instagram: '📸',
    tiktok: '🎵',
    linkedin: '💼',
    computrabajo: '💻',
    bumeran: '🔄',
    indeed: '🔍',
    volante: '📄',
    radio: '📻',
    evento: '🎪',
    other: '📋'
};

export default function SourceChart({ data, title }: SourceChartProps) {
    const maxCount = Math.max(...data.map(d => d.count));

    return (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            {title && (
                <h3 className="text-lg font-bold text-gray-900 mb-6">{title}</h3>
            )}

            <div className="space-y-6">
                {data.map((item) => {
                    const icon = sourceIcons[item.source] || '📋';
                    const widthPercent = maxCount > 0 ? (item.count / maxCount) * 100 : 0;

                    return (
                        <div key={item.source} className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-xl">{icon}</span>
                                    <span className="text-sm font-medium text-gray-700">{item.label}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-sm font-semibold text-gray-900">
                                        {item.count} <span className="text-xs font-normal text-gray-500">Postulantes</span>
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        ({item.percentage.toFixed(1)}%)
                                    </span>
                                </div>
                            </div>

                            {/* Main Bar (Flow-based) */}
                            <div className="relative">
                                <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                                        style={{ width: `${widthPercent}%` }}
                                    />
                                </div>
                            </div>

                            {/* Stats Breakdown */}
                            <div className="grid grid-cols-3 gap-2">
                                <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                                    <p className="text-[10px] text-emerald-600 font-bold uppercase">Aptos</p>
                                    <p className="text-sm font-bold text-emerald-700">{item.approvedCount || 0}</p>
                                </div>
                                <div className="bg-blue-50 p-2 rounded-lg border border-blue-100">
                                    <p className="text-[10px] text-blue-600 font-bold uppercase">Seleccionados</p>
                                    <p className="text-sm font-bold text-blue-700">{item.selectedCount || 0}</p>
                                </div>
                                <div className="bg-violet-50 p-2 rounded-lg border border-violet-100">
                                    <p className="text-[10px] text-violet-600 font-bold uppercase">Ingresados</p>
                                    <p className="text-sm font-bold text-violet-700">{item.hiredCount || 0}</p>
                                </div>
                            </div>

                            <div className="flex justify-end pr-1">
                                <p className="text-[11px] text-gray-500 font-medium italic">
                                    Tasa de éxito (Ingresos): {item.hireRate.toFixed(1)}%
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Global Insight */}
            {data.length > 0 && (
                <div className="mt-8 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Canal con mayor éxito (Ingresos):</span>
                        <span className="font-bold text-indigo-600">
                            {data.sort((a, b) => (b.hireRate || 0) - (a.hireRate || 0))[0]?.label}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
