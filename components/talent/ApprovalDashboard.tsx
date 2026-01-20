'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import {
    collection, query, where, getDocs, addDoc, updateDoc, doc, Timestamp, arrayUnion
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
    assignedRecruiterEmail?: string;
    createdBy: string;
    createdAt: any;
}

interface ApprovalDashboardProps {
    holdingId: string;
    userEmail: string;
    userCapacidades: string[];
    initialRQId?: string;
    onRQOpened?: () => void;
}

export default function ApprovalDashboard({ holdingId, userEmail, userCapacidades, initialRQId, onRQOpened }: ApprovalDashboardProps) {
    const [loading, setLoading] = useState(true);
    const [pendingRQs, setPendingRQs] = useState<RQ[]>([]);
    const [selectedRQ, setSelectedRQ] = useState<RQ | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [processing, setProcessing] = useState(false);
    const [recruiters, setRecruiters] = useState<{ email: string, nombre: string }[]>([]);
    const [assignedRecruiter, setAssignedRecruiter] = useState<{ email: string, nombre: string } | null>(null);

    useEffect(() => {
        loadPendingRQs();
    }, [holdingId, userEmail]);

    async function loadPendingRQs() {
        setLoading(true);
        try {
            const rqsRef = collection(db, 'talent_rqs');

            // 1. Pending approval query
            const pendingQuery = query(
                rqsRef,
                where('holdingId', '==', holdingId),
                where('status', '==', 'pending_approval')
            );

            // 2. Approved but unassigned query (for recruitment leaders)
            const approvedUnassignedQuery = query(
                rqsRef,
                where('holdingId', '==', holdingId),
                where('status', '==', 'approved')
            );

            const [pendingSnap, approvedSnap] = await Promise.all([
                getDocs(pendingQuery),
                getDocs(approvedUnassignedQuery)
            ]);

            const allPendingRQs = pendingSnap.docs.map(d => ({
                id: d.id,
                ...d.data()
            })) as RQ[];

            const allApprovedRQs = approvedSnap.docs.map(d => ({
                id: d.id,
                ...d.data()
            })) as RQ[];

            // Filter pending: only RQs where current step requires this user
            const myPendingRQs = allPendingRQs.filter(rq => {
                if (!rq.resolvedApprovers) return false;
                const currentApprover = rq.resolvedApprovers.find(
                    a => a.stepOrden === rq.currentStep && !a.skipped
                );
                return currentApprover?.email.toLowerCase() === userEmail.toLowerCase();
            });

            // Filter approved: only if missing recruiter (for recruitment leadership visibility)
            // Note: We show these if they have NO assignedRecruiterEmail
            const myApprovedUnassigned = allApprovedRQs.filter(rq => !rq.assignedRecruiterEmail);

            // Combine both - these are the items requiring leader action
            const combined = [...myPendingRQs, ...myApprovedUnassigned];

            // Remove duplicates (unlikely with filters but safe)
            const uniqueMap = new Map();
            combined.forEach(rq => uniqueMap.set(rq.id, rq));

            setPendingRQs(Array.from(uniqueMap.values()));
        } catch (error) {
            console.error('Error loading pending RQs:', error);
        } finally {
            setLoading(false);
        }
    }

    // Auto-open effect
    useEffect(() => {
        if (initialRQId && !loading && pendingRQs.length > 0 && !selectedRQ) {
            const target = pendingRQs.find(r => r.id === initialRQId);
            if (target) {
                console.log('🎯 Auto-opening RQ:', initialRQId);
                openDetail(target);
                if (onRQOpened) onRQOpened();
            }
        }
    }, [initialRQId, loading, pendingRQs, selectedRQ, onRQOpened]);

    async function loadRecruiters() {
        try {
            console.log('🔍 loadRecruiters called with holdingId:', holdingId);
            const usersRef = collection(db, 'talent_users');
            const q = query(
                usersRef,
                where('holdingId', '==', holdingId),
                where('activo', '==', true)
            );
            const snap = await getDocs(q);
            console.log('📋 Found users:', snap.docs.length);

            const list = snap.docs
                .map(d => d.data())
                .filter(u => {
                    const isRecruiter = u.rol === 'recruiter' || (u.capacidades && u.capacidades.includes('recruiter'));
                    console.log(`   - ${u.email}: rol=${u.rol}, capacidades=${JSON.stringify(u.capacidades)}, isRecruiter=${isRecruiter}`);
                    return isRecruiter;
                })
                .map(u => ({ email: u.email, nombre: u.nombre }));

            console.log('✅ Recruiters found:', list);
            setRecruiters(list);
        } catch (error) {
            console.error('Error loading recruiters:', error);
        }
    }

    function openDetail(rq: RQ) {
        setSelectedRQ(rq);
        setRejectionReason('');
        setAssignedRecruiter(null);
        setShowDetailModal(true);

        // Load recruiters if user is a recruitment leader (they can assign at any step)
        if (userCapacidades?.includes('lider_reclutamiento') || userCapacidades?.includes('admin')) {
            loadRecruiters();
        }
    }

    async function handleApprove() {
        if (!selectedRQ) return;

        setProcessing(true);
        try {
            console.log('🚀 handleApprove started for RQ:', selectedRQ.id);
            console.log('   currentStep:', selectedRQ.currentStep);
            console.log('   resolvedApprovers:', selectedRQ.resolvedApprovers);

            const currentApprover = selectedRQ.resolvedApprovers.find(
                a => a.stepOrden === selectedRQ.currentStep && !a.skipped
            );
            console.log('   currentApprover:', currentApprover);

            // DEDUPLICATION: Check if this user already approved THIS step
            const alreadyApproved = selectedRQ.aprobaciones?.some(
                (a: any) => a.step === selectedRQ.currentStep && a.approverEmail === userEmail && a.action === 'approved'
            );

            if (alreadyApproved) {
                console.warn('⚠️ User already approved this step - blocking');
                alert('Ya aprobaste este paso anteriormente');
                setShowDetailModal(false);
                setProcessing(false);
                return;
            }

            // Record the approval
            const aprobacion = {
                step: selectedRQ.currentStep,
                stepNombre: currentApprover?.stepNombre || '',
                approverEmail: userEmail,
                approverNombre: currentApprover?.nombre || userEmail,
                action: 'approved',
                timestamp: Timestamp.now()
            };

            let nextStepIndex = -1;
            for (let i = 0; i < selectedRQ.resolvedApprovers.length; i++) {
                const step = selectedRQ.resolvedApprovers[i];
                if (step.stepOrden === selectedRQ.currentStep && !step.skipped) {
                    nextStepIndex = i + 1;
                    console.log('   Found current step at index', i, ', next index:', nextStepIndex);
                    break;
                }
            }

            let newStatus = 'pending_approval';
            let newCurrentStep = selectedRQ.currentStep;

            // Find next non-skipped step from nextStepIndex onwards
            let foundNext = false;
            if (nextStepIndex !== -1) {
                for (let j = nextStepIndex; j < selectedRQ.resolvedApprovers.length; j++) {
                    const step = selectedRQ.resolvedApprovers[j];
                    const isRecruitmentLeader = step.approverType === 'jefe_reclutamiento' || step.approverType === 'lider_reclutamiento';

                    console.log(`   Checking step ${j}:`, step.stepNombre, 'email:', step.email, 'skipped:', step.skipped);

                    // Allow step if not skipped AND (has email OR is a recruitment leader step)
                    if (!step.skipped && (step.email?.trim() !== '' || isRecruitmentLeader)) {
                        newCurrentStep = step.stepOrden;
                        foundNext = true;
                        console.log('   ✅ Found next step:', step.stepNombre);
                        break;
                    }
                }
            }

            if (!foundNext) {
                newStatus = 'approved';
                console.log('   🎉 No more steps - setting status to APPROVED');
            }

            const nextStep = foundNext ? selectedRQ.resolvedApprovers.find(a => a.stepOrden === newCurrentStep && !a.skipped) : null;

            const updates: any = {
                status: newStatus,
                currentStep: newCurrentStep,
                aprobaciones: arrayUnion(aprobacion),
                updatedAt: Timestamp.now()
            };

            // If recruiter was assigned, save it
            if (assignedRecruiter) {
                updates.assignedRecruiterEmail = assignedRecruiter.email;
                updates.assignedRecruiterNombre = assignedRecruiter.nombre;
                console.log('   👤 Assigning recruiter:', assignedRecruiter.email);
            }

            console.log('   📝 Updates to apply:', { status: newStatus, currentStep: newCurrentStep, hasRecruiter: !!assignedRecruiter });
            await updateDoc(doc(db, 'talent_rqs', selectedRQ.id), updates);
            console.log('   ✅ Firestore updated successfully');

            // Trigger Notifications
            try {
                const notificationsRef = collection(db, 'notifications');

                // 1. Notify Creator
                await addDoc(notificationsRef, {
                    recipientEmail: selectedRQ.createdBy.toLowerCase(),
                    holdingId,
                    type: newStatus === 'approved' ? 'rq_approved' : 'rq_step_approved',
                    title: `Actualización de RQ: ${selectedRQ.puestoNombre}`,
                    message: newStatus === 'approved'
                        ? 'Tu requerimiento ha sido aprobado completamente y está listo para ser publicado.'
                        : `Tu requerimiento pasó al siguiente paso: ${nextStep?.stepNombre || 'Siguiente'}`,
                    read: false,
                    createdAt: Timestamp.now(),
                    data: { rqId: selectedRQ.id, link: '/talent' }
                });

                // 2. Notify Assigned Recruiter
                if (assignedRecruiter) {
                    await addDoc(notificationsRef, {
                        recipientEmail: assignedRecruiter.email.toLowerCase(),
                        holdingId,
                        type: 'rq_assigned',
                        title: 'Nuevo Requerimiento Asignado',
                        message: `Se te ha asignado el RQ: ${selectedRQ.puestoNombre} para ser gestionado.`,
                        read: false,
                        createdAt: Timestamp.now(),
                        data: { rqId: selectedRQ.id, link: '/talent' }
                    });
                }

                // 3. Notify Next Approver if step changed and email exists
                if (nextStep && !assignedRecruiter && nextStep.email?.trim()) { // If assigned recruiter is same as next, avoid double notify
                    await addDoc(notificationsRef, {
                        recipientEmail: nextStep.email.toLowerCase(),
                        holdingId,
                        type: 'rq_pending_approval',
                        title: 'Requerimiento Pendiente de Aprobación',
                        message: `Tienes un nuevo requerimiento pendiente: ${selectedRQ.puestoNombre}`,
                        read: false,
                        createdAt: Timestamp.now(),
                        data: { rqId: selectedRQ.id, link: '/talent' }
                    });
                }
            } catch (notifyError) {
                console.error('Error sending notifications:', notifyError);
            }

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

    async function handleDeleteRQ() {
        if (!selectedRQ) return;

        const reason = prompt('¿Por qué deseas cancelar este requerimiento?\n(Ej: Creado por error, Ya no se necesita, etc.)');
        if (!reason?.trim()) {
            alert('Debes proporcionar un motivo para cancelar');
            return;
        }

        if (!confirm(`¿Estás seguro de cancelar el RQ ${selectedRQ.codigo}?\n\nMotivo: ${reason}\n\nEsta acción no se puede deshacer.`)) {
            return;
        }

        setProcessing(true);
        try {
            await updateDoc(doc(db, 'talent_rqs', selectedRQ.id), {
                status: 'cancelled',
                cancelledBy: userEmail,
                cancelledAt: Timestamp.now(),
                cancelReason: reason.trim(),
                updatedAt: Timestamp.now()
            });

            setShowDetailModal(false);
            loadPendingRQs();
            alert('✅ RQ Cancelado exitosamente');
        } catch (error) {
            console.error('Error cancelling RQ:', error);
            alert('Error al cancelar el RQ');
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
                                className="bg-white rounded-xl border-2 p-6 cursor-pointer hover:shadow-lg transition-shadow border-gray-200"
                                onClick={() => openDetail(rq)}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded text-gray-600">
                                                {rq.codigo}
                                            </span>
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
                                            <span>✉️ Solicitado por: {rq.createdBy}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        {(() => {
                                            const isCreator = rq.createdBy?.toLowerCase() === userEmail.toLowerCase();
                                            const isMyTurn = currentApprover?.email?.toLowerCase() === userEmail.toLowerCase();
                                            const isLeaderOrAdmin = userCapacidades?.includes('lider_reclutamiento') || userCapacidades?.includes('admin');

                                            // Creator only sees "Ver Estado" 
                                            if (isCreator && !isLeaderOrAdmin) {
                                                return (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); openDetail(rq); }}
                                                        className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm"
                                                    >
                                                        👁️ Ver Estado
                                                    </button>
                                                );
                                            }

                                            // Approvers and Leaders see action buttons
                                            return (
                                                <>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); openDetail(rq); }}
                                                        className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
                                                    >
                                                        ✗ Rechazar
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); openDetail(rq); }}
                                                        className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm"
                                                    >
                                                        ✓ Aprobar
                                                    </button>
                                                </>
                                            );
                                        })()}
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
                        <div className="px-6 py-4 bg-violet-600 text-white">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono bg-white/20 px-2 py-1 rounded text-sm">
                                            {selectedRQ.codigo}
                                        </span>
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

                            {/* Recruiter Assignment (Visible for Recruitment Leader during ANY approval step, or when it's specifically required) */}
                            {(userCapacidades?.includes('lider_reclutamiento') || selectedRQ.resolvedApprovers?.find(a => a.stepOrden === selectedRQ.currentStep && !a.skipped)?.approverType === 'lider_reclutamiento') && (
                                <div className="bg-violet-50 border border-violet-100 rounded-xl p-6 space-y-4">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">👤</span>
                                        <h4 className="font-bold text-violet-900">Asignar Recruiter Responsable</h4>
                                    </div>
                                    <p className="text-sm text-violet-700">Como líder de reclutamiento, debes asignar a la persona que gestionará este proceso.</p>

                                    <div className="grid grid-cols-1 gap-2">
                                        {recruiters.map((r) => (
                                            <button
                                                key={r.email}
                                                onClick={() => setAssignedRecruiter(r)}
                                                className={`flex items-center justify-between px-4 py-3 rounded-lg border-2 transition-all ${assignedRecruiter?.email === r.email
                                                    ? 'border-violet-600 bg-violet-100 text-violet-900 shadow-sm'
                                                    : 'border-white bg-white text-gray-600 hover:border-violet-200'
                                                    }`}
                                            >
                                                <div className="text-left">
                                                    <p className="font-bold text-sm">{r.nombre}</p>
                                                    <p className="text-xs opacity-75">{r.email}</p>
                                                </div>
                                                {assignedRecruiter?.email === r.email && (
                                                    <span className="text-violet-600 font-bold">✓ Seleccionado</span>
                                                )}
                                            </button>
                                        ))}
                                        {recruiters.length === 0 && (
                                            <p className="text-sm text-gray-400 italic py-2">No se encontraron recruiters activos.</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="border-t border-gray-200 px-6 py-4 flex justify-between">
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowDetailModal(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                                >
                                    Cerrar
                                </button>
                                {/* Cancel button only for creator */}
                                {selectedRQ.createdBy?.toLowerCase() === userEmail.toLowerCase() && selectedRQ.status === 'pending_approval' && (
                                    <button
                                        onClick={handleDeleteRQ}
                                        disabled={processing}
                                        className="px-4 py-2 border border-orange-300 text-orange-700 rounded-lg hover:bg-orange-50 disabled:opacity-50"
                                    >
                                        {processing ? '⏳...' : '🗑️ Cancelar RQ'}
                                    </button>
                                )}
                            </div>
                            {(() => {
                                // Find current step - may not have an approver email assigned
                                const currentApprover = selectedRQ.resolvedApprovers?.find(a => a.stepOrden === selectedRQ.currentStep && !a.skipped);

                                // Debug logging
                                console.log('🔍 Button check: step=' + selectedRQ.currentStep +
                                    ', approverType=' + currentApprover?.approverType +
                                    ', approverEmail=' + currentApprover?.email +
                                    ', userEmail=' + userEmail +
                                    ', caps=' + userCapacidades?.join(',') +
                                    ', status=' + selectedRQ.status);

                                const isMyTurnByEmail = currentApprover?.email?.toLowerCase() === userEmail.toLowerCase();

                                // Leaders can approve when step type is for leaders OR when step has no specific email
                                const isLeaderStep = currentApprover?.approverType === 'lider_reclutamiento' ||
                                    currentApprover?.approverType === 'jefe_reclutamiento' ||
                                    !currentApprover?.email; // Empty email means it needs a leader to handle
                                const isLeader = userCapacidades?.includes('lider_reclutamiento');
                                const isMyTurnToApprove = isMyTurnByEmail || (isLeaderStep && isLeader);

                                const alreadyApproved = selectedRQ.aprobaciones?.some(
                                    (a: any) => a.step === selectedRQ.currentStep && a.approverEmail === userEmail && a.action === 'approved'
                                );
                                const canApprove = isMyTurnToApprove && !alreadyApproved && selectedRQ.status === 'pending_approval';

                                // Admins can always act on pending RQs
                                const isAdmin = userCapacidades?.includes('admin');
                                const showButtons = (canApprove || isAdmin) && selectedRQ.status === 'pending_approval';

                                console.log('🔍 ShowButtons result:', { isMyTurnByEmail, isLeaderStep, isLeader, isMyTurnToApprove, alreadyApproved, canApprove, isAdmin, showButtons });

                                if (!showButtons) return null;

                                return (
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
                                            disabled={processing || (currentApprover?.approverType === 'lider_reclutamiento' && !assignedRecruiter)}
                                            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {processing ? '⏳...' : (
                                                currentApprover?.approverType === 'lider_reclutamiento'
                                                    ? '✓ Asignar y Aprobar'
                                                    : '✓ Aprobar'
                                            )}
                                        </button>
                                    </div>
                                );
                            })()}

                            {/* Assign button for approved RQs without recruiter */}
                            {selectedRQ.status === 'approved' && !selectedRQ.assignedRecruiterEmail &&
                                (userCapacidades?.includes('lider_reclutamiento') || userCapacidades?.includes('admin')) && (
                                    <button
                                        onClick={async () => {
                                            if (!assignedRecruiter) {
                                                alert('Por favor selecciona un recruiter primero');
                                                return;
                                            }
                                            setProcessing(true);
                                            try {
                                                await updateDoc(doc(db, 'talent_rqs', selectedRQ.id), {
                                                    assignedRecruiterEmail: assignedRecruiter.email,
                                                    assignedRecruiterNombre: assignedRecruiter.nombre,
                                                    updatedAt: Timestamp.now()
                                                });
                                                setShowDetailModal(false);
                                                loadPendingRQs();
                                                alert('✅ Recruiter asignado exitosamente');
                                            } catch (error) {
                                                console.error('Error assigning recruiter:', error);
                                                alert('Error al asignar recruiter');
                                            } finally {
                                                setProcessing(false);
                                            }
                                        }}
                                        disabled={processing || !assignedRecruiter}
                                        className="px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50"
                                    >
                                        {processing ? '⏳...' : '👤 Asignar Recruiter'}
                                    </button>
                                )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
