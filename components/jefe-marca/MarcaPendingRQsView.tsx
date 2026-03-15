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
    const [dateFilter, setDateFilter] = useState<'semana' | 'mes' | 'todos'>('semana'); // Default to last week
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
                <p className="mt-4 text-gray-600">Cargando RQs pendientes...</p>
            </div>
        );
    }

    return (
        <div>
            <div className="space-y-6">
                {/* Toolbar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                    <div className="flex flex-wrap items-center gap-4">
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

                        {/* Date Filter */}
                        <select
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value as any)}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-violet-500 focus:border-violet-500"
                        >
                            <option value="semana">📅 Última Semana</option>
                            <option value="mes">📅 Último Mes</option>
                            <option value="todos">📅 Todo el Historial</option>
                        </select>
                    </div>

                    {/* Action Buttons - Desktop only */}
                    <div className="hidden md:flex gap-2">
                        <button
                            onClick={handleBulkApprove}
                            disabled={selectedRQs.size === 0 || approving}
                            className="px-6 py-2 bg-violet-600 text-white rounded-lg font-semibold hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {approving ? 'Aprobando...' : `✅ Aprobar ${selectedRQs.size} RQ(s)`}
                        </button>

                        <button
                            onClick={() => setShowRejectModal(true)}
                            disabled={selectedRQs.size === 0}
                            className="px-6 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            ❌ Rechazar {selectedRQs.size} RQ(s)
                        </button>
                    </div>
                </div>

                {/* Mobile Floating Action Bar */}
                {selectedRQs.size > 0 && (
                    <div className="md:hidden fixed bottom-24 left-6 right-6 z-[60] animate-in slide-in-from-bottom-10 fade-in duration-300">
                        <div className="bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-gray-200 p-4 flex flex-col gap-3">
                            <div className="text-center">
                                <span className="text-sm font-bold text-gray-900">{selectedRQs.size} seleccionados</span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowRejectModal(true)}
                                    disabled={rejecting || approving}
                                    className="flex-1 py-3 bg-red-50 text-red-600 rounded-xl font-bold text-sm transition-all active:scale-95"
                                >
                                    ❌ Rechazar
                                </button>
                                <button
                                    onClick={handleBulkApprove}
                                    disabled={approving || rejecting}
                                    className="flex-1 py-3 bg-violet-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-violet-200 transition-all active:scale-95"
                                >
                                    {approving ? '...' : '✅ Aprobar'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

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
                                        onApprove={async (id) => {
                                            const res = await bulkApproveRQs([id], jefeId, jefeNombre, 'jefe_marca');
                                            if (res.approved > 0) loadPendingRQs();
                                        }}
                                        onReject={async (id, reason) => {
                                            const res = await bulkRejectRQs([id], jefeId, jefeNombre, 'jefe_marca', reason);
                                            if (res.rejected > 0) loadPendingRQs();
                                        }}
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
        </div >
    );
}
