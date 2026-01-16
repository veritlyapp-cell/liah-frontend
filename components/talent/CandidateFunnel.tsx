'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import {
    collection, query, where, getDocs, getDoc, updateDoc, doc, Timestamp
} from 'firebase/firestore';

interface StageTransition {
    stageId: string;
    stageName: string;
    enteredAt: any; // Timestamp
}

interface Application {
    id: string;
    jobId: string;
    nombre: string;
    email: string;
    telefono?: string;
    cvFileName?: string;
    cvUrl?: string;
    killerQuestionsPassed: boolean;
    failedKillerQuestions?: string[];
    status: string;
    matchScore?: number;
    funnelStage: string;
    stageHistory?: StageTransition[]; // Track time in each stage
    currentStageEnteredAt?: any; // When entered current stage
    createdAt: any;
    aiAnalysis?: {
        matchScore: number;
        resumenEjecutivo: string;
        puntosFuertes: string[];
        puntosDebiles: string[];
        recomendacion: string;
        analisisDetallado: {
            experiencia: string;
            habilidades: string;
            formacion: string;
        }
    };
}

interface FunnelStage {
    id: string;
    nombre: string;
    color: string;
    orden: number;
}

interface CandidateFunnelProps {
    jobId: string;
    jobTitulo: string;
    holdingId: string;
}

// Default funnel stages
const DEFAULT_STAGES: FunnelStage[] = [
    { id: 'applied', nombre: 'Postulados', color: 'bg-gray-100', orden: 1 },
    { id: 'screening', nombre: 'Screening', color: 'bg-blue-100', orden: 2 },
    { id: 'interview', nombre: 'Entrevista', color: 'bg-yellow-100', orden: 3 },
    { id: 'offer', nombre: 'Oferta', color: 'bg-green-100', orden: 4 },
    { id: 'hired', nombre: 'Contratado', color: 'bg-emerald-100', orden: 5 },
    { id: 'rejected', nombre: 'Rechazados', color: 'bg-red-100', orden: 99 },
];

