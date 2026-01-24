'use client';

import { useState, useEffect, Suspense, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getMaxDistanceForTurno } from '@/lib/geo/distance-utils';

interface Vacancy {
    id: string;
    posicion: string;
    turno: string;
    modalidad: string;
    marcaNombre: string;
    tiendaNombre: string;
    tiendaDistrito: string;
}

interface KQQuestion {
    id: string;
    question: string;
    type: 'boolean' | 'select';
    options?: string[];
    requiredAnswer?: string;
    isRequired: boolean;
}

// Default KQs (will come from job profile later)
const DEFAULT_KQS: KQQuestion[] = [
    {
        id: 'disponibilidad_horario',
        question: '¿Tienes disponibilidad para el horario indicado?',
        type: 'boolean',
        requiredAnswer: 'yes',
        isRequired: true
    },
    {
        id: 'carnet_sanidad',
        question: '¿Cuentas con carnet de sanidad vigente?',
        type: 'boolean',
        requiredAnswer: 'yes',
        isRequired: true
    },
    {
        id: 'experiencia_cliente',
        question: '¿Tienes experiencia en atención al cliente?',
        type: 'boolean',
        isRequired: false
    }
];

function AplicarContent({ params }: { params: Promise<{ rqId: string }> }) {
    const { rqId } = use(params);
    const router = useRouter();
    const searchParams = useSearchParams();
    const holdingSlug = searchParams.get('holding') || 'ngr';
    const token = searchParams.get('token');

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [vacancy, setVacancy] = useState<Vacancy | null>(null);
    const [candidateData, setCandidateData] = useState<any>(null);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [result, setResult] = useState<'match' | 'review' | null>(null);
    const [distanceKm, setDistanceKm] = useState<number | null>(null);

    useEffect(() => {
        async function loadData() {
            if (!token) {
                router.push(`/empleos/postular?holding=${holdingSlug}`);
                return;
            }

            try {
                // Validate session
                const sessionRes = await fetch('/api/portal/validate-session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token })
                });

                if (!sessionRes.ok) {
                    router.push(`/empleos/postular?holding=${holdingSlug}`);
                    return;
                }

                const sessionData = await sessionRes.json();
                setCandidateData(sessionData.candidate);

                // Get vacancy
                const vacRes = await fetch(`/api/portal/vacancy/${rqId}`);
                if (!vacRes.ok) {
                    alert('Vacante no encontrada');
                    router.push(`/empleos/vacantes?holding=${holdingSlug}&token=${token}`);
                    return;
                }

                const vacData = await vacRes.json();
                setVacancy(vacData.vacancy);

            } catch (error) {
                console.error('Error:', error);
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, [rqId, token, holdingSlug, router]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!vacancy || !candidateData) return;

        // Validate required answers
        for (const kq of DEFAULT_KQS) {
            if (kq.isRequired && !answers[kq.id]) {
                alert(`Por favor responde: ${kq.question}`);
                return;
            }
        }

        setSubmitting(true);

        try {
            // Check KQ results
            let kqPassed = true;
            const kqResults: Record<string, { passed: boolean; answer: string }> = {};

            for (const kq of DEFAULT_KQS) {
                const answer = answers[kq.id];
                let passed = true;

                if (kq.requiredAnswer && answer !== kq.requiredAnswer) {
                    passed = false;
                }

                kqResults[kq.id] = { passed, answer };

                if (kq.isRequired && !passed) {
                    kqPassed = false;
                }
            }

            // Submit application
            const response = await fetch('/api/portal/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    candidateId: candidateData.id,
                    rqId: vacancy.id,
                    kqAnswers: answers,
                    kqResults,
                    kqPassed,
                    sessionToken: token
                })
            });

            if (!response.ok) throw new Error('Error al postular');

            const data = await response.json();

            if (data.flow === 'A') {
                // Within range + KQ passed → Schedule
                setResult('match');
                setTimeout(() => {
                    router.push(`/empleos/agendar/${vacancy.id}?holding=${holdingSlug}&token=${token}&appId=${data.applicationId}`);
                }, 2000);
            } else {
                // Out of range or KQ failed → Review
                setResult('review');
            }

        } catch (error) {
            console.error('Error:', error);
            alert('Error al postular');
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="animate-spin w-12 h-12 border-4 border-gray-700 border-t-violet-400 rounded-full"></div>
            </div>
        );
    }

    if (result === 'match') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-600 to-emerald-700 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
                    <span className="text-6xl block mb-4">🎉</span>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Felicidades!</h2>
                    <p className="text-gray-600 mb-4">
                        Tu perfil calza con esta vacante. Ahora puedes agendar tu entrevista.
                    </p>
                    <div className="bg-green-50 rounded-xl p-4">
                        <p className="text-green-700 font-medium">{vacancy?.posicion}</p>
                        <p className="text-green-600 text-sm">{vacancy?.tiendaNombre}</p>
                    </div>
                    <p className="text-gray-400 text-sm mt-4">Redirigiendo...</p>
                </div>
            </div>
        );
    }

    if (result === 'review') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
                    <span className="text-6xl block mb-4">📋</span>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Postulación Recibida</h2>
                    <p className="text-gray-600 mb-4">
                        Tu perfil será revisado por el equipo de selección.
                    </p>
                    <div className="bg-violet-50 rounded-xl p-4 mb-6">
                        <p className="text-violet-700 font-medium">{vacancy?.posicion}</p>
                        <p className="text-violet-600 text-sm">{vacancy?.tiendaNombre}</p>
                    </div>
                    <p className="text-gray-500 text-sm mb-6">
                        Te contactaremos pronto si tu perfil es seleccionado.
                    </p>
                    <button
                        onClick={() => router.push(`/empleos/vacantes?holding=${holdingSlug}&token=${token}`)}
                        className="px-6 py-3 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700"
                    >
                        Ver más vacantes
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900">
            {/* Header */}
            <div className="bg-gradient-to-r from-violet-600 to-cyan-500 py-6 px-4">
                <div className="max-w-2xl mx-auto">
                    <button
                        onClick={() => router.back()}
                        className="text-white/70 hover:text-white text-sm mb-2"
                    >
                        ← Volver
                    </button>
                    <h1 className="text-xl font-bold text-white">{vacancy?.posicion}</h1>
                    <p className="text-white/80 text-sm">
                        {vacancy?.marcaNombre} • {vacancy?.tiendaNombre}
                    </p>
                </div>
            </div>

            {/* Form */}
            <div className="max-w-2xl mx-auto px-4 py-8">
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <h2 className="text-lg font-semibold text-white mb-2">Preguntas de Filtro</h2>
                    <p className="text-gray-400 text-sm mb-6">
                        Responde para completar tu postulación
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {DEFAULT_KQS.map((kq, idx) => (
                            <div key={kq.id} className="border-b border-gray-700 pb-4">
                                <label className="block text-white font-medium mb-3">
                                    {idx + 1}. {kq.question}
                                    {kq.isRequired && <span className="text-red-400 ml-1">*</span>}
                                </label>

                                {kq.type === 'boolean' && (
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name={kq.id}
                                                value="yes"
                                                checked={answers[kq.id] === 'yes'}
                                                onChange={(e) => setAnswers({ ...answers, [kq.id]: e.target.value })}
                                                className="w-5 h-5 text-violet-500"
                                            />
                                            <span className="text-gray-300">Sí</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name={kq.id}
                                                value="no"
                                                checked={answers[kq.id] === 'no'}
                                                onChange={(e) => setAnswers({ ...answers, [kq.id]: e.target.value })}
                                                className="w-5 h-5 text-violet-500"
                                            />
                                            <span className="text-gray-300">No</span>
                                        </label>
                                    </div>
                                )}
                            </div>
                        ))}

                        {submitting ? (
                            <div className="w-full py-4 bg-gradient-to-r from-violet-500 to-cyan-500 text-white font-bold rounded-xl flex flex-col items-center justify-center gap-2">
                                <div className="flex items-center gap-2">
                                    <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full"></div>
                                    <span>Procesando tu postulación...</span>
                                </div>
                                <span className="text-sm font-normal text-white/80">✨ Nuestra IA está evaluando tu perfil para encontrar el mejor match</span>
                            </div>
                        ) : (
                            <button
                                type="submit"
                                className="w-full py-4 bg-gradient-to-r from-violet-500 to-cyan-500 text-white font-bold rounded-xl hover:from-violet-600 hover:to-cyan-600"
                            >
                                📨 Enviar Postulación
                            </button>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
}

export default function AplicarPage({ params }: { params: Promise<{ rqId: string }> }) {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="animate-spin w-12 h-12 border-4 border-gray-700 border-t-violet-400 rounded-full"></div>
            </div>
        }>
            <AplicarContent params={params} />
        </Suspense>
    );
}
