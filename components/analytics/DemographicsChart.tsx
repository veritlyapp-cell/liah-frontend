'use client';

import { DemographicMetrics } from '@/types/analytics';

interface DemographicsChartProps {
    data: DemographicMetrics;
    title?: string;
}

export default function DemographicsChart({ data, title }: DemographicsChartProps) {
    const maxCount = Math.max(...data.ageDistribution.map(d => d.count));

    const ageColors = [
        'bg-violet-500',
        'bg-blue-500',
        'bg-cyan-500',
        'bg-teal-500',
        'bg-green-500'
    ];

    return (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            {title && (
                <h3 className="text-lg font-bold text-gray-900 mb-6">{title}</h3>
            )}

            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-violet-50 rounded-xl">
                    <p className="text-sm text-violet-600 font-medium">Edad Promedio</p>
                    <p className="text-2xl font-bold text-violet-900">{data.averageAge.toFixed(1)} años</p>
                </div>
                <div className="p-4 bg-green-50 rounded-xl">
                    <p className="text-sm text-green-600 font-medium">Con Experiencia</p>
                    <p className="text-2xl font-bold text-green-900">{data.experienceRate.toFixed(1)}%</p>
                </div>
            </div>

            {/* Age Distribution Bars */}
            <div className="space-y-3">
                <p className="text-sm font-medium text-gray-600 mb-3">Distribución por Edad</p>
                {data.ageDistribution.map((item, idx) => {
                    const widthPercent = maxCount > 0 ? (item.count / maxCount) * 100 : 0;

                    return (
                        <div key={item.range} className="flex items-center gap-3">
                            <span className="w-12 text-sm text-gray-600 text-right">{item.range}</span>
                            <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden">
                                <div
                                    className={`h-full ${ageColors[idx]} rounded-lg transition-all duration-500 flex items-center pl-3`}
                                    style={{ width: `${Math.max(widthPercent, 5)}%` }}
                                >
                                    {widthPercent > 20 && (
                                        <span className="text-white text-xs font-medium">{item.count}</span>
                                    )}
                                </div>
                            </div>
                            <span className="w-12 text-sm text-gray-600">{item.percentage.toFixed(0)}%</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
