'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc, updateDoc, doc, Timestamp } from 'firebase/firestore';
import CreateJobModal from '@/components/talent/CreateJobModal';
import CandidateList from '@/components/talent/CandidateList';
import OrgStructure from '@/components/talent/OrgStructure';
import CreateRQModal from '@/components/talent/CreateRQModal';
import TalentUsers from '@/components/talent/TalentUsers';
import ApprovalWorkflows from '@/components/talent/ApprovalWorkflows';
import ApprovalDashboard from '@/components/talent/ApprovalDashboard';
import PublishRQModal from '@/components/talent/PublishRQModal';
import FunnelStagesConfig from '@/components/talent/FunnelStagesConfig';
import TalentNotificationBell from '@/components/talent/TalentNotificationBell';
import CalendarSettings from '@/components/talent/CalendarSettings';
import CandidateFunnel from '@/components/talent/CandidateFunnel';
import TalentSecurity from '@/components/talent/TalentSecurity';
import PublishConfigView from '@/components/talent/PublishConfigView';
import EmailTemplatesConfig from '@/components/admin/EmailTemplatesConfig';
import PipelineView from '@/components/talent/PipelineView';
import NuevosColaboradoresTab from '@/components/talent/NuevosColaboradoresTab';
import CompensacionesTab from '@/components/talent/CompensacionesTab';
import { Job } from '@/components/talent/types';

/**
 * Liah Talent - Main Dashboard
 * Corporate Recruitment Platform
 */
export default function TalentDashboardPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600" />
            </div>
        }>
            <TalentDashboardContent />
        </Suspense>
    );
}

