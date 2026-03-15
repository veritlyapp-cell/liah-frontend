'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { RQ } from '@/lib/firestore/rqs';
import RQCard from '@/components/RQCard';

interface MarcaApprovedRQsViewProps {
    marcaId: string;
}

export default function MarcaApprovedRQsView({ marcaId }: MarcaApprovedRQsViewProps) {
    const [rqs, setRQs] = useState<RQ[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedStore, setSelectedStore] = useState<string>('all');
    const [dateFilter, setDateFilter] = useState<'semana' | 'mes' | 'todos'>('semana'); // Default to last week
    const [stores, setStores] = useState<{ id: string, name: string }[]>([]);

    useEffect(() => {
        loadApprovedRQs();
    }, [marcaId]);

    async function loadApprovedRQs() {
        if (!marcaId) {
            setLoading(false);
            return;
        }

        try {
            const rqsRef = collection(db, 'rqs');
            const q = query(
                rqsRef,
                where('marcaId', '==', marcaId),
                where('approvalStatus', '==', 'approved')
            );

            const snapshot = await getDocs(q);
            const approvedRQs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as RQ));

            // Sort by most recent first
            approvedRQs.sort((a, b) => {
                const aTime = a.updatedAt?.toMillis?.() || 0;
                const bTime = b.updatedAt?.toMillis?.(

                ) || 0;
                return bTime - aTime;
            });

            setRQs(approvedRQs);

            // Extract unique stores
            const uniqueStores = new Map<string, string>();
            approvedRQs.forEach(rq => {
                if (rq.tiendaId && rq.tiendaNombre) {
                    uniqueStores.set(rq.tiendaId, rq.tiendaNombre);
                }
            });
            setStores(Array.from(uniqueStores.entries()).map(([id, name]) => ({ id, name })));
        } catch (error) {
            console.error('Error loading approved RQs:', error);
        } finally {
            setLoading(false);
        }
    }

    // Filter by selected store and date
    const filteredRQs = rqs.filter(rq => {
        // Store filter
        if (selectedStore !== 'all' && rq.tiendaId !== selectedStore) return false;

        // Date filter
        if (dateFilter !== 'todos') {
            const createdAt = rq.createdAt?.toDate ? rq.createdAt.toDate() : new Date(rq.createdAt);
            const now = new Date();
            const diffDays = (now.getTime() - createdAt.getTime()) / (1000 * 3600 * 24);
            if (dateFilter === 'semana' && diffDays > 7) return false;
            if (dateFilter === 'mes' && diffDays > 30) return false;
        }

        return true;
    });

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
                    <option value="all">Todas las tiendas ({stores.length})</option>
                    {stores.map(store => (
                        <option key={store.id} value={store.id}>
                            {store.name}
                        </option>
                    ))}
                </select>

                <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value as any)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-violet-500 focus:border-violet-500 ml-2"
                >
                    <option value="semana">📅 Última Semana</option>
                    <option value="mes">📅 Último Mes</option>
                    <option value="todos">📅 Todo el Historial</option>
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
                            userRole="jefe_marca"
                            onUpdate={loadApprovedRQs}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
