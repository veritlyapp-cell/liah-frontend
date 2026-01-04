'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { Candidate } from '@/lib/firestore/candidates';
import { approveCandidate, rejectCandidate, updateCULStatus } from '@/lib/firestore/candidate-actions';
import { getRQsByMarca, RQ } from '@/lib/firestore/rqs';
import { createApplication } from '@/lib/firestore/applications';
import { Timestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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
    const [analyzingCUL, setAnalyzingCUL] = useState(false);
    const [analyzingDNI, setAnalyzingDNI] = useState(false);
    const [aiResult, setAiResult] = useState<any>(null);

    // [RQ Assignment]
    const [availableRQs, setAvailableRQs] = useState<RQ[]>([]);
    const [selectedRQId, setSelectedRQId] = useState('');
    const [loadingRQs, setLoadingRQs] = useState(false);

    // Fetch active RQs for the candidate's brand
    useEffect(() => {
        async function fetchRQs() {
            if (!candidate.applications || candidate.applications.length === 0) return;

            setLoadingRQs(true);
            try {
                // Use brand from latest application
                const brandId = candidate.applications[candidate.applications.length - 1].marcaId;
                const rqs = await getRQsByMarca(brandId);
                // Filter RQs:
                // 1. Must be active (not closed/filled/cancelled)
                // 2. Must be APPROVED (user requested to remove pending)
                // 3. Exclude RQs where the candidate already has an application
                const activeRQs = rqs.filter(r => {
                    const isAvailable = (r.status === 'active' || !r.status) &&
                        r.approvalStatus === 'approved';

                    const alreadyApplied = candidate.applications?.some(app => app.rqId === r.id);

                    return isAvailable && !alreadyApplied;
                });

                setAvailableRQs(activeRQs);
            } catch (error) {
                console.error('Error fetching RQs:', error);
            } finally {
                setLoadingRQs(false);
            }
        }
        fetchRQs();
    }, [candidate]);

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
            alert(`✅ CUL marcado como ${status === 'apto' ? 'Apto ✓' : status === 'no_apto' ? 'No Apto ✗' : 'Requiere Revisión ⚠️'}`);
            onRefresh();
        } catch (error) {
            console.error('Error updating CUL status:', error);
            alert('Error al actualizar CUL');
        } finally {
            setProcessing(false);
        }
    }

    // NEW: Select candidate for the position (sends email notification)
    async function handleSelectCandidate() {
        if (!user || !candidate.email) {
            alert('Este candidato no tiene email registrado');
            return;
        }

        const latestApp = candidate.applications?.[candidate.applications.length - 1];

        // Check if candidate is already selected for another RQ
        if (candidate.selectionStatus === 'selected') {
            const selectedForApp = candidate.applications?.find(app => app.rqId === candidate.selectedForRQ);

            // Check if selected in the same brand
            if (selectedForApp?.marcaId === latestApp?.marcaId) {
                alert(`❌ Este candidato ya fue SELECCIONADO para:\n\n🏪 Tienda: ${selectedForApp?.tiendaNombre}\n📋 Posición: ${selectedForApp?.posicion}\n\nNo es posible seleccionarlo para otra posición en la misma marca.`);
                return;
            } else {
                // Selected in different brand - show warning
                const proceed = window.confirm(
                    `⚠️ ATENCIÓN: Este candidato ya está SELECCIONADO en otra marca:\n\n` +
                    `🏢 Marca: ${selectedForApp?.marcaNombre || 'Otra marca'}\n` +
                    `🏪 Tienda: ${selectedForApp?.tiendaNombre}\n` +
                    `📋 Posición: ${selectedForApp?.posicion}\n\n` +
                    `Para seleccionarlo en esta marca, primero debe ser RECHAZADO en la otra.\n\n` +
                    `¿Deseas continuar de todas formas? (No recomendado)`
                );
                if (!proceed) return;
            }
        }

        // Verify CUL is approved first
        if (candidate.culStatus !== 'apto') {
            const proceed = window.confirm('⚠️ El CUL de este candidato no está marcado como Apto.\n\n¿Deseas seleccionarlo de todas formas?');
            if (!proceed) return;
        }

        setProcessing(true);
        try {
            const latestApp = candidate.applications?.[candidate.applications.length - 1];

            // Send selection email
            await fetch('/api/send-selection-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    candidateEmail: candidate.email,
                    candidateName: candidate.nombre,
                    posicion: latestApp?.posicion,
                    marcaNombre: latestApp?.marcaNombre
                })
            });

            // Update candidate status and its applications
            // const { updateDoc, doc } = await import('firebase/firestore'); // Removed dynamic imports
            // const { db } = await import('@/lib/firebase');

            const updatedApplications = candidate.applications?.map(app => {
                if (app.id === latestApp?.id) {
                    return { ...app, status: 'selected' as const, selectedAt: new Date(), selectedBy: user.uid };
                }
                return app;
            }) || [];

            await updateDoc(doc(db, 'candidates', candidate.id), {
                selectionStatus: 'selected',
                selectedAt: new Date(),
                selectedBy: user.uid,
                selectedForRQ: latestApp?.rqId,
                applications: updatedApplications
            });

            alert('🎉 Candidato SELECCIONADO. Se ha enviado el correo de notificación.');
            onRefresh();
        } catch (error) {
            console.error('Error selecting candidate:', error);
            alert('Error al seleccionar candidato');
        } finally {
            setProcessing(false);
        }
    }

    // NEW: Add candidate to another RQ
    async function handleAddToAnotherRQ() {
        if (!user || !selectedRQId) return;

        const selectedRQ = availableRQs.find(r => r.id === selectedRQId);
        if (!selectedRQ) return;

        // Block if candidate is already selected
        if (candidate.selectionStatus === 'selected') {
            const selectedForApp = candidate.applications?.find(app => app.rqId === candidate.selectedForRQ);
            alert(`❌ No es posible mover a este candidato.\n\nYa fue SELECCIONADO para:\n🏪 ${selectedForApp?.tiendaNombre}\n📋 ${selectedForApp?.posicion}\n\nDebe ser rechazado primero para reasignarlo.`);
            return;
        }

        // Check if candidate already applied to this exact RQ
        const alreadyApplied = candidate.applications?.some(app => app.rqId === selectedRQ.id);
        if (alreadyApplied) {
            alert('El candidato ya tiene una postulación a este RQ');

            return;
        }

        setProcessing(true);
        try {
            await createApplication(candidate.id, {
                rqId: selectedRQ.id,
                rqNumber: selectedRQ.rqNumber,
                posicion: selectedRQ.posicion,
                modalidad: selectedRQ.modalidad,
                marcaId: selectedRQ.marcaId,
                marcaNombre: selectedRQ.marcaNombre,
                tiendaId: selectedRQ.tiendaId || '',
                tiendaNombre: selectedRQ.tiendaNombre || '',
                origenConvocatoria: 'Reasignado por Recruiter',
                categoria: selectedRQ.categoria // [NEW] Pass category
            });

            alert(`✅ Candidato postulado exitosamente a ${selectedRQ.rqNumber} en ${selectedRQ.tiendaNombre}`);
            setSelectedRQId('');
            onRefresh();
        } catch (error) {
            console.error('Error adding to another RQ:', error);
            alert('Error al postular a otra posición');
        } finally {
            setProcessing(false);
        }
    }


    async function handleAnalyzeCUL() {
        const culUrl = candidate.certificadoUnicoLaboral || candidate.documents?.cul;
        if (!culUrl) {
            alert('No hay CUL subido para analizar');
            return;
        }

        setAnalyzingCUL(true);
        try {
            const response = await fetch('/api/ai/analyze-document', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    documentType: 'cul',
                    documentUrl: culUrl,
                    candidateId: candidate.id
                })
            });


            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            setAiResult(data);

            // Auto-update CUL status based on AI recommendation
            if (data.validationStatus === 'approved_ai') {
                await handleUpdateCUL('apto', `IA: ${data.aiObservation}`);
            } else if (data.validationStatus === 'rejected_ai') {
                await handleUpdateCUL('no_apto', `IA: ${data.aiObservation}`);
            } else {
                await handleUpdateCUL('manual_review', `IA: ${data.aiObservation}`);
            }

            alert(`✅ Análisis completado\n\nRecomendación: ${data.validationStatus}\nConfianza: ${data.confidence}%`);
        } catch (error: any) {
            console.error('Error analyzing CUL:', error);
            alert(`❌ Error: ${error.message}`);
        } finally {
            setAnalyzingCUL(false);
        }
    }

    async function handleAnalyzeDNI() {
        // First check if there's a DNI document
        const dniUrl = candidate.documents?.dni || (candidate as any).documentoDNI;
        if (!dniUrl) {
            alert('No hay imagen de DNI subida para analizar');
            return;
        }

        setAnalyzingDNI(true);
        try {
            const response = await fetch('/api/ai/analyze-document', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    documentType: 'dni',
                    documentUrl: dniUrl,
                    candidateId: candidate.id
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            // Update candidate with extracted data
            await fetch('/api/candidates/update-validation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    candidateId: candidate.id,
                    updateType: 'dni_verification',
                    data: data.extractedData
                })
            });

            alert(`✅ DNI analizado y perfil actualizado\n\nNombre: ${data.extractedData?.nombreCompleto}\nDNI: ${data.extractedData?.dni}\nConfianza: ${data.confidence}%`);
            onRefresh();
        } catch (error: any) {
            console.error('Error analyzing DNI:', error);
            alert(`❌ Error: ${error.message}`);
        } finally {
            setAnalyzingDNI(false);
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
                                <label className="text-sm text-gray-500 flex items-center gap-2">
                                    {(candidate as any).documentType || 'DNI'}
                                    {(candidate as any).documentType === 'CE' && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 text-xs rounded-full font-bold border border-amber-300 animate-pulse">
                                            🛂 EXTRANJERO
                                        </span>
                                    )}
                                    {(candidate as any).dniVerified && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                                            ✅ Verificado por IA
                                        </span>
                                    )}
                                </label>
                                <div className="flex items-center gap-2">
                                    <p className="font-medium text-gray-900">{candidate.dni}</p>
                                    {candidate.documents?.dni && !(candidate as any).dniVerified && (
                                        <button
                                            onClick={handleAnalyzeDNI}
                                            disabled={analyzingDNI}
                                            className="px-2 py-1 bg-violet-100 text-violet-700 rounded text-xs font-medium hover:bg-violet-200 disabled:opacity-50"
                                        >
                                            {analyzingDNI ? '⏳' : '🤖'} Verificar
                                        </button>
                                    )}
                                </div>
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
                            {(candidate.certificadoUnicoLaboral || candidate.documents?.cul) ? (
                                <a
                                    href={candidate.certificadoUnicoLaboral || candidate.documents?.cul}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-medium hover:bg-blue-700 shadow-sm flex items-center gap-2"
                                >
                                    <span>📄</span> Ver PDF del CUL
                                </a>
                            ) : (
                                <div className="px-4 py-2 bg-gray-100 text-gray-500 rounded-full text-sm font-medium border border-gray-200 flex items-center gap-2 italic">
                                    <span>🚫</span> CUL no cargado
                                </div>
                            )}

                        </div>


                        {/* AI Result Display */}
                        {aiResult && aiResult.documentType === 'cul' && (
                            <div className="mb-4 p-4 bg-violet-50 border border-violet-200 rounded-xl">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-lg">🤖</span>
                                    <p className="font-medium text-violet-900">Resultado del Análisis IA</p>
                                    <span className="text-xs bg-violet-200 text-violet-800 px-2 py-0.5 rounded-full">
                                        {aiResult.confidence}% confianza
                                    </span>
                                </div>
                                <p className="text-sm text-violet-800">{aiResult.aiObservation}</p>
                                {aiResult.denunciasEncontradas?.length > 0 && (
                                    <div className="mt-2 p-2 bg-red-50 rounded">
                                        <p className="text-sm font-medium text-red-800">⚠️ Denuncias detectadas:</p>
                                        <ul className="list-disc list-inside text-sm text-red-700">
                                            {aiResult.denunciasEncontradas.map((d: string, i: number) => (
                                                <li key={i}>{d}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* CUL Actions Bar */}
                        <div className="flex gap-2 flex-wrap items-center">
                            <button
                                onClick={handleAnalyzeCUL}
                                disabled={analyzingCUL || processing || (!candidate.certificadoUnicoLaboral && !candidate.documents?.cul)}
                                className="px-4 py-2 bg-gradient-to-r from-violet-600 to-cyan-600 text-white rounded-full text-sm font-medium hover:opacity-90 disabled:opacity-50 shadow-sm flex items-center gap-2 transition-all"
                            >
                                {analyzingCUL ? (

                                    <><span className="animate-spin">⌛</span> Analizando...</>
                                ) : (
                                    <><span className="text-lg">🤖</span> Analizar con IA</>
                                )}
                            </button>

                            <div className="h-6 w-px bg-gray-200 mx-1" />

                            <button
                                onClick={() => handleUpdateCUL('apto')}
                                disabled={processing}
                                className="px-4 py-2 bg-emerald-500 text-white rounded-full text-sm font-medium hover:bg-emerald-600 disabled:opacity-50 shadow-sm flex items-center gap-2 transition-all"
                            >
                                <span>✓</span> Marcar como Apto
                            </button>
                            <button
                                onClick={() => handleUpdateCUL('no_apto', 'Revisión manual - observaciones encontradas')}
                                disabled={processing}
                                className="px-4 py-2 bg-rose-600 text-white rounded-full text-sm font-medium hover:bg-rose-700 disabled:opacity-50 shadow-sm flex items-center gap-2 transition-all"
                            >
                                <span>✕</span> Marcar como No Apto
                            </button>
                            <button
                                onClick={() => handleUpdateCUL('manual_review')}
                                disabled={processing}
                                className="px-4 py-2 bg-amber-500 text-white rounded-full text-sm font-medium hover:bg-amber-600 disabled:opacity-50 shadow-sm flex items-center gap-2 transition-all"
                            >
                                <span>⚠</span> Requiere Revisión
                            </button>
                        </div>

                        {/* Selection Action - Final decision by Recruiter */}
                        <div className="mt-4 pt-4 border-t border-dashed">
                            <p className="text-sm text-gray-600 mb-2">
                                Selecciona al candidato para la posición (envía notificación por correo):
                            </p>
                            <button
                                onClick={handleSelectCandidate}
                                disabled={processing}
                                className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 shadow-lg flex items-center gap-3 transition-all hover:scale-105"
                            >
                                <span className="text-xl">🎯</span> Seleccionar Candidato para la Posición
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

                    {/* NEW: Reassignment Section */}
                    <div className="border-t pt-4 bg-violet-50/30 rounded-lg p-4 mt-4">
                        <h3 className="text-sm font-bold text-violet-900 mb-3 flex items-center gap-2">
                            <span>🔄</span> Mover a otra Vacante / RQ de la Marca
                        </h3>
                        <p className="text-xs text-violet-700 mb-3">
                            Si el candidato es apto pero su RQ original se cubrió, puedes postularlo a otra vacante activa sin que tenga que volver a subir documentos.
                        </p>

                        <div className="flex gap-2">
                            <select
                                value={selectedRQId}
                                onChange={(e) => setSelectedRQId(e.target.value)}
                                disabled={loadingRQs || processing || availableRQs.length === 0}
                                className="flex-1 px-3 py-2 border border-violet-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-violet-500 font-medium"
                            >
                                <option value="">
                                    {loadingRQs ? 'Cargando requerimientos...' :
                                        availableRQs.length === 0 ? 'No hay otros RQs disponibles para esta marca' :
                                            'Seleccionar RQ activo...'}
                                </option>
                                {availableRQs.map(rq => (
                                    <option key={rq.id} value={rq.id}>
                                        {rq.rqNumber} - {rq.posicion} ({rq.tiendaNombre})
                                    </option>
                                ))}
                            </select>
                            <button
                                onClick={handleAddToAnotherRQ}
                                disabled={!selectedRQId || processing}
                                className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors whitespace-nowrap shadow-sm"
                            >
                                {processing ? 'Procesando...' : 'Postular a esta Vacante'}
                            </button>
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
