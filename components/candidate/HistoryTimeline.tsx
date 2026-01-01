'use client';

import { useState, useEffect } from 'react';
import { getCandidateHistory, CandidateHistoryEntry } from '@/lib/firestore/candidate-history';

interface HistoryTimelineProps {
    candidateId: string;
}

const actionIcons: Record<string, string> = {
    status_change: '🔄',
    assignment: '📋',
    note_added: '📝',
    interview_scheduled: '📅',
    rejection: '❌',
    approval: '✅',
    hire: '🎉',
    application_created: '📬'
};

const actionLabels: Record<string, string> = {
    status_change: 'Cambio de Estado',
    assignment: 'Asignación a RQ',
    note_added: 'Nota Agregada',
    interview_scheduled: 'Entrevista Programada',
    rejection: 'Candidato Rechazado',
    approval: 'Candidato Aprobado',
    hire: 'Candidato Contratado',
    application_created: 'Aplicación Creada'
};

function formatRelativeTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `hace ${days} día${days > 1 ? 's' : ''}`;
    if (hours > 0) return `hace ${hours} hora${hours > 1 ? 's' : ''}`;
    if (minutes > 0) return `hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;
    return 'hace un momento';
}

export default function HistoryTimeline({ candidateId }: HistoryTimelineProps) {
    const [history, setHistory] = useState<(CandidateHistoryEntry & { id: string })[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('all');

    useEffect(() => {
        loadHistory();
    }, [candidateId]);

    async function loadHistory() {
        setLoading(true);
        const entries = await getCandidateHistory(candidateId);
        setHistory(entries);
        setLoading(false);
    }

    const filteredHistory = filter === 'all'
        ? history
        : history.filter(entry => entry.action === filter);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
            </div>
        );
    }

    if (history.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                <p className="text-sm">No hay historial disponible para este candidato</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
                <button
                    onClick={() => setFilter('all')}
                    className={`px-3 py-1 text-sm rounded-full transition ${filter === 'all'
                            ? 'bg-violet-100 text-violet-700 font-medium'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                >
                    Todos ({history.length})
                </button>
                {Object.entries(actionLabels).map(([action, label]) => {
                    const count = history.filter(e => e.action === action).length;
                    if (count === 0) return null;
                    return (
                        <button
                            key={action}
                            onClick={() => setFilter(action)}
                            className={`px-3 py-1 text-sm rounded-full transition ${filter === action
                                    ? 'bg-violet-100 text-violet-700 font-medium'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {actionIcons[action]} {label} ({count})
                        </button>
                    );
                })}
            </div>

            {/* Timeline */}
            <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>

                {/* Entries */}
                <div className="space-y-4">
                    {filteredHistory.map((entry, index) => {
                        const timestamp = entry.timestamp.toDate();
                        const icon = actionIcons[entry.action] || '•';
                        const label = actionLabels[entry.action] || entry.action;

                        return (
                            <div key={entry.id} className="relative flex gap-4">
                                {/* Icon */}
                                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-white border-2 border-violet-200 flex items-center justify-center text-xl z-10">
                                    {icon}
                                </div>

                                {/* Content */}
                                <div className="flex-1 bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <h4 className="font-medium text-gray-900">{label}</h4>
                                            <p className="text-sm text-gray-500">
                                                por {entry.performedBy.userName} · {formatRelativeTime(timestamp)}
                                            </p>
                                        </div>
                                        <span className="text-xs text-gray-400 whitespace-nowrap ml-4">
                                            {timestamp.toLocaleDateString('es-PE', {
                                                day: '2-digit',
                                                month: 'short',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </span>
                                    </div>

                                    {/* Changes */}
                                    {entry.changes && (
                                        <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                                            <span className="text-gray-600">{entry.changes.field}: </span>
                                            <span className="text-red-600 line-through mr-2">{entry.changes.oldValue}</span>
                                            <span className="text-green-600 font-medium">→ {entry.changes.newValue}</span>
                                        </div>
                                    )}

                                    {/* Metadata */}
                                    {entry.metadata && (
                                        <div className="mt-2 space-y-1 text-sm text-gray-600">
                                            {entry.metadata.rqTitle && (
                                                <p><strong>RQ:</strong> {entry.metadata.rqTitle} ({entry.metadata.brandName})</p>
                                            )}
                                            {entry.metadata.reason && (
                                                <p><strong>Razón:</strong> {entry.metadata.reason}</p>
                                            )}
                                            {entry.metadata.notes && (
                                                <p><strong>Notas:</strong> {entry.metadata.notes}</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
