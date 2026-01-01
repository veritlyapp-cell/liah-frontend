'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { RQ } from '@/lib/firestore/rqs';
import RQCard from '@/components/RQCard';

interface ApprovedRQsViewProps {
    storeIds: string[];
    storeNames: string[];
}

export default function ApprovedRQsView({ storeIds, storeNames }: ApprovedRQsViewProps) {
    const [rqs, setRQs] = useState<RQ[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedStore, setSelectedStore] = useState<string>('all');

    useEffect(() => {
        loadApprovedRQs();
    }, [storeIds]);

    async function loadApprovedRQs() {
        if (storeIds.length === 0) {
            setLoading(false);
            return;
        }

        try {
            const rqsRef = collection(db, 'rqs');

            // Get RQs from supervisor's stores that have progressed past supervisor level
            // (currentApprovalLevel >= 3 means supervisor already approved)
            const q = query(
                rqsRef,
                where('tiendaId', 'in', storeIds.slice(0, 10))
            );

            const snapshot = await getDocs(q);
            const approvedRQs = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as RQ))
                .filter(rq => {
                    // Skip cancelled RQs
                    if (rq.status === 'cancelled') return false;

                    // Show RQs where supervisor has approved (level 2 approved in chain)
                    const supervisorApproval = rq.approvalChain?.find(a => a.level === 2);
                    return supervisorApproval?.status === 'approved';
                });

            // Sort by most recent first
            approvedRQs.sort((a, b) => {
                const aTime = a.updatedAt?.toMillis?.() || 0;
                const bTime = b.updatedAt?.toMillis?.() || 0;
                return bTime - aTime;
            });

            setRQs(approvedRQs);
        } catch (error) {
            console.error('Error loading approved RQs:', error);
        } finally {
            setLoading(false);
        }
    }

    // Filter by selected store
    const filteredRQs = selectedStore === 'all'
        ? rqs
        : rqs.filter(rq => rq.tiendaId === selectedStore);

    if (loading) {
        return (
            <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Cargando RQs aprobados...</p>
            </div>
        );
    }

    return (
        <div>
            {/* Filter */}
            <div className="mb-6">
                <select
                    value={selectedStore}
                    onChange={(e) => setSelectedStore(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-violet-500 focus:border-violet-500"
                >
                    <option value="all">Todas las tiendas ({storeNames.length})</option>
                    {storeNames.map((name, idx) => (
                        <option key={storeIds[idx]} value={storeIds[idx]}>
                            {name}
                        </option>
                    ))}
                </select>
            </div>

            {/* RQs List */}
            {filteredRQs.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <p className="text-gray-500 text-lg">📋 No hay RQs aprobados aún</p>
                    <p className="text-gray-400 text-sm mt-2">Los RQs que apruebes aparecerán aquí</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredRQs.map(rq => (
                        <RQCard
                            key={rq.id}
                            rq={rq}
                            userRole="supervisor"
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
