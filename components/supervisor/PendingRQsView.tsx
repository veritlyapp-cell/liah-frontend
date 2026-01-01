'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { RQ } from '@/lib/firestore/rqs';
import { bulkApproveRQs, bulkRejectRQs } from '@/lib/firestore/rq-approval';
import RQCard from '@/components/RQCard';

interface PendingRQsViewProps {
    storeIds: string[];
    storeNames: string[];
    supervisorId: string;
    supervisorName: string;
}

export default function PendingRQsView({ storeIds, storeNames, supervisorId, supervisorName }: PendingRQsViewProps) {
    const [rqs, setRQs] = useState<RQ[]>([]);
    const [selectedRQs, setSelectedRQs] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [approving, setApproving] = useState(false);
    const [rejecting, setRejecting] = useState(false);
    const [selectedStore, setSelectedStore] = useState<string>('all');

    useEffect(() => {
        loadPendingRQs();
    }, [storeIds]);

    async function loadPendingRQs() {
        if (storeIds.length === 0) {
            setLoading(false);
            return;
        }

        try {
            const rqsRef = collection(db, 'rqs');
            const q = query(
                rqsRef,
                where('tiendaId', 'in', storeIds.slice(0, 10)), // Firestore limit
                where('currentApprovalLevel', '==', 2), // Pending supervisor approval
                where('approvalStatus', '==', 'pending')
            );

            const snapshot = await getDocs(q);
            const pendingRQs = snapshot.docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as RQ))
                .filter(rq => rq.status !== 'cancelled');

            setRQs(pendingRQs);
        } catch (error) {
            console.error('Error loading pending RQs:', error);
        } finally {
            setLoading(false);
        }
    }

    function toggleSelectRQ(rqId: string) {
        const newSelected = new Set(selectedRQs);
        if (newSelected.has(rqId)) {
            newSelected.delete(rqId);
        } else {
            newSelected.add(rqId);
        }
        setSelectedRQs(newSelected);
    }

    function selectAll() {
        if (selectedRQs.size === filteredRQs.length) {
            setSelectedRQs(new Set());
        } else {
            setSelectedRQs(new Set(filteredRQs.map(rq => rq.id)));
        }
    }

    async function handleBulkApprove() {
        if (selectedRQs.size === 0) return;

        const confirmed = confirm(
            `¿Aprobar ${selectedRQs.size} RQ(s)? Serán enviados a Jefe de Marca para aprobación final.`
        );

        if (!confirmed) return;

        setApproving(true);
        try {
            const result = await bulkApproveRQs(
                Array.from(selectedRQs),
                supervisorId,
                supervisorName,
                'supervisor'
            );

            if (result.failed.length > 0) {
                alert(`Aprobados: ${result.approved}\nFallaron: ${result.failed.length}`);
            } else {
                alert(`✅ ${result.approved} RQ(s) aprobados exitosamente`);
            }

            // Reload list
            setSelectedRQs(new Set());
            await loadPendingRQs();
        } catch (error) {
            console.error('Error approving RQs:', error);
            alert('Error al aprobar RQs. Intenta nuevamente.');
        } finally {
            setApproving(false);
        }
    }

    async function handleBulkReject() {
        if (selectedRQs.size === 0) return;

        const reason = prompt(
            `¿Por qué rechazas ${selectedRQs.size} RQ(s)?\n\nEscribe el motivo:`
        );

        if (!reason) return;

        setRejecting(true);
        try {
            const result = await bulkRejectRQs(
                Array.from(selectedRQs),
                supervisorId,
                supervisorName,
                'supervisor',
                reason
            );

            if (result.failed.length > 0) {
                alert(`Rechazados: ${result.rejected}\nFallaron: ${result.failed.length}`);
            } else {
                alert(`❌ ${result.rejected} RQ(s) rechazados`);
            }

            // Reload list
            setSelectedRQs(new Set());
            await loadPendingRQs();
        } catch (error) {
            console.error('Error rejecting RQs:', error);
            alert('Error al rechazar RQs. Intenta nuevamente.');
        } finally {
            setRejecting(false);
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
                <p className="mt-4 text-gray-600">Cargando RQs pendientes...</p>
            </div>
        );
    }

    return (
        <div>
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    {/* Select All Checkbox */}
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={selectedRQs.size === filteredRQs.length && filteredRQs.length > 0}
                            onChange={selectAll}
                            className="w-5 h-5 text-violet-600 rounded focus:ring-violet-500"
                        />
                        <span className="text-sm text-gray-700">
                            Seleccionar todos ({selectedRQs.size} seleccionados)
                        </span>
                    </label>

                    {/* Store Filter */}
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

                {/* Action Buttons */}
                <div className="flex gap-2">
                    <button
                        onClick={handleBulkReject}
                        disabled={selectedRQs.size === 0 || rejecting || approving}
                        className="px-6 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {rejecting ? 'Rechazando...' : `❌ Rechazar ${selectedRQs.size} RQ(s)`}
                    </button>
                    <button
                        onClick={handleBulkApprove}
                        disabled={selectedRQs.size === 0 || approving || rejecting}
                        className="px-6 py-2 bg-violet-600 text-white rounded-lg font-semibold hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {approving ? 'Aprobando...' : `✅ Aprobar ${selectedRQs.size} RQ(s)`}
                    </button>
                </div>
            </div>

            {/* RQs List */}
            {filteredRQs.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <p className="text-gray-500 text-lg">✨ No hay RQs pendientes de aprobación</p>
                    <p className="text-gray-400 text-sm mt-2">Los RQs aprobados aparecerán en la pestaña "RQs Aprobados"</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredRQs.map(rq => (
                        <div key={rq.id} className="flex items-start gap-4">
                            <input
                                type="checkbox"
                                checked={selectedRQs.has(rq.id)}
                                onChange={() => toggleSelectRQ(rq.id)}
                                className="mt-5 w-5 h-5 text-violet-600 rounded focus:ring-violet-500"
                            />
                            <div className="flex-1">
                                <RQCard
                                    rq={rq}
                                    userRole="supervisor"
                                    onUpdate={loadPendingRQs}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
