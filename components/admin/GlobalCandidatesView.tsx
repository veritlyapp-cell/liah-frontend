'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

interface GlobalCandidate {
    id: string;
    nombre: string;
    apellidoPaterno?: string;
    apellidoMaterno?: string;
    dni: string;
    email: string;
    telefono: string;
    distrito?: string;
    holdingId?: string;
    createdAt?: any;
    applications?: any[];
}

interface GlobalCandidatesViewProps {
    holdings: { id: string; nombre: string }[];
}

export default function GlobalCandidatesView({ holdings }: GlobalCandidatesViewProps) {
    const [candidates, setCandidates] = useState<GlobalCandidate[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [holdingFilter, setHoldingFilter] = useState<string>('todos');
    const [dateFilter, setDateFilter] = useState<'semana' | 'mes' | 'todos'>('semana'); // Default to last week
    const [viewMode, setViewMode] = useState<'candidates' | 'talent'>('candidates');
    const [talentPool, setTalentPool] = useState<any[]>([]);

    useEffect(() => {
        loadAllCandidates();
        loadTalentPool();
    }, []);

    async function loadAllCandidates() {
        setLoading(true);
        try {
            const candidatesRef = collection(db, 'candidates');
            const q = query(candidatesRef, orderBy('createdAt', 'desc'), limit(500));
            const snapshot = await getDocs(q);

            const allCandidates = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as GlobalCandidate[];

            setCandidates(allCandidates);
            console.log('✅ Candidatos globales cargados:', allCandidates.length);
        } catch (error) {
            console.error('Error loading global candidates:', error);
        } finally {
            setLoading(false);
        }
    }

    async function loadTalentPool() {
        try {
            const talentRef = collection(db, 'talent_pool');
            const q = query(talentRef, orderBy('appliedAt', 'desc'), limit(500));
            const snapshot = await getDocs(q);

            const allTalent = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            setTalentPool(allTalent);
            console.log('✅ Red de talento cargada:', allTalent.length);
        } catch (error) {
            console.error('Error loading talent pool:', error);
        }
    }

    // Filter candidates
    // Filter data based on viewMode
    const currentData = viewMode === 'candidates' ? candidates : talentPool;

    const filteredData = currentData.filter(item => {
        // Holding filter
        if (holdingFilter !== 'todos') {
            const holdingIdOrSlug = item.holdingId || item.holdingSlug;
            if (holdingIdOrSlug !== holdingFilter) return false;
        }

        // Date filter
        const dateField = item.createdAt || item.appliedAt;
        if (dateFilter !== 'todos' && dateField) {
            const date = dateField?.toDate ? dateField.toDate() : new Date(dateField);
            const now = new Date();
            const diffDays = (now.getTime() - date.getTime()) / (1000 * 3600 * 24);
            if (dateFilter === 'semana' && diffDays > 7) return false;
            if (dateFilter === 'mes' && diffDays > 30) return false;
        }

        // Search
        const search = searchTerm.toLowerCase();
        const nameMatch = (item.nombre || item.nombreCompleto || '').toLowerCase().includes(search);
        const surnameMatch = (item.apellidoPaterno || item.apellidos || '').toLowerCase().includes(search);
        const dniMatch = (item.dni || '').includes(search);
        const emailMatch = (item.email || '').toLowerCase().includes(search);

        return nameMatch || surnameMatch || dniMatch || emailMatch;
    });

    async function handleExportToExcel() {
        try {
            const { exportCandidates } = await import('@/lib/utils/export-csv');
            const dataToExport = filteredData.map(item => {
                if (viewMode === 'candidates') {
                    const c = item as GlobalCandidate;
                    return {
                        ...c,
                        fullName: `${c.nombre} ${c.apellidoPaterno || ''} ${c.apellidoMaterno || ''}`.trim(),
                        applicationCount: c.applications?.length || 0
                    };
                } else {
                    return {
                        ...item,
                        fullName: item.nombreCompleto || `${item.nombre} ${item.apellidos}`,
                        type: 'Red de Talento'
                    };
                }
            });
            const filename = viewMode === 'candidates' ? 'candidatos_global' : 'red_de_talento';
            exportCandidates(dataToExport as any[], `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
            alert('✅ Exportación iniciada');
        } catch (error) {
            console.error('Export error:', error);
            alert('Error al exportar');
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Cargando candidatos globales...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Bases de Datos de Talento</h2>
                    <div className="flex bg-gray-100 p-1 rounded-xl mt-3 w-fit">
                        <button
                            onClick={() => setViewMode('candidates')}
                            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'candidates' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Postulantes (RQs)
                        </button>
                        <button
                            onClick={() => setViewMode('talent')}
                            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'talent' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Red de Talento (Unete)
                        </button>
                    </div>
                </div>
                <button
                    onClick={handleExportToExcel}
                    className="px-4 py-2 bg-green-600 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-green-700 transition-colors flex items-center gap-2 w-fit h-fit"
                >
                    📥 Exportar {viewMode === 'candidates' ? 'Candidatos' : 'Talento'}
                </button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                    <input
                        type="text"
                        placeholder="Buscar por nombre, DNI, email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    />
                </div>
                <select
                    value={holdingFilter}
                    onChange={(e) => setHoldingFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                >
                    <option value="todos">Todos los Holdings</option>
                    {holdings.map(h => (
                        <option key={h.id} value={h.id}>{h.nombre}</option>
                    ))}
                </select>

                <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value as any)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                >
                    <option value="semana">📅 Última Semana</option>
                    <option value="mes">📅 Último Mes</option>
                    <option value="todos">📅 Todo el Historial</option>
                </select>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-card rounded-xl p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total {viewMode === 'candidates' ? 'Candidatos' : 'Perfiles Unete'}</p>
                    <p className="text-3xl font-black italic tracking-tighter text-slate-900">{currentData.length}</p>
                </div>
                <div className="glass-card rounded-xl p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Filtrados</p>
                    <p className="text-3xl font-black italic tracking-tighter text-violet-600">{filteredData.length}</p>
                </div>
                <div className="glass-card rounded-xl p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Holdings Impactados</p>
                    <p className="text-3xl font-black italic tracking-tighter text-cyan-600">
                        {new Set(currentData.map(c => c.holdingId || c.holdingSlug).filter(Boolean)).size}
                    </p>
                </div>
            </div>

            {/* Data Table */}
            {
                filteredData.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-3xl border-2 border-dashed border-slate-200">
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No se encontraron resultados</p>
                    </div>
                ) : (
                    <div className="glass-card rounded-2xl overflow-hidden border border-slate-100 shadow-xl">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        <th className="px-4 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Nombre</th>
                                        <th className="px-4 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">DNI / CE</th>
                                        <th className="px-4 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Email</th>
                                        <th className="px-4 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Teléfono</th>
                                        {viewMode === 'candidates' ? (
                                            <>
                                                <th className="px-4 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Distrito</th>
                                                <th className="px-4 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Apps</th>
                                            </>
                                        ) : (
                                            <>
                                                <th className="px-4 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Ubicación</th>
                                                <th className="px-4 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Preferencia</th>
                                            </>
                                        )}
                                        <th className="px-4 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Registro</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredData.slice(0, 100).map(item => (
                                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-4 py-4">
                                                <p className="font-bold text-slate-900 text-sm uppercase italic">
                                                    {item.nombreCompleto || `${item.nombre} ${item.apellidoPaterno || item.apellidos || ''}`}
                                                </p>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.holdingSlug || holdings.find(h => h.id === item.holdingId)?.nombre}</p>
                                            </td>
                                            <td className="px-4 py-4 text-xs text-slate-600 font-mono font-bold">{item.dni}</td>
                                            <td className="px-4 py-4 text-xs text-slate-600 lowercase">{item.email}</td>
                                            <td className="px-4 py-4 text-xs text-slate-600">{item.telefono}</td>
                                            {viewMode === 'candidates' ? (
                                                <>
                                                    <td className="px-4 py-4 text-xs text-slate-600 uppercase font-medium">{item.distrito || '-'}</td>
                                                    <td className="px-4 py-4">
                                                        <span className="px-2 py-1 bg-violet-100 text-violet-700 rounded-lg text-[10px] font-black uppercase tracking-widest border border-violet-200">
                                                            {item.applications?.length || 0}
                                                        </span>
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className="px-4 py-4">
                                                        <p className="text-xs text-slate-900 font-bold uppercase">{item.distrito || '-'}</p>
                                                        <p className="text-[9px] font-medium text-slate-400 uppercase">{item.departamento || '-'}</p>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${item.preferenciaRol === 'administrativo' ? 'bg-cyan-50 border-cyan-100 text-cyan-600' : 'bg-amber-50 border-amber-100 text-amber-600'}`}>
                                                            {item.preferenciaRol || 'tienda'}
                                                        </span>
                                                    </td>
                                                </>
                                            )}
                                            <td className="px-4 py-4 text-xs text-slate-500 font-medium">
                                                {(item.createdAt || item.appliedAt)?.toDate
                                                    ? (item.createdAt || item.appliedAt).toDate().toLocaleDateString()
                                                    : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {filteredData.length > 100 && (
                            <div className="px-4 py-4 bg-slate-50 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Mostrando 100 de {filteredData.length} resultados. Usa filtros o exporta para ver todo.
                            </div>
                        )}
                    </div>
                )
            }
        </div >
    );
}
