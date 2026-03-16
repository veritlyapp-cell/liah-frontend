'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { Candidate } from '@/lib/firestore/candidates';
import { approveCandidate, rejectCandidate } from '@/lib/firestore/candidate-actions';
import CandidateProfileModal from './CandidateProfileModal';

interface RecruiterCandidatesViewProps {
    candidates: Candidate[];
    onRefresh: () => void;
}

export default function RecruiterCandidatesView({ candidates, onRefresh }: RecruiterCandidatesViewProps) {
    const { user, claims } = useAuth();
    const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [culFilter, setCulFilter] = useState<string>('all');

    // Search and CUL status filtering
    const filteredCandidates = candidates.filter(candidate => {
        // CUL status filter
        if (culFilter !== 'all') {
            const culStatus = candidate.culStatus || 'pending';
            const culValidationStatus = (candidate as any).culValidationStatus;

            if (culFilter === 'verified') {
                // Show approved by AI or manually
                if (culStatus !== 'apto' && culValidationStatus !== 'approved_ai' && culValidationStatus !== 'approved_manual') {
                    return false;
                }
            } else if (culFilter === 'rejected') {
                // Show rejected by AI or manually
                if (culStatus !== 'no_apto' && culValidationStatus !== 'rejected_ai' && culValidationStatus !== 'rejected_manual' && culValidationStatus !== 'rejected_invalid_doc') {
                    return false;
                }
            } else if (culFilter === 'manual_review') {
                // Show pending manual review
                if (culStatus !== 'manual_review' && culValidationStatus !== 'pending_review') {
                    return false;
                }
            } else if (culFilter === 'pending') {
                // Show not validated yet
                if (culStatus && culStatus !== 'pending') return false;
                if (culValidationStatus) return false;
            }
        }

        // Search filter
        const search = searchTerm.toLowerCase();
        return (
            candidate.nombre?.toLowerCase().includes(search) ||
            candidate.apellidoPaterno?.toLowerCase().includes(search) ||
            candidate.dni?.includes(search) ||
            candidate.candidateCode?.toLowerCase().includes(search) ||
            candidate.email?.toLowerCase().includes(search)
        );
    });

    const getCULStatusColor = (status: string) => {
        switch (status) {
            case 'apto':
                return 'bg-green-100 text-green-800';
            case 'no_apto':
                return 'bg-red-100 text-red-800';
            case 'manual_review':
                return 'bg-yellow-100 text-yellow-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getCULStatusLabel = (status: string) => {
        switch (status) {
            case 'apto':
                return 'Apto';
            case 'no_apto':
                return 'No Apto';
            case 'manual_review':
                return 'Revisión Manual';
            default:
                return 'Pendiente';
        }
    };

    const getApplicationStatusColor = (status: string) => {
        switch (status) {
            case 'approved':
                return 'bg-green-100 text-green-700';
            case 'rejected':
                return 'bg-red-100 text-red-700';
            case 'completed':
                return 'bg-blue-100 text-blue-700';
            default:
                return 'bg-gray-100 text-gray-700';
        }
    };

    const getApplicationStatusLabel = (status: string) => {
        switch (status) {
            case 'approved':
                return 'Aprobado';
            case 'rejected':
                return 'Rechazado';
            case 'completed':
                return 'Completado';
            case 'selected':
                return 'Seleccionado';
            case 'no_show':
                return 'No Acudió';
            default:
                return 'Invitado';
        }
    };

    return (
        <div className="space-y-4">
            {/* Search & Toolbar */}
            <div className="flex flex-col gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            placeholder="Buscar por nombre, DNI, código, email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full h-11 pl-10 pr-4 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-violet-500 focus:bg-white transition-all outline-none"
                        />
                        <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>

                    <select
                        value={culFilter}
                        onChange={(e) => setCulFilter(e.target.value)}
                        className="h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-violet-500 focus:bg-white transition-all outline-none"
                    >
                        <option value="all">📋 Todos los estados</option>
                        <option value="verified">✅ Verificados (Aptos)</option>
                        <option value="rejected">❌ Rechazados</option>
                        <option value="manual_review">⚠️ Por Validar</option>
                        <option value="pending">⏳ Sin Validar</option>
                    </select>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={async () => {
                            const { exportAllCandidatesExcel } = await import('@/lib/utils/export-excel');
                            exportAllCandidatesExcel(filteredCandidates);
                        }}
                        className="flex-1 min-w-[160px] h-11 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-100 transition-all border border-emerald-100 flex items-center justify-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Exportar Lista
                    </button>

                    <button
                        onClick={async () => {
                            const { exportAptosExcel } = await import('@/lib/utils/export-excel');
                            try {
                                exportAptosExcel(filteredCandidates);
                            } catch (error: any) {
                                alert(error.message);
                            }
                        }}
                        className="flex-1 min-w-[200px] h-11 bg-violet-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-lg shadow-violet-200 flex items-center justify-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Seleccionados (Excel)
                    </button>

                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap ml-auto">
                        {filteredCandidates.length} Candidatos
                    </div>
                </div>
            </div>

            {/* Candidates List */}
            {
                filteredCandidates.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                        <div className="text-6xl mb-4">👥</div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {searchTerm ? 'No se encontraron candidatos' : 'No hay candidatos pendientes de selección'}
                        </h3>
                        <p className="text-gray-600">
                            {searchTerm ? 'Intenta con otro término de búsqueda' : 'Los candidatos aparecerán aquí cuando el Gerente de Tienda o Supervisor los marque como aptos'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredCandidates.map(candidate => {
                            // Get latest application relevant to this recruiter's marcas if possible
                            // For simplicity, we filter the apps list to avoid cross-brand pollution
                            const recruiterMarcaIds = (claims as any)?.allowedMarcaIds || [];
                            const relevantApps = recruiterMarcaIds.length > 0
                                ? (candidate.applications || []).filter(a => recruiterMarcaIds.includes(a.marcaId))
                                : (candidate.applications || []);

                            const latestApp = relevantApps.length > 0
                                ? relevantApps[relevantApps.length - 1]
                                : (candidate.applications?.[candidate.applications.length - 1] || null);

                            return (
                                <div key={candidate.id} className="white-label-card p-4 md:p-6 group hover:translate-y-[-2px] transition-all duration-300">
                                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 md:gap-6">
                                        <div className="flex-1 min-w-0">
                                            {/* Header */}
                                            <div className="flex flex-wrap items-center gap-2 mb-3">
                                                <h3 className="text-base font-bold text-slate-900 group-hover:text-brand transition-colors">
                                                    {candidate.nombre} {candidate.apellidoPaterno} {candidate.apellidoMaterno}
                                                </h3>
                                                <div className="flex flex-wrap gap-2">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${getCULStatusColor(candidate.culStatus)}`}>
                                                        {getCULStatusLabel(candidate.culStatus)}
                                                    </span>
                                                    {latestApp && (
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${getApplicationStatusColor(latestApp.status)}`}>
                                                            {getApplicationStatusLabel(latestApp.status)}
                                                        </span>
                                                    )}

                                                    {/* Hiring Status Badge */}
                                                    {(() => {
                                                        if (candidate.selectionStatus === 'selected' && latestApp && candidate.selectedForRQ === latestApp.rqId) {
                                                            return (
                                                                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-emerald-500 text-white shadow-lg shadow-emerald-100 flex items-center gap-1">
                                                                    <span>🎯</span> SELECCIONADO
                                                                </span>
                                                            );
                                                        }
                                                        if (candidate.selectionStatus === 'selected' && latestApp && candidate.selectedForRQ !== latestApp.rqId) {
                                                            return (
                                                                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-amber-500 text-white flex items-center gap-1">
                                                                    <span>⚠️</span> En otro RQ
                                                                </span>
                                                            );
                                                        }
                                                        if (latestApp?.hiredStatus === 'hired') {
                                                            return <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-emerald-600 text-white">✅ INGRESÓ</span>;
                                                        } else if (latestApp?.hiredStatus === 'not_hired') {
                                                            return <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-slate-500 text-white">❌ NO INGRESÓ</span>;
                                                        }
                                                        return null;
                                                    })()}
                                                </div>
                                            </div>

                                            {/* Info Grid */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-2 gap-x-4 text-xs mb-4">
                                                <div className="flex items-center gap-2 bg-slate-50/50 p-2 rounded-lg border border-slate-100/50">
                                                    <span className="text-slate-400 font-bold uppercase text-[9px]">ID:</span>
                                                    <span className="font-mono font-bold text-brand">{candidate.candidateCode}</span>
                                                </div>
                                                <div className="flex items-center gap-2 p-2">
                                                    <span className="text-slate-400 font-bold uppercase text-[9px]">DNI:</span>
                                                    <span className="font-medium text-slate-700">{candidate.dni}</span>
                                                </div>
                                                <div className="flex items-center gap-2 p-2">
                                                    <span className="text-slate-400 font-bold uppercase text-[9px]">Tel:</span>
                                                    <span className="font-medium text-slate-700">{candidate.telefono}</span>
                                                </div>
                                                {latestApp && (
                                                    <div className="flex items-center gap-2 p-2 sm:col-span-2">
                                                        <span className="text-slate-400 font-bold uppercase text-[9px]">Posición:</span>
                                                        <span className="text-brand font-bold uppercase tracking-tight">{latestApp.posicion || 'N/A'}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Applications Summary - Strictly filter by recruiter brands to avoid Tambo/other leakage */}
                                            {relevantApps.length > 0 && (
                                                <div className="pt-3 border-t border-slate-50 flex items-center gap-3">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Historial en Marca:</span>
                                                    <div className="flex flex-wrap gap-2">
                                                        {relevantApps.slice(-2).map((app, idx) => (
                                                            <div key={idx} className="text-[9px] font-bold bg-slate-50 text-slate-500 rounded-md px-2 py-1 border border-slate-100">
                                                                 {app.marcaNombre} • {app.tiendaNombre}
                                                            </div>
                                                        ))}
                                                        {relevantApps.length > 2 && <span className="text-[9px] text-slate-300">+{relevantApps.length - 2}</span>}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex md:flex-col gap-2 w-full md:w-[140px] border-t md:border-t-0 md:border-l border-slate-50 pt-4 md:pt-0 md:pl-6">
                                            <button
                                                onClick={() => setSelectedCandidate(candidate)}
                                                className="flex-1 h-11 bg-brand text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-brand/10 flex items-center justify-center gap-2"
                                            >
                                                Ver Perfil
                                            </button>
                                            {candidate.certificadoUnicoLaboral && (
                                                <a
                                                    href={candidate.certificadoUnicoLaboral}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex-1 md:flex-none h-11 bg-slate-50 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
                                                >
                                                    CUL
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )
            }

            {/* Profile Modal */}
            {
                selectedCandidate && (
                    <CandidateProfileModal
                        candidate={selectedCandidate}
                        onClose={() => setSelectedCandidate(null)}
                        onRefresh={onRefresh}
                    />
                )
            }
        </div >
    );
}
