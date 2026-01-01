'use client';

import { PerformanceRanking } from '@/types/analytics';

interface RankingTableProps {
    data: PerformanceRanking[];
    title: string;
    type: 'stores' | 'positions';
}

export default function RankingTable({ data, title, type }: RankingTableProps) {
    const isGoodPerformance = (fillRate: number) => fillRate >= 80;
    const isMediumPerformance = (fillRate: number) => fillRate >= 50 && fillRate < 80;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-full">
            <h3 className="text-lg font-bold text-gray-900 mb-6">{title}</h3>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-gray-50">
                            <th className="text-left py-2 px-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center w-10">#</th>
                            <th className="text-left py-2 px-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                {type === 'stores' ? 'Tienda' : 'Posición'}
                            </th>
                            <th className="text-right py-2 px-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Fill Rate</th>
                            <th className="text-right py-2 px-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Días</th>
                            <th className="text-right py-2 px-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {data.map((item, idx) => (
                            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                <td className="py-3 px-2 text-center">
                                    <span className="text-xs font-bold text-gray-400">
                                        {idx + 1}
                                    </span>
                                </td>
                                <td className="py-3 px-2 font-medium text-gray-700 text-sm">{item.name}</td>
                                <td className="py-3 px-2 text-right">
                                    <span className={`text-sm font-bold ${isGoodPerformance(item.fillRate) ? 'text-green-500' :
                                        isMediumPerformance(item.fillRate) ? 'text-amber-500' :
                                            'text-red-500'
                                        }`}>
                                        {item.fillRate.toFixed(0)}%
                                    </span>
                                </td>
                                <td className="py-3 px-2 text-right text-sm text-gray-500 font-medium">
                                    {item.avgTimeToFill.toFixed(0)}
                                </td>
                                <td className="py-3 px-2 text-right font-bold text-gray-900 text-sm">
                                    {item.totalFilled}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
