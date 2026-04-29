'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { RQ } from '@/lib/firestore/rqs';

interface SupervisorStatsCardsProps {
    storeIds: string[];
    onFilterChange?: (tienda: string, puesto: string) => void;
}

export default function SupervisorStatsCards({ storeIds, onFilterChange }: SupervisorStatsCardsProps) {
    const [rqs, setRqs] = useState<RQ[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterTienda, setFilterTienda] = useState('all');
    const [filterPuesto, setFilterPuesto] = useState('all');

    useEffect(() => {
        async function loadRQs() {
            if (storeIds.length === 0) {
                setLoading(false);
                return;
            }
            try {
                const rqsRef = collection(db, 'rqs');
                const q = query(rqsRef, where('tiendaId', 'in', storeIds.slice(0, 10)));
                const snapshot = await getDocs(q);
                const loaded = snapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() } as RQ))
                    .filter(rq => rq.status !== 'cancelled');
                setRqs(loaded);
            } catch (error) {
                console.error('Error loading RQs:', error);
            } finally {
                setLoading(false);
            }
        }
        loadRQs();
    }, [storeIds]);

    const uniqueTiendas = useMemo(() =>
        Array.from(new Set(rqs.map(r => r.tiendaNombre).filter(Boolean))).sort(),
    [rqs]);

    const uniquePuestos = useMemo(() =>
        Array.from(new Set(rqs.map(r => r.puesto).filter(Boolean))).sort(),
    [rqs]);

    // Notify parent when filters change
    useEffect(() => {
        onFilterChange?.(filterTienda, filterPuesto);
    }, [filterTienda, filterPuesto]);

    const filtered = useMemo(() => rqs.filter(rq => {
        if (filterTienda !== 'all' && rq.tiendaNombre !== filterTienda) return false;
        if (filterPuesto !== 'all' && rq.puesto !== filterPuesto) return false;
        return true;
    }), [rqs, filterTienda, filterPuesto]);

    const stats = useMemo(() => {
        let pending = 0, approved = 0, rejected = 0;
        filtered.forEach(rq => {
            if (rq.approvalStatus === 'approved' && rq.status !== 'closed' && rq.status !== 'filled') {
                approved++;
            } else if (rq.approvalStatus === 'pending') {
                pending++;
            } else if (rq.approvalStatus === 'rejected') {
                rejected++;
            }
        });
        return { pending, approved, rejected, total: filtered.length };
    }, [filtered]);

    // Global stats (unfiltered for the 4 KPI cards)
    const globalStats = useMemo(() => {
        let pending = 0, approved = 0, rejected = 0;
        rqs.forEach(rq => {
            if (rq.approvalStatus === 'approved' && rq.status !== 'closed' && rq.status !== 'filled') approved++;
            else if (rq.approvalStatus === 'pending') pending++;
            else if (rq.approvalStatus === 'rejected') rejected++;
        });
        return { pending, approved, rejected };
    }, [rqs]);

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="bg-white rounded-xl shadow p-5 animate-pulse">
                            <div className="h-3 bg-gray-200 rounded w-2/3 mb-3" />
                            <div className="h-7 bg-gray-200 rounded w-1/3" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* KPI Cards - Global totals */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <p className="text-xs font-black uppercase text-amber-400 tracking-widest mb-1">Pendientes</p>
                    <p className="text-3xl font-black text-amber-500">{globalStats.pending}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <p className="text-xs font-black uppercase text-emerald-400 tracking-widest mb-1">Aprobados</p>
                    <p className="text-3xl font-black text-emerald-600">{globalStats.approved}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <p className="text-xs font-black uppercase text-rose-400 tracking-widest mb-1">Rechazados</p>
                    <p className="text-3xl font-black text-rose-500">{globalStats.rejected}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <p className="text-xs font-black uppercase text-blue-400 tracking-widest mb-1">Tiendas</p>
                    <p className="text-3xl font-black text-blue-600">{storeIds.length}</p>
                </div>
            </div>

            {/* Filter panel — drives the ApprovedRQSummary below via onFilterChange */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-3">
                    Filtrar consolidado de requerimientos
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Tienda</label>
                        <select
                            value={filterTienda}
                            onChange={e => setFilterTienda(e.target.value)}
                            className="h-10 bg-white border border-slate-200 rounded-xl px-3 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-violet-300"
                        >
                            <option value="all">Todas las tiendas</option>
                            {uniqueTiendas.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Puesto</label>
                        <select
                            value={filterPuesto}
                            onChange={e => setFilterPuesto(e.target.value)}
                            className="h-10 bg-white border border-slate-200 rounded-xl px-3 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-violet-300"
                        >
                            <option value="all">Todos los puestos</option>
                            {uniquePuestos.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                </div>

                {/* Filtered mini-stats — only show when filter is active */}
                {(filterTienda !== 'all' || filterPuesto !== 'all') && (
                    <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="text-center">
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total</p>
                            <p className="text-2xl font-black text-slate-700">{stats.total}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] font-black uppercase text-amber-400 tracking-widest">Pendientes</p>
                            <p className="text-2xl font-black text-amber-500">{stats.pending}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">Aprobados</p>
                            <p className="text-2xl font-black text-emerald-600">{stats.approved}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] font-black uppercase text-rose-400 tracking-widest">Rechazados</p>
                            <p className="text-2xl font-black text-rose-500">{stats.rejected}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
