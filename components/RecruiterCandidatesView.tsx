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
    const { user } = useAuth();
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
            default:
                return 'Invitado';
        }
    };

    return (
        <div className="space-y-4">
            {/* Search */}
            <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                    <input
                        type="text"
                        placeholder="Buscar por nombre, DNI, código, email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    />
                    <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>

                {/* CUL Validation Filter */}
                <select
                    value={culFilter}
                    onChange={(e) => setCulFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm"
                >
                    <option value="all">📋 Todos los estados</option>
                    <option value="verified">✅ Verificados (Aptos)</option>
                    <option value="rejected">❌ Rechazados</option>
                    <option value="manual_review">⚠️ Por Validar</option>
                    <option value="pending">⏳ Sin Validar</option>
                </select>
                <button
                    onClick={async () => {
                        const { exportAllCandidatesExcel } = await import('@/lib/utils/export-excel');
                        exportAllCandidatesExcel(filteredCandidates);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-full text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-2 shadow-sm"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Exportar Lista (Excel)
                </button>

                {/* Special button for exporting only SELECCIONADOS - NGR Format */}
                <button
                    onClick={async () => {
                        const { exportAptosExcel } = await import('@/lib/utils/export-excel');
                        try {
                            exportAptosExcel(filteredCandidates);
                        } catch (error: any) {
                            alert(error.message);
                        }
                    }}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-full text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-sm border border-emerald-500"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Exportar SELECCIONADOS (Excel)
                </button>

                <div className="text-sm text-gray-600">
                    {filteredCandidates.length} candidatos
                </div>
            </div>

            {/* Candidates List */}
            {filteredCandidates.length === 0 ? (
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
                        // Get latest application
                        const latestApp = candidate.applications && candidate.applications.length > 0
                            ? candidate.applications[candidate.applications.length - 1]
                            : null;

                        return (
                            <div key={candidate.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        {/* Header */}
                                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                                            <h3 className="font-semibold text-gray-900">
                                                {candidate.nombre} {candidate.apellidoPaterno} {candidate.apellidoMaterno}
                                            </h3>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getCULStatusColor(candidate.culStatus)}`}>
                                                {getCULStatusLabel(candidate.culStatus)}
                                            </span>
                                            {latestApp && (
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getApplicationStatusColor(latestApp.status)}`}>
                                                    {getApplicationStatusLabel(latestApp.status)}
                                                </span>
                                            )}

                                            {/* Hiring Status Badge */}
                                            {(() => {
                                                const aptoApp = candidate.applications?.find(app => (app.status === 'approved' || app.status === 'selected'));

                                                if (candidate.selectionStatus === 'selected' && latestApp && candidate.selectedForRQ === latestApp.rqId) {
                                                    return (
                                                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                                                            <span>🎯</span> SELECCIONADO
                                                        </span>
                                                    );
                                                }

                                                // Warning if selected for another RQ
                                                if (candidate.selectionStatus === 'selected' && latestApp && candidate.selectedForRQ !== latestApp.rqId) {
                                                    return (
                                                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100 flex items-center gap-1">
                                                            <span>⚠️</span> Sel. en otra tienda/RQ
                                                        </span>
                                                    );
                                                }

                                                if (aptoApp?.hiredStatus === 'hired') {
                                                    return (
                                                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-600 text-white">
                                                            ✅ Ingresó
                                                        </span>
                                                    );
                                                } else if (aptoApp?.hiredStatus === 'not_hired') {
                                                    return (
                                                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-500 text-white">
                                                            ❌ No Ingresó
                                                        </span>
                                                    );
                                                } else if (candidate.culStatus === 'apto') {
                                                    return (
                                                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500 text-white">
                                                            ⏳ Pendiente Ingreso
                                                        </span>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </div>

                                        {/* Info Grid */}
                                        <div className="grid grid-cols-3 gap-x-6 gap-y-1 text-sm mb-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-gray-500">Código:</span>
                                                <span className="font-mono font-semibold text-violet-700">{candidate.candidateCode}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-gray-500">DNI:</span>
                                                <span className="font-medium">{candidate.dni}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-gray-500">Email:</span>
                                                <span className="text-gray-700 text-xs">{candidate.email}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-gray-500">Teléfono:</span>
                                                <span className="text-gray-700">{candidate.telefono}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-gray-500">Ubicación:</span>
                                                <span className="text-gray-700">{candidate.distrito}</span>
                                            </div>
                                            {latestApp && (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-gray-500">Posición:</span>
                                                    <span className="text-violet-700 font-medium">{latestApp.posicion || 'N/A'}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Applications Summary */}
                                        {candidate.applications && candidate.applications.length > 0 && (
                                            <div className="mt-3 pt-3 border-t border-gray-100">
                                                <p className="text-xs text-gray-500 mb-2">
                                                    Postulaciones ({candidate.applications.length}):
                                                </p>
                                                <div className="flex flex-wrap gap-2">
                                                    {candidate.applications.slice(-3).map((app, idx) => (
                                                        <div key={idx} className="text-xs bg-violet-50 rounded px-2 py-1">
                                                            <span className="text-violet-900">{app.tiendaNombre}</span>
                                                            {app.posicion && <span className="text-violet-600"> • {app.posicion}</span>}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-col gap-2 ml-4 min-w-[120px]">
                                        <button
                                            onClick={() => setSelectedCandidate(candidate)}
                                            className="px-4 py-2 bg-violet-600 text-white rounded-full text-sm font-medium hover:bg-violet-700 transition-colors shadow-sm flex items-center justify-center gap-2"
                                        >
                                            <span>👤</span> Ver Perfil
                                        </button>
                                        {candidate.certificadoUnicoLaboral && (
                                            <a
                                                href={candidate.certificadoUnicoLaboral}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-4 py-2 text-center bg-blue-600 text-white rounded-full text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm flex items-center justify-center gap-2"
                                            >
                                                <span>📄</span> Ver CUL
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Profile Modal */}
            {selectedCandidate && (
                <CandidateProfileModal
                    candidate={selectedCandidate}
                    onClose={() => setSelectedCandidate(null)}
                    onRefresh={onRefresh}
                />
            )}
        </div>
    );
}
