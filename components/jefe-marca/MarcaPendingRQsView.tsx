'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { RQ } from '@/lib/firestore/rqs';
import { bulkApproveRQs, bulkRejectRQs } from '@/lib/firestore/rq-approval';
import RQCard from '@/components/RQCard';

interface MarcaPendingRQsViewProps {
    marcaId: string;
    jefeId: string;
    jefeNombre: string;
}

export default function MarcaPendingRQsView({ marcaId, jefeId, jefeNombre }: MarcaPendingRQsViewProps) {
    const [rqs, setRQs] = useState<RQ[]>([]);
    const [selectedRQs, setSelectedRQs] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [approving, setApproving] = useState(false);
    const [rejecting, setRejecting] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [selectedStore, setSelectedStore] = useState<string>('all');
    const [stores, setStores] = useState<{ id: string, name: string }[]>([]);

    useEffect(() => {
        loadPendingRQs();
    }, [marcaId]);

    async function loadPendingRQs() {
        if (!marcaId) {
            setLoading(false);
            return;
        }

        try {
            const rqsRef = collection(db, 'rqs');
            const q = query(
                rqsRef,
                where('marcaId', '==', marcaId),
                where('currentApprovalLevel', '==', 3), // Pending jefe de marca approval
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

            // Extract unique stores
            const uniqueStores = new Map<string, string>();
            pendingRQs.forEach(rq => {
                if (rq.tiendaId && rq.tiendaNombre) {
                    uniqueStores.set(rq.tiendaId, rq.tiendaNombre);
                }
            });
            setStores(Array.from(uniqueStores.entries()).map(([id, name]) => ({ id, name })));
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
            `¿Aprobar ${selectedRQs.size} RQ(s)? Quedarán listos para reclutamiento.`
        );

        if (!confirmed) return;

        setApproving(true);
        try {
            const result = await bulkApproveRQs(
                Array.from(selectedRQs),
                jefeId,
                jefeNombre,
                'jefe_marca'
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
        if (selectedRQs.size === 0 || !rejectReason.trim()) return;

        setRejecting(true);
        try {
            const result = await bulkRejectRQs(
                Array.from(selectedRQs),
                jefeId,
                jefeNombre,
                'jefe_marca',
                rejectReason
            );

            if (result.failed.length > 0) {
                alert(`Rechazados: ${result.rejected}\nFallaron: ${result.failed.length}`);
            } else {
                alert(`❌ ${result.rejected} RQ(s) rechazados`);
            }

            // Reset and reload
            setSelectedRQs(new Set());
            setShowRejectModal(false);
            setRejectReason('');
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
                        <option value="all">Todas las tiendas ({stores.length})</option>
                        {stores.map(store => (
                            <option key={store.id} value={store.id}>
                                {store.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Bulk Approve Button */}
                <button
                    onClick={handleBulkApprove}
                    disabled={selectedRQs.size === 0 || approving}
                    className="px-6 py-2 bg-violet-600 text-white rounded-lg font-semibold hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {approving ? 'Aprobando...' : `✅ Aprobar ${selectedRQs.size} RQ(s)`}
                </button>

                {/* Bulk Reject Button */}
                <button
                    onClick={() => setShowRejectModal(true)}
                    disabled={selectedRQs.size === 0}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    ❌ Rechazar {selectedRQs.size} RQ(s)
                </button>
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
                                    userRole="jefe_marca"
                                    onUpdate={loadPendingRQs}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Reject Reason Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Motivo del Rechazo</h3>
                        <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Escribe el motivo del rechazo..."
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                            rows={4}
                        />
                        <div className="flex gap-3 mt-4">
                            <button
                                onClick={() => { setShowRejectModal(false); setRejectReason(''); }}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleBulkReject}
                                disabled={!rejectReason.trim() || rejecting}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50"
                            >
                                {rejecting ? 'Rechazando...' : 'Confirmar Rechazo'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