function TalentDashboardContent() {
    const { user, loading, claims, signOut } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const holdingId = claims?.holdingId || 'ngr';

    const [activeTab, setActiveTab] = useState('pipeline');

    // Handle initial state from URL search params
    useEffect(() => {
        const tabParam = searchParams.get('tab');
        const jobParam = searchParams.get('job');
        const rqParam = searchParams.get('rq');

        if (tabParam) setActiveTab(tabParam);
        if (jobParam) setSelectedJobIdForPipeline(jobParam);
        if (rqParam) setAutoOpenRQId(rqParam);
    }, [searchParams]);

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showRQModal, setShowRQModal] = useState(false);
    const [showPublishModal, setShowPublishModal] = useState(false);
    const [selectedRQForPublish, setSelectedRQForPublish] = useState<any>(null);
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loadingJobs, setLoadingJobs] = useState(true);
    const [selectedJobIdForPipeline, setSelectedJobIdForPipeline] = useState<string | null>(null);
    const [rqs, setRqs] = useState<any[]>([]);
    const [loadingRQs, setLoadingRQs] = useState(true);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [configTab, setConfigTab] = useState('estructura');
    const [aprobacionesTab, setAprobacionesTab] = useState('dashboard');
    const [autoOpenRQId, setAutoOpenRQId] = useState<string | null>(null);

    // Current logged-in talent user's profile (for gerencia filtering)
    const [currentTalentUser, setCurrentTalentUser] = useState<{
        nombre?: string;
        gerenciaId?: string;
        areaId?: string;
        puestoId?: string;
        capacidades?: string[];
    } | null>(null);

    // Analytics state
    const [analyticsData, setAnalyticsData] = useState<{
        totalApplicants: number;
        hiredCount: number;
        selectionRate: number;
        avgTimeToFill: number;
        byGerencia: { nombre: string; count: number }[];
    }>({ totalApplicants: 0, hiredCount: 0, selectionRate: 0, avgTimeToFill: 0, byGerencia: [] });

    // User's role and capabilities detection
    const rawCapacidades = (claims as any)?.capacidades;
    const userRole = (claims as any)?.role;
    const userCapacidades: string[] = (Array.isArray(rawCapacidades) && rawCapacidades.length > 0)
        ? rawCapacidades as string[]
        : [userRole].filter(Boolean) as string[];

    const isAdmin = userCapacidades.includes('admin') || ['admin', 'client_admin', 'super_admin'].includes(userRole);
    const canManageVacantes = ['admin', 'lider_reclutamiento', 'recruiter', 'client_admin', 'super_admin'].some(cap =>
        userCapacidades.includes(cap)
    ) || ['admin', 'client_admin', 'super_admin'].includes(userRole);

    const isCompensaciones = userRole === 'compensaciones' || isAdmin;

    // Debug logs for permissions
    useEffect(() => {
        if (claims) {
            console.log('🔐 Auth Claims:', {
                uid: user?.uid,
                email: user?.email,
                role: (claims as any).role,
                capacidades: (claims as any).capacidades,
                computedCapacidades: userCapacidades,
                isAdmin,
                canManageVacantes
            });
        }
    }, [claims, user, isAdmin, canManageVacantes]);


    useEffect(() => {
        if (user && holdingId) {
            loadJobs();
            loadRQs();
            loadAnalytics();
            loadCurrentTalentUser();
        }
    }, [user, holdingId]);

    // Default config tab if current one is not visible
    useEffect(() => {
        if (!isAdmin && (configTab === 'estructura' || configTab === 'usuarios' || configTab === 'etapas' || configTab === 'config')) {
            setConfigTab('security');
        }
    }, [isAdmin, configTab]);

    // Force requerimientos tab for non-recruiters if they are on pipeline
    useEffect(() => {
        if (!canManageVacantes && activeTab === 'pipeline') {
            setActiveTab('requerimientos');
        }
    }, [canManageVacantes, activeTab]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600" />
            </div>
        );
    }

    // Load current user's profile from talent_users to get gerenciaId for filtering
    async function loadCurrentTalentUser() {
        if (!user?.email) return;
        try {
            const talentRef = collection(db, 'talent_users');
            const q = query(talentRef, where('email', '==', user.email.toLowerCase()));
            const snap = await getDocs(q);
            if (!snap.empty) {
                const data = snap.docs[0].data();
                setCurrentTalentUser({
                    nombre: data.nombre || undefined,
                    gerenciaId: data.gerenciaId || undefined,
                    areaId: data.areaId || undefined,
                    puestoId: data.puestoId || undefined,
                    capacidades: data.capacidades || [data.rol]
                });
                console.log('✅ Loaded talent user:', data.nombre, 'gerenciaId:', data.gerenciaId);
                console.log('🔍 Debug Gerencia Data:', {
                    nombre: data.nombre,
                    gerenciaId: data.gerenciaId,
                    areaId: data.areaId,
                    rol: data.rol,
                    capacidades: data.capacidades
                });
            } else {
                console.warn('⚠️ No talent user found in Firestore for:', user.email);
            }
        } catch (e) {
            console.error('Error loading talent user:', e);
        }
    }

    async function loadAnalytics() {
        try {
            // Load applications
            const appsRef = collection(db, 'talent_applications');
            const q = query(appsRef, where('holdingId', '==', holdingId));
            const snapshot = await getDocs(q);

            const totalApplicants = snapshot.size;
            const hiredApps = snapshot.docs.filter(doc => {
                const data = doc.data();
                return data.currentStage === 'hired' || data.stage === 'hired';
            });
            const hiredCount = hiredApps.length;
            const selectionRate = totalApplicants > 0 ? Math.round((hiredCount / totalApplicants) * 100) : 0;

            // Calculate Time to Fill (days from application to hire)
            let avgTimeToFill = 0;
            if (hiredApps.length > 0) {
                const timesToFill = hiredApps.map(doc => {
                    const data = doc.data();
                    const createdAt = data.createdAt?.toDate?.() || new Date();
                    const hiredAt = data.hiredAt?.toDate?.() || data.updatedAt?.toDate?.() || new Date();
                    return Math.ceil((hiredAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
                }).filter(days => days > 0);

                if (timesToFill.length > 0) {
                    avgTimeToFill = Math.round(timesToFill.reduce((a, b) => a + b, 0) / timesToFill.length);
                }
            }

            // Group by Gerencia
            const gerenciaMap = new Map<string, number>();
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                const gerencia = data.gerenciaNombre || data.gerencia || 'Sin Gerencia';
                gerenciaMap.set(gerencia, (gerenciaMap.get(gerencia) || 0) + 1);
            });
            const byGerencia = Array.from(gerenciaMap.entries())
                .map(([nombre, count]) => ({ nombre, count }))
                .sort((a, b) => b.count - a.count);

            setAnalyticsData({ totalApplicants, hiredCount, selectionRate, avgTimeToFill, byGerencia });
        } catch (error) {
            console.error('Error loading analytics:', error);
        }
    }

    async function loadRQs() {
        setLoadingRQs(true);
        try {
            const rqsRef = collection(db, 'talent_rqs');
            const rqQuery = query(
                rqsRef,
                where('holdingId', '==', holdingId)
            );
            const rqSnap = await getDocs(rqQuery);
            const loadedRqs = rqSnap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as any[];

            // Sort client-side to avoid index issues
            loadedRqs.sort((a, b) => {
                const dateA = a.createdAt?.seconds || 0;
                const dateB = b.createdAt?.seconds || 0;
                return dateB - dateA;
            });

            setRqs(loadedRqs);
        } catch (error) {
            console.error('Error loading RQs:', error);
        } finally {
            setLoadingRQs(false);
        }
    }

    // Helper: deeply clean undefined values from objects/arrays
    function deepCleanUndefined(obj: any): any {
        if (obj === null || obj === undefined) return null;
        if (Array.isArray(obj)) {
            return obj.map(item => deepCleanUndefined(item)).filter(item => item !== undefined);
        }
        if (typeof obj === 'object' && obj.constructor === Object) {
            const cleaned: any = {};
            for (const [key, value] of Object.entries(obj)) {
                if (value !== undefined) {
                    cleaned[key] = deepCleanUndefined(value);
                }
            }
            return cleaned;
        }
        return obj;
    }

    async function handleSaveRQ(rqData: any) {
        try {
            // CRITICAL: Deeply remove all undefined values - Firebase doesn't accept them
            const cleanedData = deepCleanUndefined(rqData);

            console.log('📝 [TalentPage v2] Saving RQ with deep-cleaned data:', cleanedData);

            await addDoc(collection(db, 'talent_rqs'), cleanedData);
            await loadRQs();
            setShowRQModal(false);
            alert('✅ Requerimiento creado exitosamente');
        } catch (error) {
            console.error('Error saving RQ:', error);
            throw error;
        }
    }

    async function handleDeleteRQ(id: string) {
        if (!confirm('¿Estás seguro de eliminar este Requerimiento?')) return;
        try {
            await deleteDoc(doc(db, 'talent_rqs', id));
            await loadRQs();
            alert('✅ RQ eliminado');
        } catch (error) {
            console.error('Error deleting RQ:', error);
            alert('Error al eliminar RQ');
        }
    }

    const handleDeleteJob = async (id: string) => {
        if (confirm('¿Estás seguro de eliminar esta vacante?')) {
            try {
                await deleteDoc(doc(db, 'talent_jobs', id));
                loadJobs();
            } catch (e) {
                console.error(e);
            }
        }
    };

    const toggleJobStatus = async (job: any) => {
        const newStatus = job.status === 'active' ? 'inactive' : 'active';
        try {
            await updateDoc(doc(db, 'talent_jobs', job.id), {
                status: newStatus,
                updatedAt: Timestamp.now()
            });
            loadJobs();
        } catch (e) {
            console.error('Error toggling job status:', e);
            alert('Error al cambiar el estado de la vacante');
        }
    };

    async function loadJobs() {
        try {
            const jobsRef = collection(db, 'talent_jobs');
            const q = query(
                jobsRef,
                where('holdingId', '==', holdingId)
            );
            const snapshot = await getDocs(q);

            // Load application counts for each job
            const appsRef = collection(db, 'talent_applications');
            const appsSnap = await getDocs(query(appsRef, where('holdingId', '==', holdingId)));
            const countsMap = new Map<string, number>();
            appsSnap.docs.forEach(doc => {
                const data = doc.data();
                if (data.jobId) {
                    countsMap.set(data.jobId, (countsMap.get(data.jobId) || 0) + 1);
                }
            });

            const loadedJobs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                applicantCount: countsMap.get(doc.id) || 0
            })) as any[];

            // Sort client-side to avoid index issues
            loadedJobs.sort((a, b) => {
                const dateA = a.createdAt?.seconds || 0;
                const dateB = b.createdAt?.seconds || 0;
                return dateB - dateA;
            });

            setJobs(loadedJobs);
        } catch (error) {
            console.error('Error loading jobs:', error);
        } finally {
            setLoadingJobs(false);
        }
    }

    async function handleSaveJob(jobData: any) {
        console.log('[Talent] Saving job:', jobData);
        try {
            const jobsRef = collection(db, 'talent_jobs');
            const docRef = await addDoc(jobsRef, {
                ...jobData,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
                createdBy: user?.email
            });

            console.log('[Talent] Job created with ID:', docRef.id);
            alert('✅ Vacante creada exitosamente');
            setShowCreateModal(false);
            loadJobs();
        } catch (error: any) {
            console.error('[Talent] Error saving job:', error);
            console.error('[Talent] Error code:', error?.code);
            console.error('[Talent] Error message:', error?.message);
            alert(`Error guardando vacante: ${error?.message || 'Error desconocido'}`);
        }
    }

    const sidebarTabs = [
        { id: 'pipeline', label: 'Pipeline', icon: '🎯', visible: canManageVacantes },
        { id: 'requerimientos', label: 'Requerimientos', icon: '📝', visible: true },
        { id: 'vacantes', label: 'Vacantes', icon: '📋', visible: canManageVacantes },
        { id: 'colaboradores', label: 'Nuevos Colaboradores', icon: '🎉', visible: canManageVacantes },
        { id: 'compensaciones', label: 'Compensaciones', icon: '📑', visible: isCompensaciones },
        { id: 'analytics', label: 'Analytics', icon: '📊', visible: canManageVacantes },
    ];

    const visibleSidebarTabs = sidebarTabs.filter(t => t.visible);

    const configTabs = [
        { id: 'estructura', label: 'Organización', icon: '🏢', visible: isAdmin },
        { id: 'usuarios', label: 'Usuarios', icon: '👤', visible: isAdmin },
        { id: 'etapas', label: 'Funnel', icon: '🗂️', visible: isAdmin },
        { id: 'plantillas', label: 'Plantillas', icon: '📧', visible: userCapacidades.some(c => ['admin', 'lider_reclutamiento', 'recruiter'].includes(c)) },
        { id: 'calendars', label: 'Calendarios', icon: '📅', visible: true },
        { id: 'security', label: 'Seguridad', icon: '🔒', visible: true },
        { id: 'config', label: 'Flujos', icon: '⚙️', visible: isAdmin },
    ];

    const visibleConfigTabs = configTabs.filter(t => t.visible);


    const getStatusBadge = (status: string, rq?: any) => {
        const badges: Record<string, { bg: string; text: string; label: string }> = {
            draft: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Borrador' },
            pending_approval: { bg: 'bg-amber-100', text: 'text-amber-700', label: rq?.currentStep ? `Pendiente (Paso ${rq.currentStep})` : 'Pendiente' },
            approved: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Aprobado' },
            published: { bg: 'bg-green-100', text: 'text-green-700', label: 'Activa' },
            active: { bg: 'bg-green-100', text: 'text-green-700', label: 'Activa' },
            inactive: { bg: 'bg-rose-100', text: 'text-rose-700', label: 'Inactiva' },
            closed: { bg: 'bg-red-100', text: 'text-red-700', label: 'Cerrado' },
            rejected: { bg: 'bg-rose-100', text: 'text-rose-700', label: 'Rechazado' },
        };
        const badge = badges[status] || (status === 'published' ? badges.published : badges.draft);
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${badge.bg} ${badge.text}`}>
                {badge.label}
            </span>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            {canManageVacantes ? (
                                <Link href="/launcher">
                                    <img src="/logos/liah-logo.png" alt="Liah" className="h-10 cursor-pointer" />
                                </Link>
                            ) : (
                                <img src="/logos/liah-logo.png" alt="Liah" className="h-10" />
                            )}
                            <div className="h-6 w-px bg-gray-300" />
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">💼</span>
                                <span className="font-bold text-gray-900">Talent</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 relative">
                            {/* ... (bell code remains same) */}
                            <TalentNotificationBell
                                userEmail={user?.email || ''}
                                holdingId={holdingId}
                            />

                            <div className="h-6 w-px bg-gray-200" />

                            <button
                                onClick={async () => {
                                    console.log('--- DIAGNOSTIC PIPELINE ---');
                                    console.log('Current holdingId:', holdingId);
                                    try {
                                        const snap = await getDocs(collection(db, 'talent_jobs'));
                                        const all = snap.docs.map(d => ({ id: d.id, status: d.data().status, hId: d.data().holdingId, tId: d.data().tenant_id, title: d.data().titulo }));
                                        console.table(all);
                                        alert(`TOTAL JOBS IN DB: ${all.length}. check console for details.`);
                                    } catch (e) {
                                        console.error(e);
                                    }
                                }}
                                className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 text-xs"
                                title="Debug Data"
                            >
                                🔍
                            </button>

                            <button
                                onClick={() => setShowUserMenu(!showUserMenu)}
                                className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-100 transition-colors"
                            >
                                <div className="w-8 h-8 bg-violet-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                    {currentTalentUser?.nombre
                                        ? currentTalentUser.nombre.trim().split(/\s+/).map(n => n[0]).join('').substring(0, 2).toUpperCase()
                                        : user?.email?.substring(0, 2).toUpperCase()}
                                </div>
                                <span className="text-sm font-medium text-gray-700 hidden md:block">
                                    {currentTalentUser?.nombre || user?.email?.split('@')[0]}
                                </span>
                            </button>

                            {/* User Dropdown Menu */}
                            {showUserMenu && (
                                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="px-4 py-2 border-b border-gray-50 mb-1">
                                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Mi Cuenta</p>
                                        <p className="text-sm text-gray-900 truncate font-medium">{user?.email}</p>
                                    </div>

                                    <button
                                        onClick={() => {
                                            setActiveTab('settings');
                                            setShowUserMenu(false);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-violet-50 hover:text-violet-700 transition-colors"
                                    >
                                        <span>⚙️</span> Configuración
                                    </button>

                                    {canManageVacantes && (
                                        <button
                                            onClick={() => router.push('/launcher')}
                                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-violet-50 hover:text-violet-700 transition-colors"
                                        >
                                            <span>🔄</span> Cambiar Producto
                                        </button>
                                    )}

                                    <div className="h-px bg-gray-100 my-1" />

                                    <button
                                        onClick={async () => {
                                            await signOut();
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                    >
                                        <span>🚪</span> Cerrar Sesión
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex gap-1">
                        {visibleSidebarTabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-3 text-sm font-medium transition-all relative border-b-2 mt-1 ${activeTab === tab.id
                                    ? 'text-violet-600 border-violet-600'
                                    : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-200'
                                    }`}
                            >
                                <span className="flex items-center gap-2">
                                    <span>{tab.icon}</span>
                                    {tab.label}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-8">
                {activeTab === 'pipeline' && (
                    <PipelineView
                        holdingId={holdingId}
                        preSelectedJobId={selectedJobIdForPipeline}
                        onClearPreSelect={() => setSelectedJobIdForPipeline(null)}
                        initialJobs={jobs}
                        isSuperAdmin={isAdmin}
                    />
                )}

                {activeTab === 'requerimientos' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h1 className="text-2xl font-bold text-gray-900">Requerimientos</h1>
                            <div className="flex bg-gray-100 p-1 rounded-lg">
                                <button
                                    onClick={() => setAprobacionesTab('dashboard')}
                                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${aprobacionesTab === 'dashboard'
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    Dashboard
                                </button>
                                <button
                                    onClick={() => setAprobacionesTab('rqs')}
                                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${aprobacionesTab === 'rqs'
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    Lista de RQs
                                </button>
                            </div>
                        </div>

                        {aprobacionesTab === 'dashboard' ? (
                            <ApprovalDashboard
                                holdingId={holdingId}
                                userEmail={user?.email || ''}
                                userCapacidades={userCapacidades}
                                initialRQId={autoOpenRQId || undefined}
                                onRQOpened={() => setAutoOpenRQId(null)}
                            />
                        ) : (
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                                    <h3 className="font-bold text-gray-900">Historial de Requerimientos</h3>
                                    <button
                                        onClick={() => setShowRQModal(true)}
                                        className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors text-sm flex items-center gap-2"
                                    >
                                        <span>➕</span> Crear RQ
                                    </button>
                                </div>

                                {loadingRQs ? (
                                    <div className="p-12 text-center text-gray-500">Cargando RQs...</div>
                                ) : rqs.length === 0 ? (
                                    <div className="p-12 text-center text-gray-400">No hay RQs registrados.</div>
                                ) : (
                                    <table className="w-full">
                                        <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            <tr>
                                                <th className="px-6 py-3">Número</th>
                                                <th className="px-6 py-3">Puesto</th>
                                                <th className="px-6 py-3">Área</th>
                                                <th className="px-6 py-3">Aprobador Actual / Reclutador</th>
                                                <th className="px-6 py-3">Estado</th>
                                                <th className="px-6 py-3">Acción</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {rqs.map(rq => {
                                                const currentApprover = rq.resolvedApprovers?.find((a: any) => a.stepOrden === rq.currentStep && !a.skipped);
                                                const isAssignedToMe = rq.assignedRecruiterEmail?.toLowerCase() === user?.email?.toLowerCase();
                                                const canPublish = isAdmin || userCapacidades.includes('lider_reclutamiento') || isAssignedToMe;

                                                return (
                                                    <tr key={rq.id} className="hover:bg-gray-50">
                                                        <td className="px-6 py-4 font-medium text-gray-900">
                                                            {rq.codigo || `#${rq.id.substring(0, 6)}`}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm font-medium">{rq.puestoNombre}</td>
                                                        <td className="px-6 py-4 text-sm text-gray-600">{rq.areaNombre} ({rq.cantidad})</td>
                                                        <td className="px-6 py-4 text-sm">
                                                            {rq.status === 'pending_approval' ? (
                                                                <div>
                                                                    <p className="font-medium text-gray-900">
                                                                        {currentApprover?.nombre || 'Cargando...'}
                                                                    </p>
                                                                    <p className="text-xs text-gray-500">
                                                                        {currentApprover?.stepNombre}
                                                                    </p>
                                                                </div>
                                                            ) : rq.assignedRecruiterNombre ? (
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-6 h-6 bg-violet-100 rounded-full flex items-center justify-center text-[10px] font-bold text-violet-700">
                                                                        {rq.assignedRecruiterNombre.substring(0, 2).toUpperCase()}
                                                                    </div>
                                                                    <span className="font-medium text-gray-900">{rq.assignedRecruiterNombre}</span>
                                                                </div>
                                                            ) : rq.status === 'rejected' ? (
                                                                <span className="text-gray-400">-</span>
                                                            ) : (
                                                                <span className="text-gray-500 italic">Esperando asignación</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            {getStatusBadge(rq.status, rq)}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                {rq.status === 'approved' && !rq.published && (
                                                                    <>
                                                                        {(!rq.assignedRecruiterEmail && (userCapacidades.includes('lider_reclutamiento') || isAdmin)) ? (
                                                                            <button
                                                                                onClick={() => {
                                                                                    setAutoOpenRQId(rq.id);
                                                                                    setAprobacionesTab('dashboard');
                                                                                }}
                                                                                className="text-sm font-medium text-amber-600 hover:text-amber-800"
                                                                            >
                                                                                Asignar
                                                                            </button>
                                                                        ) : (
                                                                            <button
                                                                                onClick={() => {
                                                                                    if (!canPublish) {
                                                                                        alert('Solo el reclutador asignado puede publicar esta vacante.');
                                                                                        return;
                                                                                    }
                                                                                    setSelectedRQForPublish(rq);
                                                                                    setShowPublishModal(true);
                                                                                }}
                                                                                disabled={!canPublish}
                                                                                className={`text-sm font-medium ${canPublish ? 'text-violet-600 hover:text-violet-800' : 'text-gray-300 cursor-not-allowed'}`}
                                                                            >
                                                                                Publicar
                                                                            </button>
                                                                        )}
                                                                    </>
                                                                )}
                                                                {rq.published && (
                                                                    <div className="flex flex-col">
                                                                        <span className="text-green-600 text-sm font-medium">Publicado</span>
                                                                        <button
                                                                            onClick={() => {
                                                                                // Find the associated job ID
                                                                                const associatedJob = jobs.find(j => j.rqId === rq.id);
                                                                                if (associatedJob) {
                                                                                    setSelectedJobIdForPipeline(associatedJob.id);
                                                                                    setActiveTab('pipeline');
                                                                                } else {
                                                                                    // Fallback: just go to pipeline list
                                                                                    setActiveTab('pipeline');
                                                                                }
                                                                            }}
                                                                            className="text-xs text-violet-600 hover:text-violet-800 font-medium underline"
                                                                        >
                                                                            Ver Pipeline
                                                                        </button>
                                                                    </div>
                                                                )}
                                                                {isAdmin && (
                                                                    <button
                                                                        onClick={() => handleDeleteRQ(rq.id)}
                                                                        className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                                                                        title="Eliminar RQ"
                                                                    >
                                                                        🗑️
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'vacantes' && (
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <h1 className="text-2xl font-bold text-gray-900">Vacantes Publicadas</h1>
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors flex items-center gap-2"
                            >
                                <span>➕</span> Crear Vacante Manual
                            </button>
                        </div>

                        {loadingJobs ? (
                            <div className="p-12 text-center text-gray-500 bg-white rounded-xl border border-gray-100">Cargando vacantes...</div>
                        ) : jobs.length === 0 ? (
                            <div className="p-12 text-center text-gray-400 bg-white rounded-xl border border-gray-100 italic">No hay vacantes publicadas.</div>
                        ) : (
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        <tr>
                                            <th className="px-6 py-3">Título</th>
                                            <th className="px-6 py-3">Área</th>
                                            <th className="px-6 py-3">Link</th>
                                            <th className="px-6 py-3">Estado</th>
                                            <th className="px-6 py-3">Postulantes</th>
                                            <th className="px-6 py-3">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {jobs.map(job => (
                                            <tr key={job.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-gray-900">{job.titulo}</div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600">{job.departamento || '-'}</td>
                                                <td className="px-6 py-4">
                                                    <a
                                                        href={`/careers/${job.id}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                                    >
                                                        🔗 Ver Link
                                                    </a>
                                                </td>
                                                <td className="px-6 py-4">{getStatusBadge(job.status)}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600">{job.applicantCount || 0}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <button
                                                            onClick={() => toggleJobStatus(job)}
                                                            className={`p-1.5 rounded-lg transition-colors ${job.status === 'active'
                                                                ? 'text-amber-600 hover:bg-amber-50'
                                                                : 'text-emerald-600 hover:bg-emerald-50'}`}
                                                            title={job.status === 'active' ? 'Desactivar Vacante' : 'Activar Vacante'}
                                                        >
                                                            {job.status === 'active' ? '⏹️' : '▶️'}
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setSelectedJobIdForPipeline(job.id);
                                                                setActiveTab('pipeline');
                                                            }}
                                                            className="text-violet-600 hover:text-violet-800 text-sm font-medium"
                                                        >
                                                            Ver Pipeline
                                                        </button>
                                                        {isAdmin && (
                                                            <button
                                                                onClick={() => handleDeleteJob(job.id)}
                                                                className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                                                                title="Eliminar Vacante"
                                                            >
                                                                🗑️
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}



                {activeTab === 'colaboradores' && (
                    <NuevosColaboradoresTab holdingId={holdingId} />
                )}

                {activeTab === 'compensaciones' && (
                    <CompensacionesTab holdingId={holdingId} />
                )}

                {activeTab === 'analytics' && (
                    <div className="space-y-8">
                        <div className="flex items-center justify-between">
                            <h1 className="text-2xl font-bold text-gray-900">Métricas de Talento</h1>
                            <button
                                onClick={loadAnalytics}
                                className="px-4 py-2 text-violet-600 border border-violet-200 rounded-lg hover:bg-violet-50 text-sm"
                            >
                                🔄 Actualizar
                            </button>
                        </div>

                        {/* KPI Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                            {[
                                { label: 'RQs Pendientes', val: rqs.filter(r => r.status === 'pending_approval').length, icon: '⏳', color: 'bg-amber-50 text-amber-600' },
                                { label: 'Vacantes Activas', val: jobs.filter(j => j.status === 'published').length, icon: '📋', color: 'bg-blue-50 text-blue-600' },
                                { label: 'Total Postulantes', val: analyticsData.totalApplicants, icon: '👥', color: 'bg-violet-50 text-violet-600' },
                                { label: 'Contratados', val: analyticsData.hiredCount, icon: '✅', color: 'bg-emerald-50 text-emerald-600' },
                                { label: 'Time to Fill', val: `${analyticsData.avgTimeToFill || 0}d`, icon: '⏱️', color: 'bg-rose-50 text-rose-600', desc: 'promedio días' },
                            ].map((stat, i) => (
                                <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3 ${stat.color}`}>
                                        {stat.icon}
                                    </div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{stat.label}</p>
                                    <p className="text-2xl font-bold text-gray-900 mt-1">{stat.val}</p>
                                    {stat.desc && <p className="text-xs text-gray-400 mt-0.5">{stat.desc}</p>}
                                </div>
                            ))}
                        </div>

                        {/* Breakdown by Gerencia */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-gray-100">
                                <h3 className="font-bold text-gray-900">Postulantes por Gerencia</h3>
                                <p className="text-sm text-gray-500 mt-1">Distribución de candidatos por área organizacional</p>
                            </div>
                            <div className="p-6">
                                {analyticsData.byGerencia && analyticsData.byGerencia.length > 0 ? (
                                    <div className="space-y-4">
                                        {analyticsData.byGerencia.map((g: any, idx: number) => (
                                            <div key={idx} className="flex items-center gap-4">
                                                <div className="w-40 text-sm font-medium text-gray-700 truncate">{g.nombre}</div>
                                                <div className="flex-1 h-8 bg-gray-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-violet-500 to-violet-400 rounded-full flex items-center justify-end pr-3"
                                                        style={{ width: `${Math.max(10, (g.count / (analyticsData.totalApplicants || 1)) * 100)}%` }}
                                                    >
                                                        <span className="text-xs font-bold text-white">{g.count}</span>
                                                    </div>
                                                </div>
                                                <div className="w-16 text-right text-sm text-gray-500">
                                                    {analyticsData.totalApplicants > 0 ? Math.round((g.count / analyticsData.totalApplicants) * 100) : 0}%
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-400">
                                        <p>No hay datos de postulantes por gerencia</p>
                                        <p className="text-xs mt-1">Los candidatos aparecerán aquí cuando postulen a vacantes</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Selection Rate */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900 mb-4">Tasa de Selección</h3>
                                <div className="flex items-end gap-4">
                                    <div className="text-5xl font-bold text-emerald-600">{analyticsData.selectionRate}%</div>
                                    <div className="text-sm text-gray-500 pb-2">
                                        de {analyticsData.totalApplicants} postulantes<br />
                                        fueron contratados
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900 mb-4">Tiempo Promedio de Contratación</h3>
                                <div className="flex items-end gap-4">
                                    <div className="text-5xl font-bold text-rose-500">{analyticsData.avgTimeToFill || 0}</div>
                                    <div className="text-sm text-gray-500 pb-2">
                                        días promedio<br />
                                        desde publicación hasta contratación
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="flex gap-8">
                        {/* Sidebar Config */}
                        <div className="w-64 shrink-0 space-y-1">
                            <h2 className="text-lg font-bold text-gray-900 px-4 mb-4">Configuración</h2>
                            {visibleSidebarTabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id
                                        ? 'bg-violet-600 text-white shadow-lg shadow-violet-200'
                                        : 'text-gray-500 hover:bg-violet-50 hover:text-violet-600'
                                        }`}
                                >
                                    <span className="text-lg">{tab.icon}</span>
                                    {tab.label}
                                </button>
                            ))}


                            {visibleConfigTabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setConfigTab(tab.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${configTab === tab.id
                                        ? 'bg-violet-100 text-violet-700'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                        }`}
                                >
                                    <span>{tab.icon}</span>
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Config Content */}
                        <div className="flex-1 min-w-0">
                            {configTab === 'estructura' && (
                                <div className="space-y-6">
                                    <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                                        <h2 className="text-xl font-bold text-gray-900 mb-2">Estructura Organizacional</h2>
                                        <p className="text-sm text-gray-500">Define las Gerencias, Áreas y Puestos de tu holding.</p>
                                    </div>
                                    <OrgStructure holdingId={holdingId} />
                                </div>
                            )}

                            {configTab === 'usuarios' && (
                                <TalentUsers holdingId={holdingId} />
                            )}

                            {configTab === 'etapas' && holdingId && (
                                <FunnelStagesConfig holdingId={holdingId} />
                            )}

                            {configTab === 'calendars' && user && holdingId && (
                                <CalendarSettings userId={user.uid} holdingId={holdingId} />
                            )}

                            {configTab === 'security' && (
                                <TalentSecurity />
                            )}

                            {configTab === 'publicacion' && (
                                <PublishConfigView holdingId={holdingId} />
                            )}

                            {configTab === 'plantillas' && (
                                <EmailTemplatesConfig holdingId={holdingId} />
                            )}

                            {configTab === 'config' && holdingId && isAdmin && (
                                <ApprovalWorkflows holdingId={holdingId} />
                            )}
                        </div>
                    </div>
                )}
            </main>

            {/* Create Job Modal */}
            <CreateJobModal
                show={showCreateModal}
                holdingId={holdingId}
                onCancel={() => setShowCreateModal(false)}
                onSave={handleSaveJob}
            />

            {/* Create RQ Modal */}
            <CreateRQModal
                show={showRQModal}
                holdingId={holdingId}
                creatorEmail={user?.email || ''}
                creatorNombre={currentTalentUser?.nombre}
                userGerenciaId={currentTalentUser?.gerenciaId}
                onCancel={() => setShowRQModal(false)}
                onSave={handleSaveRQ}
            />

            {/* Publish RQ Modal */}
            <PublishRQModal
                show={showPublishModal}
                holdingId={holdingId}
                rq={selectedRQForPublish}
                onClose={() => {
                    setShowPublishModal(false);
                    setSelectedRQForPublish(null);
                }}
                onPublished={() => {
                    setShowPublishModal(false);
                    setSelectedRQForPublish(null);
                    loadRQs();
                    loadJobs();
                }}
            />
        </div>
    );
}
