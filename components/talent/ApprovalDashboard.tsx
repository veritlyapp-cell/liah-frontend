'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import {
    collection, query, where, getDocs, updateDoc, doc, Timestamp, arrayUnion
} from 'firebase/firestore';

interface ResolvedApprover {
    stepOrden: number;
    stepNombre: string;
    approverType: string;
    userId: string;
    email: string;
    nombre: string;
    skipped: boolean;
    skipReason?: string;
}

interface RQ {
    id: string;
    codigo: string;
    puestoNombre: string;
    areaNombre: string;
    gerenciaNombre: string;
    cantidad: number;
    urgente: boolean;
    fechaLimite?: any;
    justificacion: string;
    perfilContent: string;
    status: string;
    currentStep: number;
    workflowName?: string;
    resolvedApprovers: ResolvedApprover[];
    aprobaciones: any[];
    createdBy: string;
    createdAt: any;
}

interface ApprovalDashboardProps {
    holdingId: string;
    userEmail: string;
}

export default function ApprovalDashboard({ holdingId, userEmail }: ApprovalDashboardProps) {
    const [loading, setLoading] = useState(true);
    const [pendingRQs, setPendingRQs] = useState<RQ[]>([]);
    const [selectedRQ, setSelectedRQ] = useState<RQ | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        loadPendingRQs();
    }, [holdingId, userEmail]);

    async function loadPendingRQs() {
        setLoading(true);
        try {
            const rqsRef = collection(db, 'talent_rqs');
            const rqQuery = query(
                rqsRef,
                where('holdingId', '==', holdingId),
                where('status', '==', 'pending_approval')
            );
            const rqSnap = await getDocs(rqQuery);

            const allRQs = rqSnap.docs.map(d => ({
                id: d.id,
                ...d.data()
            })) as RQ[];

            // Filter: only RQs where current step requires this user
            const myPendingRQs = allRQs.filter(rq => {
                if (!rq.resolvedApprovers) return false;

                // Find the current approver (currentStep and not skipped)
                const currentApprover = rq.resolvedApprovers.find(
                    a => a.stepOrden === rq.currentStep && !a.skipped
                );

                return currentApprover?.email.toLowerCase() === userEmail.toLowerCase();
            });

            setPendingRQs(myPendingRQs);
        } catch (error) {
            console.error('Error loading pending RQs:', error);
        } finally {
            setLoading(false);
        }
    }

    function openDetail(rq: RQ) {
        setSelectedRQ(rq);
        setRejectionReason('');
        setShowDetailModal(true);
    }

    async function handleApprove() {
        if (!selectedRQ) return;

        setProcessing(true);
        try {
            const currentApprover = selectedRQ.resolvedApprovers.find(
                a => a.stepOrden === selectedRQ.currentStep && !a.skipped
            );

            // Record the approval
            const aprobacion = {
                step: selectedRQ.currentStep,
                stepNombre: currentApprover?.stepNombre || '',
                approverEmail: userEmail,
                approverNombre: currentApprover?.nombre || userEmail,
                action: 'approved',
                timestamp: Timestamp.now()
            };

            // Find next non-skipped step
            const nextStep = selectedRQ.resolvedApprovers.find(
                a => a.stepOrden > selectedRQ.currentStep && !a.skipped
            );

            let newStatus = 'pending_approval';
            let newCurrentStep = selectedRQ.currentStep;

            if (nextStep) {
                // Move to next step
                newCurrentStep = nextStep.stepOrden;
            } else {
                // All steps completed - RQ is approved!
                newStatus = 'approved';
            }

            await updateDoc(doc(db, 'talent_rqs', selectedRQ.id), {
                status: newStatus,
                currentStep: newCurrentStep,
                aprobaciones: arrayUnion(aprobacion),
                updatedAt: Timestamp.now()
            });

            setShowDetailModal(false);
            loadPendingRQs();
            alert(`✅ ${newStatus === 'approved' ? 'RQ Aprobado completamente!' : 'Aprobación registrada, pasó al siguiente nivel'}`);
        } catch (error) {
            console.error('Error approving RQ:', error);
            alert('Error al aprobar');
        } finally {
            setProcessing(false);
        }
    }

    async function handleReject() {
        if (!selectedRQ) return;
        if (!rejectionReason.trim()) {
            alert('Por favor ingresa un motivo de rechazo');
            return;
        }

        setProcessing(true);
        try {
            const currentApprover = selectedRQ.resolvedApprovers.find(
                a => a.stepOrden === selectedRQ.currentStep && !a.skipped
            );

            const aprobacion = {
                step: selectedRQ.currentStep,
                stepNombre: currentApprover?.stepNombre || '',
                approverEmail: userEmail,
                approverNombre: currentApprover?.nombre || userEmail,
                action: 'rejected',
                reason: rejectionReason,
                timestamp: Timestamp.now()
            };

            await updateDoc(doc(db, 'talent_rqs', selectedRQ.id), {
                status: 'rejected',
                aprobaciones: arrayUnion(aprobacion),
                updatedAt: Timestamp.now()
            });

            setShowDetailModal(false);
            loadPendingRQs();
            alert('❌ RQ Rechazado');
        } catch (error) {
            console.error('Error rejecting RQ:', error);
            alert('Error al rechazar');
        } finally {
            setProcessing(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Mis Aprobaciones Pendientes</h2>
                    <p className="text-gray-600">RQs que requieren tu aprobación</p>
                </div>
                <button
                    onClick={loadPendingRQs}
                    className="px-4 py-2 text-violet-600 border border-violet-200 rounded-lg hover:bg-violet-50"
                >
                    🔄 Actualizar
                </button>
            </div>

            {/* Pending RQs */}
            {pendingRQs.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <div className="text-6xl mb-4">✓</div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No tienes aprobaciones pendientes</h3>
                    <p className="text-gray-600">Cuando haya RQs esperando tu aprobación, aparecerán aquí</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {pendingRQs.map(rq => {
                        const currentApprover = rq.resolvedApprovers?.find(
                            a => a.stepOrden === rq.currentStep && !a.skipped
                        );
                        return (
                            <div
                                key={rq.id}
                                className={`bg-white rounded-xl border-2 p-6 cursor-pointer hover:shadow-lg transition-shadow ${rq.urgente ? 'border-red-300 bg-red-50/30' : 'border-gray-200'
                                    }`}
                                onClick={() => openDetail(rq)}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded text-gray-600">
                                                {rq.codigo}
                                            </span>
                                            {rq.urgente && (
                                                <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium animate-pulse">
                                                    🔥 URGENTE
                                                </span>
                                            )}
                                            <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                                                Paso {rq.currentStep}: {currentApprover?.stepNombre}
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-semibold text-gray-900">{rq.puestoNombre}</h3>
                                        <p className="text-sm text-gray-500">
                                            {rq.gerenciaNombre} → {rq.areaNombre}
                                        </p>
                                        <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
                                            <span>👥 {rq.cantidad} posicion{rq.cantidad > 1 ? 'es' : ''}</span>
                                            {rq.fechaLimite && (
                                                <span>📅 Límite: {new Date(rq.fechaLimite.seconds * 1000).toLocaleDateString()}</span>
                                            )}
                                            <span>✉️ Solicitado por: {rq.createdBy}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors">
                                            ✓ Aprobar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Detail Modal */}
            {showDetailModal && selectedRQ && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full my-8 max-h-[90vh] overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className={`px-6 py-4 ${selectedRQ.urgente ? 'bg-red-600' : 'bg-violet-600'} text-white`}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono bg-white/20 px-2 py-1 rounded text-sm">
                                            {selectedRQ.codigo}
                                        </span>
                                        {selectedRQ.urgente && <span>🔥 URGENTE</span>}
                                    </div>
                                    <h3 className="text-lg font-semibold mt-1">{selectedRQ.puestoNombre}</h3>
                                </div>
                                <button
                                    onClick={() => setShowDetailModal(false)}
                                    className="text-white/70 hover:text-white text-2xl"
                                >
                                    ×
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Info grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <p className="text-sm text-gray-500">Ubicación</p>
                                    <p className="font-medium">{selectedRQ.gerenciaNombre} → {selectedRQ.areaNombre}</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <p className="text-sm text-gray-500">Cantidad</p>
                                    <p className="font-medium">{selectedRQ.cantidad} posicion{selectedRQ.cantidad > 1 ? 'es' : ''}</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <p className="text-sm text-gray-500">Solicitado por</p>
                                    <p className="font-medium">{selectedRQ.createdBy}</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <p className="text-sm text-gray-500">Fecha límite</p>
                                    <p className="font-medium">
                                        {selectedRQ.fechaLimite
                                            ? new Date(selectedRQ.fechaLimite.seconds * 1000).toLocaleDateString()
                                            : 'No especificada'
                                        }
                                    </p>
                                </div>
                            </div>

                            {/* Justification */}
                            {selectedRQ.justificacion && (
                                <div>
                                    <h4 className="font-medium text-gray-900 mb-2">Justificación</h4>
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-800">
                                        {selectedRQ.justificacion}
                                    </div>
                                </div>
                            )}

                            {/* Profile */}
                            <div>
                                <h4 className="font-medium text-gray-900 mb-2">Perfil del Puesto</h4>
                                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-gray-700 max-h-48 overflow-y-auto whitespace-pre-wrap">
                                    {selectedRQ.perfilContent}
                                </div>
                            </div>

                            {/* Workflow progress */}
                            <div>
                                <h4 className="font-medium text-gray-900 mb-2">Flujo de Aprobación: {selectedRQ.workflowName}</h4>
                                <div className="flex items-center gap-2 flex-wrap">
                                    {selectedRQ.resolvedApprovers?.map((step, index) => {
                                        const isCompleted = selectedRQ.aprobaciones?.some(a => a.step === step.stepOrden);
                                        const isCurrent = step.stepOrden === selectedRQ.currentStep && !step.skipped;
                                        const isSkipped = step.skipped;

                                        return (
                                            <div key={index} className="flex items-center">
                                                <div className={`px-3 py-2 rounded-lg text-sm ${isCompleted ? 'bg-green-100 text-green-700' :
                                                        isCurrent ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-300' :
                                                            isSkipped ? 'bg-gray-100 text-gray-400 line-through' :
                                                                'bg-gray-100 text-gray-500'
                                                    }`}>
                                                    <span className="font-medium">{step.stepOrden}.</span>{' '}
                                                    {step.stepNombre}
                                                    <span className="text-xs block opacity-75">
                                                        {isSkipped ? step.skipReason : step.nombre}
                                                    </span>
                                                </div>
                                                {index < selectedRQ.resolvedApprovers.length - 1 && (
                                                    <span className="mx-2 text-gray-300">→</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Previous approvals */}
                            {selectedRQ.aprobaciones?.length > 0 && (
                                <div>
                                    <h4 className="font-medium text-gray-900 mb-2">Aprobaciones Anteriores</h4>
                                    <div className="space-y-2">
                                        {selectedRQ.aprobaciones.map((a: any, i: number) => (
                                            <div key={i} className={`p-3 rounded-lg text-sm ${a.action === 'approved' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                                }`}>
                                                <strong>{a.stepNombre}</strong>: {a.action === 'approved' ? '✓ Aprobado' : '✗ Rechazado'}
                                                por {a.approverNombre} ({new Date(a.timestamp.seconds * 1000).toLocaleDateString()})
                                                {a.reason && <p className="mt-1 text-sm opacity-75">Motivo: {a.reason}</p>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Rejection reason */}
                            <div>
                                <h4 className="font-medium text-gray-900 mb-2">Motivo de Rechazo (si aplica)</h4>
                                <textarea
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    placeholder="Ingresa el motivo si vas a rechazar..."
                                    rows={2}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                                />
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="border-t border-gray-200 px-6 py-4 flex justify-between">
                            <button
                                onClick={() => setShowDetailModal(false)}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                            >
                                Cerrar
                            </button>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleReject}
                                    disabled={processing}
                                    className="px-6 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50"
                                >
                                    {processing ? '⏳...' : '✗ Rechazar'}
                                </button>
                                <button
                                    onClick={handleApprove}
                                    disabled={processing}
                                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                                >
                                    {processing ? '⏳...' : '✓ Aprobar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
