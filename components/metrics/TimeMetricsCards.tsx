'use client';

import type { TimeMetrics } from '@/lib/analytics/recruitment-metrics';

interface TimeMetricsCardsProps {
    metrics: TimeMetrics;
}

export default function TimeMetricsCards({ metrics }: TimeMetricsCardsProps) {
    const cards = [
        {
            label: 'RQ → Primera Invitación',
            value: metrics.avgRQToFirstInvite,
            unit: 'días',
            icon: '📋',
            color: 'violet'
        },
        {
            label: 'Aprobado → CUL Apto',
            value: metrics.avgApprovalToApto,
            unit: 'días',
            icon: '⏱️',
            color: 'cyan'
        },
        {
            label: 'CUL Apto → Ingreso',
            value: metrics.avgAptoToHired,
            unit: 'días',
            icon: '✅',
            color: 'green'
        },
        {
            label: 'RQ → Ingreso (Total)',
            value: metrics.avgRQToHired,
            unit: 'días',
            icon: '🎯',
            color: 'amber'
        }
    ];

    const getColorClasses = (color: string) => {
        const colors: Record<string, string> = {
            violet: 'bg-violet-50 text-violet-600 border-violet-200',
            cyan: 'bg-cyan-50 text-cyan-600 border-cyan-200',
            green: 'bg-green-50 text-green-600 border-green-200',
            amber: 'bg-amber-50 text-amber-600 border-amber-200'
        };
        return colors[color] || 'bg-gray-50 text-gray-600 border-gray-200';
    };

    return (
        <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tiempos Promedio del Proceso</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {cards.map((card, index) => (
                    <div
                        key={index}
                        className={`border-2 rounded-lg p-4 ${getColorClasses(card.color)}`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-2xl">{card.icon}</span>
                            <span className="text-xs font-medium opacity-75">{card.unit}</span>
                        </div>
                        <p className="text-3xl font-bold mb-1">
                            {card.value > 0 ? card.value.toFixed(1) : '--'}
                        </p>
                        <p className="text-xs opacity-75 leading-tight">
                            {card.label}
                        </p>
                    </div>
                ))}
            </div>

            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                    💡 <strong>Tip:</strong> Tiempos menores indican un proceso más eficiente.
                    Monitorea regularmente para identificar cuellos de botella.
                </p>
            </div>
        </div>
    );
}
