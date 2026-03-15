import { type RQ } from '@/lib/firestore/rqs';
import { useApprovalConfig } from '@/lib/hooks/useApprovalConfig';

interface RQCardProps {
    rq: RQ;
    userRole: string;
    onApprove?: (rqId: string) => void;
    onReject?: (rqId: string, reason: string) => void;
    onDelete?: (rqId: string, reason: string) => void;
    onRequestDeletion?: (rqId: string, reason: string) => void;
    onStartRecruitment?: (rqId: string) => void;
    onFinalize?: (rqId: string) => void;
    onInvite?: (rq: RQ) => void;
    onUpdate?: () => void;
}

export default function RQCard({
    rq,
    userRole,
    onApprove,
    onReject,
    onDelete,
    onRequestDeletion,
    onStartRecruitment,
    onFinalize,
    onInvite
}: RQCardProps) {
    const { getLevelInfo } = useApprovalConfig(rq.marcaId);

    // Calcular Time to Fill si está en reclutamiento
    const getTimeToFill = () => {
        if (!rq.recruitment_started_at) return null;

        const startDate = rq.recruitment_started_at.toDate();
        const endDate = rq.recruitment_ended_at
            ? rq.recruitment_ended_at.toDate()
            : new Date();

        const days = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        return days;
    };

    const timeToFillDays = getTimeToFill();

    // Determinar badge de estado
    const getStateBadge = () => {
        const baseClasses = "px-3 py-1 rounded-full text-xs font-semibold";

        if (rq.status === 'filled') {
            return (
                <span className={`${baseClasses} bg-green-100 text-green-700`}>
                    ✅ Cubierto
                </span>
            );
        }

        if (rq.approvalStatus === 'approved' && rq.status === 'active') {
            return (
                <span className={`${baseClasses} bg-blue-100 text-blue-700`}>
                    🔵 Activo
                </span>
            );
        }

        if (rq.approvalStatus === 'rejected') {
            return (
                <span className={`${baseClasses} bg-red-100 text-red-700`}>
                    ❌ Rechazado
                </span>
            );
        }

        if (rq.status === 'closed') {
            return (
                <span className={`${baseClasses} bg-gray-100 text-gray-700`}>
                    🔒 Cerrado
                </span>
            );
        }

        if (rq.status === 'cancelled') {
            return (
                <span className={`${baseClasses} bg-red-100 text-red-700`}>
                    ❌ Cancelado
                </span>
            );
        }



        if (rq.approvalStatus === 'pending') {
            const levelInfo = getLevelInfo(rq.currentApprovalLevel || 1);
            return (
                <span className={`${baseClasses} bg-amber-100 text-amber-700`}>
                    ⏳ Nivel {rq.currentApprovalLevel || 1}: {levelInfo?.name || 'Pendiente'}
                </span>
            );
        }

        return (
            <span className={`${baseClasses} bg-gray-100 text-gray-600`}>
                Estado desconocido
            </span>
        );
    };

    // Determinar si mostrar botones de acción
    const canApprove = rq.approvalStatus === 'pending';
    // Aprobado es el estado final - no hay workflow de reclutamiento
    const canStartRecruitment = false;
    const canFinalize = false;
    // Store Manager, Supervisor, and Jefe de Marca can all delete directly
    const canDelete = userRole === 'jefe_marca' || userRole === 'supervisor' || userRole === 'store_manager';
    // No more request deletion - everyone who can delete does it directly
    const canRequestDeletion = false;
    // Recruiters can reject approved RQs to return them to Jefe de Marca with observations
    const canRecruiterReject = userRole === 'recruiter' && rq.approvalStatus === 'approved' && rq.status === 'active';

    return (
        <div className="glass-card rounded-xl p-4 hover:shadow-lg transition-shadow">
            {/* RQ Number Header - Solo si existe */}
            {rq.rqNumber && (
                <div className="mb-2 pb-2 border-b border-violet-200">
                    <p className="text-xs font-mono text-violet-600 font-semibold">{rq.rqNumber}</p>
                </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-bold text-gray-900 text-lg leading-tight uppercase italic tracking-tight">{rq.posicion}</h3>
                        {rq.confidencial && (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-black rounded flex items-center gap-1 uppercase tracking-widest">
                                🔒 CONFIDENCIAL
                            </span>
                        )}
                        {rq.instanceNumber > 1 && (
                            <span className="text-[10px] font-black bg-violet-100 text-violet-600 px-2 py-0.5 rounded uppercase">
                                #{rq.instanceNumber}
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-slate-500 font-medium">
                        {rq.tiendaNombre} • {rq.modalidad} • {rq.turno}
                    </p>
                </div>

                <div className="flex sm:flex-col items-start sm:items-end gap-2 shrink-0">
                    {getStateBadge()}

                    {/* Alerta de X+ días sin cubrir (configurable) */}
                    {rq.alert_unfilled && (
                        <span className="px-2 py-1 rounded-lg text-[10px] font-black bg-red-50 text-red-600 animate-pulse uppercase tracking-wider border border-red-100">
                            🚨 +{rq.alert_days_threshold || 7} d
                        </span>
                    )}
                </div>
            </div>

            {/* Visual Approval Stepper */}
            {rq.approvalStatus !== 'rejected' && (
                <div className="mb-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Flujo de Aprobación</span>
                        <div className="flex items-center gap-1.5 bg-violet-50 text-violet-600 px-2.5 py-1 rounded-full border border-violet-100">
                            <div className={`w-1.5 h-1.5 rounded-full ${rq.approvalStatus === 'approved' ? 'bg-emerald-500' : 'bg-violet-500 animate-pulse'}`} />
                            <span className="text-[10px] font-black uppercase tracking-wider">
                                {rq.approvalStatus === 'approved' ? 'Completado' : `Nivel ${rq.currentApprovalLevel}`}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-0 relative px-2">
                        {[1, 2, 3].map((level, idx) => {
                            const levelInfo = getLevelInfo(level);
                            const chainItem = rq.approvalChain?.find(item => item.level === level);
                            const isPast = level < (rq.currentApprovalLevel || 1) || rq.approvalStatus === 'approved';
                            const isCurrent = level === (rq.currentApprovalLevel || 1) && rq.approvalStatus === 'pending';

                            // Colors
                            let circleBg = "bg-slate-200";
                            let textColor = "text-slate-400";
                            let icon: React.ReactNode = level;

                            if (isPast) {
                                circleBg = "bg-emerald-500 shadow-lg shadow-emerald-200";
                                textColor = "text-emerald-600 font-black";
                                icon = "✓";
                            } else if (isCurrent) {
                                circleBg = "bg-violet-600 animate-pulse shadow-lg shadow-violet-200";
                                textColor = "text-violet-600 font-black";
                            }

                            return (
                                <div key={level} className="flex-1 flex flex-col items-center gap-2 group relative">
                                    <div className={`w-8 h-8 rounded-full ${circleBg} flex items-center justify-center text-xs text-white transition-all z-10 font-black italic`}>
                                        {icon}
                                    </div>
                                    <span className={`text-[9px] text-center uppercase tracking-tighter ${textColor} font-black leading-tight max-w-[60px]`}>
                                        {levelInfo?.name || `Nivel ${level}`}
                                    </span>

                                    {/* Line connecting circles */}
                                    {idx < 2 && (
                                        <div className={`absolute h-[2px] w-[calc(100%-32px)] top-4 left-[calc(50%+16px)] ${isPast ? 'bg-emerald-500' : 'bg-slate-200'} transition-all`} />
                                    )}

                                    {/* Tooltip detail (Desktop only or touch) */}
                                    {chainItem?.approvedAt && (
                                        <div className="absolute bottom-full mb-3 hidden group-hover:block bg-slate-900 text-white text-[10px] p-3 rounded-2xl whitespace-nowrap z-50 shadow-2xl border border-slate-700">
                                            <p className="font-bold text-emerald-400">{chainItem.status === 'approved' ? 'Aprobado' : 'Pendiente'}</p>
                                            <p className="text-slate-300">{chainItem.approvedByName || 'N/A'}</p>
                                            <p className="text-slate-500">{new Date(chainItem.approvedAt.toDate()).toLocaleString()}</p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Detalles */}
            <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                <div>
                    <span className="text-gray-500">Salario:</span>
                    <span className="font-medium text-gray-900 ml-1">S/ {rq.salario}</span>
                </div>
                <div>
                    <span className="text-gray-500">Marca:</span>
                    <span className="font-medium text-gray-900 ml-1">{rq.marcaNombre}</span>
                </div>
            </div>

            {/* Botones de acción principal */}
            <div className="flex flex-wrap gap-2 mb-3">
                {/* Invite Button - Visible for roles that can invite when approved & active */}
                {rq.approvalStatus === 'approved' && rq.status === 'active' && onInvite && (
                    <button
                        onClick={() => onInvite(rq)}
                        className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-cyan-500 text-white rounded-lg text-sm font-bold shadow-sm hover:opacity-90 transition-all flex items-center gap-2"
                    >
                        ➕ Invitar Candidato
                    </button>
                )}

                {canApprove && onApprove && (
                    <>
                        <button
                            onClick={() => onApprove(rq.id)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                        >
                            ✓ Aprobar
                        </button>
                        <button
                            onClick={() => {
                                const reason = prompt('Motivo de rechazo:');
                                if (reason && onReject) {
                                    onReject(rq.id, reason);
                                }
                            }}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                        >
                            ✗ Rechazar
                        </button>
                    </>
                )}

                {canStartRecruitment && onStartRecruitment && (
                    <button
                        onClick={() => onStartRecruitment(rq.id)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                        🚀 Iniciar Reclutamiento
                    </button>
                )}

                {canFinalize && onFinalize && (
                    <button
                        onClick={() => {
                            if (confirm('¿Finalizar este RQ? Esta acción no se puede deshacer.')) {
                                onFinalize(rq.id);
                            }
                        }}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
                    >
                        ✔ Finalizar
                    </button>
                )}

                {/* Recruiter can reject approved RQs to return to Jefe Marca */}
                {canRecruiterReject && onReject && (
                    <button
                        onClick={() => {
                            const reason = prompt('Motivo de rechazo (se devolverá al Jefe de Marca):');
                            if (reason) {
                                onReject(rq.id, reason);
                            }
                        }}
                        className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors"
                    >
                        ↩ Rechazar RQ
                    </button>
                )}

                {canDelete && onDelete && !rq.deletion_requested && (
                    <button
                        onClick={() => {
                            const reason = prompt('Motivo de eliminación:');
                            if (reason) {
                                if (confirm('¿Estás seguro? Se notificará al equipo de reclutamiento.')) {
                                    onDelete(rq.id, reason);
                                }
                            }
                        }}
                        className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
                    >
                        🗑 Eliminar
                    </button>
                )}

                {canRequestDeletion && onRequestDeletion && !rq.deletion_requested && (
                    <button
                        onClick={() => {
                            const reason = prompt('Motivo para solicitar eliminación:');
                            if (reason) {
                                onRequestDeletion(rq.id, reason);
                            }
                        }}
                        className="px-4 py-2 border border-orange-300 text-orange-600 rounded-lg text-sm font-medium hover:bg-orange-50 transition-colors"
                    >
                        ⚠️ Solicitar Eliminación
                    </button>
                )}
            </div>

            {/* Info adicional al pie */}
            <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
                <p>Creado por: {rq.creadorEmail}</p>
                <p>Fecha: {new Date(rq.createdAt.toDate()).toLocaleDateString('es-PE')}</p>
            </div>
        </div>
    );
}
