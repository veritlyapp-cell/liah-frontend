'use client';

import { useState, useEffect } from 'react';
import type { Candidate } from '@/lib/firestore/candidates';
import CandidateProfileModal from '@/components/CandidateProfileModal';
import { MapPin, Search, Filter, User, Mail, Smartphone, ExternalLink, Hash } from 'lucide-react';

interface AdminCandidatesViewProps {
    holdingId: string;
    marcas: { id: string; nombre: string }[];
    tiendas: { id: string; nombre: string; marcaId: string }[];
}

export default function AdminCandidatesView({ holdingId, marcas, tiendas }: AdminCandidatesViewProps) {
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMarca, setSelectedMarca] = useState<string>('all');
    const [selectedTienda, setSelectedTienda] = useState<string>('all');
    const [dateFilter, setDateFilter] = useState<'semana' | 'mes' | 'todos'>('semana'); // Default to last week
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

    // Filter tiendas by selected marca
    const filteredTiendas = selectedMarca === 'all'
        ? tiendas
        : tiendas.filter(t => t.marcaId === selectedMarca);

    // Load candidates
    useEffect(() => {
        loadCandidates();
    }, [holdingId, selectedMarca, selectedTienda]);

    async function loadCandidates() {
        setLoading(true);
        try {
            const { getCandidatesByMarca, getCandidatesByStore } = await import('@/lib/firestore/candidate-queries');

            let result: Candidate[] = [];

            if (selectedTienda !== 'all') {
                result = await getCandidatesByStore(selectedTienda);
            } else if (selectedMarca !== 'all') {
                result = await getCandidatesByMarca(selectedMarca);
            } else {
                // Get all candidates for all marcas
                const allCandidates: Candidate[] = [];
                for (const marca of marcas) {
                    const marcaCandidates = await getCandidatesByMarca(marca.id);
                    allCandidates.push(...marcaCandidates);
                }
                // Remove duplicates by id
                result = allCandidates.filter((c, i, arr) => arr.findIndex(x => x.id === c.id) === i);
            }

            setCandidates(result);
        } catch (error) {
            console.error('Error loading candidates:', error);
        } finally {
            setLoading(false);
        }
    }

    // Filter by search term and date
    const filteredCandidates = candidates.filter(c => {
        // Date filter
        if (dateFilter !== 'todos') {
            const createdAt = c.createdAt?.toDate ? c.createdAt.toDate() : new Date(c.createdAt);
            const now = new Date();
            const diffDays = (now.getTime() - createdAt.getTime()) / (1000 * 3600 * 24);
            if (dateFilter === 'semana' && diffDays > 7) return false;
            if (dateFilter === 'mes' && diffDays > 30) return false;
        }

        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        const fullName = `${c.nombre} ${c.apellidoPaterno} ${c.apellidoMaterno}`.toLowerCase();
        return fullName.includes(search) || c.dni?.includes(search) || c.email?.toLowerCase().includes(search);
    });

    // Get status badge
    function getStatusBadge(candidate: Candidate) {
        if (candidate.selectionStatus === 'selected') {
            return (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 text-[10px] font-black uppercase tracking-widest">
                    <div className="w-1 h-1 rounded-full bg-emerald-500" />
                    Seleccionado
                </div>
            );
        }
        if (candidate.culStatus === 'apto') {
            return <div className="px-3 py-1 bg-brand-soft text-brand rounded-full border border-brand/10 text-[10px] font-black uppercase tracking-widest text-center">CUL Apto</div>;
        }
        if (candidate.culStatus === 'no_apto') {
            return <div className="px-3 py-1 bg-rose-50 text-rose-500 rounded-full border border-rose-100 text-[10px] font-black uppercase tracking-widest text-center">No Apto</div>;
        }
        return <div className="px-3 py-1 bg-slate-50 text-slate-400 rounded-full border border-slate-100 text-[10px] font-black uppercase tracking-widest text-center">Pendiente</div>;
    }

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic mb-1">
                        Pool de Talento
                    </h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Visualización global de candidatos y postulaciones
                    </p>
                </div>
                <div className="px-4 py-2 bg-slate-100 rounded-xl text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Total: {filteredCandidates.length} Candidatos
                </div>
            </div>

            {/* Premium Filters Widget */}
            <div className="white-label-card p-4">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex-1 min-w-[300px] relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, DNI o email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand focus:bg-white transition-all outline-none"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Brand Filter */}
                        <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl">
                            <Filter size={14} className="text-slate-400" />
                            <select
                                value={selectedMarca}
                                onChange={(e) => {
                                    setSelectedMarca(e.target.value);
                                    setSelectedTienda('all');
                                }}
                                className="bg-transparent text-xs font-black uppercase tracking-widest text-slate-600 outline-none"
                            >
                                <option value="all">Marcas</option>
                                {marcas.map(marca => (
                                    <option key={marca.id} value={marca.id}>{marca.nombre}</option>
                                ))}
                            </select>
                        </div>

                        {/* Store Filter */}
                        <div className={`flex items-center gap-2 px-3 py-2 border rounded-xl transition-all ${selectedMarca === 'all' ? 'bg-slate-50/50 border-slate-100 opacity-50' : 'bg-slate-50 border-slate-100'}`}>
                            <MapPin size={14} className="text-slate-400" />
                            <select
                                value={selectedTienda}
                                onChange={(e) => setSelectedTienda(e.target.value)}
                                className="bg-transparent text-xs font-black uppercase tracking-widest text-slate-600 outline-none disabled:cursor-not-allowed"
                                disabled={selectedMarca === 'all'}
                            >
                                <option value="all">Tiendas</option>
                                {filteredTiendas.map(tienda => (
                                    <option key={tienda.id} value={tienda.id}>{tienda.nombre}</option>
                                ))}
                            </select>
                        </div>

                        {/* Date Filter */}
                        <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl">
                            <select
                                value={dateFilter}
                                onChange={(e) => setDateFilter(e.target.value as any)}
                                className="bg-transparent text-xs font-black uppercase tracking-widest text-slate-600 outline-none"
                            >
                                <option value="semana">📅 Última Semana</option>
                                <option value="mes">📅 Último Mes</option>
                                <option value="todos">📅 Todo el Historial</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Candidates Data Component */}
            {
                loading ? (
                    <div className="white-label-card py-32 text-center">
                        <div className="w-12 h-12 border-4 border-slate-100 border-t-brand rounded-full animate-spin mx-auto mb-6"></div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">Sincronizando Candidatos...</p>
                    </div>
                ) : filteredCandidates.length === 0 ? (
                    <div className="white-label-card py-24 text-center">
                        <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <User className="text-slate-200" size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">No se encontraron candidatos</h3>
                        <p className="text-slate-500 max-w-xs mx-auto text-sm">Ajusta los criterios de búsqueda o filtros de ubicación.</p>
                    </div>
                ) : (
                    <div className="white-label-card overflow-hidden">
                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full divide-y divide-slate-100">
                                <thead>
                                    <tr className="bg-slate-50/50">
                                        <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Candidato</th>
                                        <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Identificación</th>
                                        <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Contacto</th>
                                        <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Destino Actual</th>
                                        <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Estado</th>
                                        <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filteredCandidates.slice(0, 50).map(candidate => {
                                        const latestApp = candidate.applications?.[candidate.applications.length - 1];
                                        return (
                                            <tr key={candidate.id} className="group hover:bg-slate-50/80 transition-all duration-200">
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 font-black group-hover:bg-brand group-hover:text-white transition-all shadow-sm">
                                                            {candidate.nombre?.[0]}
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="text-sm font-bold text-slate-900 group-hover:text-brand transition-colors truncate">
                                                                {candidate.nombre} {candidate.apellidoPaterno}
                                                            </span>
                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight truncate">Postuló a {latestApp?.posicion || 'Posición Varias'}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 whitespace-nowrap">
                                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100/50 rounded-lg w-fit">
                                                        <Hash size={12} className="text-slate-400" />
                                                        <span className="text-xs font-bold text-slate-600 tracking-wider">{candidate.dni}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex flex-col gap-1.5">
                                                        <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                                                            <Mail size={12} className="text-slate-300" strokeWidth={3} />
                                                            <span className="truncate max-w-[140px]">{candidate.email}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                                                            <Smartphone size={12} className="text-slate-300" strokeWidth={3} />
                                                            <span>{candidate.telefono}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black text-slate-900 uppercase italic tracking-tight">{latestApp?.marcaNombre || 'Sin Marca'}</span>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{latestApp?.tiendaNombre || 'Sin Tienda'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    {getStatusBadge(candidate)}
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <button
                                                        onClick={() => setSelectedCandidate(candidate)}
                                                        className="w-11 h-11 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-900 hover:text-white transition-all shadow-sm flex items-center justify-center group/btn"
                                                    >
                                                        <ExternalLink size={18} className="group-hover/btn:scale-110 transition-transform" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="md:hidden divide-y divide-slate-50">
                            {filteredCandidates.slice(0, 50).map(candidate => {
                                const latestApp = candidate.applications?.[candidate.applications.length - 1];
                                return (
                                    <div key={candidate.id} className="p-4 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-black text-sm">
                                                    {candidate.nombre?.[0]}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-900">{candidate.nombre} {candidate.apellidoPaterno}</span>
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight">{latestApp?.posicion || 'Pool General'}</span>
                                                </div>
                                            </div>
                                            {getStatusBadge(candidate)}
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 pt-2">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">DNI</span>
                                                <span className="text-xs font-bold text-slate-600">{candidate.dni}</span>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Destino</span>
                                                <span className="text-[10px] font-bold text-slate-900 uppercase truncate">{latestApp?.tiendaNombre || 'N/A'}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                                            <div className="flex items-center gap-3 text-slate-400">
                                                <Mail size={14} />
                                                <Smartphone size={14} />
                                            </div>
                                            <button
                                                onClick={() => setSelectedCandidate(candidate)}
                                                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest"
                                            >
                                                Ver Perfil
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )
            }

            {/* Candidate Profile Modal */}
            {
                selectedCandidate && (
                    <CandidateProfileModal
                        candidate={selectedCandidate}
                        onClose={() => setSelectedCandidate(null)}
                        onRefresh={() => {
                            setSelectedCandidate(null);
                            loadCandidates();
                        }}
                    />
                )
            }
        </div >
    );
}
