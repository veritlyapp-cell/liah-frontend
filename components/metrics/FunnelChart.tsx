'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import type { FunnelMetrics } from '@/lib/analytics/recruitment-metrics';

interface FunnelChartProps {
    metrics: FunnelMetrics;
}

export default function FunnelChart({ metrics }: FunnelChartProps) {
    const data = [
        { stage: 'RQs Creados', value: metrics.rqsCreated, color: '#8b5cf6' },
        { stage: 'Aplicaciones', value: metrics.applicationsCompleted, color: '#06b6d4' },
        { stage: 'SM Aprobados', value: metrics.smApproved, color: '#10b981' },
        { stage: 'CUL Aptos', value: metrics.culAptos, color: '#f59e0b' },
        { stage: 'Ingresaron', value: metrics.hired, color: '#22c55e' }
    ];

    return (
        <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Embudo de Reclutamiento</h3>

            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                        dataKey="stage"
                        angle={-15}
                        textAnchor="end"
                        height={80}
                        style={{ fontSize: '12px' }}
                    />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>

            {/* Conversion Rates */}
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                    <p className="text-sm text-gray-600">Aprobados → Aptos</p>
                    <p className="text-2xl font-bold text-violet-600">
                        {metrics.approvedToApto.toFixed(1)}%
                    </p>
                </div>
                <div className="text-center">
                    <p className="text-sm text-gray-600">Aptos → Ingresaron</p>
                    <p className="text-2xl font-bold text-cyan-600">
                        {metrics.aptoToHired.toFixed(1)}%
                    </p>
                </div>
                <div className="text-center">
                    <p className="text-sm text-gray-600">Conversión General</p>
                    <p className="text-2xl font-bold text-green-600">
                        {metrics.overallConversion.toFixed(1)}%
                    </p>
                </div>
                <div className="text-center">
                    <p className="text-sm text-gray-600">Total Ingresados</p>
                    <p className="text-2xl font-bold text-gray-900">
                        {metrics.hired}
                    </p>
                </div>
            </div>
        </div>
    );
}
