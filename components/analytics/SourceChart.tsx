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

            <div className="space-y-4">
                {data.map((item) => {
                    const colors = sourceColors[item.source] || sourceColors.other;
                    const icon = sourceIcons[item.source] || '📋';
                    const widthPercent = maxCount > 0 ? (item.count / maxCount) * 100 : 0;

                    return (
                        <div key={item.source} className="space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-xl">{icon}</span>
                                    <span className="text-sm font-medium text-gray-700">{item.label}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-sm font-semibold text-gray-900">
                                        {item.count}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        ({item.percentage.toFixed(1)}%)
                                    </span>
                                </div>
                            </div>

                            <div className="relative">
                                <div className="h-8 bg-gray-100 rounded-lg overflow-hidden">
                                    <div
                                        className={`h-full ${colors.bg} rounded-lg transition-all duration-500 flex items-center justify-end pr-3`}
                                        style={{ width: `${widthPercent}%` }}
                                    >
                                        <span className="text-white text-xs font-medium">
                                            {item.hireRate.toFixed(0)}% contratados
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Best performing source */}
            {data.length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Mejor tasa de conversión:</span>
                        <span className="font-bold text-green-600">
                            {data.sort((a, b) => b.hireRate - a.hireRate)[0]?.label} ({data[0]?.hireRate.toFixed(1)}%)
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
