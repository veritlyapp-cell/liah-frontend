'use client';

import { TimeSeriesData } from '@/types/analytics';

interface TimeSeriesChartProps {
    data: TimeSeriesData[];
    title?: string;
    metric?: 'candidates' | 'hires' | 'fillRate';
}

export default function TimeSeriesChart({ data, title, metric = 'candidates' }: TimeSeriesChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                {title && <h3 className="text-lg font-bold text-gray-900 mb-4">{title}</h3>}
                <div className="text-center py-8 text-gray-400">
                    No hay datos de tendencia disponibles
                </div>
            </div>
        );
    }

    // Get max value for scaling
    const getValue = (item: TimeSeriesData) => {
        switch (metric) {
            case 'hires': return item.candidatesHired;
            case 'fillRate': return item.rqsFilled > 0 ? (item.rqsFilled / (item.rqsCreated || 1)) * 100 : 0;
            default: return item.candidatesApplied;
        }
    };

    const maxValue = Math.max(...data.map(getValue));
    const minValue = Math.min(...data.map(getValue));
    const range = maxValue - minValue || 1;

    // Calculate average and trend
    const values = data.map(getValue);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    const trend = secondAvg > firstAvg ? 'up' : secondAvg < firstAvg ? 'down' : 'stable';
    const trendPercent = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;

    // Format label based on metric
    const getMetricLabel = () => {
        switch (metric) {
            case 'hires': return 'Contratados';
            case 'fillRate': return 'Fill Rate (%)';
            default: return 'Candidatos';
        }
    };

    const getMetricColor = () => {
        switch (metric) {
            case 'hires': return { line: 'stroke-green-500', fill: 'fill-green-100', dot: 'bg-green-500' };
            case 'fillRate': return { line: 'stroke-cyan-500', fill: 'fill-cyan-100', dot: 'bg-cyan-500' };
            default: return { line: 'stroke-violet-500', fill: 'fill-violet-100', dot: 'bg-violet-500' };
        }
    };

    const colors = getMetricColor();

    return (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            {title && (
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-gray-900">{title}</h3>
                    <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-500'}`}>
                            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
                            {Math.abs(trendPercent).toFixed(1)}%
                        </span>
                    </div>
                </div>
            )}

            {/* SVG Chart */}
            <div className="relative h-48">
                <svg className="w-full h-full" viewBox="0 0 400 150" preserveAspectRatio="none">
                    {/* Grid lines */}
                    <g className="text-gray-200">
                        {[0, 1, 2, 3, 4].map(i => (
                            <line
                                key={i}
                                x1="40"
                                y1={30 + i * 25}
                                x2="390"
                                y2={30 + i * 25}
                                stroke="currentColor"
                                strokeDasharray="4"
                                strokeWidth="1"
                            />
                        ))}
                    </g>

                    {/* Y-axis labels */}
                    <g className="text-xs fill-gray-400">
                        <text x="35" y="35" textAnchor="end">{maxValue.toFixed(0)}</text>
                        <text x="35" y="85" textAnchor="end">{((maxValue + minValue) / 2).toFixed(0)}</text>
                        <text x="35" y="135" textAnchor="end">{minValue.toFixed(0)}</text>
                    </g>

                    {/* Area fill */}
                    <path
                        d={`
                            M 40 130
                            ${data.map((item, i) => {
                            const x = 40 + (i * (350 / (data.length - 1 || 1)));
                            const y = 130 - ((getValue(item) - minValue) / range) * 100;
                            return `L ${x} ${y}`;
                        }).join(' ')}
                            L 390 130
                            Z
                        `}
                        className={`${colors.fill} opacity-30`}
                    />

                    {/* Line */}
                    <path
                        d={`
                            M ${40} ${130 - ((getValue(data[0]) - minValue) / range) * 100}
                            ${data.slice(1).map((item, i) => {
                            const x = 40 + ((i + 1) * (350 / (data.length - 1 || 1)));
                            const y = 130 - ((getValue(item) - minValue) / range) * 100;
                            return `L ${x} ${y}`;
                        }).join(' ')}
                        `}
                        fill="none"
                        className={colors.line}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />

                    {/* Data points */}
                    {data.map((item, i) => {
                        const x = 40 + (i * (350 / (data.length - 1 || 1)));
                        const y = 130 - ((getValue(item) - minValue) / range) * 100;
                        return (
                            <circle
                                key={i}
                                cx={x}
                                cy={y}
                                r="4"
                                className={`${colors.dot.replace('bg-', 'fill-')} stroke-white`}
                                strokeWidth="2"
                            />
                        );
                    })}
                </svg>
            </div>

            {/* X-axis labels */}
            <div className="flex justify-between mt-2 text-xs text-gray-400 px-10">
                {data.slice(0, Math.min(data.length, 6)).map((item, i) => (
                    <span key={i}>{new Date(item.date).toLocaleDateString('es-PE', { month: 'short', day: 'numeric' })}</span>
                ))}
            </div>

            {/* Legend/Stats */}
            <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-4 text-center">
                <div>
                    <p className="text-xs text-gray-500">Promedio</p>
                    <p className="font-bold text-gray-900">{avg.toFixed(1)}</p>
                </div>
                <div>
                    <p className="text-xs text-gray-500">Máximo</p>
                    <p className="font-bold text-gray-900">{maxValue.toFixed(0)}</p>
                </div>
                <div>
                    <p className="text-xs text-gray-500">Mínimo</p>
                    <p className="font-bold text-gray-900">{minValue.toFixed(0)}</p>
                </div>
            </div>
        </div>
    );
}
