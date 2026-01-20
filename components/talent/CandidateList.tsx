'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import CandidateDetailModal from './CandidateDetailModal';

interface Candidate {
    id: string;
    nombre: string;
    email: string;
    telefono: string;
    status: string;
    matchScore: number | null;
    jobId: string;
    appliedAt: any;
    kqPassed: boolean;
    culValidationStatus?: string;
}

interface CandidateListProps {
    holdingId: string;
    jobId?: string; // Optional filter by job
}

export default function CandidateList({ holdingId, jobId }: CandidateListProps) {
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'screening' | 'rejected'>('all');
    const [recovering, setRecovering] = useState<string | null>(null);
    const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

    useEffect(() => {
        loadCandidates();
    }, [holdingId, jobId]);

    async function loadCandidates() {
        try {
            const candidatesRef = collection(db, 'talent_candidates');
            let q = query(
                candidatesRef,
                where('holdingId', '==', holdingId)
            );

            const snapshot = await getDocs(q);
            const loadedCandidates = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as any[];

            // Sort client-side to avoid index issues
            loadedCandidates.sort((a, b) => {
                const dateA = a.appliedAt?.seconds || 0;
                const dateB = b.appliedAt?.seconds || 0;
                return dateB - dateA;
            });

            const finalCandidates = loadedCandidates as Candidate[];
            setCandidates(jobId ? finalCandidates.filter(c => c.jobId === jobId) : finalCandidates);
        } catch (error) {
            console.error('Error loading candidates:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleRecover(candidateId: string) {
        if (!confirm('¿Recuperar este candidato y analizarlo con IA?')) return;

        setRecovering(candidateId);
        try {
            const response = await fetch('/api/talent/recover-candidate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    candidateId,
                    recruiterId: 'current_user' // TODO: get from auth
                })
            });

            const data = await response.json();
            if (data.success) {
                alert('✅ Candidato recuperado. Se está analizando con IA.');
                loadCandidates();
            } else {
                alert('Error: ' + data.error);
            }
        } catch (error) {
            console.error('Error recovering candidate:', error);
            alert('Error recuperando candidato');
        } finally {
            setRecovering(null);
        }
    }

    const getStatusBadge = (status: string, matchScore: number | null) => {
        const badges: Record<string, { bg: string; text: string; label: string }> = {
            'PENDING_ANALYSIS': { bg: 'bg-blue-100', text: 'text-blue-700', label: '⏳ Analizando' },
            'SCREENING': { bg: 'bg-green-100', text: 'text-green-700', label: '✓ Screening' },
            'AUTO_REJECTED': { bg: 'bg-red-100', text: 'text-red-700', label: '⛔ Rechazado' },
            'INTERVIEW': { bg: 'bg-purple-100', text: 'text-purple-700', label: '🎤 Entrevista' },
            'OFFER': { bg: 'bg-amber-100', text: 'text-amber-700', label: '📋 Oferta' },
            'HIRED': { bg: 'bg-emerald-100', text: 'text-emerald-700', label: '🎉 Contratado' },
        };
        const badge = badges[status] || { bg: 'bg-gray-100', text: 'text-gray-700', label: status };

        return (
            <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                    {badge.label}
                </span>
                {matchScore !== null && status === 'SCREENING' && (
                    <span className={`text-xs font-bold ${matchScore >= 70 ? 'text-green-600' :
                        matchScore >= 50 ? 'text-amber-600' : 'text-red-600'
                        }`}>
                        {matchScore}%
                    </span>
                )}
            </div>
        );
    };

    const getCulBadge = (status?: string) => {
        if (!status || status === 'pending') return <span className="text-gray-400">⏳ No validado</span>;
        if (status === 'approved_ai') return <span className="text-green-600 font-medium">✅ OK</span>;
        if (status === 'rejected_ai' || status === 'rejected_invalid_doc') return <span className="text-red-600 font-medium">❌ Error</span>;
        if (status === 'pending_review') return <span className="text-amber-600 font-medium">⚠️ Manual</span>;
        return <span className="text-gray-500">{status}</span>;
    };

    const filteredCandidates = candidates.filter(c => {
        if (filter === 'screening') return c.status === 'SCREENING';
        if (filter === 'rejected') return c.status === 'AUTO_REJECTED';
        return true;
    });

    if (loading) {
        return (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500 mx-auto" />
                <p className="text-gray-500 mt-4">Cargando candidatos...</p>
            </div>
        );
    }

    if (candidates.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                <div className="text-6xl mb-4">👥</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Sin candidatos</h3>
                <p className="text-gray-600">Los candidatos aparecerán aquí cuando apliquen</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex gap-2">
                {[
                    { id: 'all', label: 'Todos', count: candidates.length },
                    { id: 'screening', label: 'Screening', count: candidates.filter(c => c.status === 'SCREENING').length },
                    { id: 'rejected', label: 'Rechazados', count: candidates.filter(c => c.status === 'AUTO_REJECTED').length },
                ].map(f => (
                    <button
                        key={f.id}
                        onClick={() => setFilter(f.id as any)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f.id
                            ? 'bg-violet-100 text-violet-700'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        {f.label} ({f.count})
                    </button>
                ))}
            </div>

            {/* Candidates Table */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Candidato</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Contacto</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Estado</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">KQ</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">CUL</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredCandidates.map(candidate => (
                            <tr key={candidate.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4">
                                    <div className="font-medium text-gray-900">{candidate.nombre}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm text-gray-600">{candidate.email}</div>
                                    <div className="text-sm text-gray-500">{candidate.telefono}</div>
                                </td>
                                <td className="px-6 py-4">
                                    {getStatusBadge(candidate.status, candidate.matchScore)}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`text-sm ${candidate.kqPassed ? 'text-green-600' : 'text-red-600'}`}>
                                        {candidate.kqPassed ? '✓ Pasó' : '✗ Falló'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-xs">
                                    {getCulBadge(candidate.culValidationStatus)}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setSelectedCandidate(candidate)}
                                            className="text-violet-600 hover:text-violet-800 text-sm font-medium"
                                        >
                                            Ver perfil
                                        </button>
                                        {candidate.status === 'AUTO_REJECTED' && (
                                            <button
                                                onClick={() => handleRecover(candidate.id)}
                                                disabled={recovering === candidate.id}
                                                className="text-amber-600 hover:text-amber-800 text-sm font-medium disabled:opacity-50"
                                            >
                                                {recovering === candidate.id ? '⏳' : '🔄'} Recuperar
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {selectedCandidate && (
                <CandidateDetailModal
                    candidate={selectedCandidate}
                    onClose={() => setSelectedCandidate(null)}
                />
            )}
        </div>
    );
}
