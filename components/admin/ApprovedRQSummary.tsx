'use client';

import { useState, useMemo } from 'react';
import type { RQ } from '@/lib/firestore/rqs';

interface ApprovedRQSummaryProps {
    rqs: RQ[];
    showTienda?: boolean;
    showMarca?: boolean;
    showPending?: boolean; // For Jefe de Marca / Approvers
    userRole?: string;     // To calculate "pending for me"
    hideFilters?: boolean; // When parent already controls filters
}

export default function ApprovedRQSummary({ 
    rqs, 
    showTienda = false, 
    showMarca = false,
    showPending = false,
    userRole = '',
    hideFilters = false
}: ApprovedRQSummaryProps) {
    const [marcaFilter, setMarcaFilter] = useState('all');
    const [tiendaFilter, setTiendaFilter] = useState('all');
    const [puestoFilter, setPuestoFilter] = useState('all');

    // Base filter
    const activeRQs = useMemo(() => {
        return rqs.filter(rq =>
            rq.status !== 'closed' &&
            rq.status !== 'filled' &&
            rq.status !== 'cancelled'
        );
    }, [rqs]);

    const uniqueMarcas = useMemo(() => 
        Array.from(new Set(activeRQs.map(rq => rq.marcaNombre).filter(Boolean))).sort()
    , [activeRQs]);
    
    const uniqueTiendas = useMemo(() => 
        Array.from(new Set(activeRQs.map(rq => rq.tiendaNombre).filter(Boolean))).sort()
    , [activeRQs]);

    const uniquePuestos = useMemo(() => 
        Array.from(new Set(activeRQs.map(rq => rq.puesto).filter(Boolean))).sort()
    , [activeRQs]);

    const filtered = useMemo(() => {
        return activeRQs.filter(rq => {
            if (marcaFilter !== 'all' && rq.marcaNombre !== marcaFilter) return false;
            if (tiendaFilter !== 'all' && rq.tiendaNombre !== tiendaFilter) return false;
            if (puestoFilter !== 'all' && rq.puesto !== puestoFilter) return false;
            return true;
        });
    }, [activeRQs, marcaFilter, tiendaFilter, puestoFilter]);

    // Grouping logic
    const grouped = useMemo(() => {
        const groups: Record<string, {
            puesto: string;
            modalidad: string;
            horario: string;
            tienda?: string;
            marca?: string;
            aprobados: number;
            pendientes: number;
            reemplazos: number;
            nuevasVacantes: number;
        }> = {};

        filtered.forEach(rq => {
            const keyParts = [
                rq.puesto,
                rq.modalidad || 'N/A',
                rq.turno || 'N/A'
            ];
            
            if (showTienda) keyParts.push(rq.tiendaId || 'no-store');
            if (showMarca) keyParts.push(rq.marcaId || 'no-brand');

            const key = keyParts.join('||');

            if (!groups[key]) {
                groups[key] = {
                    puesto: rq.puesto,
                    modalidad: rq.modalidad || 'N/A',
                    horario: rq.turno || 'N/A',
                    tienda: rq.tiendaNombre,
                    marca: rq.marcaNombre,
                    aprobados: 0,
                    pendientes: 0,
                    reemplazos: 0,
                    nuevasVacantes: 0
                };
            }
            
            if (rq.approvalStatus === 'approved') {
                groups[key].aprobados += (rq.vacantes || 1);
            } else if (rq.approvalStatus === 'pending') {
                groups[key].pendientes += (rq.vacantes || 1);
            }

            // Count by motivo
            if (rq.motivo === 'Reemplazo') {
                groups[key].reemplazos += (rq.vacantes || 1);
            } else {
                groups[key].nuevasVacantes += (rq.vacantes || 1);
            }
        });

        // Filter out groups with 0 in both columns if requested only approved
        let list = Object.values(groups);
        if (!showPending) {
            list = list.filter(g => g.aprobados > 0);
        }

        return list.sort((a, b) => b.aprobados + b.pendientes - (a.aprobados + a.pendientes));
    }, [filtered, showTienda, showMarca, showPending]);

    const totalAprobados = grouped.reduce((sum, g) => sum + g.aprobados, 0);
    const totalPendientes = grouped.reduce((sum, g) => sum + g.pendientes, 0);

    if (activeRQs.length === 0) {
        return (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] p-12 text-center">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <span className="text-3xl">📋</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">No hay requerimientos activos</h3>
                <p className="text-sm text-slate-500 max-w-xs mx-auto mt-2">
                    Las vacantes aparecerán aquí automáticamente para tu seguimiento.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Filters Bar — hidden when parent controls filtering */}
            {!hideFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {showMarca && (
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Filtrar Marca</label>
                        <select
                            value={marcaFilter}
                            onChange={(e) => setMarcaFilter(e.target.value)}
                            className="h-11 bg-white border border-slate-200 rounded-xl px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand/20 transition-all shadow-sm"
                        >
                            <option value="all">Todas las marcas</option>
                            {uniqueMarcas.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                )}

                <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Filtrar Tienda</label>
                    <select
                        value={tiendaFilter}
                        onChange={(e) => setTiendaFilter(e.target.value)}
                        className="h-11 bg-white border border-slate-200 rounded-xl px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand/20 transition-all shadow-sm"
                    >
                        <option value="all">Todas las tiendas</option>
                        {uniqueTiendas.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Filtrar Puesto</label>
                    <select
                        value={puestoFilter}
                        onChange={(e) => setPuestoFilter(e.target.value)}
                        className="h-11 bg-white border border-slate-200 rounded-xl px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand/20 transition-all shadow-sm"
                    >
                        <option value="all">Todos los puestos</option>
                        {uniquePuestos.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
            </div>
            )}

            {/* Aggregated Table */}
            <div className="bg-white border border-slate-100 rounded-[2rem] shadow-xl shadow-slate-200/40 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-100">
                                {showMarca && <th className="px-8 py-5 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Marca</th>}
                                {showTienda && <th className="px-8 py-5 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Tienda</th>}
                                <th className="px-8 py-5 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Puesto / Servicio</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Modalidad</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Motivo</th>
                                {showPending && (
                                    <th className="px-8 py-5 text-right text-[10px] font-black uppercase text-amber-500 tracking-widest">Por Aprobar</th>
                                )}
                                <th className="px-8 py-5 text-right text-[10px] font-black uppercase text-emerald-500 tracking-widest">Aprobado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {grouped.map((group, idx) => (
                                <tr key={idx} className="hover:bg-brand/5 group transition-colors">
                                    {showMarca && (
                                        <td className="px-8 py-5">
                                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-tighter group-hover:text-brand transition-colors">{group.marca}</span>
                                        </td>
                                    )}
                                    {showTienda && (
                                        <td className="px-8 py-5">
                                            <span className="text-sm font-bold text-slate-600 tracking-tight">{group.tienda}</span>
                                        </td>
                                    )}
                                    <td className="px-8 py-5">
                                        <div className="font-black text-slate-900 uppercase italic tracking-tighter text-base group-hover:translate-x-1 transition-transform">{group.puesto}</div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase">{group.horario}</div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 border border-slate-200/50">
                                            {group.modalidad}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex flex-col gap-1">
                                            {group.reemplazos > 0 && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                    🔄 Reemplazo × {group.reemplazos}
                                                </span>
                                            )}
                                            {group.nuevasVacantes > 0 && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-violet-50 text-violet-700 border border-violet-200">
                                                    ✨ Nueva Vacante × {group.nuevasVacantes}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    
                                    {showPending && (
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex items-center justify-end gap-3">
                                                <div className="h-1.5 w-12 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                                                    <div 
                                                        className="h-full bg-amber-400 rounded-full" 
                                                        style={{ width: `${Math.min((group.pendientes / (totalPendientes || 1)) * 100, 100)}%` }}
                                                    />
                                                </div>
                                                <span className={`text-lg font-black italic tracking-tighter ${group.pendientes > 0 ? 'text-amber-500' : 'text-slate-200'}`}>
                                                    {group.pendientes}
                                                </span>
                                            </div>
                                        </td>
                                    )}

                                    <td className="px-8 py-5 text-right">
                                        <div className="flex items-center justify-end gap-3">
                                            <div className="h-2 w-16 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                                                <div 
                                                    className="h-full bg-emerald-500 rounded-full" 
                                                    style={{ width: `${Math.min((group.aprobados / (totalAprobados || 1)) * 100, 100)}%` }}
                                                />
                                            </div>
                                            <span className={`text-xl font-black italic tracking-tighter ${group.aprobados > 0 ? 'text-emerald-600' : 'text-slate-200'}`}>
                                                {group.aprobados}
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="bg-slate-900 border-t-4 border-brand">
                                <td colSpan={(showMarca ? 1 : 0) + (showTienda ? 1 : 0) + 3} className="px-8 py-6 text-right">
                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mr-8">Consolidado Total Marca</span>
                                </td>
                                {showPending && (
                                    <td className="px-8 py-6 text-right border-l border-slate-800">
                                        <div className="flex flex-col items-end">
                                            <span className="text-2xl font-black italic text-amber-400 tracking-tighter leading-none">{totalPendientes}</span>
                                            <span className="text-[7px] font-black uppercase text-amber-500/50 tracking-widest mt-1">Por Procesar</span>
                                        </div>
                                    </td>
                                )}
                                <td className="px-8 py-6 text-right border-l border-slate-800">
                                    <div className="flex flex-col items-end">
                                        <span className="text-3xl font-black italic text-white tracking-tighter leading-none">{totalAprobados}</span>
                                        <span className="text-[8px] font-black uppercase text-emerald-400 tracking-widest mt-1">Aprobado Final</span>
                                    </div>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
}
