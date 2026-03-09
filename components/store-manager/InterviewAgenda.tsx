'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc, orderBy } from 'firebase/firestore';
import { CheckCircle2, XCircle, UserX, CalendarClock, ChevronDown, ChevronUp } from 'lucide-react';

interface Interview {
    id: string;
    candidateId: string;
    candidateName: string;
    candidateEmail: string;
    candidatePhone: string;
    rqId: string;
    slotDate: string;
    slotTime: string;
    status: string;
    applicationId: string;
    posicion?: string;
}

interface InterviewAgendaProps {
    storeId: string;
    holdingId?: string;
    marcaColor?: string;
}

export default function InterviewAgenda({ storeId, holdingId, marcaColor }: InterviewAgendaProps) {
    const [interviews, setInterviews] = useState<Interview[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const accent = marcaColor || '#7C3AED';

    useEffect(() => {
        if (!storeId) return;
        loadInterviews();
    }, [storeId]);

    async function loadInterviews() {
        if (!storeId) return;
        setLoading(true);
        try {
            const q = query(
                collection(db, 'interviews'),
                where('storeId', '==', storeId),
                where('status', 'in', ['scheduled', 'manager_approved', 'pending_review'])
            );
            const snap = await getDocs(q);
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Interview));

            // Sort by date then time
            setInterviews(list.sort((a, b) => {
                const dateCompare = (a.slotDate || '').localeCompare(b.slotDate || '');
                if (dateCompare !== 0) return dateCompare;
                return (a.slotTime || '').localeCompare(b.slotTime || '');
            }));
        } catch (e) {
            console.error('Error loading interviews:', e);
        } finally {
            setLoading(false);
        }
    }

    async function handleAction(interviewId: string, candidateId: string, rqId: string, action: 'approved' | 'discarded' | 'no_show') {
        setActionLoading(interviewId + action);
        try {
            // Update interview
            await updateDoc(doc(db, 'interviews', interviewId), {
                status: action === 'approved' ? 'manager_approved' : action === 'discarded' ? 'discarded' : 'no_show',
                updatedAt: new Date().toISOString()
            });

            // If approved: call the manager-approve API to send ficha email
            if (action === 'approved') {
                await fetch('/api/portal/manager-approve', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ interviewId, candidateId, rqId })
                });
            }

            // Refresh list
            await loadInterviews();
        } catch (e) {
            console.error('Error updating interview:', e);
            alert('Error al procesar la acción. Intenta de nuevo.');
        } finally {
            setActionLoading(null);
        }
    }

    const statusLabels: Record<string, { label: string; color: string }> = {
        scheduled: { label: 'Pendiente', color: 'bg-amber-100 text-amber-800' },
        manager_approved: { label: 'Aprobado', color: 'bg-green-100 text-green-800' },
        discarded: { label: 'Descartado', color: 'bg-red-100 text-red-800' },
        no_show: { label: 'No Acudió', color: 'bg-gray-100 text-gray-600' }
    };

    if (loading) return (
        <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-gray-200 rounded-full" style={{ borderTopColor: accent }} />
        </div>
    );

    if (interviews.length === 0) return (
        <div className="text-center py-12">
            <CalendarClock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No hay entrevistas agendadas</p>
            <p className="text-gray-400 text-sm mt-1">Los candidatos que agendan aparecerán aquí</p>
        </div>
    );

    return (
        <div className="space-y-3">
            {interviews.map(interview => {
                const statusInfo = statusLabels[interview.status] || statusLabels.scheduled;
                const isExpanded = expandedId === interview.id;
                const isPending = interview.status === 'scheduled';

                return (
                    <div key={interview.id} className="border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm">
                        {/* Top strip with brand color */}
                        <div className="h-1" style={{ backgroundColor: accent }} />

                        <div className="p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className="font-bold text-gray-900 truncate">{interview.candidateName}</h4>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusInfo.color}`}>
                                            {statusInfo.label}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 flex-wrap">
                                        <span className="flex items-center gap-1">
                                            📅 <span className="capitalize">{interview.slotDate}</span>
                                        </span>
                                        <span className="flex items-center gap-1">
                                            🕐 {interview.slotTime}
                                        </span>
                                        {interview.posicion && (
                                            <span className="font-medium text-gray-700">{interview.posicion}</span>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => setExpandedId(isExpanded ? null : interview.id)}
                                    className="p-2 rounded-xl hover:bg-gray-50 text-gray-400 transition-colors flex-shrink-0"
                                >
                                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                </button>
                            </div>

                            {/* Expanded: contact + action buttons */}
                            {isExpanded && (
                                <div className="mt-3 pt-3 border-t border-gray-100">
                                    <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                                        <div>
                                            <p className="text-gray-400 text-xs uppercase font-semibold tracking-wide">Email</p>
                                            <p className="text-gray-700">{interview.candidateEmail}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400 text-xs uppercase font-semibold tracking-wide">Teléfono</p>
                                            <p className="text-gray-700">{interview.candidatePhone || '—'}</p>
                                        </div>
                                    </div>

                                    {isPending && (
                                        <div>
                                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Resultado de entrevista</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    onClick={() => handleAction(interview.id, interview.candidateId, interview.rqId, 'approved')}
                                                    disabled={!!actionLoading}
                                                    className="flex items-center justify-center gap-2 py-3 px-3 bg-green-600 text-white rounded-xl text-sm font-black uppercase italic tracking-tighter hover:bg-green-700 transition-colors disabled:opacity-50 shadow-sm"
                                                >
                                                    {actionLoading === interview.id + 'approved'
                                                        ? <span className="animate-spin w-4 h-4 border-2 border-white/40 border-t-white rounded-full" />
                                                        : <CheckCircle2 size={16} />}
                                                    Aprobado
                                                </button>
                                                <button
                                                    onClick={() => handleAction(interview.id, interview.candidateId, interview.rqId, 'discarded')}
                                                    disabled={!!actionLoading}
                                                    className="flex items-center justify-center gap-2 py-3 px-3 bg-red-100 text-red-700 rounded-xl text-sm font-black uppercase italic tracking-tighter hover:bg-red-200 transition-colors disabled:opacity-50"
                                                >
                                                    {actionLoading === interview.id + 'discarded'
                                                        ? <span className="animate-spin w-4 h-4 border-2 border-red-300 border-t-red-700 rounded-full" />
                                                        : <XCircle size={16} />}
                                                    Descartado
                                                </button>
                                                <button
                                                    onClick={() => handleAction(interview.id, interview.candidateId, interview.rqId, 'no_show')}
                                                    disabled={!!actionLoading}
                                                    className="flex items-center justify-center gap-2 py-3 px-3 bg-gray-100 text-gray-600 rounded-xl text-sm font-black uppercase italic tracking-tighter hover:bg-gray-200 transition-colors disabled:opacity-50"
                                                >
                                                    {actionLoading === interview.id + 'no_show'
                                                        ? <span className="animate-spin w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full" />
                                                        : <UserX size={16} />}
                                                    No Acudió
                                                </button>
                                                <button
                                                    onClick={() => alert('Próximamente: Modifica la fecha y el candidato recibirá un aviso.')}
                                                    className="flex items-center justify-center gap-2 py-3 px-3 border-2 border-dashed border-gray-200 text-gray-400 rounded-xl text-sm font-black uppercase italic tracking-tighter hover:border-gray-300 hover:text-gray-500 transition-colors"
                                                >
                                                    <CalendarClock size={16} />
                                                    Reprogramar
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {!isPending && interview.status === 'manager_approved' && (
                                        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                                            <p className="text-green-800 text-sm font-medium">
                                                ✅ Aprobado — Se envió email al candidato para completar su ficha.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
