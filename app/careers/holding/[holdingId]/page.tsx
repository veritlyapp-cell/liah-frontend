'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

interface Job {
    id: string;
    titulo: string;
    descripcion: string;
    tipoContrato: string;
    modalidad: string;
    salarioMin?: number;
    salarioMax?: number;
    mostrarSalario: boolean;
    vacantes: number;
    areaNombre?: string;
    gerenciaNombre?: string;
    createdAt: any;
}

interface Holding {
    id: string;
    nombre: string;
    logoUrl?: string;
    colorPrimario?: string;
    descripcion?: string;
}

export default function HoldingCareersPage() {
    const params = useParams();
    const router = useRouter();
    const holdingId = params?.holdingId as string;

    const [loading, setLoading] = useState(true);
    const [holding, setHolding] = useState<Holding | null>(null);
    const [jobs, setJobs] = useState<Job[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (holdingId) {
            loadData();
        }
    }, [holdingId]);

    async function loadData() {
        setLoading(true);
        try {
            // Load holding info
            const holdingDoc = await getDoc(doc(db, 'holdings', holdingId));
            if (!holdingDoc.exists()) {
                setError('Empresa no encontrada');
                return;
            }
            setHolding({ id: holdingDoc.id, ...holdingDoc.data() } as Holding);

            // Load published jobs
            const jobsRef = collection(db, 'talent_jobs');
            const jobsQuery = query(
                jobsRef,
                where('holdingId', '==', holdingId),
                where('status', '==', 'published')
            );
            const jobsSnap = await getDocs(jobsQuery);

            const loadedJobs = jobsSnap.docs.map(d => ({
                id: d.id,
                ...d.data()
            })) as Job[];

            // Sort by creation date
            loadedJobs.sort((a, b) =>
                (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
            );

            setJobs(loadedJobs);
        } catch (err) {
            console.error('Error loading careers:', err);
            setError('Error al cargar las vacantes');
        } finally {
            setLoading(false);
        }
    }

    const tipoContratoLabels: Record<string, string> = {
        tiempo_completo: 'Tiempo Completo',
        medio_tiempo: 'Medio Tiempo',
        temporal: 'Temporal',
        practicas: 'Prácticas',
        freelance: 'Freelance'
    };

    const modalidadLabels: Record<string, string> = {
        presencial: 'Presencial',
        remoto: 'Remoto',
        hibrido: 'Híbrido'
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">🏢</div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">{error}</h1>
                    <p className="text-gray-600">Verifica el enlace e intenta nuevamente</p>
                </div>
            </div>
        );
    }

    const primaryColor = holding?.colorPrimario || '#7c3aed';

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            {/* Header */}
            <header
                className="text-white py-12"
                style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%)` }}
            >
                <div className="max-w-5xl mx-auto px-4">
                    <div className="flex items-center gap-4">
                        {holding?.logoUrl ? (
                            <img
                                src={holding.logoUrl}
                                alt={holding.nombre}
                                className="w-16 h-16 rounded-xl bg-white p-2 object-contain"
                            />
                        ) : (
                            <div className="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center text-2xl font-bold">
                                {holding?.nombre?.charAt(0) || 'L'}
                            </div>
                        )}
                        <div>
                            <h1 className="text-3xl font-bold">{holding?.nombre || 'Carreras'}</h1>
                            <p className="text-white/80">Únete a nuestro equipo</p>
                        </div>
                    </div>
                    {holding?.descripcion && (
                        <p className="mt-4 text-white/90 max-w-2xl">{holding.descripcion}</p>
                    )}
                </div>
            </header>

            {/* Content */}
            <main className="max-w-5xl mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900">
                        Vacantes Disponibles ({jobs.length})
                    </h2>
                </div>

                {jobs.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                        <div className="text-6xl mb-4">🔍</div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            No hay vacantes disponibles
                        </h3>
                        <p className="text-gray-600">
                            Vuelve pronto, estamos en constante búsqueda de talento.
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {jobs.map(job => (
                            <div
                                key={job.id}
                                onClick={() => router.push(`/careers/${job.id}`)}
                                className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer border border-gray-100"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                            {job.titulo}
                                        </h3>
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            <span
                                                className="px-3 py-1 rounded-full text-sm font-medium"
                                                style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
                                            >
                                                {tipoContratoLabels[job.tipoContrato] || job.tipoContrato}
                                            </span>
                                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                                                {modalidadLabels[job.modalidad] || job.modalidad}
                                            </span>
                                            {job.gerenciaNombre && (
                                                <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                                                    {job.gerenciaNombre}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-gray-600 text-sm line-clamp-2">
                                            {job.descripcion}
                                        </p>
                                    </div>
                                    <div className="text-right ml-4">
                                        {job.mostrarSalario && job.salarioMin && (
                                            <p className="text-green-600 font-semibold">
                                                S/ {job.salarioMin.toLocaleString()}
                                                {job.salarioMax && ` - ${job.salarioMax.toLocaleString()}`}
                                            </p>
                                        )}
                                        <p className="text-xs text-gray-400 mt-1">
                                            {job.vacantes} vacante{job.vacantes > 1 ? 's' : ''}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-4 flex items-center justify-between">
                                    <span className="text-xs text-gray-400">
                                        Publicado {job.createdAt ? new Date(job.createdAt.seconds * 1000).toLocaleDateString() : ''}
                                    </span>
                                    <span
                                        className="text-sm font-medium"
                                        style={{ color: primaryColor }}
                                    >
                                        Ver más →
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="border-t border-gray-200 py-8 mt-12">
                <div className="max-w-5xl mx-auto px-4 text-center text-gray-500 text-sm">
                    <p>Powered by <strong>Liah</strong> • Reclutamiento Inteligente</p>
                </div>
            </footer>
        </div>
    );
}
