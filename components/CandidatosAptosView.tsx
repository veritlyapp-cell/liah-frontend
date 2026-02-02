'use client';

import { useState, useEffect } from 'react';
import type { Candidate } from '@/lib/firestore/candidates';
import DatePickerModal from './DatePickerModal';
import CandidateProfileModal from './CandidateProfileModal';

interface CandidatosAptosViewProps {
    storeId: string;
    marcaId: string;
}

export default function CandidatosAptosView({ storeId, marcaId }: CandidatosAptosViewProps) {
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [loading, setLoading] = useState(true);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [selectedCandidate, setSelectedCandidate] = useState<{ id: string, appId: string, name: string } | null>(null);
    const [viewedCandidate, setViewedCandidate] = useState<Candidate | null>(null);

    useEffect(() => {
        loadAptoCandidates();
    }, [storeId, marcaId]);

    const loadAptoCandidates = async () => {
        setLoading(true);
        try {
            // Use getCandidatesByMarca
            const { getCandidatesByMarca } = await import('@/lib/firestore/recruiter-queries');
            const allCandidates = await getCandidatesByMarca(marcaId);

            // 1. selectionStatus is strictly 'selected'
            // 2. selectedForRQ belongs to an application in this store
            const selectedCandidates = allCandidates.filter(c => {
                if (c.selectionStatus !== 'selected') return false;

                return c.applications?.some(app =>
                    app.rqId === c.selectedForRQ && app.tiendaId === storeId
                );
            });

            setCandidates(selectedCandidates);
        } catch (error) {
            console.error('Error loading apto candidates:', error);
        } finally {
            setLoading(false);
        }
    };

    const confirmHire = async (date: Date) => {
        if (!selectedCandidate) return;

        try {
            const { markCandidateHired } = await import('@/lib/firestore/hiring-actions');
            await markCandidateHired(
                selectedCandidate.id,
                selectedCandidate.appId,
                'store-manager-user',
                date
            );
            alert('✅ Candidato marcado como INGRESADO');
            loadAptoCandidates();
        } catch (error) {
            console.error('Error marking hired:', error);
            alert('Error al marcar ingreso');
        } finally {
            setSelectedCandidate(null);
        }
    };

    const handleMarkNotHired = async (candidateId: string, applicationId: string) => {
        const reasons = [
            'Desistió',
            'No pasó examen médico',
            'Encontró mejor oferta',
            'No se presentó',
            'Documentación incompleta',
            'Otro'
        ];

        const reasonIndex = prompt(
            'Selecciona razón:\n' +
            reasons.map((r, i) => `${i + 1}. ${r}`).join('\n') +
            '\n\nIngresa el número:'
        );

        if (!reasonIndex) return;
        const index = parseInt(reasonIndex) - 1;

        let reason = reasons[index];
        if (index === reasons.length - 1) {
            reason = prompt('Especifica la razón:') || 'Otro';
        }

        try {
            const { markCandidateNotHired } = await import('@/lib/firestore/hiring-actions');
            await markCandidateNotHired(candidateId, applicationId, 'store-manager-user', reason);
            alert('❌ Candidato marcado como NO INGRESADO');
            loadAptoCandidates();
        } catch (error) {
            console.error('Error marking not hired:', error);
            alert('Error al marcar como no ingresado');
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
        </div>;
    }

    // Agrupar por estado de ingreso - ONLY check the CURRENT (selectedForRQ) application
    const pending = candidates.filter(c => {
        const currentApp = c.applications?.find(app => app.rqId === c.selectedForRQ);
        return currentApp && !currentApp.hiredStatus;
    });
    const hired = candidates.filter(c => {
        const currentApp = c.applications?.find(app => app.rqId === c.selectedForRQ);
        return currentApp?.hiredStatus === 'hired';
    });
    const notHired = candidates.filter(c => {
        const currentApp = c.applications?.find(app => app.rqId === c.selectedForRQ);
        return currentApp?.hiredStatus === 'not_hired';
    });

    const exportToCSV = () => {
        if (pending.length === 0) return;

        const headers = ['Nombre', 'Apellido Paterno', 'Apellido Materno', 'DNI', 'Email', 'Telefono', 'Puesto', 'Modalidad', 'Tienda'];
        const rows = pending.map(c => {
            const app = c.applications?.find(a => (a.tiendaId === storeId || a.marcaId === marcaId) && (a.status === 'approved' || a.status === 'selected'));
            return [
                c.nombre,
                c.apellidoPaterno,
                c.apellidoMaterno,
                c.dni,
                c.email,
                c.telefono,
                app?.posicion || '',
                app?.modalidad || '',
                app?.tiendaNombre || ''
            ].join(',');
        });

        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `ingresos_pendientes_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-600">Pendientes Ingreso</p>
                    <p className="text-3xl font-bold text-yellow-900">{pending.length}</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 opacity-75">
                    <p className="text-sm text-green-600">Ingresaron</p>
                    <p className="text-3xl font-bold text-green-900">{hired.length}</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 opacity-75">
                    <p className="text-sm text-gray-600">No Ingresaron</p>
                    <p className="text-3xl font-bold text-gray-900">{notHired.length}</p>
                </div>
            </div>

            {/* Pending Candidates (Always Visible) */}
            {pending.length > 0 && (
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <span>⏳</span> Candidatos Seleccionados - Pendientes de Ingreso
                        </h3>
                        <button
                            onClick={exportToCSV}
                            className="text-sm px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2 font-medium"
                        >
                            📥 Exportar CSV para Ingreso
                        </button>
                    </div>
                    <div className="space-y-3">
                        {pending.map(candidate => {
                            const aptoApp = candidate.applications?.find(app => (app.tiendaId === storeId || app.marcaId === marcaId) && (app.status === 'approved' || app.status === 'selected'));
                            if (!aptoApp) return null;

                            // Since we filtered strictly, canConfirmIngreso is always true if they are in the 'pending' list
                            const canConfirmIngreso = true;
                            const fullName = `${candidate.nombre} ${candidate.apellidoPaterno} ${candidate.apellidoMaterno}`;

                            return (
                                <div key={candidate.id} className="bg-white border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h4 className="font-semibold text-gray-900">
                                                    {fullName}
                                                </h4>
                                                {aptoApp.priority === 'principal' && (
                                                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                                                        ⭐ Principal
                                                    </span>
                                                )}
                                                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                                                    <span>🎯</span> SELECCIONADO
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-sm text-gray-600">
                                                <div><span className="font-medium">DNI:</span> {candidate.dni}</div>
                                                <div><span className="font-medium">Email:</span> {candidate.email}</div>
                                                <div><span className="font-medium">Teléfono:</span> {candidate.telefono}</div>
                                                <div><span className="font-medium">Posición:</span> {aptoApp.posicion}</div>
                                                <div><span className="font-medium">Modalidad:</span> {aptoApp.modalidad || 'Full Time'}</div>
                                                <div>
                                                    {candidate.cvUrl ? (
                                                        <a href={candidate.cvUrl} target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:underline font-medium">
                                                            📄 Ver CV
                                                        </a>
                                                    ) : (
                                                        <span className="text-gray-400 italic">Sin CV adjunto</span>
                                                    )}
                                                </div>
                                            </div>

                                            {!canConfirmIngreso && (
                                                <p className="mt-2 text-xs text-amber-600 font-medium">
                                                    📌 Aprueba al candidato con prioridad (Principal/Backup) para habilitar los botones.
                                                </p>
                                            )}

                                            <div className="mt-4">
                                                <button
                                                    onClick={() => setViewedCandidate(candidate)}
                                                    className="text-xs font-bold text-violet-600 hover:text-violet-800 flex items-center gap-1.5 bg-violet-50 px-3 py-1.5 rounded-lg border border-violet-100 transition-colors"
                                                >
                                                    🔍 Ver Perfil y Documentos (CUL IA)
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2 ml-4">
                                            <button
                                                disabled={!canConfirmIngreso}
                                                onClick={() => {
                                                    setSelectedCandidate({
                                                        id: candidate.id,
                                                        appId: aptoApp.id,
                                                        name: fullName
                                                    });
                                                    setShowDatePicker(true);
                                                }}
                                                className={`px-4 py-2 rounded font-medium transition-colors text-sm ${canConfirmIngreso
                                                    ? 'bg-green-600 text-white hover:bg-green-700'
                                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                    }`}
                                            >
                                                ✅ Confirmar Ingreso
                                            </button>
                                            <button
                                                disabled={!canConfirmIngreso}
                                                onClick={() => handleMarkNotHired(candidate.id, aptoApp.id)}
                                                className={`px-4 py-2 rounded font-medium transition-colors text-sm ${canConfirmIngreso
                                                    ? 'bg-gray-600 text-white hover:bg-gray-700'
                                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                    }`}
                                            >
                                                ❌ No Ingresó
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Candidate Profile Modal */}
            {viewedCandidate && (
                <CandidateProfileModal
                    candidate={viewedCandidate}
                    onClose={() => setViewedCandidate(null)}
                    onRefresh={loadAptoCandidates}
                />
            )}

            {/* Toggle History Button */}
            {(hired.length > 0 || notHired.length > 0) && (
                <div className="flex justify-center pt-4">
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className="text-sm text-violet-600 font-medium hover:underline flex items-center gap-2"
                    >
                        {showHistory ? 'Ocultar Historial' : `Ver Historial (${hired.length + notHired.length} archivados)`}
                    </button>
                </div>
            )}

            {/* Hired Candidates (History) */}
            {showHistory && hired.length > 0 && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                    <h3 className="text-lg font-semibold mb-3 text-green-700">✅ Candidatos que Ingresaron</h3>
                    <div className="space-y-2">
                        {hired.map(candidate => {
                            const hiredApp = candidate.applications?.find(app => app.hiredStatus === 'hired');
                            if (!hiredApp) return null;

                            return (
                                <div key={candidate.id} className="bg-green-50 border border-green-200 rounded-lg p-3">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3">
                                                <span className="font-medium text-gray-900">
                                                    {candidate.nombre} {candidate.apellidoPaterno} {candidate.apellidoMaterno}
                                                </span>
                                                <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-bold">INGRESÓ</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-600 mt-2">
                                                <div><span className="font-medium">Puesto:</span> {hiredApp.posicion}</div>
                                                <div><span className="font-medium">DNI:</span> {candidate.dni}</div>
                                                <div><span className="font-medium">Email:</span> {candidate.email}</div>
                                                <div><span className="font-medium">Teléfono:</span> {candidate.telefono}</div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-2 text-right">
                                            <div className="text-sm text-gray-600">
                                                Fecha de Ingreso: <strong>{hiredApp.startDate?.toDate?.().toLocaleDateString() || 'N/A'}</strong>
                                            </div>
                                            {candidate.cvUrl && (
                                                <a
                                                    href={candidate.cvUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs font-medium text-violet-600 hover:text-violet-800 flex items-center gap-1"
                                                >
                                                    📄 Ver CV PDF
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Not Hired Candidates (History) */}
            {showHistory && notHired.length > 0 && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                    <h3 className="text-lg font-semibold mb-3 text-gray-700">❌ Candidatos que No Ingresaron</h3>
                    <div className="space-y-2">
                        {notHired.map(candidate => {
                            const notHiredApp = candidate.applications?.find(app => app.hiredStatus === 'not_hired');
                            if (!notHiredApp) return null;

                            return (
                                <div key={candidate.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <span className="font-medium text-gray-900">
                                                {candidate.nombre} {candidate.apellidoPaterno}
                                            </span>
                                            <span className="text-sm text-gray-600 ml-3">
                                                Razón: {notHiredApp.notHiredReason}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {candidates.length === 0 && (
                <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                    <div className="text-6xl mb-4">📋</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        No hay candidatos aptos aún
                    </h3>
                    <p className="text-gray-600">
                        Los candidatos con CUL Apto aparecerán aquí
                    </p>
                </div>
            )}

            {/* Date Picker Modal */}
            {selectedCandidate && (
                <DatePickerModal
                    isOpen={showDatePicker}
                    onClose={() => {
                        setShowDatePicker(false);
                        setSelectedCandidate(null);
                    }}
                    onConfirm={confirmHire}
                    title="Confirmar Ingreso de Candidato"
                    candidateName={selectedCandidate.name}
                />
            )}
        </div>
    );
}
