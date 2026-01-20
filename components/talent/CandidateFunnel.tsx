'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import {
    collection, query, where, getDocs, getDoc, updateDoc, doc, Timestamp
} from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import ScheduleInterviewModal from './ScheduleInterviewModal';
import InviteCandidateModal from './InviteCandidateModal';
import { notifyStageChange } from '@/lib/notifications/notification-service';

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
    currentStage?: string;
    matchScore?: number;
    autoRejected?: boolean;
    autoRejectionReason?: string;
    funnelStage: string;
    stageHistory?: StageTransition[];
    currentStageEnteredAt?: any;
    createdAt: any;
    aiAnalysis?: {
        matchScore: number;
        summary_rationale: string;
        puntosFuertes: string[];
        puntosDebiles: string[];
        recomendacion: string;
        skill_breakdown?: {
            technical?: {
                score: number;
                matched: string[];
                missing: string[];
            };
            experience?: {
                score: number;
                years_found: number;
                relevant_roles: string[];
            };
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
    salarioMin?: number;
    salarioMax?: number;
}

// Default funnel stages - Pipeline v2.0
const DEFAULT_STAGES: FunnelStage[] = [
    { id: 'applied', nombre: 'Postulantes', color: 'bg-gray-100', orden: 1 },
    { id: 'screening', nombre: 'Screening', color: 'bg-blue-100', orden: 2 },
    { id: 'longlist', nombre: 'Long List', color: 'bg-indigo-100', orden: 3 },
    { id: 'interview_selection', nombre: 'Entrevista Selección', color: 'bg-yellow-100', orden: 4 },
    { id: 'interview_hm', nombre: 'Entrevista HM', color: 'bg-orange-100', orden: 5 },
    { id: 'offer', nombre: 'Carta Oferta', color: 'bg-teal-100', orden: 6 },
    { id: 'hired', nombre: 'Contratado', color: 'bg-green-100', orden: 7 },
    { id: 'onboarding', nombre: 'Onboarding', color: 'bg-emerald-100', orden: 8 },
    { id: 'rejected', nombre: 'Rechazados', color: 'bg-red-100', orden: 99 },
];

export default function CandidateFunnel({ jobId, jobTitulo, holdingId, salarioMin, salarioMax }: CandidateFunnelProps) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [applications, setApplications] = useState<Application[]>([]);
    const [stages, setStages] = useState<FunnelStage[]>(DEFAULT_STAGES);
    const [selectedCandidate, setSelectedCandidate] = useState<Application | null>(null);
    const [showCandidateModal, setShowCandidateModal] = useState(false);
    const [showInterviewModal, setShowInterviewModal] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [showStagesConfig, setShowStagesConfig] = useState(false);
    const [usingCustomStages, setUsingCustomStages] = useState(false);
    const [savingStages, setSavingStages] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);

    // Multi-select state
    const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set());
    const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);

    // Hire confirmation state
    const [showHireConfirmModal, setShowHireConfirmModal] = useState(false);
    const [pendingHireCandidate, setPendingHireCandidate] = useState<Application | null>(null);
    const [sendOnboardingEmail, setSendOnboardingEmail] = useState(true);

    // Stage filters state
    const [matchFilter, setMatchFilter] = useState<string>('all'); // 'all', '80+', '60-80', '40-60', '0-40'
    const [salaryFromFilter, setSalaryFromFilter] = useState<number | null>(null);
    const [salaryToFilter, setSalaryToFilter] = useState<number | null>(null);

    // Check if candidate salary is outside job range
    function isSalaryOutOfRange(candidateSalary: number | undefined): boolean {
        if (!candidateSalary) return false;
        if (!salarioMin && !salarioMax) return false;
        if (salarioMin && candidateSalary < salarioMin) return true;
        if (salarioMax && candidateSalary > salarioMax) return true;
        return false;
    }

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

    // Migration map: old stage ID -> new stage ID (for backwards compatibility)
    const stageIdMigration: Record<string, string> = {
        'interview': 'interview_selection',  // Old 'Entrevista' → new 'Entrevista Selección'
        'Postulados': 'applied',
        'postulados': 'applied',
    };

    function normalizeStageId(rawStageId: string | undefined): string {
        if (!rawStageId) return 'applied';
        const normalized = stageIdMigration[rawStageId] || rawStageId;
        return normalized;
    }

    function getApplicationsByStage(stageId: string) {
        return applications.filter(a => {
            const normalizedStage = normalizeStageId(a.funnelStage || a.currentStage);
            if (normalizedStage !== stageId) return false;

            // Apply match filter
            const matchScore = a.matchScore || 0;
            if (matchFilter === '80+' && matchScore < 80) return false;
            if (matchFilter === '60-80' && (matchScore < 60 || matchScore >= 80)) return false;
            if (matchFilter === '40-60' && (matchScore < 40 || matchScore >= 60)) return false;
            if (matchFilter === '0-40' && matchScore >= 40) return false;

            // Apply salary filter (custom range)
            const candidateSalary = (a as any).salaryExpectation;
            if (candidateSalary) {
                if (salaryFromFilter && candidateSalary < salaryFromFilter) return false;
                if (salaryToFilter && candidateSalary > salaryToFilter) return false;
            }

            return true;
        });
    }

    async function moveCandidate(candidateId: string, newStage: string) {
        setProcessing(true);
        try {
            const { arrayUnion } = await import('firebase/firestore');
            const newStageName = stages.find(s => s.id === newStage)?.nombre || newStage;

            // Find the candidate being moved
            const candidate = applications.find(a => a.id === candidateId);

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

            // Send welcome email if candidate is hired
            if (newStage === 'hired' && candidate) {
                try {
                    const holdingDoc = await getDoc(doc(db, 'holdings', holdingId));
                    const companyName = holdingDoc.exists() ? holdingDoc.data().nombre : 'La empresa';

                    await fetch('/api/talent/send-welcome-email', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            candidateName: candidate.nombre,
                            candidateEmail: candidate.email,
                            jobTitle: jobTitulo,
                            companyName,
                            holdingId
                        })
                    });
                    console.log('Welcome email sent to:', candidate.email);
                } catch (emailError) {
                    console.error('Failed to send welcome email:', emailError);
                }
            }

            // Send rejection email if candidate is rejected
            if (newStage === 'rejected' && candidate) {
                try {
                    // Get holding info for company name
                    const holdingDoc = await getDoc(doc(db, 'holdings', holdingId));
                    const companyName = holdingDoc.exists() ? holdingDoc.data().nombre : 'La empresa';

                    await fetch('/api/talent/send-rejection-email', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            candidateName: candidate.nombre,
                            candidateEmail: candidate.email,
                            jobTitle: jobTitulo,
                            companyName
                        })
                    });
                    console.log('Rejection email sent to:', candidate.email);
                } catch (emailError) {
                    console.error('Failed to send rejection email:', emailError);
                }
            }

            // Internal notification for stage change
            if (candidate && user?.email) {
                notifyStageChange(
                    holdingId,
                    user.email, // Recruiter
                    candidate.nombre,
                    jobTitulo,
                    newStageName,
                    jobId,
                    candidateId
                ).catch(err => console.error('Notification error:', err));
            }

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

    // Multi-select functions
    function toggleCandidateSelection(candidateId: string, e: React.MouseEvent) {
        e.stopPropagation();
        setSelectedCandidates(prev => {
            const newSet = new Set(prev);
            if (newSet.has(candidateId)) {
                newSet.delete(candidateId);
            } else {
                newSet.add(candidateId);
            }
            // Enable multi-select mode if any candidates selected
            setIsMultiSelectMode(newSet.size > 0);
            return newSet;
        });
    }

    function clearSelection() {
        setSelectedCandidates(new Set());
        setIsMultiSelectMode(false);
    }

    async function moveMultipleCandidates(newStage: string) {
        if (selectedCandidates.size === 0) return;

        setProcessing(true);
        try {
            const candidateIds = Array.from(selectedCandidates);

            for (const candidateId of candidateIds) {
                const appRef = doc(db, 'talent_applications', candidateId);
                const app = applications.find(a => a.id === candidateId);

                if (app) {
                    // Build stage history
                    const newTransition: StageTransition = {
                        stageId: newStage,
                        stageName: stages.find(s => s.id === newStage)?.nombre || newStage,
                        enteredAt: Timestamp.now()
                    };

                    await updateDoc(appRef, {
                        currentStage: newStage,
                        currentStageEnteredAt: Timestamp.now(),
                        stageHistory: [...(app.stageHistory || []), newTransition]
                    });
                }
            }

            clearSelection();
            loadData();
            alert(`✅ ${candidateIds.length} candidatos movidos a ${stages.find(s => s.id === newStage)?.nombre}`);
        } catch (error) {
            console.error('Error moving candidates:', error);
            alert('Error al mover candidatos');
        } finally {
            setProcessing(false);
        }
    }

    // Hire confirmation functions
    function initiateHire(candidate: Application) {
        setPendingHireCandidate(candidate);
        setSendOnboardingEmail(true);
        setShowHireConfirmModal(true);
    }

    async function confirmHire() {
        if (!pendingHireCandidate) return;

        setProcessing(true);
        try {
            const { arrayUnion } = await import('firebase/firestore');
            const candidateId = pendingHireCandidate.id;

            const stageTransition: StageTransition = {
                stageId: 'hired',
                stageName: 'Contratado',
                enteredAt: Timestamp.now()
            };

            await updateDoc(doc(db, 'talent_applications', candidateId), {
                funnelStage: 'hired',
                status: 'hired',
                currentStageEnteredAt: Timestamp.now(),
                stageHistory: arrayUnion(stageTransition),
                updatedAt: Timestamp.now(),
                hiredAt: Timestamp.now(),
                onboardingEmailSent: sendOnboardingEmail
            });

            // TODO: If sendOnboardingEmail is true, trigger email with onboarding form link
            if (sendOnboardingEmail) {
                console.log(`[Onboarding] Would send email to ${pendingHireCandidate.email}`);
                // Future: Call API to send onboarding form email
            }

            loadData();
            setShowHireConfirmModal(false);
            setPendingHireCandidate(null);
            alert(`✅ ${pendingHireCandidate.nombre} ha sido contratado${sendOnboardingEmail ? ' y se enviará el formulario de onboarding' : ''}`);
        } catch (error) {
            console.error('Error confirming hire:', error);
            alert('Error al confirmar contratación');
        } finally {
            setProcessing(false);
        }
    }

    // Request CUL from selected candidates
    async function requestCUL() {
        if (selectedCandidates.size === 0) {
            alert('Selecciona al menos un candidato');
            return;
        }

        setProcessing(true);
        try {
            const response = await fetch('/api/talent/request-cul', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    applicationIds: Array.from(selectedCandidates),
                    holdingId
                })
            });

            if (response.ok) {
                const { results } = await response.json();
                const successCount = results.filter((r: any) => r.success).length;
                alert(`📋 Se envió solicitud de CUL a ${successCount} candidato(s)`);
                setSelectedCandidates(new Set());
                loadData();
            } else {
                alert('Error al solicitar CUL');
            }
        } catch (error) {
            console.error('Error requesting CUL:', error);
            alert('Error al solicitar CUL');
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
        <>
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
                        {selectedCandidates.size > 0 && (
                            <button
                                onClick={requestCUL}
                                disabled={processing}
                                className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 flex items-center gap-2"
                            >
                                📋 Solicitar CUL ({selectedCandidates.size})
                            </button>
                        )}
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

                {/* Stats - Responsive grid with auto-fit */}
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2">
                    {stages.filter(s => s.id !== 'rejected').map(stage => {
                        const count = getApplicationsByStage(stage.id).length;
                        return (
                            <div
                                key={stage.id}
                                className={`${stage.color} rounded-xl p-4 text-center min-w-[120px] flex-shrink-0 border border-white/50 shadow-sm`}
                            >
                                <div className="text-3xl font-bold text-gray-900">{count}</div>
                                <div className="text-sm text-gray-700 font-medium mt-1">{stage.nombre}</div>
                            </div>
                        );
                    })}
                </div>

                {/* Stage Filters */}
                <div className="flex flex-wrap gap-4 mb-4 items-center bg-white p-3 rounded-lg border border-gray-200">
                    <span className="text-sm font-medium text-gray-700">Filtros:</span>
                    <select
                        value={matchFilter}
                        onChange={(e) => setMatchFilter(e.target.value)}
                        className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-violet-500"
                    >
                        <option value="all">Match: Todos</option>
                        <option value="80+">Match: 80%+</option>
                        <option value="60-80">Match: 60-80%</option>
                        <option value="40-60">Match: 40-60%</option>
                        <option value="0-40">Match: &lt;40%</option>
                    </select>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">Salario:</span>
                        <input
                            type="number"
                            placeholder="Desde"
                            value={salaryFromFilter || ''}
                            onChange={(e) => setSalaryFromFilter(e.target.value ? parseInt(e.target.value) : null)}
                            className="w-24 text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-violet-500"
                        />
                        <span className="text-gray-400">-</span>
                        <input
                            type="number"
                            placeholder="Hasta"
                            value={salaryToFilter || ''}
                            onChange={(e) => setSalaryToFilter(e.target.value ? parseInt(e.target.value) : null)}
                            className="w-24 text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-violet-500"
                        />
                    </div>
                    {(matchFilter !== 'all' || salaryFromFilter !== null || salaryToFilter !== null) && (
                        <button
                            onClick={() => { setMatchFilter('all'); setSalaryFromFilter(null); setSalaryToFilter(null); }}
                            className="text-sm text-violet-600 hover:text-violet-800"
                        >
                            ✕ Limpiar filtros
                        </button>
                    )}
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
                                        className={`bg-white rounded-lg p-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow ${selectedCandidates.has(app.id) ? 'ring-2 ring-violet-500' : ''}`}
                                        onClick={() => openCandidateDetail(app)}
                                    >
                                        <div className="flex items-start gap-2">
                                            {/* Multi-select checkbox */}
                                            <input
                                                type="checkbox"
                                                checked={selectedCandidates.has(app.id)}
                                                onChange={(e) => toggleCandidateSelection(app.id, e as any)}
                                                onClick={(e) => e.stopPropagation()}
                                                className="mt-1 w-4 h-4 text-violet-600 rounded border-gray-300 focus:ring-violet-500"
                                            />
                                            <div className="flex-1">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <p className="font-medium text-gray-900">{app.nombre}</p>
                                                        <p className="text-sm text-gray-500">{app.email}</p>
                                                    </div>
                                                    {app.matchScore !== null && app.matchScore !== undefined && (
                                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${getMatchScoreColor(app.matchScore)}`}>
                                                            {app.matchScore}%
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Salary Expectations */}
                                                {(app as any).salaryExpectation && (
                                                    <p className={`text-sm font-medium mt-0.5 ${isSalaryOutOfRange((app as any).salaryExpectation)
                                                        ? 'text-red-600'
                                                        : 'text-emerald-600'
                                                        }`}>
                                                        S/ {((app as any).salaryExpectation).toLocaleString()}
                                                        {(app as any).salaryNegotiable && <span className="text-gray-500 font-normal"> (Negociable)</span>}
                                                        {isSalaryOutOfRange((app as any).salaryExpectation) && !((app as any).salaryNegotiable) && (
                                                            <span className="text-red-500 text-xs ml-1">⚠️</span>
                                                        )}
                                                    </p>
                                                )}

                                                {/* WhatsApp Link */}
                                                {app.telefono && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const phone = app.telefono?.replace(/\D/g, '');
                                                            window.open(`https://wa.me/51${phone}?text=Hola ${encodeURIComponent(app.nombre)}`, '_blank');
                                                        }}
                                                        className="mt-1 text-xs text-green-600 hover:text-green-700 flex items-center gap-1"
                                                    >
                                                        💬 WhatsApp
                                                    </button>
                                                )}

                                                {/* Auto-rejected badge */}
                                                {app.autoRejected && (
                                                    <div className="mt-1 text-xs text-red-600 bg-red-50 rounded px-2 py-1">
                                                        🤖 Auto-rechazado por IA
                                                    </div>
                                                )}

                                                {/* CV Button */}
                                                {app.cvUrl && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); window.open(app.cvUrl, '_blank'); }}
                                                        className="mt-2 text-xs text-violet-600 hover:text-violet-800 flex items-center gap-1"
                                                    >
                                                        📄 Ver CV
                                                    </button>
                                                )}
                                            </div>
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
                                                "{selectedCandidate.aiAnalysis.summary_rationale}"
                                            </p>
                                        </div>

                                        {/* Skill Breakdown */}
                                        {selectedCandidate.aiAnalysis.skill_breakdown && (
                                            <div className="space-y-3">
                                                {selectedCandidate.aiAnalysis.skill_breakdown.technical && (
                                                    <div className="bg-gray-50 p-3 rounded-lg">
                                                        <div className="flex justify-between items-center mb-2">
                                                            <h5 className="text-xs font-bold text-gray-700 uppercase">Habilidades Técnicas</h5>
                                                            <span className="text-xs font-bold text-violet-600">{selectedCandidate.aiAnalysis.skill_breakdown.technical.score}%</span>
                                                        </div>
                                                        <div className="flex flex-wrap gap-1">
                                                            {selectedCandidate.aiAnalysis.skill_breakdown.technical.matched.map((s, i) => (
                                                                <span key={i} className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-medium">✓ {s}</span>
                                                            ))}
                                                            {selectedCandidate.aiAnalysis.skill_breakdown.technical.missing.map((s, i) => (
                                                                <span key={i} className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-medium">✗ {s}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {selectedCandidate.aiAnalysis.skill_breakdown.experience && (
                                                    <div className="bg-gray-50 p-3 rounded-lg">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <h5 className="text-xs font-bold text-gray-700 uppercase">Experiencia</h5>
                                                            <span className="text-xs font-bold text-blue-600">{selectedCandidate.aiAnalysis.skill_breakdown.experience.score}%</span>
                                                        </div>
                                                        <p className="text-xs text-gray-600 mb-2">
                                                            Detectados: <span className="font-bold">{selectedCandidate.aiAnalysis.skill_breakdown.experience.years_found} años</span> relevantes.
                                                        </p>
                                                        <div className="flex flex-wrap gap-1">
                                                            {selectedCandidate.aiAnalysis.skill_breakdown.experience.relevant_roles.map((r, i) => (
                                                                <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded text-[10px]">{r}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-green-50 p-3 rounded-lg">
                                                <h5 className="text-xs font-bold text-green-700 mb-2">💪 Puntos Fuertes</h5>
                                                <ul className="text-xs text-green-800 space-y-1">
                                                    {(selectedCandidate.aiAnalysis.puntosFuertes || []).map((p, i) => (
                                                        <li key={i}>• {p}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <div className="bg-orange-50 p-3 rounded-lg">
                                                <h5 className="text-xs font-bold text-orange-700 mb-2">⚠️ Puntos Débiles</h5>
                                                <ul className="text-xs text-orange-800 space-y-1">
                                                    {(selectedCandidate.aiAnalysis.puntosDebiles || []).map((p, i) => (
                                                        <li key={i}>• {p}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>

                                        <div className="bg-gray-50 p-3 rounded-lg">
                                            <h4 className="text-xs font-bold text-gray-700 mb-1">💡 Recomendación</h4>
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
                                                    // Intercept 'hired' to show confirmation popup
                                                    if (stage.id === 'hired') {
                                                        initiateHire(selectedCandidate);
                                                        setShowCandidateModal(false);
                                                    } else {
                                                        moveCandidate(selectedCandidate.id, stage.id);
                                                        setShowCandidateModal(false);
                                                    }
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
                            <div className="border-t border-gray-200 px-6 py-4 flex gap-3">
                                <button
                                    onClick={() => {
                                        setShowInterviewModal(true);
                                    }}
                                    className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 flex items-center justify-center gap-2"
                                >
                                    📅 Agendar Entrevista
                                </button>
                                <button
                                    onClick={() => setShowCandidateModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Schedule Interview Modal */}
            {selectedCandidate && (
                <ScheduleInterviewModal
                    show={showInterviewModal}
                    candidateId={selectedCandidate.id}
                    candidateName={selectedCandidate.nombre}
                    candidateEmail={selectedCandidate.email}
                    jobId={jobId}
                    jobTitle={jobTitulo}
                    holdingId={holdingId}
                    userId={user?.uid || ''}
                    userEmail={user?.email || ''}
                    onClose={() => setShowInterviewModal(false)}
                    onScheduled={() => {
                        loadData();
                        setShowInterviewModal(false);
                    }}
                />
            )}

            <InviteCandidateModal
                show={showInviteModal}
                jobId={jobId}
                jobTitle={jobTitulo}
                holdingId={holdingId}
                onClose={() => setShowInviteModal(false)}
                onInvited={loadData}
            />

            {/* Floating Batch Action Bar */}
            {selectedCandidates.size > 0 && (
                <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white rounded-2xl shadow-2xl border border-gray-200 px-6 py-4 flex items-center gap-4 z-50 animate-in slide-in-from-bottom-4">
                    <div className="flex items-center gap-2">
                        <span className="bg-violet-100 text-violet-700 font-bold px-3 py-1 rounded-full">
                            {selectedCandidates.size}
                        </span>
                        <span className="text-gray-700 font-medium">candidatos seleccionados</span>
                    </div>

                    <div className="h-6 w-px bg-gray-200" />

                    <div className="flex items-center gap-2">
                        <select
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 outline-none"
                            onChange={(e) => {
                                if (e.target.value) {
                                    moveMultipleCandidates(e.target.value);
                                    e.target.value = '';
                                }
                            }}
                            disabled={processing}
                        >
                            <option value="">Mover a...</option>
                            {stages.filter(s => s.id !== 'rejected').map(stage => (
                                <option key={stage.id} value={stage.id}>
                                    {stage.nombre}
                                </option>
                            ))}
                        </select>

                        <button
                            onClick={() => moveMultipleCandidates('rejected')}
                            disabled={processing}
                            className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium disabled:opacity-50"
                        >
                            ❌ Rechazar
                        </button>
                    </div>

                    <button
                        onClick={clearSelection}
                        className="text-gray-500 hover:text-gray-700 text-sm"
                    >
                        Limpiar selección
                    </button>
                </div>
            )}

            {/* Hire Confirmation Modal */}
            {showHireConfirmModal && pendingHireCandidate && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
                        <div className="bg-green-600 px-6 py-4 text-white">
                            <h3 className="text-lg font-semibold">✅ Confirmar Contratación</h3>
                        </div>

                        <div className="p-6 space-y-4">
                            <p className="text-gray-700">
                                ¿Confirmas la contratación de <strong>{pendingHireCandidate.nombre}</strong>?
                            </p>

                            <div className="bg-gray-50 rounded-lg p-4">
                                <p className="text-sm text-gray-600">
                                    <strong>Email:</strong> {pendingHireCandidate.email}
                                </p>
                                {pendingHireCandidate.matchScore && (
                                    <p className="text-sm text-gray-600 mt-1">
                                        <strong>Match Score:</strong> {pendingHireCandidate.matchScore}%
                                    </p>
                                )}
                            </div>

                            <label className="flex items-center gap-3 p-3 bg-violet-50 rounded-lg cursor-pointer hover:bg-violet-100 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={sendOnboardingEmail}
                                    onChange={(e) => setSendOnboardingEmail(e.target.checked)}
                                    className="w-5 h-5 text-violet-600 rounded focus:ring-violet-500"
                                />
                                <div>
                                    <p className="font-medium text-gray-900">Enviar formulario de onboarding</p>
                                    <p className="text-sm text-gray-600">Se enviará un email con el formulario de datos adicionales</p>
                                </div>
                            </label>
                        </div>

                        <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setShowHireConfirmModal(false);
                                    setPendingHireCandidate(null);
                                }}
                                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                                disabled={processing}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmHire}
                                disabled={processing}
                                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {processing ? (
                                    <><span className="animate-spin">⏳</span> Procesando...</>
                                ) : (
                                    <>🎉 Confirmar Contratación</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
