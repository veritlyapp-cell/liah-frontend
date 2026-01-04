'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getCandidatesByStore, getCandidatesByMultipleStores, getCandidatesByMarca } from '@/lib/firestore/candidate-queries';
import type { Candidate } from '@/lib/firestore/candidates';
import CandidateProfileModal from '@/components/CandidateProfileModal';
import PriorityModal from '@/components/PriorityModal';

interface CandidatesListViewProps {
    storeId?: string;
    storeIds?: string[]; // [NEW] For supervisors
    marcaId?: string; // [NEW] For jefe de marca
    filterStatus?: string; // [NEW] Optional filter
}

export default function CandidatesListView({ storeId, storeIds, marcaId, filterStatus }: CandidatesListViewProps) {
    const { claims } = useAuth();
    const isStoreManager = claims?.role === 'store_manager';
    const isSupervisor = claims?.role === 'supervisor';
    const isJefeMarca = claims?.role === 'jefe_marca';
    const isRecruiter = claims?.role === 'brand_recruiter' || claims?.role === 'recruiter';
    const isAdmin = claims?.role === 'client_admin' || claims?.role === 'super_admin';

    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
    const [expandedHistory, setExpandedHistory] = useState<Set<string>>(new Set());
    // State for PriorityModal
    const [candidateToApprove, setCandidateToApprove] = useState<{ candidate: Candidate; appId: string } | null>(null);

    const toggleHistory = (candidateId: string) => {
        setExpandedHistory(prev => {
            const next = new Set(prev);
            if (next.has(candidateId)) {
                next.delete(candidateId);
            } else {
                next.add(candidateId);
            }
            return next;
        });
    };

    useEffect(() => {
        loadCandidates();
    }, [storeId, JSON.stringify(storeIds), marcaId]);

    async function loadCandidates() {
        setLoading(true);
        try {
            let data: Candidate[] = [];
            if (marcaId) {
                data = await getCandidatesByMarca(marcaId);
            } else if (storeIds && storeIds.length > 0) {
                data = await getCandidatesByMultipleStores(storeIds);
            } else if (storeId) {
                data = await getCandidatesByStore(storeId);
            }
            setCandidates(data);
        } catch (error) {
            console.error('Error loading candidates:', error);
        } finally {
            setLoading(false);
        }
    }

    // Handle approval with new PriorityModal
    const handleApproveWithPriority = async (priority: 'principal' | 'backup') => {
        if (!candidateToApprove) return;

        const { candidate, appId } = candidateToApprove;
        const { approveCandidate } = await import('@/lib/firestore/candidate-actions');

        try {
            await approveCandidate(candidate.id, appId, 'store-manager-user', priority);

            // NOTE: Email removed - Recruiter sends email when marking CUL as 'Apto'
            alert(`✅ Candidato aprobado como ${priority === 'principal' ? '⭐ PRINCIPAL' : '📋 BACKUP'}`);
            loadCandidates();
        } catch (error) {
            console.error('Error approving:', error);
            alert('Error al aprobar');
        } finally {
            setCandidateToApprove(null);
        }
    };


    const [listFilter, setListFilter] = useState<'process' | 'selected' | 'rejected'>('process');

    const filteredCandidates = candidates.filter(candidate => {
        // Obtenemos la aplicación para esta tienda, lista de tiendas o marca
        const relevantStoreIds = storeIds || (storeId ? [storeId] : []);
        const storeApplications = candidate.applications?.filter(app => {
            if (marcaId) return app.marcaId === marcaId;
            return relevantStoreIds.includes(app.tiendaId);
        }) || [];
        const latestApp = storeApplications[storeApplications.length - 1];

        // Search filter first
        const search = searchTerm.toLowerCase();
        const matchesSearch = (
            candidate.nombre?.toLowerCase().includes(search) ||
            candidate.apellidoPaterno?.toLowerCase().includes(search) ||
            candidate.dni?.includes(search) ||
            candidate.candidateCode?.toLowerCase().includes(search)
        );

        if (!matchesSearch) return false;

        // Status Categorization
        if (filterStatus) {
            // If strictly filtered (e.g. from a specific dashboard tab), enforce it
            return latestApp?.status === filterStatus;
        }

        // Default behavior: Categorize by listFilter
        if (listFilter === 'process') {
            // En Proceso: No están aprobados ni rechazados final
            if (latestApp?.status === 'approved' || latestApp?.status === 'rejected' || candidate.selectionStatus === 'selected') {
                return false;
            }
        } else if (listFilter === 'selected') {
            // Seleccionados: marcados como 'selected' por recruiter o aprobados por SM si no hay check de recruiter
            // Pero priorizamos selectionStatus === 'selected'
            const isSelected = candidate.selectionStatus === 'selected' && (candidate.selectedForRQ === latestApp?.rqId);
            const isApprovedBySM = latestApp?.status === 'approved';
            if (!isSelected && !isApprovedBySM) return false;
        } else if (listFilter === 'rejected') {
            if (latestApp?.status !== 'rejected') return false;
        }

        return true;
    });

    const getCULStatusColor = (status: string) => {
        switch (status) {
            case 'apto':
                return 'bg-green-100 text-green-800';
            case 'no_apto':
                return 'bg-red-100 text-red-800';
            case 'expired':
                return 'bg-orange-100 text-orange-800';
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
            case 'expired':
                return 'Vencido';
            case 'manual_review':
                return 'En Revisión';
            default:
                return 'Pendiente';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <div className="text-4xl mb-2">⏳</div>
                    <p className="text-gray-500">Cargando candidatos...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Status Tabs */}
            {!filterStatus && (
                <div className="flex border-b border-gray-200">
                    <button
                        onClick={() => setListFilter('process')}
                        className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${listFilter === 'process'
                            ? 'border-violet-600 text-violet-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        🔄 En Proceso
                    </button>
                    <button
                        onClick={() => setListFilter('selected')}
                        className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${listFilter === 'selected'
                            ? 'border-violet-600 text-violet-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        🎯 Seleccionados
                    </button>
                    <button
                        onClick={() => setListFilter('rejected')}
                        className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${listFilter === 'rejected'
                            ? 'border-violet-600 text-violet-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        🚫 Rechazados
                    </button>
                </div>
            )}

            {/* Search */}
            <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                    <input
                        type="text"
                        placeholder="Buscar por nombre, DNI, código..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    />
                    <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
                <button
                    onClick={async () => {
                        const { exportCandidates } = await import('@/lib/utils/export-csv');
                        exportCandidates(filteredCandidates, `candidatos_${listFilter}_${new Date().toISOString().split('T')[0]}.csv`);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Exportar CSV
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <p className="text-sm text-gray-600">Total en Proceso</p>
                    <p className="text-2xl font-bold text-gray-900">{filteredCandidates.length}</p>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <p className="text-sm text-gray-600">Aceptados (Tienda)</p>
                    <p className="text-2xl font-bold text-green-600">
                        {candidates.filter(c => {
                            const apps = c.applications?.filter(a => a.tiendaId === storeId) || [];
                            return apps[apps.length - 1]?.status === 'approved';
                        }).length}
                    </p>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <p className="text-sm text-gray-600">Revisión de CUL</p>
                    <p className="text-2xl font-bold text-yellow-600">
                        {filteredCandidates.filter(c => c.culStatus === 'pending' || c.culStatus === 'manual_review').length}
                    </p>
                </div>
            </div>

            {/* Candidates List */}
            {filteredCandidates.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                    <div className="text-6xl mb-4">👥</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {searchTerm ? 'No se encontraron candidatos' : 'No hay candidatos pendientes'}
                    </h3>
                    <p className="text-gray-600">
                        {searchTerm ? 'Intenta con otro término de búsqueda' : 'Los candidatos aparecerán aquí cuando se registren. Una vez evaluados, pasarán a "Aptos" o Historial.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredCandidates.map(candidate => {
                        // Obtener su última aplicación a esta tienda (ACTUAL)
                        const storeApplications = candidate.applications?.filter(app => app.tiendaId === storeId) || [];
                        const latestApp = storeApplications[storeApplications.length - 1];

                        // Historial: todas las demás aplicaciones (otras tiendas o anteriores)
                        const otherApplications = candidate.applications?.filter(app =>
                            app.id !== latestApp?.id
                        ) || [];
                        const hasHistory = otherApplications.length > 0;

                        const showCandidateHistory = expandedHistory.has(candidate.id);

                        return (
                            <div key={candidate.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        {/* Header */}
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="font-semibold text-gray-900">
                                                {candidate.nombre} {candidate.apellidoPaterno} {candidate.apellidoMaterno}
                                            </h3>

                                            {candidate.source === 'bot_whatsapp' && (
                                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100 flex items-center gap-1">
                                                    <span>🤖</span> Bot
                                                </span>
                                            )}

                                            {/* CUL Global Status Badge - Visible only to Admin/Recruiter as it is internal */}
                                            {(isAdmin || isRecruiter) && candidate.culStatus && candidate.culStatus !== 'pending' && (
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 flex items-center gap-1`}>
                                                    <span>📄</span>
                                                    CUL: {candidate.culStatus === 'apto' ? 'Ya Validado (Apto)' : 'Validado (No Apto)'}
                                                </span>
                                            )}

                                            {/* Seleccionado Badge - Final state */}
                                            {candidate.selectionStatus === 'selected' && (candidate.selectedForRQ === latestApp?.rqId) && (
                                                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                                                    <span>🎯</span> SELECCIONADO
                                                </span>
                                            )}

                                            {/* Warning if selected for another RQ */}
                                            {candidate.selectionStatus === 'selected' && candidate.selectedForRQ !== latestApp?.rqId && (
                                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100 flex items-center gap-1">
                                                    <span>⚠️</span> Sel. en otra tienda/RQ
                                                </span>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm mb-3">
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
                                                <span className="text-gray-700">{candidate.email}</span>
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
                                                <>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-gray-500">Posición:</span>
                                                        <span className="text-violet-700 font-medium">
                                                            {latestApp.posicion || 'No especificada'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-gray-500">Modalidad:</span>
                                                        <span className="font-medium text-gray-900">
                                                            {latestApp.modalidad || 'Full Time'}
                                                        </span>
                                                    </div>
                                                    {latestApp.turno && (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-gray-500">Turno:</span>
                                                            <span className="font-medium text-gray-900">{latestApp.turno}</span>
                                                        </div>
                                                    )}
                                                    {latestApp.priority && (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-gray-500">Prioridad:</span>
                                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${latestApp.priority === 'principal'
                                                                ? 'bg-amber-100 text-amber-800'
                                                                : 'bg-gray-100 text-gray-700'
                                                                }`}>
                                                                {latestApp.priority === 'principal' ? '⭐ Principal' : 'Backup'}
                                                            </span>
                                                        </div>
                                                    )}
                                                </>
                                            )}

                                            {/* Interview Details Block */}
                                            {latestApp && latestApp.status === 'interview_scheduled' && candidate.entrevista && (
                                                <div className="col-span-2 mt-2 bg-purple-50 p-3 rounded-lg border border-purple-100 text-xs">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <div className="flex items-center gap-2 text-purple-900 font-semibold text-sm">
                                                            <span>📅</span>
                                                            <span>
                                                                {new Date(candidate.entrevista.fechaHora?.toDate ? candidate.entrevista.fechaHora.toDate() : candidate.entrevista.fechaHora).toLocaleString('es-PE', { weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                        {candidate.entrevista.confirmada ? (
                                                            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold text-[10px] border border-green-200">
                                                                ✓ CONFIRMADO
                                                            </span>
                                                        ) : (
                                                            <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-bold text-[10px] border border-yellow-200">
                                                                ⏳ PENDIENTE
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-purple-700 flex items-start gap-2 pl-1 mb-2">
                                                        <span>📍</span>
                                                        <span>{candidate.entrevista.direccion}</span>
                                                    </div>
                                                    {candidate.entrevista.calendarLink && (
                                                        <a href={candidate.entrevista.calendarLink} target="_blank" rel="noreferrer" className="text-purple-600 hover:text-purple-800 hover:underline pl-7 flex items-center gap-1 font-medium transition-colors">
                                                            <span>🔗</span> Ver evento en Google Calendar
                                                        </a>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Postulación Actual - Solo la más reciente */}
                                        {latestApp && (
                                            <div className="mt-3 pt-3 border-t border-gray-100">
                                                <div className="flex items-center justify-between mb-2">
                                                    <p className="text-xs text-gray-500 font-medium">Postulación Actual:</p>
                                                    {hasHistory && (
                                                        <button
                                                            onClick={() => toggleHistory(candidate.id)}
                                                            className="text-xs text-violet-600 hover:underline flex items-center gap-1"
                                                        >
                                                            📜 {showCandidateHistory ? 'Ocultar' : 'Ver'} Historial ({otherApplications.length})
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="text-xs bg-violet-50 rounded px-3 py-2 flex items-center justify-between">
                                                    <span className="text-violet-900">
                                                        {latestApp.tiendaNombre} • {latestApp.posicion || 'Posición'} • {new Date(latestApp.appliedAt?.toDate ? latestApp.appliedAt.toDate() : latestApp.appliedAt).toLocaleDateString()}
                                                    </span>
                                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${candidate.selectionStatus === 'selected' && candidate.selectedForRQ === latestApp.rqId ? 'bg-emerald-100 text-emerald-700' :
                                                        latestApp.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                            latestApp.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                                                                latestApp.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                                    latestApp.status === 'interview_scheduled' ? 'bg-purple-100 text-purple-700' :
                                                                        'bg-amber-100 text-amber-700'
                                                        }`}>
                                                        {candidate.selectionStatus === 'selected' && candidate.selectedForRQ === latestApp.rqId ? 'Seleccionado' :
                                                            latestApp.status === 'completed' ? 'Completado' :
                                                                latestApp.status === 'approved' ? 'Aprobado' :
                                                                    latestApp.status === 'rejected' ? 'Rechazado' :
                                                                        latestApp.status === 'interview_scheduled' ? 'Entrevista Agendada' :
                                                                            'Invitado'}
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Historial Expandible */}
                                        {showCandidateHistory && otherApplications.length > 0 && (
                                            <div className="mt-2 bg-gray-50 rounded-lg p-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                                <p className="text-xs text-gray-500 mb-2 font-medium">📜 Historial de Procesos Anteriores:</p>
                                                <div className="space-y-1">
                                                    {otherApplications.map((app, idx) => (
                                                        <div key={idx} className="text-xs bg-white rounded px-2 py-1.5 flex items-center justify-between border border-gray-200">
                                                            <span className="text-gray-700">
                                                                {app.tiendaNombre} • {app.posicion || 'N/A'} • {new Date(app.appliedAt?.toDate ? app.appliedAt.toDate() : app.appliedAt).toLocaleDateString()}
                                                            </span>
                                                            <span className={`px-2 py-0.5 rounded text-xs ${app.hiredStatus === 'hired' ? 'bg-green-100 text-green-700 font-bold' :
                                                                app.hiredStatus === 'not_hired' ? 'bg-gray-100 text-gray-600' :
                                                                    app.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                                                                        app.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                                            'bg-gray-100 text-gray-600'
                                                                }`}>
                                                                {app.hiredStatus === 'hired' ? '✅ Ingresó' :
                                                                    app.hiredStatus === 'not_hired' ? '❌ No Ingresó' :
                                                                        app.status === 'approved' ? 'Aprobado' :
                                                                            app.status === 'rejected' ? 'Rechazado' :
                                                                                'Finalizado'}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-col gap-2 ml-4 min-w-[120px]">
                                        {candidate.certificadoUnicoLaboral && (isAdmin || isRecruiter) && (
                                            <a
                                                href={candidate.certificadoUnicoLaboral}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors text-center shadow-sm flex items-center justify-center gap-2"
                                            >
                                                <span>📄</span> Ver CUL
                                            </a>
                                        )}

                                        {/* Approval Actions for latest application */}
                                        {latestApp && latestApp.status === 'completed' && (
                                            <>
                                                <button
                                                    onClick={() => setCandidateToApprove({ candidate, appId: latestApp.id })}
                                                    className="px-4 py-2 text-sm bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors shadow-sm flex items-center justify-center gap-2"
                                                >
                                                    <span>✓</span> Aprobar
                                                </button>

                                                <button
                                                    onClick={async () => {
                                                        const reason = prompt('Razón del rechazo:');
                                                        if (!reason) return;

                                                        const { rejectCandidate } = await import('@/lib/firestore/candidate-actions');
                                                        try {
                                                            await rejectCandidate(candidate.id, latestApp.id, 'store-manager-user', reason);
                                                            // REMOVED: updateCULStatus - Recruiter should do this evaluation

                                                            loadCandidates();
                                                            alert('Candidato rechazado.');
                                                        } catch (error) {
                                                            console.error('Error rejecting:', error);
                                                            alert('Error al rechazar');
                                                        }
                                                    }}
                                                    className="px-4 py-2 text-sm bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors shadow-sm flex items-center justify-center gap-2"
                                                >
                                                    <span>✕</span> Rechazar
                                                </button>
                                            </>
                                        )}

                                        <button
                                            onClick={() => setSelectedCandidate(candidate)}
                                            className="px-4 py-2 text-sm border border-gray-300 rounded-full hover:bg-gray-50 transition-colors shadow-sm text-center"
                                        >
                                            Ver Perfil
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Candidate Profile Modal */}
            {selectedCandidate && (
                <CandidateProfileModal
                    candidate={selectedCandidate}
                    onClose={() => setSelectedCandidate(null)}
                    onRefresh={loadCandidates}
                />
            )}

            {/* Priority Selection Modal */}
            <PriorityModal
                isOpen={!!candidateToApprove}
                candidateName={candidateToApprove?.candidate.nombre || ''}
                onSelect={handleApproveWithPriority}
                onClose={() => setCandidateToApprove(null)}
            />
        </div>
    );
}
