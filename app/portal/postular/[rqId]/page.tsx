'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { getMatchScore } from '@/lib/geo/district-matching';

interface Vacancy {
    id: string;
    rqNumber: string;
    posicion: string;
    modalidad: string;
    tiendaNombre: string;
    tiendaDistrito?: string;
    marcaNombre: string;
    vacantes: number;
}

interface KQQuestion {
    id: string;
    question: string;
    type: 'boolean' | 'select' | 'text';
    options?: string[];
    requiredAnswer?: string;
    isRequired?: boolean;
}

interface CandidateSession {
    id: string;
    nombre: string;
    distrito: string;
    email: string;
}

// Default KQ questions for all positions
const DEFAULT_KQ: KQQuestion[] = [
    {
        id: 'disponibilidad',
        question: '¿Tienes disponibilidad para trabajar en el horario indicado?',
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
        id: 'experiencia',
        question: '¿Tienes experiencia en atención al cliente?',
        type: 'boolean',
        isRequired: false
    },
    {
        id: 'transporte',
        question: '¿Cómo te trasladarías al lugar de trabajo?',
        type: 'select',
        options: ['Transporte público', 'Vehículo propio', 'A pie', 'Bicicleta'],
        isRequired: true
    }
];

function PostularContent() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [vacancy, setVacancy] = useState<Vacancy | null>(null);
    const [candidate, setCandidate] = useState<CandidateSession | null>(null);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [result, setResult] = useState<'pending' | 'match' | 'review' | null>(null);

    useEffect(() => {
        async function loadData() {
            const token = searchParams.get('token');
            const rqId = params.rqId as string;

            if (!token) {
                router.push('/portal');
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
                    router.push('/portal');
                    return;
                }

                const sessionData = await sessionRes.json();
                setCandidate(sessionData.candidate);

                // Get vacancy details
                const vacancyRes = await fetch(`/api/portal/vacancy/${rqId}`);
                if (!vacancyRes.ok) {
                    alert('Vacante no encontrada');
                    router.push(`/portal/vacantes?token=${token}`);
                    return;
                }

                const vacancyData = await vacancyRes.json();
                setVacancy(vacancyData.vacancy);

            } catch (error) {
                console.error('Error loading data:', error);
                router.push('/portal');
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, [params.rqId, searchParams, router]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!vacancy || !candidate) return;

        // Validate required answers
        for (const kq of DEFAULT_KQ) {
            if (kq.isRequired && !answers[kq.id]) {
                alert(`Por favor responde: ${kq.question}`);
                return;
            }
        }

        setSubmitting(true);

        try {
            const token = searchParams.get('token');

            // Calculate if KQs passed
            let kqPassed = true;
            const kqResults: Record<string, { passed: boolean; answer: string }> = {};

            for (const kq of DEFAULT_KQ) {
                const answer = answers[kq.id];
                let passed = true;

                if (kq.requiredAnswer) {
                    passed = answer === kq.requiredAnswer;
                }

                kqResults[kq.id] = { passed, answer };

                if (kq.isRequired && !passed) {
                    kqPassed = false;
                }
            }

            // Calculate geographic match
            const matchScore = getMatchScore(candidate.distrito, vacancy.tiendaDistrito || '');
            const isGeoMatch = matchScore >= 60;

            // Determine flow
            const isFlowA = kqPassed && isGeoMatch;

            // Submit application
            const response = await fetch('/api/portal/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    candidateId: candidate.id,
                    rqId: vacancy.id,
                    kqAnswers: answers,
                    kqResults,
                    kqPassed,
                    isGeoMatch,
                    matchScore,
                    flow: isFlowA ? 'A' : 'B',
                    sessionToken: token
                })
            });

            if (!response.ok) {
                throw new Error('Error al postular');
            }

            const data = await response.json();

            // Show result
            if (isFlowA) {
                // FLUJO A: Redirect to scheduling
                setResult('match');
                setTimeout(() => {
                    router.push(`/portal/agendar/${vacancy.id}?token=${token}&appId=${data.applicationId}`);
                }, 2000);
            } else {
                // FLUJO B: Show "profile in review" message
                setResult('review');
            }

        } catch (error) {
            console.error('Error submitting application:', error);
            alert('Error al enviar postulación');
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin w-12 h-12 border-4 border-violet-200 border-t-violet-600 rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-600">Cargando...</p>
                </div>
            </div>
        );
    }

    if (result === 'match') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <span className="text-5xl">🎉</span>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        ¡Felicidades!
                    </h2>
                    <p className="text-gray-600 mb-4">
                        Tu perfil calza con esta vacante. Ahora puedes agendar tu entrevista.
                    </p>
                    <div className="bg-green-50 rounded-xl p-4 mb-6">
                        <p className="text-green-700 font-medium">{vacancy?.posicion}</p>
                        <p className="text-green-600 text-sm">{vacancy?.tiendaNombre}</p>
                    </div>
                    <p className="text-gray-500 text-sm">
                        Redirigiendo al calendario...
                    </p>
                </div>
            </div>
        );
    }

    if (result === 'review') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
                    <div className="w-20 h-20 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <span className="text-5xl">📋</span>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        Postulación Recibida
                    </h2>
                    <p className="text-gray-600 mb-4">
                        Tu perfil está en revisión por el equipo de selección.
                    </p>
                    <div className="bg-violet-50 rounded-xl p-4 mb-6">
                        <p className="text-violet-700 font-medium">{vacancy?.posicion}</p>
                        <p className="text-violet-600 text-sm">{vacancy?.tiendaNombre}</p>
                    </div>
                    <p className="text-gray-500 text-sm mb-6">
                        Te contactaremos pronto si tu perfil es seleccionado.
                    </p>
                    <button
                        onClick={() => router.push(`/portal/vacantes?token=${searchParams.get('token')}`)}
                        className="px-6 py-3 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700 transition-colors"
                    >
                        Ver más vacantes
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-violet-600 to-cyan-500 text-white">
                <div className="max-w-2xl mx-auto px-4 py-6">
                    <button
                        onClick={() => router.back()}
                        className="text-white/80 hover:text-white flex items-center gap-1 mb-4"
                    >
                        ← Volver
                    </button>
                    <h1 className="text-2xl font-bold">{vacancy?.posicion}</h1>
                    <p className="text-white/80">{vacancy?.marcaNombre} • {vacancy?.tiendaNombre}</p>
                </div>
            </div>

            {/* Form */}
            <div className="max-w-2xl mx-auto px-4 py-6">
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">
                        Preguntas de Filtro
                    </h2>
                    <p className="text-gray-500 text-sm mb-6">
                        Responde estas preguntas para completar tu postulación
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {DEFAULT_KQ.map((kq, index) => (
                            <div key={kq.id} className="border-b border-gray-100 pb-4">
                                <label className="block text-gray-800 font-medium mb-3">
                                    {index + 1}. {kq.question}
                                    {kq.isRequired && <span className="text-red-500 ml-1">*</span>}
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
                                                className="w-5 h-5 text-violet-600"
                                            />
                                            <span className="text-gray-700">Sí</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name={kq.id}
                                                value="no"
                                                checked={answers[kq.id] === 'no'}
                                                onChange={(e) => setAnswers({ ...answers, [kq.id]: e.target.value })}
                                                className="w-5 h-5 text-violet-600"
                                            />
                                            <span className="text-gray-700">No</span>
                                        </label>
                                    </div>
                                )}

                                {kq.type === 'select' && kq.options && (
                                    <select
                                        value={answers[kq.id] || ''}
                                        onChange={(e) => setAnswers({ ...answers, [kq.id]: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                                    >
                                        <option value="">Selecciona una opción</option>
                                        {kq.options.map(opt => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                )}

                                {kq.type === 'text' && (
                                    <input
                                        type="text"
                                        value={answers[kq.id] || ''}
                                        onChange={(e) => setAnswers({ ...answers, [kq.id]: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                                    />
                                )}
                            </div>
                        ))}

                        {submitting ? (
                            <div className="w-full py-4 bg-gradient-to-r from-violet-600 to-cyan-500 text-white font-bold rounded-xl flex flex-col items-center justify-center gap-2">
                                <div className="flex items-center gap-2">
                                    <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full"></div>
                                    <span>Procesando tu postulación...</span>
                                </div>
                                <span className="text-sm font-normal text-white/80">✨ Nuestra IA está evaluando tu perfil para encontrar el mejor match</span>
                            </div>
                        ) : (
                            <button
                                type="submit"
                                className="w-full py-4 bg-gradient-to-r from-violet-600 to-cyan-500 text-white font-bold rounded-xl hover:from-violet-700 hover:to-cyan-600 transition-all"
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

export default function PostularPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin w-12 h-12 border-4 border-violet-200 border-t-violet-600 rounded-full"></div>
            </div>
        }>
            <PostularContent />
        </Suspense>
    );
}
