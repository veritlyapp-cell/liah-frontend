'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { Candidate } from '@/lib/firestore/candidates';
import { approveCandidate, rejectCandidate, updateCULStatus } from '@/lib/firestore/candidate-actions';

interface CandidateProfileModalProps {
    candidate: Candidate;
    onClose: () => void;
    onRefresh: () => void;
}

export default function CandidateProfileModal({ candidate, onClose, onRefresh }: CandidateProfileModalProps) {
    const { user } = useAuth();
    const [processing, setProcessing] = useState(false);
    const [showRejectReason, setShowRejectReason] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');

    async function handleApprove(applicationId: string) {
        if (!user) return;

        setProcessing(true);
        try {
            await approveCandidate(candidate.id, applicationId, user.uid);
            alert('Candidato aprobado exitosamente');
            onRefresh();
            onClose();
        } catch (error) {
            console.error('Error approving candidate:', error);
            alert('Error al aprobar candidato');
        } finally {
            setProcessing(false);
        }
    }

    async function handleReject(applicationId: string) {
        if (!user || !rejectionReason.trim()) {
            alert('Por favor ingresa una razón del rechazo');
            return;
        }

        setProcessing(true);
        try {
            await rejectCandidate(candidate.id, applicationId, user.uid, rejectionReason);
            alert('Candidato rechazado');
            onRefresh();
            onClose();
        } catch (error) {
            console.error('Error rejecting candidate:', error);
            alert('Error al rechazar candidato');
        } finally {
            setProcessing(false);
        }
    }

    async function handleUpdateCUL(status: 'apto' | 'no_apto' | 'manual_review', notes?: string) {
        if (!user) return;

        setProcessing(true);
        try {
            await updateCULStatus(candidate.id, status, user.uid, notes);
            alert('Estado del CUL actualizado');
            onRefresh();
        } catch (error) {
            console.error('Error updating CUL status:', error);
            alert('Error al actualizar CUL');
        } finally {
            setProcessing(false);
        }
    }

    const latestApp = candidate.applications && candidate.applications.length > 0
        ? candidate.applications[candidate.applications.length - 1]
        : null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-900">
                        Perfil de Candidato
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Basic Info */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">Información Personal</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-gray-500">Nombre Completo</label>
                                <p className="font-medium text-gray-900">
                                    {candidate.nombre} {candidate.apellidoPaterno} {candidate.apellidoMaterno}
                                </p>
                            </div>
                            <div>
                                <label className="text-sm text-gray-500">Código</label>
                                <p className="font-mono font-semibold text-violet-700">{candidate.candidateCode}</p>
                            </div>
                            <div>
                                <label className="text-sm text-gray-500">DNI</label>
                                <p className="font-medium text-gray-900">{candidate.dni}</p>
                            </div>
                            <div>
                                <label className="text-sm text-gray-500">Email</label>
                                <p className="font-medium text-gray-900">{candidate.email}</p>
                            </div>
                            <div>
                                <label className="text-sm text-gray-500">Teléfono</label>
                                <p className="font-medium text-gray-900">{candidate.telefono}</p>
                            </div>
                            <div>
                                <label className="text-sm text-gray-500">Ubicación</label>
                                <p className="font-medium text-gray-900">
                                    {candidate.distrito}, {candidate.provincia}, {candidate.departamento}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* CUL Status */}
                    <div className="border-t pt-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">Certificado Único Laboral</h3>
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Estado de CUL (Global)</p>
                                <div className="flex flex-col gap-1">
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium w-fit ${candidate.culStatus === 'apto' ? 'bg-green-100 text-green-800 border border-green-200' :
                                        candidate.culStatus === 'no_apto' ? 'bg-red-100 text-red-800 border border-red-200' :
                                            candidate.culStatus === 'manual_review' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                                                'bg-gray-100 text-gray-800'
                                        }`}>
                                        {candidate.culStatus === 'apto' ? '✓ CUL Verificado (Apto)' :
                                            candidate.culStatus === 'no_apto' ? '✗ CUL Verificado (No Apto)' :
                                                candidate.culStatus === 'manual_review' ? '⚠ Revisión Manual' :
                                                    '⌛ Pendiente de Validación'}
                                    </span>
                                    {candidate.culCheckedBy && (
                                        <p className="text-xs text-blue-600 font-medium italic">
                                            ℹ️ Este CUL ya fue validado por un reclutador anteriormente.
                                        </p>
                                    )}
                                </div>
                            </div>
                            {candidate.certificadoUnicoLaboral && (
                                <a
                                    href={candidate.certificadoUnicoLaboral}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-medium hover:bg-blue-700 shadow-sm flex items-center gap-2"
                                >
                                    <span>📄</span> Ver PDF del CUL
                                </a>
                            )}
                        </div>

                        {/* CUL Actions */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleUpdateCUL('apto')}
                                disabled={processing}
                                className="px-4 py-2 bg-green-500 text-white rounded-full text-sm font-medium hover:bg-green-600 disabled:opacity-50 shadow-sm flex items-center gap-2"
                            >
                                <span>✓</span> Marcar como Apto
                            </button>
                            <button
                                onClick={() => handleUpdateCUL('no_apto', 'Revisión manual - denuncias encontradas')}
                                disabled={processing}
                                className="px-4 py-2 bg-red-600 text-white rounded-full text-sm font-medium hover:bg-red-700 disabled:opacity-50 shadow-sm flex items-center gap-2"
                            >
                                <span>✕</span> Marcar como No Apto
                            </button>
                            <button
                                onClick={() => handleUpdateCUL('manual_review')}
                                disabled={processing}
                                className="px-4 py-2 bg-amber-500 text-white rounded-full text-sm font-medium hover:bg-amber-600 disabled:opacity-50 shadow-sm flex items-center gap-2"
                            >
                                <span>⚠</span> Requiere Revisión
                            </button>
                        </div>
                    </div>

                    {/* Applications */}
                    <div className="border-t pt-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">
                            Postulaciones ({candidate.applications?.length || 0})
                        </h3>
                        <div className="space-y-3">
                            {candidate.applications?.map((app, idx) => (
                                <div key={idx} className="bg-gray-50 rounded-lg p-4">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <p className="font-semibold text-gray-900">{app.posicion || 'Posición no especificada'}</p>
                                            <p className="text-sm text-gray-600">{app.tiendaNombre}</p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {new Date(app.appliedAt?.toDate ? app.appliedAt.toDate() : app.appliedAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${app.status === 'approved' ? 'bg-green-100 text-green-700' :
                                            app.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                app.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-gray-100 text-gray-700'
                                            }`}>
                                            {app.status === 'approved' ? 'Aprobado' :
                                                app.status === 'rejected' ? 'Rechazado' :
                                                    app.status === 'completed' ? 'Completado' :
                                                        'Invitado'}
                                        </span>
                                    </div>

                                    {/* Application Actions */}
                                    {app.status === 'completed' && (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleApprove(app.id)}
                                                disabled={processing}
                                                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-full text-sm font-medium hover:bg-green-600 disabled:opacity-50 shadow-sm flex items-center justify-center gap-2"
                                            >
                                                <span>✓</span> Aprobar para esta posición
                                            </button>
                                            <button
                                                onClick={() => setShowRejectReason(!showRejectReason)}
                                                disabled={processing}
                                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-full text-sm font-medium hover:bg-red-700 disabled:opacity-50 shadow-sm flex items-center justify-center gap-2"
                                            >
                                                <span>✕</span> Rechazar
                                            </button>
                                        </div>
                                    )}

                                    {/* Rejection Reason Input */}
                                    {showRejectReason && app.status === 'completed' && (
                                        <div className="mt-3">
                                            <textarea
                                                value={rejectionReason}
                                                onChange={(e) => setRejectionReason(e.target.value)}
                                                placeholder="Razón del rechazo..."
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                rows={2}
                                            />
                                            <button
                                                onClick={() => handleReject(app.id)}
                                                disabled={processing || !rejectionReason.trim()}
                                                className="mt-2 w-full px-4 py-2 bg-red-600 text-white rounded-full text-sm font-medium hover:bg-red-700 disabled:opacity-50 shadow-sm"
                                            >
                                                Confirmar Rechazo Definitivo
                                            </button>
                                        </div>
                                    )}

                                    {app.rejectionReason && (
                                        <div className="mt-2 text-sm text-red-600">
                                            <strong>Razón de rechazo:</strong> {app.rejectionReason}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-8 py-2 border border-gray-300 rounded-full font-medium hover:bg-gray-100 transition-colors shadow-sm"
                    >
                        Cerrar Perfil
                    </button>
                </div>
            </div>
        </div>
    );
}
