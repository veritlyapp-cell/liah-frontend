'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, Timestamp, orderBy } from 'firebase/firestore';
import CreateJobModal from '@/components/talent/CreateJobModal';
import CandidateList from '@/components/talent/CandidateList';
import OrgStructure from '@/components/talent/OrgStructure';
import CreateRQModal from '@/components/talent/CreateRQModal';
import TalentUsers from '@/components/talent/TalentUsers';

interface Job {
    id: string;
    titulo: string;
    departamento: string;
    status: string;
    createdAt: any;
    killerQuestions?: any[];
}

/**
 * Liah Talent - Main Dashboard
 * Corporate Recruitment Platform
 */
export default function TalentDashboard() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('rqs');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showRQModal, setShowRQModal] = useState(false);
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loadingJobs, setLoadingJobs] = useState(true);
    const [rqs, setRqs] = useState<any[]>([]);
    const [loadingRQs, setLoadingRQs] = useState(true);

    // TODO: Get from user profile
    const holdingId = 'ngr';

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (user) {
            loadJobs();
            loadRQs();
        }
    }, [user]);

    async function loadRQs() {
        setLoadingRQs(true);
        try {
            const rqsRef = collection(db, 'talent_rqs');
            const rqQuery = query(
                rqsRef,
                where('holdingId', '==', holdingId),
                orderBy('createdAt', 'desc')
            );
            const rqSnap = await getDocs(rqQuery);
            const loadedRqs = rqSnap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setRqs(loadedRqs);
        } catch (error) {
            console.error('Error loading RQs:', error);
        } finally {
            setLoadingRQs(false);
        }
    }

    async function handleSaveRQ(rqData: any) {
        try {
            await addDoc(collection(db, 'talent_rqs'), rqData);
            await loadRQs();
            setShowRQModal(false);
            alert('✅ Requerimiento creado exitosamente');
        } catch (error) {
            console.error('Error saving RQ:', error);
            throw error;
        }
    }

    async function loadJobs() {
        try {
            const jobsRef = collection(db, 'talent_jobs');
            const q = query(
                jobsRef,
                where('holdingId', '==', holdingId),
                orderBy('createdAt', 'desc')
            );
            const snapshot = await getDocs(q);
            const loadedJobs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Job[];
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

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500" />
            </div>
        );
    }

    const tabs = [
        { id: 'rqs', label: 'Requerimientos', icon: '📝' },
        { id: 'jobs', label: 'Vacantes', icon: '📋' },
        { id: 'candidates', label: 'Candidatos', icon: '👥' },
        { id: 'pipeline', label: 'Pipeline', icon: '🎯' },
        { id: 'estructura', label: 'Estructura Org', icon: '🏢' },
        { id: 'usuarios', label: 'Usuarios', icon: '👤' },
        { id: 'analytics', label: 'Analytics', icon: '📊' },
    ];

    const getStatusBadge = (status: string) => {
        const badges: Record<string, { bg: string; text: string; label: string }> = {
            draft: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Borrador' },
            pending_approval: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Pendiente' },
            approved: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Aprobado' },
            published: { bg: 'bg-green-100', text: 'text-green-700', label: 'Publicado' },
            closed: { bg: 'bg-red-100', text: 'text-red-700', label: 'Cerrado' },
        };
        const badge = badges[status] || badges.draft;
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
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
                            <Link href="/launcher">
                                <img src="/logos/liah-logo.png" alt="Liah" className="h-10" />
                            </Link>
                            <div className="h-6 w-px bg-gray-300" />
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">💼</span>
                                <span className="font-bold text-gray-900">Talent</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-600">{user?.email}</span>
                            <button
                                onClick={() => router.push('/launcher')}
                                className="px-4 py-2 text-sm bg-violet-100 text-violet-700 rounded-lg hover:bg-violet-200 transition-colors"
                            >
                                Cambiar Producto
                            </button>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex gap-1">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-5 py-3 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 ${activeTab === tab.id
                                    ? 'bg-slate-50 text-violet-600 border-t-2 border-x border-violet-500'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                    }`}
                            >
                                <span>{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* RQs Tab */}
                {activeTab === 'rqs' && (
                    <div>
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Requerimientos (RQ)</h1>
                                <p className="text-gray-600">Gestiona las solicitudes de posiciones</p>
                            </div>
                            <button
                                onClick={() => setShowRQModal(true)}
                                className="px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                            >
                                + Nuevo Requerimiento
                            </button>
                        </div>

                        {loadingRQs ? (
                            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-500 mx-auto" />
                                <p className="text-gray-500 mt-4">Cargando requerimientos...</p>
                            </div>
                        ) : rqs.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                                <div className="text-6xl mb-4">📝</div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">No hay requerimientos aún</h3>
                                <p className="text-gray-600 mb-6">Crea tu primer requerimiento para iniciar el proceso de reclutamiento</p>
                                <button
                                    onClick={() => setShowRQModal(true)}
                                    className="px-6 py-3 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 transition-colors"
                                >
                                    Crear Primer Requerimiento
                                </button>
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {rqs.map(rq => (
                                    <div key={rq.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded text-gray-600">
                                                        {rq.codigo}
                                                    </span>
                                                    {rq.urgente && (
                                                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                                                            🔥 Urgente
                                                        </span>
                                                    )}
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${rq.status === 'pending_approval' ? 'bg-amber-100 text-amber-700' :
                                                        rq.status === 'approved' ? 'bg-green-100 text-green-700' :
                                                            rq.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                                rq.status === 'published' ? 'bg-blue-100 text-blue-700' :
                                                                    'bg-gray-100 text-gray-700'
                                                        }`}>
                                                        {rq.status === 'pending_approval' ? '⏳ Pendiente Aprobación' :
                                                            rq.status === 'approved' ? '✅ Aprobado' :
                                                                rq.status === 'rejected' ? '❌ Rechazado' :
                                                                    rq.status === 'published' ? '📣 Publicado' :
                                                                        rq.status}
                                                    </span>
                                                </div>
                                                <h3 className="text-lg font-semibold text-gray-900">{rq.puestoNombre}</h3>
                                                <p className="text-sm text-gray-500">
                                                    {rq.gerenciaNombre} → {rq.areaNombre}
                                                </p>
                                                <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
                                                    <span>👥 {rq.cantidad} posicion{rq.cantidad > 1 ? 'es' : ''}</span>
                                                    {rq.fechaLimite && (
                                                        <span>📅 Límite: {new Date(rq.fechaLimite.seconds * 1000).toLocaleDateString()}</span>
                                                    )}
                                                    <span>✉️ {rq.createdBy}</span>
                                                </div>
                                            </div>
                                            <button className="px-4 py-2 text-violet-600 hover:bg-violet-50 rounded-lg transition-colors">
                                                Ver detalles →
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'jobs' && (
                    <div>
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Vacantes</h1>
                                <p className="text-gray-600">Gestiona tus posiciones abiertas</p>
                            </div>
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                            >
                                + Nueva Vacante
                            </button>
                        </div>

                        {loadingJobs ? (
                            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-500 mx-auto" />
                                <p className="text-gray-500 mt-4">Cargando vacantes...</p>
                            </div>
                        ) : jobs.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                                <div className="text-6xl mb-4">📋</div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">No hay vacantes aún</h3>
                                <p className="text-gray-600 mb-6">Crea tu primera vacante para empezar a reclutar</p>
                                <button
                                    onClick={() => setShowCreateModal(true)}
                                    className="px-6 py-3 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 transition-colors"
                                >
                                    Crear Primera Vacante
                                </button>
                            </div>
                        ) : (
                            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Título</th>
                                            <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Departamento</th>
                                            <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Estado</th>
                                            <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">KQs</th>
                                            <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Candidatos</th>
                                            <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {jobs.map(job => (
                                            <tr key={job.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-gray-900">{job.titulo}</div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600">{job.departamento || '-'}</td>
                                                <td className="px-6 py-4">{getStatusBadge(job.status)}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600">{job.killerQuestions?.length || 0}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600">0</td>
                                                <td className="px-6 py-4">
                                                    <button className="text-violet-600 hover:text-violet-800 text-sm font-medium">
                                                        Ver detalles
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'candidates' && (
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-4">Candidatos</h1>
                        <CandidateList holdingId={holdingId} />
                    </div>
                )}

                {activeTab === 'pipeline' && (
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-4">Pipeline de Reclutamiento</h1>
                        <div className="grid grid-cols-5 gap-4">
                            {['Aplicados', 'Screening', 'Entrevista', 'Oferta', 'Contratado'].map((stage) => (
                                <div key={stage} className="bg-white rounded-xl border border-gray-200 p-4">
                                    <h3 className="font-semibold text-gray-700 mb-2 text-sm">{stage}</h3>
                                    <div className="text-3xl font-bold text-violet-600">0</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'estructura' && (
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-4">Estructura Organizacional</h1>
                        <p className="text-gray-600 mb-6">Gestiona la jerarquía de tu organización: Gerencias → Áreas → Puestos</p>
                        <OrgStructure holdingId={holdingId} />
                    </div>
                )}

                {activeTab === 'usuarios' && (
                    <TalentUsers holdingId={holdingId} />
                )}

                {activeTab === 'analytics' && (
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-4">Analytics</h1>
                        <div className="grid grid-cols-4 gap-4">
                            {[
                                { label: 'Vacantes Activas', value: jobs.filter(j => j.status === 'published').length.toString(), icon: '📋' },
                                { label: 'Total Vacantes', value: jobs.length.toString(), icon: '📂' },
                                { label: 'En Proceso', value: '0', icon: '⏳' },
                                { label: 'Contratados', value: '0', icon: '✅' },
                            ].map(stat => (
                                <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-6">
                                    <div className="text-3xl mb-2">{stat.icon}</div>
                                    <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
                                    <div className="text-sm text-gray-600">{stat.label}</div>
                                </div>
                            ))}
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
                onCancel={() => setShowRQModal(false)}
                onSave={handleSaveRQ}
            />
        </div>
    );
}
