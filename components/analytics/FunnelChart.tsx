'use client';

import { FunnelStage } from '@/types/analytics';

interface FunnelChartProps {
    data: FunnelStage[];
    title?: string;
}

export default function FunnelChart({ data, title }: FunnelChartProps) {
    const maxCount = data[0]?.count || 1;

    const totalConversion = data.length > 0
        ? ((data[data.length - 1].count / data[0].count) * 100).toFixed(1)
        : '0';

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            {title && (
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                    {title}
                </h3>
            )}

            <div className="space-y-6">
                {data.map((stage, idx) => {
                    const widthPercent = (stage.count / maxCount) * 100;

                    return (
                        <div key={stage.stage} className="space-y-2">
                            {/* Label and Value on top of the bar */}
                            <div className="flex justify-between items-center px-1">
                                <span className="text-sm font-medium text-gray-700">
                                    {stage.label}
                                </span>
                                <span className="text-sm font-medium text-gray-900">
                                    {stage.count.toLocaleString()} ({stage.percentage.toFixed(0)}%)
                                </span>
                            </div>

                            {/* Bar Container - Pill shape */}
                            <div className="relative h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] rounded-full transition-all duration-1000 ease-out"
                                    style={{ width: `${widthPercent}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Total Conversion */}
            <div className="mt-8 pt-4 border-t border-gray-50">
                <p className="text-lg font-bold text-gray-900">
                    Tasa de conversión total: {totalConversion}%
                </p>
            </div>
        </div>
    );
}
