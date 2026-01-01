'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { RQ } from '@/lib/firestore/rqs';

interface SupervisorStatsCardsProps {
    storeIds: string[];
}

interface RQBreakdown {
    total: number;
    pending: number;
    approved: number;
    byPuesto: Record<string, number>;
    byModalidad: Record<string, number>;
    byTurno: Record<string, number>;
}

export default function SupervisorStatsCards({ storeIds }: SupervisorStatsCardsProps) {
    const [breakdown, setBreakdown] = useState<RQBreakdown>({
        total: 0,
        pending: 0,
        approved: 0,
        byPuesto: {},
        byModalidad: {},
        byTurno: {}
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadRQs() {
            if (storeIds.length === 0) {
                setLoading(false);
                return;
            }

            try {
                const rqsRef = collection(db, 'rqs');
                const q = query(
                    rqsRef,
                    where('tiendaId', 'in', storeIds.slice(0, 10)) // Firestore limit
                );

                const snapshot = await getDocs(q);
                const rqs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RQ));

                // Calculate breakdowns
                const newBreakdown: RQBreakdown = {
                    total: 0,
                    pending: 0,
                    approved: 0,
                    byPuesto: {},
                    byModalidad: {},
                    byTurno: {}
                };

                rqs.forEach(rq => {
                    // Skip cancelled RQs
                    if (rq.status === 'cancelled') return;

                    newBreakdown.total++;
                    // Count by approval status
                    const isApprovedByMe = rq.approvalChain?.some(a => a.level === 2 && a.status === 'approved');

                    if (rq.currentApprovalLevel === 2 && rq.approvalStatus === 'pending') {
                        newBreakdown.pending++;
                    } else if (isApprovedByMe || rq.approvalStatus === 'approved') {
                        newBreakdown.approved++;
                    }

                    // Count by puesto
                    const puesto = rq.puesto || 'Sin especificar';
                    newBreakdown.byPuesto[puesto] = (newBreakdown.byPuesto[puesto] || 0) + 1;

                    // Count by modalidad
                    const modalidad = rq.modalidad || 'Sin especificar';
                    newBreakdown.byModalidad[modalidad] = (newBreakdown.byModalidad[modalidad] || 0) + 1;

                    // Count by turno
                    const turno = rq.turno || 'Sin especificar';
                    newBreakdown.byTurno[turno] = (newBreakdown.byTurno[turno] || 0) + 1;
                });

                setBreakdown(newBreakdown);
            } catch (error) {
                console.error('Error loading RQs:', error);
            } finally {
                setLoading(false);
            }
        }

        loadRQs();
    }, [storeIds]);

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <>
            {/* Main Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-white rounded-lg shadow-lg p-6">
                    <p className="text-sm text-gray-600 mb-1">📋 RQs Pendientes</p>
                    <p className="text-3xl font-bold text-violet-600">{breakdown.pending}</p>
                </div>
                <div className="bg-white rounded-lg shadow-lg p-6">
                    <p className="text-sm text-gray-600 mb-1">✅ RQs Aprobados</p>
                    <p className="text-3xl font-bold text-green-600">{breakdown.approved}</p>
                </div>
                <div className="bg-white rounded-lg shadow-lg p-6">
                    <p className="text-sm text-gray-600 mb-1">🏪 Tiendas Asignadas</p>
                    <p className="text-3xl font-bold text-blue-600">{storeIds.length}</p>
                </div>
            </div>

            {/* Breakdowns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* By Puesto */}
                <div className="bg-white rounded-lg shadow-lg p-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Breakdown por Puesto</h3>
                    <div className="space-y-2">
                        {Object.entries(breakdown.byPuesto).map(([puesto, count]) => (
                            <div key={puesto} className="flex justify-between text-sm">
                                <span className="text-gray-600">{puesto}:</span>
                                <span className="font-semibold text-gray-900">{count}</span>
                            </div>
                        ))}
                        {Object.keys(breakdown.byPuesto).length === 0 && (
                            <p className="text-sm text-gray-400">Sin datos</p>
                        )}
                    </div>
                </div>

                {/* By Modalidad */}
                <div className="bg-white rounded-lg shadow-lg p-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Breakdown por Modalidad</h3>
                    <div className="space-y-2">
                        {Object.entries(breakdown.byModalidad).map(([modalidad, count]) => (
                            <div key={modalidad} className="flex justify-between text-sm">
                                <span className="text-gray-600">{modalidad}:</span>
                                <span className="font-semibold text-gray-900">{count}</span>
                            </div>
                        ))}
                        {Object.keys(breakdown.byModalidad).length === 0 && (
                            <p className="text-sm text-gray-400">Sin datos</p>
                        )}
                    </div>
                </div>

                {/* By Turno */}
                <div className="bg-white rounded-lg shadow-lg p-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Breakdown por Turno</h3>
                    <div className="space-y-2">
                        {Object.entries(breakdown.byTurno).map(([turno, count]) => (
                            <div key={turno} className="flex justify-between text-sm">
                                <span className="text-gray-600">{turno}:</span>
                                <span className="font-semibold text-gray-900">{count}</span>
                            </div>
                        ))}
                        {Object.keys(breakdown.byTurno).length === 0 && (
                            <p className="text-sm text-gray-400">Sin datos</p>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
