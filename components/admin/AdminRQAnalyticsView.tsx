'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { RQ } from '@/lib/firestore/rqs';

interface AdminRQAnalyticsViewProps {
    holdingId: string;
    marcas: { id: string; nombre: string }[];
}

interface RQStats {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    closed: number;
    byMarca: Record<string, { total: number; approved: number; rejected: number; pending: number }>;
}

export default function AdminRQAnalyticsView({ holdingId, marcas }: AdminRQAnalyticsViewProps) {
    const [stats, setStats] = useState<RQStats>({
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        closed: 0,
        byMarca: {}
    });
    const [loading, setLoading] = useState(true);
    const [selectedMarca, setSelectedMarca] = useState<string>('all');

    useEffect(() => {
        loadStats();
    }, [marcas]);

    async function loadStats() {
        if (marcas.length === 0) {
            setLoading(false);
            return;
        }

        try {
            const rqsRef = collection(db, 'rqs');
            const marcaIds = marcas.map(m => m.id).slice(0, 10);

            const q = query(rqsRef, where('marcaId', 'in', marcaIds));
            const snapshot = await getDocs(q);

            const rqs = snapshot.docs.map(doc => doc.data() as RQ);

            const newStats: RQStats = {
                total: 0,
                pending: 0,
                approved: 0,
                rejected: 0,
                closed: 0,
                byMarca: {}
            };

            // Initialize marca stats
            marcas.forEach(m => {
                newStats.byMarca[m.id] = { total: 0, approved: 0, rejected: 0, pending: 0 };
            });

            rqs.forEach(rq => {
                if (rq.status === 'cancelled') return;

                newStats.total++;

                if (rq.approvalStatus === 'pending') newStats.pending++;
                else if (rq.approvalStatus === 'approved') newStats.approved++;
                else if (rq.approvalStatus === 'rejected') newStats.rejected++;

                if (rq.status === 'closed' || rq.status === 'filled') newStats.closed++;

                // By marca
                if (rq.marcaId && newStats.byMarca[rq.marcaId]) {
                    newStats.byMarca[rq.marcaId].total++;
                    if (rq.approvalStatus === 'pending') newStats.byMarca[rq.marcaId].pending++;
                    else if (rq.approvalStatus === 'approved') newStats.byMarca[rq.marcaId].approved++;
                    else if (rq.approvalStatus === 'rejected') newStats.byMarca[rq.marcaId].rejected++;
                }
            });

            setStats(newStats);
        } catch (error) {
            console.error('Error loading RQ stats:', error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Cargando estadísticas...</p>
            </div>
        );
    }

    // Get filtered stats
    const displayStats = selectedMarca === 'all' ? stats : {
        ...stats,
        total: stats.byMarca[selectedMarca]?.total || 0,
        approved: stats.byMarca[selectedMarca]?.approved || 0,
        rejected: stats.byMarca[selectedMarca]?.rejected || 0,
        pending: stats.byMarca[selectedMarca]?.pending || 0
    };

    const approvalRate = displayStats.total > 0 ? Math.round((displayStats.approved / displayStats.total) * 100) : 0;
    const rejectionRate = displayStats.total > 0 ? Math.round((displayStats.rejected / displayStats.total) * 100) : 0;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Estadísticas de Requerimientos</h3>
                <select
                    value={selectedMarca}
                    onChange={(e) => setSelectedMarca(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-violet-500 focus:border-violet-500"
                >
                    <option value="all">Todas las marcas</option>
                    {marcas.map(m => (
                        <option key={m.id} value={m.id}>{m.nombre}</option>
                    ))}
                </select>
            </div>

            {/* Main KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                    <p className="text-3xl font-bold text-gray-900">{displayStats.total}</p>
                    <p className="text-sm text-gray-500">Total RQs</p>
                </div>
                <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 text-center">
                    <p className="text-3xl font-bold text-amber-700">{displayStats.pending}</p>
                    <p className="text-sm text-amber-600">Pendientes</p>
                </div>
                <div className="bg-green-50 rounded-xl border border-green-200 p-4 text-center">
                    <p className="text-3xl font-bold text-green-700">{displayStats.approved}</p>
                    <p className="text-sm text-green-600">Aprobados</p>
                </div>
                <div className="bg-red-50 rounded-xl border border-red-200 p-4 text-center">
                    <p className="text-3xl font-bold text-red-700">{displayStats.rejected}</p>
                    <p className="text-sm text-red-600">Rechazados</p>
                </div>
                <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 text-center">
                    <p className="text-3xl font-bold text-blue-700">{stats.closed}</p>
                    <p className="text-sm text-blue-600">Cerrados</p>
                </div>
            </div>

            {/* Rates */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-gray-600 font-medium">Tasa de Aprobación</span>
                        <span className="text-2xl font-bold text-green-600">{approvalRate}%</span>
                    </div>
                    <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div
                            className="bg-green-500 h-full transition-all duration-500"
                            style={{ width: `${approvalRate}%` }}
                        ></div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-gray-600 font-medium">Tasa de Rechazo</span>
                        <span className="text-2xl font-bold text-red-600">{rejectionRate}%</span>
                    </div>
                    <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div
                            className="bg-red-500 h-full transition-all duration-500"
                            style={{ width: `${rejectionRate}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            {/* By Marca Breakdown (only show when viewing all) */}
            {selectedMarca === 'all' && marcas.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h4 className="font-semibold text-gray-900">Desglose por Marca</h4>
                    </div>
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Marca</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Total</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Pendientes</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Aprobados</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Rechazados</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {marcas.map(marca => {
                                const marcaStats = stats.byMarca[marca.id];
                                if (!marcaStats || marcaStats.total === 0) return null;
                                return (
                                    <tr key={marca.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900">{marca.nombre}</td>
                                        <td className="px-6 py-4 text-center text-gray-600">{marcaStats.total}</td>
                                        <td className="px-6 py-4 text-center text-amber-600 font-medium">{marcaStats.pending}</td>
                                        <td className="px-6 py-4 text-center text-green-600 font-medium">{marcaStats.approved}</td>
                                        <td className="px-6 py-4 text-center text-red-600 font-medium">{marcaStats.rejected}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
