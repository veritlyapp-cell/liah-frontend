'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { RQ } from '@/lib/firestore/rqs';
import { rejectRQ } from '@/lib/firestore/rqs';
import { useAuth } from '@/contexts/AuthContext';
import InviteCandidateModal from '@/components/InviteCandidateModal';
import { exportRQsExcel } from '@/lib/utils/export-excel';
import AdminCreateRQFlow from '@/components/admin/AdminCreateRQFlow';
import { BarChart3, FileText, LayoutDashboard, Search, Filter, Monitor, Clock, ChevronRight, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface RQTrackingViewProps {
    holdingId: string;
    marcas: { id: string; nombre: string }[];
    allowedStoreIds?: string[];
}

export default function RQTrackingView({ holdingId, marcas, allowedStoreIds }: RQTrackingViewProps) {
    const { user, claims } = useAuth();
    const [rqs, setRQs] = useState<RQ[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('active'); // Default to active (pending or approved, not closed)
    const [marcaFilter, setMarcaFilter] = useState<string>('all');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [dateFilter, setDateFilter] = useState<'semana' | 'mes' | 'todos'>('semana'); // Default to last week
    const [rejecting, setRejecting] = useState<string | null>(null);
    const [selectedRQForInvite, setSelectedRQForInvite] = useState<RQ | null>(null);
    const [selectedRQForHistory, setSelectedRQForHistory] = useState<RQ | null>(null);
    const [showCreateFlow, setShowCreateFlow] = useState(false);

    useEffect(() => {
        loadRQs();
    }, [marcas, allowedStoreIds]);

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
            let loadedRQs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as RQ)).filter(rq => rq.status !== 'cancelled');

            // If allowedStoreIds is provided, filter the RQs to only include those belonging to the allowed stores
            if (allowedStoreIds) {
                const allowedSet = new Set(allowedStoreIds);
                loadedRQs = loadedRQs.filter(rq => rq.tiendaId && allowedSet.has(rq.tiendaId));
            }

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
            if (statusFilter === 'active') {
                // Show approved (active) and pending
                const isApprovedNotClosed = rq.approvalStatus === 'approved' && rq.status !== 'closed' && rq.status !== 'filled';
                const isPending = rq.approvalStatus === 'pending';
                if (!isApprovedNotClosed && !isPending) return false;
            } else {
                if (statusFilter === 'pending' && rq.approvalStatus !== 'pending') return false;
                if (statusFilter === 'approved' && (rq.approvalStatus !== 'approved' || rq.status === 'closed' || rq.status === 'filled')) return false;
                if (statusFilter === 'rejected' && rq.approvalStatus !== 'rejected') return false;
                if (statusFilter === 'closed' && rq.status !== 'closed' && rq.status !== 'filled') return false;
            }
        }

        // Marca filter
        if (marcaFilter !== 'all' && rq.marcaId !== marcaFilter) return false;

        // Category filter
        if (categoryFilter !== 'all') {
            if (categoryFilter === 'operativo' && rq.categoria === 'gerencial') return false;
            if (categoryFilter === 'gerencial' && rq.categoria !== 'gerencial') return false;
        }

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

    function getStatusBadge(rq: RQ) {
        if (rq.status === 'filled') {
            return (
                <div className="soft-badge-emerald">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Cubierto
                </div>
            );
        }
        if (rq.status === 'closed') {
            return (
                <div className="soft-badge-slate">
                    Cerrado
                </div>
            );
        }
        if (rq.approvalStatus === 'approved') {
            return (
                <div className="soft-badge-brand">
                    Aprobado
                </div>
            );
        }
        if (rq.approvalStatus === 'rejected') {
            return (
                <div className="soft-badge-rose">
                    Rechazado
                </div>
            );
        }

        const levels = ['', 'Tienda', 'Supervisor', 'Jefe Marca'];
        const currentLevel = rq.currentApprovalLevel || 1;
        return (
            <div className="soft-badge-amber">
                <Clock size={10} className="animate-spin-slow" />
                {levels[currentLevel] || 'Nivel ' + currentLevel}
            </div>
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

    function formatDateTime(timestamp: any) {
        if (!timestamp) return '-';
        const date = timestamp.toDate?.() || new Date(timestamp);
        return date.toLocaleDateString('es-PE', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function getApprovalHistory(rq: RQ) {
        if (!rq.approvalChain || rq.approvalChain.length === 0) {
            return <span className="text-gray-400 text-xs">Sin historial</span>;
        }

        return (
            <div className="space-y-1">
                {rq.approvalChain.filter(step => step.status !== 'pending').map((step, idx) => {
                    const levelNames = ['', 'Tienda', 'Supervisor', 'Jefe Marca'];
                    const statusIcon = step.status === 'approved' ? '✅' : step.status === 'rejected' ? '❌' : '⏳';
                    const statusColor = step.status === 'approved' ? 'text-green-700' : step.status === 'rejected' ? 'text-red-700' : 'text-gray-500';

                    return (
                        <div key={idx} className="text-xs">
                            <span className={statusColor}>{statusIcon} {levelNames[step.level] || `Nivel ${step.level}`}</span>
                            {step.approvedByName && (
                                <span className="text-gray-500"> - {step.approvedByName}</span>
                            )}
                            {step.approvedAt && (
                                <span className="text-gray-400"> ({formatDateTime(step.approvedAt)})</span>
                            )}
                            {step.rejectionReason && (
                                <div className="text-red-500 text-xs italic ml-4">"{step.rejectionReason}"</div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    }

    async function handleReject(rqId: string) {
        const reason = prompt('Motivo de rechazo (se devolverá al Jefe de Marca):');
        if (!reason || !user) return;

        setRejecting(rqId);
        try {
            await rejectRQ(rqId, user.uid, user.email || '', reason);
            await loadRQs();
        } catch (error) {
            console.error('Error rejecting RQ:', error);
            alert('Error al rechazar el RQ');
        } finally {
            setRejecting(null);
        }
    }

    const canRejectRQs = claims?.role === 'recruiter' || claims?.role === 'client_admin';
    const canCreateRQs = claims?.role === 'super_admin' || claims?.role === 'admin' || claims?.role === 'client_admin';

    if (loading) {
        return (
            <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Cargando RQs...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Context Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic mb-1">
                        Seguimiento de RQs
                    </h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Gestión centralizada de requerimientos activos
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => exportRQsExcel(filteredRQs)}
                        className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
                    >
                        <BarChart3 size={16} />
                        Exportar Excel
                    </button>
                    {canCreateRQs && (
                        <button
                            onClick={() => setShowCreateFlow(true)}
                            className="px-6 py-2.5 brand-bg text-white rounded-xl text-xs font-black uppercase tracking-widest hover:brightness-110 transition-all flex items-center gap-2 shadow-xl shadow-brand/20"
                        >
                            <FileText size={16} />
                            Crear Nuevo RQ
                        </button>
                    )}
                </div>
            </div>

            {/* Premium Stats Widgets */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                    { label: 'Total RQs', val: rqs.length, color: 'slate' },
                    { label: 'Pendientes', val: rqs.filter(r => r.approvalStatus === 'pending').length, color: 'amber' },
                    { label: 'Aprobados', val: rqs.filter(r => r.approvalStatus === 'approved' && r.status !== 'closed').length, color: 'emerald' },
                    { label: 'Cerrados', val: rqs.filter(r => r.status === 'closed' || r.status === 'filled').length, color: 'slate' },
                    { label: 'Rechazados', val: rqs.filter(r => r.approvalStatus === 'rejected').length, color: 'rose' },
                ].map((stat, i) => (
                    <div key={i} className="white-label-card p-6 flex flex-col items-center justify-center text-center group hover:border-brand/30 transition-all">
                        <span className={`text-3xl font-black italic tracking-tighter text-${stat.color}-500 mb-1 group-hover:scale-110 transition-transform`}>
                            {stat.val}
                        </span>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                            {stat.label}
                        </span>
                    </div>
                ))}
            </div>

            {/* Intelligent Filters */}
            <div className="white-label-card p-4">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex-1 min-w-[280px] relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</div>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar por tienda, posición o número..."
                            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand focus:bg-white transition-all outline-none"
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 outline-none hover:bg-slate-100 transition-all"
                        >
                            <option value="active">RQs Activos</option>
                            <option value="all">Filtro Estado: Todos</option>
                            <option value="pending">Pendientes</option>
                            <option value="approved">Aprobados</option>
                            <option value="closed">Cerrados</option>
                            <option value="rejected">Rechazados</option>
                        </select>

                        <select
                            value={marcaFilter}
                            onChange={(e) => setMarcaFilter(e.target.value)}
                            className="px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 outline-none hover:bg-slate-100 transition-all"
                        >
                            <option value="all">Todas las Marcas</option>
                            {marcas.map(m => (
                                <option key={m.id} value={m.id}>{m.nombre}</option>
                            ))}
                        </select>

                        <select
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value as any)}
                            className="px-4 py-2.5 bg-blue-50 border border-blue-100 text-blue-600 rounded-xl text-xs font-black uppercase tracking-widest outline-none hover:bg-blue-100 transition-all"
                        >
                            <option value="semana">📅 Última Semana</option>
                            <option value="mes">📅 Último Mes</option>
                            <option value="todos">📅 Todo el Historial</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Premium Table Container */}
            {filteredRQs.length === 0 ? (
                <div className="white-label-card py-20 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                        <Search className="text-slate-300" size={32} />
                    </div>
                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No se encontraron requerimientos</p>
                    <p className="text-xs text-slate-400 mt-2">Prueba ajustando los filtros de búsqueda</p>
                </div>
            ) : (
                <div className="white-label-card overflow-hidden">
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-100">
                            <thead>
                                <tr className="bg-slate-50/50">
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Referencia</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Contexto</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Vacantes</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Estado</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Creado</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Aprobación</th>
                                    <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredRQs.map(rq => (
                                    <tr key={rq.id} className="group hover:bg-slate-50/80 transition-all">
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-slate-900 group-hover:text-brand transition-colors italic">
                                                    {rq.rqNumber || `#${rq.id.slice(-6)}`}
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{rq.categoria || 'OPERATIVO'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-700">{rq.posicion}</span>
                                                <span className="text-xs text-slate-400">{rq.tiendaNombre}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-black text-slate-900">{rq.vacantes}</span>
                                                <Monitor size={12} className="text-slate-300" />
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            {getStatusBadge(rq)}
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2 text-slate-500">
                                                <Clock size={12} />
                                                <span className="text-xs font-medium">{formatDate(rq.createdAt)}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            {rq.approvalChain && rq.approvalChain.length > 0 ? (
                                                <button
                                                    onClick={() => setSelectedRQForHistory(rq)}
                                                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg text-[10px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-200 transition-all"
                                                >
                                                    Historial
                                                    <ChevronRight size={10} />
                                                </button>
                                            ) : (
                                                <span className="text-[10px] font-black text-slate-300 uppercase italic">Sin flujo</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {rq.approvalStatus === 'approved' && rq.status !== 'closed' && (
                                                    <button
                                                        onClick={() => setSelectedRQForInvite(rq)}
                                                        className="px-4 py-2 brand-bg text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-brand/10 hover:brightness-110 active:scale-95 transition-all"
                                                    >
                                                        Invitar
                                                    </button>
                                                )}
                                                {canRejectRQs && rq.approvalStatus === 'approved' && rq.status !== 'closed' && (
                                                    <button
                                                        onClick={() => handleReject(rq.id)}
                                                        disabled={rejecting === rq.id}
                                                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-100"
                                                        title="Rechazar"
                                                    >
                                                        {rejecting === rq.id ? '...' : <LayoutDashboard size={18} />}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden divide-y divide-slate-50">
                        {filteredRQs.map(rq => (
                            <div key={rq.id} className="p-4 space-y-4">
                                <div className="flex justify-between items-start">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-black text-slate-900 italic">
                                            {rq.rqNumber || `#${rq.id.slice(-6)}`}
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">{rq.categoria || 'OPERATIVO'}</span>
                                    </div>
                                    {getStatusBadge(rq)}
                                </div>

                                <div className="space-y-1">
                                    <p className="text-sm font-bold text-slate-700">{rq.posicion}</p>
                                    <p className="text-xs text-slate-500 flex items-center gap-1.5">
                                        <Building2 size={12} className="text-slate-300" />
                                        {rq.tiendaNombre}
                                    </p>
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                            <Monitor size={12} className="text-slate-300" />
                                            <span className="font-bold">{rq.vacantes}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                                            <Clock size={12} className="text-slate-300" />
                                            {formatDate(rq.createdAt)}
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        {rq.approvalChain && rq.approvalChain.length > 0 && (
                                            <button
                                                onClick={() => setSelectedRQForHistory(rq)}
                                                className="p-2 bg-slate-100 rounded-lg text-slate-400"
                                            >
                                                <Clock size={16} />
                                            </button>
                                        )}
                                        {rq.approvalStatus === 'approved' && rq.status !== 'closed' && (
                                            <button
                                                onClick={() => setSelectedRQForInvite(rq)}
                                                className="px-4 py-2 brand-bg text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-brand/10"
                                            >
                                                Invitar
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            )}

            {/* Invite Modal */}
            {selectedRQForInvite && (
                <InviteCandidateModal
                    isOpen={true}
                    onClose={() => setSelectedRQForInvite(null)}
                    storeId={selectedRQForInvite.tiendaId || ''}
                    storeName={selectedRQForInvite.tiendaNombre || ''}
                    marcaId={selectedRQForInvite.marcaId}
                    marcaNombre={selectedRQForInvite.marcaNombre}
                    initialRQId={selectedRQForInvite.id}
                />
            )}

            {/* History Modal - Premium Glass Refresh */}
            {selectedRQForHistory && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="bg-white rounded-[2.5rem] shadow-2xl max-w-lg w-full overflow-hidden border border-white"
                    >
                        <div className="px-10 py-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">Historial de Aprobaciones</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">RQ ID: {selectedRQForHistory.rqNumber || selectedRQForHistory.id}</p>
                            </div>
                            <button
                                onClick={() => setSelectedRQForHistory(null)}
                                className="w-10 h-10 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-sm"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="p-10">
                            <div className="space-y-6">
                                {selectedRQForHistory.approvalChain?.filter(step => step.status !== 'pending').map((step, idx) => {
                                    const levelNames = ['', 'Tienda', 'Supervisor', 'Jefe Marca'];
                                    const isApproved = step.status === 'approved';
                                    const badgeClass = isApproved ? 'soft-badge-emerald' : 'soft-badge-rose';

                                    return (
                                        <div key={idx} className="flex gap-6 relative">
                                            {idx !== selectedRQForHistory.approvalChain!.length - 1 && (
                                                <div className="absolute left-6 top-12 w-0.5 h-10 bg-slate-100" />
                                            )}
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm border ${isApproved ? 'bg-emerald-50 border-emerald-100 text-emerald-500' : 'bg-rose-50 border-rose-100 text-rose-500'}`}>
                                                {isApproved ? '✓' : '✕'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-3 mb-1">
                                                    <p className="text-sm font-black text-slate-900 uppercase italic tracking-tight">{levelNames[step.level] || `Nivel ${step.level}`}</p>
                                                    <div className={badgeClass}>{isApproved ? 'Aprobado' : 'Rechazado'}</div>
                                                </div>
                                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-none mb-2">
                                                    {step.approvedByName || 'System Auto-Proc'}
                                                </p>
                                                <div className="inline-flex items-center gap-1.5 text-[9px] font-black text-slate-300 uppercase tracking-widest">
                                                    <Clock size={10} />
                                                    {formatDateTime(step.approvedAt)}
                                                </div>
                                                {step.rejectionReason && (
                                                    <div className="mt-4 p-4 bg-rose-50/50 rounded-2xl border border-rose-100/50 text-rose-600 text-xs italic font-medium leading-relaxed">
                                                        "{step.rejectionReason}"
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <button
                                onClick={() => setSelectedRQForHistory(null)}
                                className="w-full h-14 bg-slate-900 text-white rounded-[1.25rem] font-black uppercase tracking-[0.2em] text-[10px] mt-10 hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-slate-900/20"
                            >
                                Entendido
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Create RQ Flow Modal (Admins) */}
            {showCreateFlow && (
                <AdminCreateRQFlow
                    holdingId={holdingId}
                    marcas={marcas}
                    onClose={() => setShowCreateFlow(false)}
                    onSuccess={() => {
                        setShowCreateFlow(false);
                        loadRQs(); // Refresh the list
                    }}
                />
            )}

            <p className="text-sm text-gray-500 mt-4">
                Mostrando {filteredRQs.length} de {rqs.length} RQs
            </p>
        </div>
    );
}
