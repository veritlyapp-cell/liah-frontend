import { useState, useMemo } from 'react';
import { type RQ } from '@/lib/firestore/rqs';
import { exportRQsExcel } from '@/lib/utils/export-excel';
import RQCard from './RQCard';

interface RQListViewProps {
    rqs: RQ[];
    userRole: string;
    pendingCount?: number;
    unfilledCount?: number;
    onApprove?: (rqId: string) => void;
    onBulkApprove?: (rqIds: string[]) => void;
    onReject?: (rqId: string, reason: string) => void;
    onBulkReject?: (rqIds: string[], reason: string) => void;
    onDelete?: (rqId: string, reason: string) => void;
    onRequestDeletion?: (rqId: string, reason: string) => void;
    onStartRecruitment?: (rqId: string) => void;
    onFinalize?: (rqId: string) => void;
    initialFilter?: FilterType;
    showCategoryFilter?: boolean;
}

type FilterType = 'todos' | 'pendientes' | 'aprobados' | 'finalizados' | 'rechazados';
type CategoryFilterType = 'todos' | 'operativo' | 'gerencial';
type DateFilterType = 'semana' | 'mes' | 'todos';

export default function RQListView({
    rqs,
    userRole,
    pendingCount = 0,
    unfilledCount = 0,
    onApprove,
    onBulkApprove,
    onReject,
    onBulkReject,
    onDelete,
    onRequestDeletion,
    onStartRecruitment,
    onFinalize,
    initialFilter = 'todos',
    showCategoryFilter = true
}: RQListViewProps) {
    const [filterType, setFilterType] = useState<FilterType>(initialFilter);
    const [categoryFilter, setCategoryFilter] = useState<CategoryFilterType>('todos');
    const [dateFilter, setDateFilter] = useState<DateFilterType>('semana');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTienda, setSelectedTienda] = useState('');
    const [selectedRQIds, setSelectedRQIds] = useState<Set<string>>(new Set());

    // Obtener tiendas únicas
    const uniqueTiendas = useMemo(() => {
        const tiendas = new Set(rqs.map(rq => rq.tiendaNombre));
        return Array.from(tiendas).sort();
    }, [rqs]);

    // 1. Filtrado base (Búsqueda, Tienda, Posición)
    const baseFilteredRQs = useMemo(() => {
        return rqs.filter(rq => {
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                const matches =
                    rq.posicion?.toLowerCase().includes(term) ||
                    rq.tiendaNombre?.toLowerCase().includes(term) ||
                    rq.rqNumber?.toLowerCase().includes(term) ||
                    rq.id?.toLowerCase().includes(term);
                if (!matches) return false;
            }
            if (selectedTienda && rq.tiendaNombre !== selectedTienda) return false;
            if (categoryFilter !== 'todos') {
                if (categoryFilter === 'operativo' && rq.categoria === 'gerencial') return false;
                if (categoryFilter === 'gerencial' && rq.categoria !== 'gerencial') return false;
            }
            if (dateFilter !== 'todos') {
                const createdAt = rq.createdAt?.toDate ? rq.createdAt.toDate() : new Date(rq.createdAt);
                const now = new Date();
                const diffDays = (now.getTime() - createdAt.getTime()) / (1000 * 3600 * 24);
                if (dateFilter === 'semana' && diffDays > 7) return false;
                if (dateFilter === 'mes' && diffDays > 30) return false;
            }
            return true;
        });
    }, [rqs, searchTerm, selectedTienda, categoryFilter, dateFilter]);

    // 2. Filtrado por tipo (Pestaña activa)
    const filteredRQs = useMemo(() => {
        return baseFilteredRQs.filter(rq => {
            if (filterType !== 'finalizados' && filterType !== 'rechazados') {
                if (filterType === 'todos' && (rq.status === 'filled' || rq.status === 'closed')) return false;
                if (filterType !== 'todos' && (rq.status === 'filled' || rq.status === 'closed' || rq.status === 'cancelled')) return false;
            }
            if (filterType === 'pendientes') return rq.approvalStatus === 'pending';
            if (filterType === 'aprobados') return rq.approvalStatus === 'approved' && rq.status !== 'filled' && rq.status !== 'closed' && rq.status !== 'cancelled';
            if (filterType === 'finalizados') return rq.status === 'filled' || rq.status === 'closed';
            if (filterType === 'rechazados') return rq.approvalStatus === 'rejected';
            return true;
        });
    }, [baseFilteredRQs, filterType]);

    // KPIs dinámicos
    const kpis = useMemo(() => {
        return {
            total: baseFilteredRQs.length,
            pendientes: baseFilteredRQs.filter(rq => rq.approvalStatus === 'pending').length,
            aprobados: baseFilteredRQs.filter(rq => rq.approvalStatus === 'approved' && rq.status !== 'filled' && rq.status !== 'closed').length,
            finalizados: baseFilteredRQs.filter(rq => rq.status === 'filled' || rq.status === 'closed').length,
            rechazados: baseFilteredRQs.filter(rq => rq.approvalStatus === 'rejected').length,
        };
    }, [baseFilteredRQs]);

    // Pendientes visibles (aprobables)
    const visiblePendingRQs = filteredRQs.filter(rq => rq.approvalStatus === 'pending');
    const canBulkApprove = (onApprove || onBulkApprove) && visiblePendingRQs.length > 0 &&
        ['supervisor', 'jefe_marca', 'client_admin', 'admin', 'super_admin'].includes(userRole);

    // Selection helpers
    const allPendingSelected = visiblePendingRQs.length > 0 &&
        visiblePendingRQs.every(rq => selectedRQIds.has(rq.id));
    const somePendingSelected = visiblePendingRQs.some(rq => selectedRQIds.has(rq.id));

    function toggleSelectAll() {
        if (allPendingSelected) {
            setSelectedRQIds(new Set());
        } else {
            setSelectedRQIds(new Set(visiblePendingRQs.map(rq => rq.id)));
        }
    }

    function toggleSelect(id: string) {
        setSelectedRQIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }

    async function handleBulkApprove() {
        const ids = Array.from(selectedRQIds);
        if (!ids.length) return;
        if (!confirm(`¿Aprobar ${ids.length} RQ${ids.length > 1 ? 's' : ''}?`)) return;
        if (onBulkApprove) {
            await onBulkApprove(ids);
        } else if (onApprove) {
            for (const id of ids) await onApprove(id);
        }
        setSelectedRQIds(new Set());
    }

    async function handleBulkReject() {
        const ids = Array.from(selectedRQIds);
        if (!ids.length) return;
        const reason = prompt(`Motivo de rechazo para ${ids.length} RQ${ids.length > 1 ? 's' : ''}:`);
        if (!reason) return;
        if (onBulkReject) {
            await onBulkReject(ids, reason);
        } else if (onReject) {
            for (const id of ids) await onReject(id, reason);
        }
        setSelectedRQIds(new Set());
    }

    return (
        <div className="space-y-4">
            {/* Alertas destacadas */}
            {(pendingCount > 0 || unfilledCount > 0) && (
                <div className="space-y-2">
                    {pendingCount > 0 && (userRole === 'supervisor' || userRole === 'jefe_marca' || userRole === 'client_admin' || userRole === 'super_admin') && (
                        <div className="glass-card rounded-xl p-4 bg-amber-50 border-l-4 border-amber-500">
                            <div className="flex items-center gap-3">
                                <div className="text-3xl">⚠️</div>
                                <div>
                                    <h4 className="font-semibold text-amber-900">
                                        {pendingCount} RQ{pendingCount !== 1 ? 's' : ''} pendiente{pendingCount !== 1 ? 's' : ''} de tu aprobación
                                    </h4>
                                    <p className="text-sm text-amber-700">
                                        Revisa y aprueba los requerimientos que están esperando tu autorización
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                    {unfilledCount > 0 && (
                        <div className="glass-card rounded-xl p-4 bg-red-50 border-l-4 border-red-500">
                            <div className="flex items-center gap-3">
                                <div className="text-3xl">🚨</div>
                                <div>
                                    <h4 className="font-semibold text-red-900">
                                        {unfilledCount} posición{unfilledCount !== 1 ? 'es' : ''} sin cubrir por más de 7 días
                                    </h4>
                                    <p className="text-sm text-red-700">Estas posiciones requieren atención urgente</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Mis Requerimientos</h3>
                <button
                    onClick={() => exportRQsExcel(filteredRQs)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                    📊 Exportar a Excel
                </button>
            </div>

            {/* Filtros y búsqueda */}
            <div className="glass-card rounded-xl p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar por N° RQ, posición, tienda o modalidad..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                        />
                    </div>
                    <select
                        value={selectedTienda}
                        onChange={(e) => setSelectedTienda(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                        <option value="">Todas las tiendas</option>
                        {uniqueTiendas.map(tienda => (
                            <option key={tienda} value={tienda}>{tienda}</option>
                        ))}
                    </select>
                    {showCategoryFilter && (
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value as CategoryFilterType)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent font-medium"
                        >
                            <option value="todos">Categoría: Todos</option>
                            <option value="operativo">👷 Operativos</option>
                            {userRole !== 'store_manager' && (
                                <option value="gerencial">👔 Gerenciales</option>
                            )}
                        </select>
                    )}
                    <select
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value as DateFilterType)}
                        className="px-4 py-2 border border-blue-300 bg-blue-50 text-blue-700 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent font-bold"
                    >
                        <option value="semana">📅 Última Semana</option>
                        <option value="mes">📅 Último Mes</option>
                        <option value="todos">📅 Todo el Historial</option>
                    </select>
                </div>

                {/* Pestañas de estado */}
                <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
                    {[
                        { value: 'todos', label: 'Todos', count: kpis.total },
                        { value: 'pendientes', label: 'Pendientes', count: kpis.pendientes },
                        { value: 'aprobados', label: 'Aprobados', count: kpis.aprobados },
                        { value: 'finalizados', label: 'Finalizados', count: kpis.finalizados },
                        { value: 'rechazados', label: 'Rechazados', count: rqs.filter(rq => rq.approvalStatus === 'rejected').length },
                    ].map(filter => (
                        <button
                            key={filter.value}
                            onClick={() => { setFilterType(filter.value as FilterType); setSelectedRQIds(new Set()); }}
                            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${filterType === filter.value
                                ? 'bg-violet-600 text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                                }`}
                        >
                            {filter.label}
                            {filter.count > 0 && (
                                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${filterType === filter.value ? 'bg-violet-700' : 'bg-gray-100'}`}>
                                    {filter.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="glass-card rounded-xl p-4">
                    <div className="text-2xl font-bold gradient-primary">{kpis.total}</div>
                    <div className="text-xs text-gray-600">Total RQs</div>
                </div>
                <div className="glass-card rounded-xl p-4">
                    <div className="text-2xl font-bold text-amber-600">{kpis.pendientes}</div>
                    <div className="text-xs text-gray-600">Pendientes</div>
                </div>
                <div className="glass-card rounded-xl p-4">
                    <div className="text-2xl font-bold text-green-600">{kpis.aprobados}</div>
                    <div className="text-xs text-gray-600">Aprobados</div>
                </div>
                <div className="glass-card rounded-xl p-4">
                    <div className="text-2xl font-bold text-blue-600">{kpis.finalizados}</div>
                    <div className="text-xs text-gray-600">Finalizados</div>
                </div>
            </div>

            {/* ─── BULK ACTION BAR ──────────────────────────────── */}
            {canBulkApprove && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            id="select-all-pending"
                            checked={allPendingSelected}
                            ref={el => { if (el) el.indeterminate = somePendingSelected && !allPendingSelected; }}
                            onChange={toggleSelectAll}
                            className="w-4 h-4 accent-violet-600 cursor-pointer"
                        />
                        <label htmlFor="select-all-pending" className="text-sm font-semibold text-amber-800 cursor-pointer">
                            {somePendingSelected
                                ? `${selectedRQIds.size} RQ${selectedRQIds.size > 1 ? 's' : ''} seleccionado${selectedRQIds.size > 1 ? 's' : ''}`
                                : `Seleccionar todos los pendientes (${visiblePendingRQs.length})`}
                        </label>
                    </div>
                    {somePendingSelected && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleBulkApprove}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-black uppercase tracking-widest hover:bg-green-700 transition-all shadow flex items-center gap-1"
                            >
                                ✓ Aprobar {selectedRQIds.size}
                            </button>
                            <button
                                onClick={handleBulkReject}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow flex items-center gap-1"
                            >
                                ✗ Rechazar {selectedRQIds.size}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Lista de RQs */}
            <div className="space-y-3">
                {filteredRQs.length === 0 ? (
                    <div className="glass-card rounded-xl p-8 text-center">
                        <div className="text-4xl mb-2">📋</div>
                        <p className="text-gray-500">No hay RQs que coincidan con los filtros</p>
                    </div>
                ) : (
                    filteredRQs.map(rq => (
                        <div key={rq.id} className="relative">
                            {/* Checkbox para pendientes */}
                            {canBulkApprove && rq.approvalStatus === 'pending' && (
                                <div className="absolute top-4 left-4 z-10">
                                    <input
                                        type="checkbox"
                                        checked={selectedRQIds.has(rq.id)}
                                        onChange={() => toggleSelect(rq.id)}
                                        className="w-4 h-4 accent-violet-600 cursor-pointer"
                                        onClick={e => e.stopPropagation()}
                                    />
                                </div>
                            )}
                            <div className={canBulkApprove && rq.approvalStatus === 'pending' ? 'pl-8' : ''}>
                                <RQCard
                                    rq={rq}
                                    userRole={userRole}
                                    onApprove={onApprove}
                                    onReject={onReject}
                                    onDelete={onDelete}
                                    onRequestDeletion={onRequestDeletion}
                                    onStartRecruitment={onStartRecruitment}
                                    onFinalize={onFinalize}
                                />
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
