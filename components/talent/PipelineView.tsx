'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import CandidateFunnel from './CandidateFunnel';
import AddCandidateModal from './AddCandidateModal';
import { Job } from './types';

// Default stages for the modal
const DEFAULT_STAGES = [
    { id: 'applied', nombre: 'Postulantes' },
    { id: 'screening', nombre: 'Screening' },
    { id: 'longlist', nombre: 'Long List' },
    { id: 'interview_selection', nombre: 'Entrevista Selección' },
    { id: 'interview_hm', nombre: 'Entrevista HM' },
    { id: 'offer', nombre: 'Carta Oferta' },
    { id: 'hired', nombre: 'Contratado' },
    { id: 'onboarding', nombre: 'Onboarding' },
];

interface PipelineViewProps {
    holdingId: string;
    preSelectedJobId?: string | null;
    onClearPreSelect?: () => void;
    initialJobs?: Job[];
    isSuperAdmin?: boolean; // If true, load all holdings' jobs
}

export default function PipelineView({ holdingId, preSelectedJobId, onClearPreSelect, initialJobs, isSuperAdmin }: PipelineViewProps) {
    const [jobs, setJobs] = useState<Job[]>(initialJobs || []);
    const [loading, setLoading] = useState(initialJobs ? false : true);
    const [error, setError] = useState<string | null>(null);
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    const [showAddCandidateModal, setShowAddCandidateModal] = useState(false);

    useEffect(() => {
        if (initialJobs && initialJobs.length > 0) {
            console.log('[PipelineView v6.0] Using initialJobs from parent:', initialJobs.length);

            // Accept all reasonable statuses including 'draft' (default for new jobs)
            const activeStatuses = ['published', 'active', 'recruiting', 'approved', 'publicado', 'abierto', 'open', 'hiring', 'draft'];

            const filtered = initialJobs.filter(j => {
                const s = (j.status || 'draft').toLowerCase();
                return activeStatuses.includes(s);
            });

            console.log(`[PipelineView] Showing ${filtered.length} jobs`);
            setJobs(filtered);
            setLoading(false);
        } else {
            loadPublishedJobs();
        }
    }, [holdingId, initialJobs]);

    useEffect(() => {
        if (preSelectedJobId && jobs.length > 0) {
            const job = jobs.find(j => j.id === preSelectedJobId);
            if (job) {
                console.log('🎯 Auto-selecting job:', job.titulo);
                setSelectedJob(job);
                // Clear the pre-selection in parent so it doesn't trigger again
                if (onClearPreSelect) onClearPreSelect();
            }
        }
    }, [preSelectedJobId, jobs, onClearPreSelect]);

    async function loadPublishedJobs() {
        setLoading(true);
        setError(null);
        console.log('[PipelineView v7.0] Loading jobs for holdingId:', holdingId, 'isSuperAdmin:', isSuperAdmin);
        try {
            const jobsRef = collection(db, 'talent_jobs');
            let allDocs: any[] = [];

            if (isSuperAdmin) {
                // SuperAdmin: Load ALL jobs from ALL holdings
                console.log('[PipelineView] SuperAdmin mode - loading ALL jobs');
                const snap = await getDocs(jobsRef);
                allDocs = snap.docs;
            } else {
                // Regular user: filter by holdingId
                const qHolding = query(jobsRef, where('holdingId', '==', holdingId));
                const qTenant = query(jobsRef, where('tenant_id', '==', holdingId));

                const [snapH, snapT] = await Promise.all([
                    getDocs(qHolding),
                    getDocs(qTenant)
                ]);

                allDocs = [...snapH.docs, ...snapT.docs];
            }

            // Remove duplicates by ID
            const uniqueDocs = Array.from(new Map(allDocs.map(d => [d.id, d])).values());

            let rawJobs = uniqueDocs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as any[];

            // Sort client-side
            rawJobs.sort((a, b) => {
                const dateA = a.createdAt?.seconds || 0;
                const dateB = b.createdAt?.seconds || 0;
                return dateB - dateA;
            });

            console.log('[PipelineView] Total raw jobs found:', rawJobs.length);

            // Include 'draft' which is the default status for new jobs
            const activeStatuses = ['published', 'active', 'recruiting', 'approved', 'publicado', 'abierto', 'open', 'hiring', 'draft'];
            const loadedJobs = rawJobs.filter(j => {
                const s = (j.status || 'draft').toLowerCase();
                return activeStatuses.includes(s);
            }) as Job[];

            console.log(`✅ Loaded ${loadedJobs.length} jobs (from ${rawJobs.length} total)`);
            setJobs(loadedJobs);
        } catch (err: any) {
            console.error('Error loading jobs:', err);
            setError('No se pudieron cargar los procesos.');
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600 mb-4" />
                <p className="text-sm text-gray-500">Cargando procesos...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
                <p className="text-red-700 font-medium">{error}</p>
                <button
                    onClick={loadPublishedJobs}
                    className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                    Reintentar
                </button>
            </div>
        );
    }

    if (selectedJob) {
        return (
            <div className="space-y-4">
                <button
                    onClick={() => setSelectedJob(null)}
                    className="flex items-center gap-2 text-sm text-violet-600 hover:text-violet-800 font-medium bg-violet-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                    ← Volver a todos los procesos
                </button>
                <CandidateFunnel
                    jobId={selectedJob.id}
                    jobTitulo={selectedJob.titulo}
                    holdingId={holdingId}
                    salarioMin={selectedJob.salarioMin}
                    salarioMax={selectedJob.salarioMax}
                />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Pipeline de Selección</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Gestiona tus procesos activos y el avance de los candidatos.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowAddCandidateModal(true)}
                        className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg font-medium hover:opacity-90 flex items-center gap-2"
                    >
                        ➕ Agregar Candidato
                    </button>
                    <button
                        onClick={loadPublishedJobs}
                        className="p-2 text-violet-600 hover:bg-violet-50 rounded-lg transition-colors text-xs font-medium border border-violet-100"
                    >
                        🔄 Recargar
                    </button>
                    <div className="bg-violet-100 text-violet-700 px-3 py-1 rounded-full text-sm font-bold">
                        {jobs.length} Procesos
                    </div>
                </div>
            </div>

            {jobs.length === 0 ? (
                <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
                    <div className="text-4xl mb-4">📋</div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">No hay procesos activos</h3>
                    <p className="text-gray-500 max-w-sm mx-auto">
                        Publica un requerimiento aprobado o crea una vacante manual para comenzar a recibir postulantes.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {jobs.map((job) => (
                        <div
                            key={job.id}
                            onClick={() => setSelectedJob(job)}
                            className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-violet-200 cursor-pointer transition-all overflow-hidden group"
                        >
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-2 bg-violet-50 rounded-xl group-hover:bg-violet-100 transition-colors">
                                        🎯
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                        {job.rqCodigo ? `RQ: ${job.rqCodigo}` : `ID: ${job.id.substring(0, 8)}`}
                                    </span>
                                </div>

                                <h3 className="text-lg font-bold text-gray-900 group-hover:text-violet-600 transition-colors mb-1">
                                    {job.titulo}
                                </h3>
                                <p className="text-sm text-gray-500 mb-4 flex items-center gap-1">
                                    <span>🏢</span> {job.gerenciaNombre || job.departamento || 'General'}
                                </p>

                                <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-50">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-gray-400">Vacantes</span>
                                        <span className="font-bold text-gray-900">{job.vacantes}</span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-xs text-violet-500 font-bold group-hover:underline">
                                            Ver Pipeline →
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Candidate Modal */}
            <AddCandidateModal
                isOpen={showAddCandidateModal}
                onClose={() => setShowAddCandidateModal(false)}
                holdingId={holdingId}
                jobs={jobs}
                stages={DEFAULT_STAGES}
                onCandidateAdded={() => {
                    loadPublishedJobs();
                    setShowAddCandidateModal(false);
                }}
            />
        </div>
    );
}
