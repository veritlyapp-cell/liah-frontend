'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, Timestamp, orderBy } from 'firebase/firestore';

interface RescueCandidate {
    id: string;
    candidateId: string;
    applicationId: string;
    rqId: string;
    rqNumber: string;
    posicion: string;
    candidateName: string;
    candidateEmail: string;
    candidateDistrito: string;
    matchScore: number;
    kqPassed: boolean;
    status: 'pending_review' | 'rescued' | 'rejected';
    createdAt: Date;
    rejectionReasons: {
        geoMismatch: boolean;
        kqFailed: boolean;
        failedKQs: string[];
    };
}

interface RescueInboxProps {
    tiendaId: string;
    onRefresh?: () => void;
}

export default function RescueInbox({ tiendaId, onRefresh }: RescueInboxProps) {
    const [loading, setLoading] = useState(true);
    const [candidates, setCandidates] = useState<RescueCandidate[]>([]);
    const [rescuing, setRescuing] = useState<string | null>(null);

    useEffect(() => {
        loadCandidates();
    }, [tiendaId]);

    async function loadCandidates() {
        setLoading(true);
        try {
            const rescueRef = collection(db, 'rescue_inbox');
            const q = query(
                rescueRef,
                where('tiendaId', '==', tiendaId),
                where('status', '==', 'pending_review'),
                orderBy('createdAt', 'desc')
            );

            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date()
            })) as RescueCandidate[];

            setCandidates(data);
        } catch (error) {
            console.error('Error loading rescue inbox:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleRescue(candidate: RescueCandidate) {
        setRescuing(candidate.id);

        try {
            // Update rescue inbox status
            await updateDoc(doc(db, 'rescue_inbox', candidate.id), {
                status: 'rescued',
                rescuedAt: Timestamp.now()
            });

            // Update candidate's application to allow scheduling
            const candidateDocRef = doc(db, 'candidates', candidate.candidateId);
            // Note: In real implementation, you'd update the specific application
            // This is a simplified version

            // Send notification to candidate
            await fetch('/api/portal/notify-rescue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    candidateId: candidate.candidateId,
                    applicationId: candidate.applicationId,
                    rqId: candidate.rqId,
                    posicion: candidate.posicion
                })
            });

            // Refresh list
            await loadCandidates();
            onRefresh?.();

            alert(`✅ Se habilitó la agenda para ${candidate.candidateName}`);

        } catch (error) {
            console.error('Error rescuing candidate:', error);
            alert('Error al rescatar candidato');
        } finally {
            setRescuing(null);
        }
    }

    async function handleReject(candidate: RescueCandidate) {
        if (!confirm(`¿Rechazar a ${candidate.candidateName}?`)) return;

        try {
            await updateDoc(doc(db, 'rescue_inbox', candidate.id), {
                status: 'rejected',
                rejectedAt: Timestamp.now()
            });

            await loadCandidates();
        } catch (error) {
            console.error('Error rejecting:', error);
        }
    }

    if (loading) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="animate-pulse flex space-x-4">
                    <div className="flex-1 space-y-4">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (candidates.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <span className="text-4xl mb-4 block">📭</span>
                <p className="text-gray-500">No hay perfiles en revisión</p>
                <p className="text-gray-400 text-sm mt-1">
                    Aquí aparecerán candidatos que postularon desde fuera de la zona
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <span className="text-xl">📥</span>
                    Buzón de Rescate
                    <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-sm">
                        {candidates.length} pendiente{candidates.length !== 1 ? 's' : ''}
                    </span>
                </h3>
                <button
                    onClick={loadCandidates}
                    className="text-sm text-violet-600 hover:text-violet-700"
                >
                    Actualizar
                </button>
            </div>

            <div className="space-y-3">
                {candidates.map(candidate => (
                    <div
                        key={candidate.id}
                        className="bg-white rounded-xl border border-gray-200 p-4 hover:border-violet-200 transition-colors"
                    >
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <h4 className="font-medium text-gray-900">
                                    {candidate.candidateName}
                                </h4>
                                <p className="text-sm text-gray-500">
                                    {candidate.candidateEmail}
                                </p>
                                <div className="flex gap-2 mt-2 flex-wrap">
                                    <span className="px-2 py-1 bg-violet-50 text-violet-700 rounded text-xs">
                                        {candidate.posicion}
                                    </span>
                                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                                        📍 {candidate.candidateDistrito}
                                    </span>
                                    {candidate.rejectionReasons.geoMismatch && (
                                        <span className="px-2 py-1 bg-red-50 text-red-600 rounded text-xs">
                                            Fuera de zona
                                        </span>
                                    )}
                                    {candidate.rejectionReasons.kqFailed && (
                                        <span className="px-2 py-1 bg-amber-50 text-amber-600 rounded text-xs">
                                            KQ no cumplidos
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleRescue(candidate)}
                                    disabled={rescuing === candidate.id}
                                    className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                                >
                                    {rescuing === candidate.id ? '...' : '✓ Rescatar'}
                                </button>
                                <button
                                    onClick={() => handleReject(candidate)}
                                    className="px-4 py-2 bg-gray-100 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* Match Score Bar */}
                        <div className="mt-3 pt-3 border-t border-gray-100">
                            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                                <span>Match Score</span>
                                <span>{candidate.matchScore}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                                <div
                                    className={`h-1.5 rounded-full ${candidate.matchScore >= 60 ? 'bg-green-500' :
                                        candidate.matchScore >= 30 ? 'bg-amber-500' : 'bg-red-400'
                                        }`}
                                    style={{ width: `${candidate.matchScore}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
