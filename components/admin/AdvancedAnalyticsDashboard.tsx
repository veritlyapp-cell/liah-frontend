'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

interface AdvancedAnalyticsDashboardProps {
    holdingId: string;
}

interface TurnoverStats {
    totalBajas: number;
    sunkCost: number; // Costo por permanencia < 90 días
    earlyAttrition: number; // % bajas < 30 días
    avgTenure: number;
    bySede: { sede: string; tenure: number; count: number }[];
    byReason: { reason: string; count: number }[];
    liahVsOther: { type: string; tenure: number; count: number }[];
    recentAlerts: any[];
}

export default function AdvancedAnalyticsDashboard({ holdingId }: AdvancedAnalyticsDashboardProps) {
    const [stats, setStats] = useState<TurnoverStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [costoReposicion, setCostoReposicion] = useState(700);

    useEffect(() => {
        const loadData = async () => {
            if (!holdingId) return;
            setLoading(true);

            try {
                // 1. Cargar configuración de la holding
                const holdingRef = doc(db, 'holdings', holdingId);
                const holdingDoc = await getDoc(holdingRef);
                if (holdingDoc.exists()) {
                    const hData = holdingDoc.data();
                    if (hData.settings?.costoReposicionPromedio) {
                        setCostoReposicion(hData.settings.costoReposicionPromedio);
                    }
                }

                // 2. Cargar bajas
                const bajasRef = collection(db, 'bajas_colaboradores');
                const q = query(
                    bajasRef,
                    where('holdingId', '==', holdingId),
                    orderBy('fechaCese', 'desc')
                );
                const snapshot = await getDocs(q);
                const bajas = snapshot.docs.map(doc => doc.data());

                // 3. Procesar estadísticas
                let totalSunkCost = 0;
                let earlyAttritionCount = 0;
                let totalTenure = 0;
                const sedeMap: Record<string, { total: number; count: number }> = {};
                const reasonMap: Record<string, number> = {};
                const typeMap: Record<string, { total: number; count: number }> = {
                    'Liah AI': { total: 0, count: 0 },
                    'Manual/Otro': { total: 0, count: 0 }
                };

                bajas.forEach(b => {
                    const days = b.permanenciaDias || 0;
                    totalTenure += days;

                    // Sunk Cost (< 90 días)
                    if (days < 90) totalSunkCost += costoReposicion;

                    // Early Attrition (< 30 días)
                    if (days < 30) earlyAttritionCount++;

                    // By Sede (Nota: Necesitaremos asegurar que 'sede' esté en el record de bajas_colaboradores, 
                    // por ahora usamos 'tiendaId' o 'marca' si está disponible)
                    const sede = b.tiendaNombre || b.marcaLabel || 'No asignado';
                    if (!sedeMap[sede]) sedeMap[sede] = { total: 0, count: 0 };
                    sedeMap[sede].total += days;
                    sedeMap[sede].count++;

                    // By Reason
                    const reason = b.motivoLabel || 'Otro';
                    reasonMap[reason] = (reasonMap[reason] || 0) + 1;

                    // Liah vs Other
                    const type = b.isLiahCandidate ? 'Liah AI' : 'Manual/Otro';
                    typeMap[type].total += days;
                    typeMap[type].count++;
                });

                setStats({
                    totalBajas: bajas.length,
                    sunkCost: totalSunkCost,
                    earlyAttrition: bajas.length > 0 ? (earlyAttritionCount / bajas.length) * 100 : 0,
                    avgTenure: bajas.length > 0 ? totalTenure / bajas.length : 0,
                    bySede: Object.entries(sedeMap).map(([sede, data]) => ({
                        sede,
                        tenure: Math.round(data.total / data.count),
                        count: data.count
                    })).sort((a, b) => b.count - a.count).slice(0, 8),
                    byReason: Object.entries(reasonMap).map(([reason, count]) => ({ reason, count })),
                    liahVsOther: Object.entries(typeMap).map(([type, data]) => ({
                        type,
                        tenure: data.count > 0 ? Math.round(data.total / data.count) : 0,
                        count: data.count
                    })),
                    recentAlerts: bajas.slice(0, 5)
                });

            } catch (error) {
                console.error('Error loading analytics:', error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [holdingId, costoReposicion]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600" />
            <p className="mt-4 text-gray-500 font-medium">Calculando impacto financiero...</p>
        </div>
    );

    if (!stats) return null;

    const COLORS = ['#7c3aed', '#06b6d4', '#f59e0b', '#ef4444', '#10b981'];

    return (
        <div className="space-y-8 pb-10">
            {/* Header / CEO View Widgets */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700">
                    <p className="text-slate-400 text-sm font-bold uppercase tracking-wider">Capital Hundido (Sunk Cost)</p>
                    <p className="text-4xl font-black text-white mt-2">S/ {stats.sunkCost.toLocaleString()}</p>
                    <div className="mt-4 flex items-center gap-2">
                        <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded text-xs font-bold">Pérdida &lt; 90 días</span>
                        <span className="text-slate-500 text-[10px]">Costo reposición: S/ {costoReposicion}</span>
                    </div>
                </div>

                <div className={`p-6 rounded-2xl shadow-xl border ${stats.earlyAttrition > 15 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
                    <p className={`${stats.earlyAttrition > 15 ? 'text-red-600' : 'text-gray-500'} text-sm font-bold uppercase tracking-wider`}>Muerte Temprana (Early Attrition)</p>
                    <p className={`text-4xl font-black mt-2 ${stats.earlyAttrition > 15 ? 'text-red-700' : 'text-gray-900'}`}>{stats.earlyAttrition.toFixed(1)}%</p>
                    <div className="mt-4 flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${stats.earlyAttrition > 15 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                            {stats.earlyAttrition > 15 ? '🔥 CRÍTICO (>15%)' : '✅ SALUDABLE'}
                        </span>
                        <span className="text-gray-400 text-[10px]">Bajas antes de los 30 días</span>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-200">
                    <p className="text-gray-500 text-sm font-bold uppercase tracking-wider">Permanencia Promedio</p>
                    <p className="text-4xl font-black text-violet-600 mt-2">{Math.round(stats.avgTenure)} días</p>
                    <div className="mt-4 flex items-center gap-2">
                        <span className="bg-violet-50 text-violet-600 px-2 py-1 rounded text-xs font-bold">Ciclo de Vida</span>
                        <span className="text-gray-400 text-[10px]">Basado en {stats.totalBajas} bajas</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Chart 1: Curva de Permanencia por Sede */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <h4 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
                        📊 Permanencia por Sede (Días Promedio)
                    </h4>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.bySede} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="sede" type="category" width={100} tick={{ fontSize: 10 }} axisLine={false} />
                                <Tooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                />
                                <Bar dataKey="tenure" fill="#7c3aed" radius={[0, 4, 4, 0]} barSize={20}>
                                    {stats.bySede.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.tenure < 90 ? '#ef4444' : '#7c3aed'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Chart 2: ROI - Liah vs Others */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <h4 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
                        🛡️ ROI: Calidad de Contratación (Liah vs Otros)
                    </h4>
                    <div className="h-72 flex items-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.liahVsOther} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <XAxis dataKey="type" axisLine={false} tickLine={false} />
                                <YAxis hide />
                                <Tooltip />
                                <Bar dataKey="tenure" radius={[8, 8, 0, 0]} barSize={60}>
                                    {stats.liahVsOther.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.type === 'Liah AI' ? '#06b6d4' : '#94a3b8'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                        <div className="w-1/3 pl-6 border-l border-gray-100 flex flex-col justify-center">
                            {stats.liahVsOther.map((item, i) => (
                                <div key={i} className="mb-4">
                                    <p className="text-xs text-gray-400 font-bold uppercase">{item.type}</p>
                                    <p className="text-2xl font-black text-gray-800">{item.tenure}d</p>
                                    <p className="text-[10px] text-gray-500">Promedio permanencia</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Heatmap/Reason distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <h4 className="font-bold text-gray-900 mb-6">🔍 Mapa de Calidez: Motivos de Salida</h4>
                    <div className="space-y-4">
                        {stats.byReason.sort((a, b) => b.count - a.count).map((r, i) => (
                            <div key={i}>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="font-medium text-gray-700">{r.reason}</span>
                                    <span className="font-bold text-gray-900">{r.count}</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-1.5">
                                    <div
                                        className="bg-violet-600 h-full rounded-full"
                                        style={{ width: `${(r.count / stats.totalBajas) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <h4 className="font-bold text-gray-900 mb-6 flex items-center justify-between">
                        ⚠️ Alertas de Rotación Recientes
                        <button className="text-xs text-violet-600 hover:underline">Ver todo</button>
                    </h4>
                    <div className="space-y-3">
                        {stats.recentAlerts.map((alert, i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${alert.permanenciaDias < 30 ? 'bg-red-500 animate-pulse' : 'bg-amber-400'}`} />
                                    <div>
                                        <p className="text-xs font-bold text-gray-900">{alert.nombreCompleto}</p>
                                        <p className="text-[10px] text-gray-500">{alert.tiendaNombre || alert.marcaLabel || 'Sede desconocida'}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-black text-red-600">-{alert.permanenciaDias}d</p>
                                    <p className="text-[9px] text-gray-400 uppercase">Permanencia</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex justify-center pt-4">
                <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                >
                    🖨️ Generar Reporte de Impacto a Gerencia
                </button>
            </div>
        </div>
    );
}