export default function CandidateFunnel({ jobId, jobTitulo, holdingId }: CandidateFunnelProps) {
    const [loading, setLoading] = useState(true);
    const [applications, setApplications] = useState<Application[]>([]);
    const [stages, setStages] = useState<FunnelStage[]>(DEFAULT_STAGES);
    const [selectedCandidate, setSelectedCandidate] = useState<Application | null>(null);
    const [showCandidateModal, setShowCandidateModal] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [showStagesConfig, setShowStagesConfig] = useState(false);
    const [usingCustomStages, setUsingCustomStages] = useState(false);
    const [savingStages, setSavingStages] = useState(false);

    useEffect(() => {
        loadData();
    }, [jobId, holdingId]);

    async function loadData() {
        setLoading(true);
        try {
            let loadedStages: FunnelStage[] | null = null;

            // 1. First try to load job-specific funnel stages
            const jobConfigDoc = await getDoc(doc(db, 'job_funnel_config', jobId));
            if (jobConfigDoc.exists()) {
                const jobConfigData = jobConfigDoc.data();
                if (jobConfigData.stages && Array.isArray(jobConfigData.stages)) {
                    loadedStages = jobConfigData.stages as FunnelStage[];
                    setUsingCustomStages(true);
                }
            }

            // 2. If no job-specific config, try holding-level default
            if (!loadedStages) {
                const holdingConfigDoc = await getDoc(doc(db, 'funnel_config', holdingId));
                if (holdingConfigDoc.exists()) {
                    const configData = holdingConfigDoc.data();
                    if (configData.stages && Array.isArray(configData.stages)) {
                        loadedStages = configData.stages as FunnelStage[];
                    }
                }
                setUsingCustomStages(false);
            }

            // 3. Apply loaded stages or use defaults
            if (loadedStages) {
                // Ensure rejected stage is always present
                if (!loadedStages.find(s => s.id === 'rejected')) {
                    loadedStages.push({ id: 'rejected', nombre: 'Rechazados', color: 'bg-red-100', orden: 99 });
                }
                setStages(loadedStages);
            }

            // Load applications
            const appsRef = collection(db, 'talent_applications');
            const appsQuery = query(appsRef, where('jobId', '==', jobId));
            const appsSnap = await getDocs(appsQuery);

            const loadedApps = appsSnap.docs.map(d => ({
                id: d.id,
                ...d.data()
            })) as Application[];

            // Sort by matchScore descending (higher first)
            loadedApps.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

            setApplications(loadedApps);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    }

    async function saveJobStages(newStages: FunnelStage[]) {
        setSavingStages(true);
        try {
            const { setDoc, Timestamp: TS } = await import('firebase/firestore');
            await setDoc(doc(db, 'job_funnel_config', jobId), {
                stages: newStages,
                jobId,
                holdingId,
                updatedAt: TS.now()
            });
            setStages(newStages);
            setUsingCustomStages(true);
            setShowStagesConfig(false);
            alert('✅ Etapas guardadas para esta vacante');
        } catch (error) {
            console.error('Error saving job stages:', error);
            alert('Error al guardar');
        } finally {
            setSavingStages(false);
        }
    }

    async function resetToDefault() {
        if (!confirm('¿Restaurar al funnel por defecto del holding? Los cambios se perderán.')) return;
        setSavingStages(true);
        try {
            const { deleteDoc } = await import('firebase/firestore');
            await deleteDoc(doc(db, 'job_funnel_config', jobId));
            setUsingCustomStages(false);
            loadData(); // Reload with holding default
        } catch (error) {
            console.error('Error resetting:', error);
        } finally {
            setSavingStages(false);
        }
    }

    function getApplicationsByStage(stageId: string) {
        return applications.filter(a => a.funnelStage === stageId);
    }

    async function moveCandidate(candidateId: string, newStage: string) {
        setProcessing(true);
        try {
            const { arrayUnion } = await import('firebase/firestore');
            const newStageName = stages.find(s => s.id === newStage)?.nombre || newStage;

            const stageTransition: StageTransition = {
                stageId: newStage,
                stageName: newStageName,
                enteredAt: Timestamp.now()
            };

            await updateDoc(doc(db, 'talent_applications', candidateId), {
                funnelStage: newStage,
                status: newStage === 'rejected' ? 'rejected' : newStage === 'hired' ? 'hired' : 'in_process',
                currentStageEnteredAt: Timestamp.now(),
                stageHistory: arrayUnion(stageTransition),
                updatedAt: Timestamp.now()
            });
            loadData();
        } catch (error) {
            console.error('Error moving candidate:', error);
        } finally {
            setProcessing(false);
        }
    }

    function openCandidateDetail(app: Application) {
        setSelectedCandidate(app);
        setShowCandidateModal(true);
    }

    function getDaysInStage(app: Application): number {
        const enteredAt = app.currentStageEnteredAt || app.createdAt;
        if (!enteredAt) return 0;

        const enteredDate = enteredAt.seconds
            ? new Date(enteredAt.seconds * 1000)
            : new Date(enteredAt);
        const now = new Date();
        const diffTime = now.getTime() - enteredDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return Math.max(0, diffDays);
    }

    function getDaysColor(days: number): string {
        if (days <= 2) return 'text-green-600';
        if (days <= 5) return 'text-yellow-600';
        if (days <= 7) return 'text-orange-600';
        return 'text-red-600';
    }

    function getMatchScoreColor(score: number | undefined): string {
        if (!score) return 'bg-gray-100 text-gray-600';
        if (score >= 80) return 'bg-green-100 text-green-700';
        if (score >= 60) return 'bg-yellow-100 text-yellow-700';
        if (score >= 40) return 'bg-orange-100 text-orange-700';
        return 'bg-red-100 text-red-700';
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
                    <h2 className="text-xl font-bold text-gray-900">Pipeline de Candidatos</h2>
                    <div className="flex items-center gap-2">
                        <span className="text-gray-600">{jobTitulo} • {applications.length} candidatos</span>
                        {usingCustomStages && (
                            <span className="px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full text-xs font-medium">
                                Etapas personalizadas
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowStagesConfig(!showStagesConfig)}
                        className="px-4 py-2 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                        🗂️ Personalizar Etapas
                    </button>
                    <button
                        onClick={loadData}
                        className="px-4 py-2 text-violet-600 border border-violet-200 rounded-lg hover:bg-violet-50"
                    >
                        🔄 Actualizar
                    </button>
                </div>
            </div>

            {/* Inline Stages Configuration */}
            {showStagesConfig && (
                <div className="bg-white rounded-xl border border-violet-200 p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold text-gray-900">Personalizar Etapas de este Proceso</h3>
                            <p className="text-sm text-gray-500">
                                {usingCustomStages
                                    ? 'Usando etapas personalizadas para esta vacante'
                                    : 'Usando etapas por defecto del holding'}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            {usingCustomStages && (
                                <button
                                    onClick={resetToDefault}
                                    disabled={savingStages}
                                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                                >
                                    ↩️ Restaurar Default
                                </button>
                            )}
                            <button
                                onClick={() => setShowStagesConfig(false)}
                                className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>

                    {/* Quick Stage Editor */}
                    <div className="flex gap-2 flex-wrap">
                        {stages.filter(s => s.id !== 'rejected').map((stage, idx) => (
                            <div
                                key={stage.id}
                                className={`${stage.color} px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2`}
                            >
                                <span>{stage.orden}. {stage.nombre}</span>
                            </div>
                        ))}
                        <span className="bg-red-100 px-3 py-2 rounded-lg text-sm font-medium">
                            99. Rechazados
                        </span>
                    </div>

                    <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-800">
                        💡 Para modificar etapas en detalle, ve a <strong>🗂️ Etapas Funnel</strong> en el menú principal.
                        Luego regresa aquí y los cambios se aplicarán a esta vacante.
                    </div>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-6 gap-4">
                {stages.filter(s => s.id !== 'rejected').map(stage => {
                    const count = getApplicationsByStage(stage.id).length;
                    return (
                        <div key={stage.id} className={`${stage.color} rounded-lg p-4 text-center`}>
                            <div className="text-2xl font-bold text-gray-900">{count}</div>
                            <div className="text-sm text-gray-600">{stage.nombre}</div>
                        </div>
                    );
                })}
            </div>

            {/* Kanban Board */}
            <div className="flex gap-4 overflow-x-auto pb-4">
                {stages.map(stage => (
                    <div
                        key={stage.id}
                        className={`flex-shrink-0 w-72 ${stage.color} rounded-xl p-4`}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-gray-900">{stage.nombre}</h3>
                            <span className="px-2 py-1 bg-white rounded-full text-sm font-medium">
                                {getApplicationsByStage(stage.id).length}
                            </span>
                        </div>

                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {getApplicationsByStage(stage.id).map(app => (
                                <div
                                    key={app.id}
                                    className="bg-white rounded-lg p-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                                    onClick={() => openCandidateDetail(app)}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-900">{app.nombre}</p>
                                            <p className="text-sm text-gray-500">{app.email}</p>
                                        </div>
                                        {app.matchScore !== null && app.matchScore !== undefined && (
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${getMatchScoreColor(app.matchScore)}`}>
                                                {app.matchScore}%
                                            </span>
                                        )}
                                    </div>

                                    {!app.killerQuestionsPassed && (
                                        <div className="mt-2 text-xs text-red-600 bg-red-50 rounded px-2 py-1">
                                            ⚠️ Falló preguntas filtro
                                        </div>
                                    )}

                                    {app.cvFileName && (
                                        <div className="mt-2 text-xs text-gray-500">
                                            📎 {app.cvFileName}
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between mt-2 text-xs">
                                        <span className="text-gray-400">
                                            {new Date(app.createdAt.seconds * 1000).toLocaleDateString()}
                                        </span>
                                        <span className={`font-medium ${getDaysColor(getDaysInStage(app))}`}>
                                            ⏱️ {getDaysInStage(app)}d
                                        </span>
                                    </div>
                                </div>
                            ))}

                            {getApplicationsByStage(stage.id).length === 0 && (
                                <div className="text-center text-gray-400 py-8 text-sm">
                                    No hay candidatos
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Candidate Detail Modal */}
            {showCandidateModal && selectedCandidate && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="bg-violet-600 px-6 py-4 text-white">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold">{selectedCandidate.nombre}</h3>
                                    <p className="text-violet-200 text-sm">{selectedCandidate.email}</p>
                                </div>
                                <button
                                    onClick={() => setShowCandidateModal(false)}
                                    className="text-white/70 hover:text-white text-2xl"
                                >
                                    ×
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {/* Match Score */}
                            {selectedCandidate.matchScore !== null && selectedCandidate.matchScore !== undefined && (
                                <div className="text-center">
                                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${getMatchScoreColor(selectedCandidate.matchScore)}`}>
                                        <span className="text-2xl font-bold">{selectedCandidate.matchScore}%</span>
                                        <span>Match</span>
                                    </div>
                                </div>
                            )}

                            {/* Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 rounded-lg p-3">
                                    <p className="text-xs text-gray-500">Teléfono</p>
                                    <p className="font-medium">{selectedCandidate.telefono || 'No proporcionado'}</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-3">
                                    <p className="text-xs text-gray-500">CV</p>
                                    {selectedCandidate.cvUrl ? (
                                        <a
                                            href={selectedCandidate.cvUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-violet-600 hover:text-violet-800 font-medium underline"
                                        >
                                            📄 {selectedCandidate.cvFileName || 'Descargar CV'}
                                        </a>
                                    ) : (
                                        <p className="font-medium text-gray-400">{selectedCandidate.cvFileName || 'No adjuntó'}</p>
                                    )}
                                </div>
                            </div>

                            {/* KQ Status */}
                            <div className={`p-3 rounded-lg ${selectedCandidate.killerQuestionsPassed ? 'bg-green-50' : 'bg-red-50'}`}>
                                <p className={`font-medium ${selectedCandidate.killerQuestionsPassed ? 'text-green-700' : 'text-red-700'}`}>
                                    {selectedCandidate.killerQuestionsPassed
                                        ? '✓ Pasó preguntas filtro'
                                        : '✗ Falló preguntas filtro'}
                                </p>
                                {selectedCandidate.failedKillerQuestions && selectedCandidate.failedKillerQuestions.length > 0 && (
                                    <ul className="mt-2 text-sm text-red-600">
                                        {selectedCandidate.failedKillerQuestions.map((q, i) => (
                                            <li key={i}>• {q}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            {/* AI Analysis Details */}
                            {selectedCandidate.aiAnalysis && (
                                <div className="space-y-4 border-t border-gray-100 pt-4">
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-900 border-l-4 border-violet-500 pl-2 mb-2">Resumen AI</h4>
                                        <p className="text-sm text-gray-700 bg-violet-50 p-3 rounded-lg italic">
                                            "{selectedCandidate.aiAnalysis.resumenEjecutivo}"
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-green-50 p-3 rounded-lg">
                                            <h5 className="text-xs font-bold text-green-700 mb-2">💪 Puntos Fuertes</h5>
                                            <ul className="text-xs text-green-800 space-y-1">
                                                {selectedCandidate.aiAnalysis.puntosFuertes.map((p, i) => (
                                                    <li key={i}>• {p}</li>
                                                ))}
                                            </ul>
                                        </div>
                                        <div className="bg-orange-50 p-3 rounded-lg">
                                            <h5 className="text-xs font-bold text-orange-700 mb-2">⚠️ Puntos Débiles</h5>
                                            <ul className="text-xs text-orange-800 space-y-1">
                                                {selectedCandidate.aiAnalysis.puntosDebiles.map((p, i) => (
                                                    <li key={i}>• {p}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 p-3 rounded-lg">
                                        <h4 className="text-xs font-bold text-gray-700 mb-2">💡 Recomendación</h4>
                                        <p className="text-sm font-semibold text-gray-900">{selectedCandidate.aiAnalysis.recomendacion}</p>
                                    </div>
                                </div>
                            )}

                            {/* Move to stage */}
                            <div>
                                <p className="text-sm font-medium text-gray-700 mb-2">Mover a etapa:</p>
                                <div className="flex flex-wrap gap-2">
                                    {stages.map(stage => (
                                        <button
                                            key={stage.id}
                                            onClick={() => {
                                                moveCandidate(selectedCandidate.id, stage.id);
                                                setShowCandidateModal(false);
                                            }}
                                            disabled={processing || selectedCandidate.funnelStage === stage.id}
                                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedCandidate.funnelStage === stage.id
                                                ? 'bg-violet-600 text-white'
                                                : `${stage.color} text-gray-700 hover:opacity-80`
                                                } disabled:opacity-50`}
                                        >
                                            {stage.nombre}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="border-t border-gray-200 px-6 py-4">
                            <button
                                onClick={() => setShowCandidateModal(false)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
