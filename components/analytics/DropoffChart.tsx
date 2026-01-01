'use client';

import { DropoffMetric } from '@/types/analytics';

interface DropoffChartProps {
    data: DropoffMetric[];
    title?: string;
}

const categoryIcons: Record<string, string> = {
    salary: '💰',
    location: '📍',
    availability: '⏰',
    age: '👤',
    screening: '❌',
    noshow: '🚫',
    interview: '🎤',
    documents: '📄',
    other: '❓'
};

export default function DropoffChart({ data, title }: DropoffChartProps) {
    const totalDropoffs = data.reduce((sum, d) => sum + d.count, 0);
    const maxCount = Math.max(...data.map(d => d.count), 1);

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            {title && (
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                    {title}
                </h3>
            )}

            <div className="space-y-6">
                {data.slice(0, 5).map((item) => {
                    const widthPercent = (item.count / maxCount) * 100;

                    return (
                        <div key={item.category} className="space-y-2">
                            {/* Label and Value */}
                            <div className="flex justify-between items-center px-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-base">{categoryIcons[item.category] || '❓'}</span>
                                    <span className="text-sm font-medium text-gray-700">{item.label}</span>
                                </div>
                                <span className="text-sm font-medium text-gray-900">
                                    {item.count.toLocaleString()} ({item.percentage.toFixed(0)}%)
                                </span>
                            </div>

                            {/* Bar Container - Pill shape */}
                            <div className="relative h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-[#F43F5E] to-[#FB7185] rounded-full transition-all duration-1000 ease-out"
                                    style={{ width: `${widthPercent}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Total */}
            <div className="mt-8 pt-4 border-t border-gray-50 flex justify-between items-center">
                <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total candidatos rechazados</span>
                <span className="text-lg font-bold text-gray-900">{totalDropoffs}</span>
            </div>
        </div>
    );
}
