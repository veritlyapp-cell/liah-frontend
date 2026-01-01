'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { RQ } from '@/lib/firestore/rqs';
import { rejectRQ } from '@/lib/firestore/rqs';
import { useAuth } from '@/contexts/AuthContext';

interface RQTrackingViewProps {
    holdingId: string;
    marcas: { id: string; nombre: string }[];
}

export default function RQTrackingView({ holdingId, marcas }: RQTrackingViewProps) {
    const { user, claims } = useAuth();
    const [rqs, setRQs] = useState<RQ[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [marcaFilter, setMarcaFilter] = useState<string>('all');
    const [rejecting, setRejecting] = useState<string | null>(null);

    useEffect(() => {
        loadRQs();
    }, [marcas]);

    async function loadRQs() {
        if (marcas.length === 0) {
            setLoading(false);
            return;
        }

        try {
            const rqsRef = collection(db, 'rqs');
            const marcaIds = marcas.map(m => m.id).slice(0, 10);

            const q = query(
                rqsRef,
                where('marcaId', 'in', marcaIds)
            );

            const snapshot = await getDocs(q);
            const loadedRQs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as RQ)).filter(rq => rq.status !== 'cancelled');

            // Sort by createdAt descending
            loadedRQs.sort((a, b) => {
                const aTime = a.createdAt?.toMillis?.() || 0;
                const bTime = b.createdAt?.toMillis?.() || 0;
                return bTime - aTime;
            });

            setRQs(loadedRQs);
        } catch (error) {
            console.error('Error loading RQs:', error);
        } finally {
            setLoading(false);
        }
    }

    // Filter RQs
    const filteredRQs = rqs.filter(rq => {
        // Search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const matchesSearch =
                rq.posicion?.toLowerCase().includes(term) ||
                rq.tiendaNombre?.toLowerCase().includes(term) ||
                rq.marcaNombre?.toLowerCase().includes(term) ||
                rq.rqNumber?.toLowerCase().includes(term) ||
                rq.id?.toLowerCase().includes(term);
            if (!matchesSearch) return false;
        }

        // Status filter
        if (statusFilter !== 'all') {
            if (statusFilter === 'pending' && rq.approvalStatus !== 'pending') return false;
            if (statusFilter === 'approved' && (rq.approvalStatus !== 'approved' || rq.status === 'closed' || rq.status === 'filled')) return false;
            if (statusFilter === 'rejected' && rq.approvalStatus !== 'rejected') return false;
            if (statusFilter === 'closed' && rq.status !== 'closed' && rq.status !== 'filled') return false;
        }

        // Marca filter
        if (marcaFilter !== 'all' && rq.marcaId !== marcaFilter) return false;

        return true;
    });

    function getStatusBadge(rq: RQ) {
        // Check if closed (candidate hired) or filled
        if (rq.status === 'closed' || rq.status === 'filled') {
            return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">✅ Cerrado</span>;
        }
        if (rq.approvalStatus === 'approved') {
            return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">✅ Aprobado</span>;
        }
        if (rq.approvalStatus === 'rejected') {
            return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">❌ Rechazado</span>;
        }

        // Pending - show current level
        const levels = ['', 'Tienda', 'Supervisor', 'Jefe Marca'];
        const currentLevel = rq.currentApprovalLevel || 1;
        return (
            <span className="px-2 py-1 text-xs rounded-full bg-amber-100 text-amber-800">
                ⏳ Esperando: {levels[currentLevel] || 'Nivel ' + currentLevel}
            </span>
        );
    }

    function formatDate(timestamp: any) {
        if (!timestamp) return '-';
        const date = timestamp.toDate?.() || new Date(timestamp);
        return date.toLocaleDateString('es-PE', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    }

    async function handleReject(rqId: string) {
        const reason = prompt('Motivo de rechazo (se devolverá al Jefe de Marca):');
        if (!reason || !user) return;

        setRejecting(rqId);
        try {
            await rejectRQ(rqId, user.uid, user.email || '', reason);
            // Reload RQs after rejection
            await loadRQs();
        } catch (error) {
            console.error('Error rejecting RQ:', error);
            alert('Error al rechazar el RQ');
        } finally {
            setRejecting(null);
        }
    }

    // Recruiters and Client Admins can reject approved RQs
    const canRejectRQs = claims?.role === 'recruiter' || claims?.role === 'client_admin';

    if (loading) {
        return (
            <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Cargando RQs...</p>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900">Seguimiento de Requerimientos</h2>
                <p className="text-sm text-gray-500">Visualiza el estado de todos los RQs de tus marcas</p>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Search */}
                    <div className="md:col-span-2">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="🔍 Buscar por posición, tienda, marca o ID..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-violet-500 focus:border-violet-500"
                        />
                    </div>

                    {/* Status Filter */}
                    <div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-violet-500 focus:border-violet-500"
                        >
                            <option value="all">Todos los estados</option>
                            <option value="pending">⏳ Pendientes</option>
                            <option value="approved">✅ Aprobados</option>
                            <option value="closed">🔒 Cerrados (Ingreso confirmado)</option>
                            <option value="rejected">❌ Rechazados</option>
                        </select>
                    </div>

                    {/* Marca Filter */}
                    <div>
                        <select
                            value={marcaFilter}
                            onChange={(e) => setMarcaFilter(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-violet-500 focus:border-violet-500"
                        >
                            <option value="all">Todas las marcas</option>
                            {marcas.map(m => (
                                <option key={m.id} value={m.id}>{m.nombre}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-5 gap-4 mb-6">
                <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
                    <p className="text-2xl font-bold text-gray-900">{rqs.length}</p>
                    <p className="text-sm text-gray-500">Total RQs</p>
                </div>
                <div className="bg-amber-50 rounded-lg border border-amber-200 p-4 text-center">
                    <p className="text-2xl font-bold text-amber-700">{rqs.filter(r => r.approvalStatus === 'pending').length}</p>
                    <p className="text-sm text-amber-600">Pendientes</p>
                </div>
                <div className="bg-green-50 rounded-lg border border-green-200 p-4 text-center">
                    <p className="text-2xl font-bold text-green-700">{rqs.filter(r => r.approvalStatus === 'approved' && r.status !== 'closed').length}</p>
                    <p className="text-sm text-green-600">Aprobados</p>
                </div>
                <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 text-center">
                    <p className="text-2xl font-bold text-blue-700">{rqs.filter(r => r.status === 'closed' || r.status === 'filled').length}</p>
                    <p className="text-sm text-blue-600">Cerrados</p>
                </div>
                <div className="bg-red-50 rounded-lg border border-red-200 p-4 text-center">
                    <p className="text-2xl font-bold text-red-700">{rqs.filter(r => r.approvalStatus === 'rejected' && r.status !== 'cancelled').length}</p>
                    <p className="text-sm text-red-600">Rechazados</p>
                </div>
            </div>

            {/* RQs Table */}
            {filteredRQs.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <p className="text-gray-500 text-lg">📋 No hay RQs que mostrar</p>
                    <p className="text-gray-400 text-sm mt-2">
                        {searchTerm || statusFilter !== 'all' || marcaFilter !== 'all'
                            ? 'Intenta ajustar los filtros de búsqueda'
                            : 'Los Store Managers crearán RQs desde sus dashboards'}
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">RQ #</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tienda</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Posición</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider text-center">Vacantes</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                                {canRejectRQs && (
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acción</th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredRQs.map(rq => (
                                <tr key={rq.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-violet-700">
                                        {rq.rqNumber || `#${String(rq.instanceNumber || 1).padStart(3, '0')}`}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">{rq.tiendaNombre}</div>
                                        <div className="text-xs text-gray-500">{rq.marcaNombre}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{rq.posicion}</div>
                                        <div className="text-xs text-gray-400">ID: {rq.id.slice(-6)}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                                        {rq.vacantes}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {getStatusBadge(rq)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {formatDate(rq.createdAt)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {/* Can reject if approved and NOT closed/filled/cancelled */}
                                        {rq.approvalStatus === 'approved' && rq.status !== 'closed' && rq.status !== 'filled' && rq.status !== 'cancelled' ? (
                                            <button
                                                onClick={() => handleReject(rq.id)}
                                                disabled={rejecting === rq.id}
                                                className="px-3 py-1 bg-orange-600 text-white rounded text-xs font-medium hover:bg-orange-700 transition-colors disabled:opacity-50"
                                            >
                                                {rejecting === rq.id ? 'Procesando...' : '↩ Rechazar'}
                                            </button>
                                        ) : (
                                            <span className="text-xs text-gray-400">-</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Result Count */}
            <p className="text-sm text-gray-500 mt-4">
                Mostrando {filteredRQs.length} de {rqs.length} RQs
            </p>
        </div>
    );
}
