'use client';

import { useState, useEffect, Suspense, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { MapPin, Clock, Search, ArrowRight, ChevronRight, Zap, Info, ShieldCheck, Map, CheckCircle2 } from 'lucide-react';
import { isWithinAcceptableDistance, formatDistance } from '@/lib/geo/distance-utils';

interface Vacancy {
    id: string;
    posicion: string;
    turno: string;
    modalidad: string;
    marcaNombre: string;
    tiendaNombre: string;
    tiendaDistrito: string;
    requisitos: any; // Dynamic KQs
    storeCoordinates: { lat: number, lng: number } | null;
    categoria: string;
}

interface KQQuestion {
    id: string;
    question: string;
    type: 'boolean' | 'select' | 'text' | 'number';
    options?: string[];
    requiredAnswer?: string;
    isRequired: boolean;
}

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
    const [geoResult, setGeoResult] = useState<any>(null);

    useEffect(() => {
        async function loadData() {
            if (!token) {
                router.push(`/portal?holding=${holdingSlug}`);
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
                    router.push(`/portal?holding=${holdingSlug}`);
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
                const v = vacData.vacancy;
                setVacancy(v);

                // Calculate distance if coordinates are available
                if (sessionData.candidate.coordinates && v.storeCoordinates) {
                    const geo = isWithinAcceptableDistance(
                        sessionData.candidate.coordinates,
                        v.storeCoordinates,
                        v.turno || 'Mañana'
                    );
                    setGeoResult(geo);
                }

            } catch (error) {
                console.error('Error:', error);
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, [rqId, token, holdingSlug, router]);

    // Parse requisitos into KQ list
    const getKQs = (): KQQuestion[] => {
        if (!vacancy?.requisitos) return [];

        // Handle different formats if necessary, for now assume it's the standard JobProfileRequisitos
        const reqs = vacancy.requisitos;
        const kqs: KQQuestion[] = [];

        // Example: converting from JobProfile structure or similar
        // If it's keys like 'experienciaMinima', 'educacion', etc.
        // For simplicity, let's assume it's an array of questions or transform key requirements

        if (Array.isArray(reqs)) return reqs;

        // If it's the standard object from JobProfile:
        if (reqs.killerQuestions && Array.isArray(reqs.killerQuestions)) {
            return reqs.killerQuestions;
        }

        return [];
    };

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!vacancy || !candidateData) return;

        const kqs = getKQs();

        // Validate required answers in UI
        for (const kq of kqs) {
            if (kq.isRequired && !answers[kq.id]) {
                alert(`Por favor responde: ${kq.question}`);
                return;
            }
        }

        setSubmitting(true);

        try {
            // Evaluamos KQs
            let kqPassed = true;
            const kqResults: Record<string, { passed: boolean; answer: string }> = {};

            for (const kq of kqs) {
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

            // Geo Match
            const isGeoMatch = geoResult ? geoResult.isAcceptable : true;

            // Flow Decision: Must pass BOTH KQs and Geo to be Flow A
            // IMPORTANT: Only 'operativo' positions go to automatic scheduling.
            // Other positions (Store Manager, etc.) always go to 'review' (Flow B).
            const isOperativo = vacancy.categoria === 'operativo';
            const finalFlow = (kqPassed && isGeoMatch && isOperativo) ? 'A' : 'B';

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
                    isGeoMatch,
                    matchScore: kqPassed ? (isGeoMatch ? 100 : 70) : 40,
                    flow: finalFlow,
                    sessionToken: token
                })
            });

            if (!response.ok) throw new Error('Error al postular');

            const data = await response.json();

            if (data.flow === 'A') {
                setResult('match');
                setTimeout(() => {
                    router.push(`/portal/agendar/${vacancy.id}?token=${token}&appId=${data.applicationId}`);
                }, 2500);
            } else {
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
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin w-12 h-12 border-4 border-gray-200 border-t-violet-600 rounded-full"></div>
            </div>
        );
    }

    if (result === 'match') {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-[3rem] p-12 max-w-lg w-full text-center shadow-2xl relative overflow-hidden"
                >
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-400 to-emerald-500"></div>
                    <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-8">
                        <CheckCircle2 size={48} className="text-green-600" />
                    </div>
                    <h2 className="text-4xl font-black text-gray-900 mb-4 tracking-tighter uppercase italic leading-none">¡Felicidades, <br /><span className="text-green-600">tienes el perfil!</span></h2>
                    <p className="text-lg text-gray-600 mb-8 font-medium">
                        Tu perfil calza perfectamente con esta vacante. El siguiente paso es agendar tu entrevista.
                    </p>
                    <div className="bg-gray-50 rounded-[2rem] p-6 mb-8 border border-gray-100 italic text-left">
                        <div className="flex items-center gap-3 mb-2">
                            <Zap size={20} className="text-violet-600" />
                            <p className="text-xl font-black text-gray-900 uppercase tracking-tight">{vacancy?.posicion}</p>
                        </div>
                        <p className="text-gray-500 font-bold text-sm uppercase flex items-center gap-1">
                            <MapPin size={14} /> {vacancy?.tiendaNombre}
                        </p>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-gray-400 font-black text-xs uppercase tracking-widest animate-pulse">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        Redirigiendo al calendario...
                    </div>
                </motion.div>
            </div>
        );
    }

    if (result === 'review') {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-[3rem] p-12 max-w-lg w-full text-center shadow-2xl"
                >
                    <div className="w-24 h-24 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-8">
                        <ShieldCheck size={48} className="text-violet-600" />
                    </div>
                    <h2 className="text-4xl font-black text-gray-900 mb-4 tracking-tighter uppercase italic leading-none">Postulación <br />en revisión</h2>
                    <p className="text-lg text-gray-600 mb-8 font-medium">
                        Tu información ha sido enviada exitosamente. Nuestro equipo de selección revisará tu perfil y te contactará pronto.
                    </p>
                    <div className="bg-gray-50 rounded-[2rem] p-6 mb-10 border border-gray-100 italic text-left">
                        <p className="text-xl font-black text-gray-900 uppercase tracking-tight mb-2">{vacancy?.posicion}</p>
                        <p className="text-gray-500 font-bold text-sm uppercase flex items-center gap-1">
                            <MapPin size={14} /> {vacancy?.tiendaNombre}
                        </p>
                    </div>
                    <button
                        onClick={() => router.push(`/empleos/${holdingSlug}/vacantes?token=${token}`)}
                        className="w-full py-5 bg-gray-900 text-white rounded-2xl font-black uppercase italic tracking-widest hover:bg-violet-600 transition-all shadow-xl"
                    >
                        Ver más vacantes
                    </button>
                </motion.div>
            </div>
        );
    }

    const currentKQs = getKQs();

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            {/* Header / Brand Nav */}
            <div className="bg-white border-b border-gray-100 p-6 sticky top-0 z-30 shadow-sm">
                <div className="max-w-3xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push(`/empleos/${holdingSlug}${token ? `?token=${token}` : ''}`)}
                            className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-all"
                        >
                            <ArrowRight className="rotate-180" size={20} />
                        </button>
                        <div className="h-4 w-px bg-gray-200"></div>
                        <span className="text-sm font-black text-gray-900 uppercase italic tracking-tighter">Postulando a {vacancy?.marcaNombre}</span>
                    </div>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-6 py-12">
                {/* Vacancy Card Summary */}
                <div className="bg-gray-900 rounded-[2.5rem] p-8 md:p-10 text-white mb-10 relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600 rounded-full blur-[100px] opacity-20 -translate-y-1/2 translate-x-1/2"></div>
                    <div className="relative z-10">
                        <span className="inline-block px-3 py-1 bg-violet-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">Confirmación de Requisitos</span>
                        <h1 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter leading-none mb-6">
                            {vacancy?.posicion}
                        </h1>
                        <div className="flex flex-wrap gap-6 text-xs font-black uppercase tracking-widest text-gray-400">
                            <span className="flex items-center gap-2"><MapPin size={16} className="text-violet-400" /> {vacancy?.tiendaNombre} ({vacancy?.tiendaDistrito})</span>
                            <span className="flex items-center gap-2"><Clock size={16} className="text-violet-400" /> {vacancy?.turno}</span>
                        </div>
                    </div>
                </div>

                {/* Question Form */}
                <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-xl border border-gray-100">
                    <div className="flex items-center gap-3 mb-10">
                        <div className="w-12 h-12 bg-violet-50 rounded-2xl flex items-center justify-center text-violet-600">
                            <Info size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black uppercase italic tracking-tighter text-gray-900 leading-none">Preguntas clave</h2>
                            <p className="text-sm text-gray-400 font-bold uppercase tracking-widest mt-1">Nuestra IA evaluará tu perfil al instante</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-10">
                        {currentKQs.length === 0 ? (
                            <div className="bg-violet-50 p-6 rounded-2xl border border-violet-100 text-center italic text-violet-800 font-bold">
                                No se requieren preguntas adicionales para esta posición. <br />Haz clic abajo para completar tu postulación.
                            </div>
                        ) : (
                            currentKQs.map((kq, idx) => (
                                <div key={kq.id} className="relative">
                                    <div className="flex items-start gap-4 mb-6">
                                        <span className="text-3xl font-black text-violet-100 italic leading-none">{String(idx + 1).padStart(2, '0')}</span>
                                        <label className="text-xl font-bold text-gray-900 tracking-tight leading-tight pt-1">
                                            {kq.question}
                                            {kq.isRequired && <span className="text-violet-400 ml-1">*</span>}
                                        </label>
                                    </div>

                                    {kq.type === 'boolean' && (
                                        <div className="grid grid-cols-2 gap-4 ml-10">
                                            <label className={`
                                                cursor-pointer flex items-center justify-center gap-3 p-5 rounded-2xl border-2 transition-all
                                                ${answers[kq.id] === 'yes' ? 'bg-gray-900 border-gray-900 text-white shadow-lg' : 'bg-gray-50 border-gray-100 text-gray-500 hover:border-violet-200'}
                                            `}>
                                                <input
                                                    type="radio"
                                                    name={kq.id}
                                                    value="yes"
                                                    className="hidden"
                                                    onChange={(e) => setAnswers({ ...answers, [kq.id]: e.target.value })}
                                                />
                                                <span className="font-black uppercase italic tracking-widest">Sí</span>
                                            </label>
                                            <label className={`
                                                cursor-pointer flex items-center justify-center gap-3 p-5 rounded-2xl border-2 transition-all
                                                ${answers[kq.id] === 'no' ? 'bg-gray-900 border-gray-900 text-white shadow-lg' : 'bg-gray-50 border-gray-100 text-gray-500 hover:border-violet-200'}
                                            `}>
                                                <input
                                                    type="radio"
                                                    name={kq.id}
                                                    value="no"
                                                    className="hidden"
                                                    onChange={(e) => setAnswers({ ...answers, [kq.id]: e.target.value })}
                                                />
                                                <span className="font-black uppercase italic tracking-widest">No</span>
                                            </label>
                                        </div>
                                    )}

                                    {kq.type === 'select' && kq.options && (
                                        <div className="grid gap-3 ml-10">
                                            {kq.options.map(opt => (
                                                <label key={opt} className={`
                                                    cursor-pointer flex items-center p-4 rounded-2xl border-2 transition-all
                                                    ${answers[kq.id] === opt ? 'bg-gray-900 border-gray-900 text-white shadow-lg' : 'bg-gray-50 border-gray-100 text-gray-500 hover:border-violet-200'}
                                                `}>
                                                    <input
                                                        type="radio"
                                                        name={kq.id}
                                                        value={opt}
                                                        className="hidden"
                                                        onChange={(e) => setAnswers({ ...answers, [kq.id]: e.target.value })}
                                                    />
                                                    <span className="font-bold">{opt}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}

                        <div className="pt-8 border-t border-gray-100">
                            {submitting ? (
                                <div className="w-full py-6 bg-gray-100 text-gray-400 rounded-2xl font-black uppercase italic tracking-widest flex items-center justify-center gap-3">
                                    <div className="animate-spin w-5 h-5 border-2 border-gray-300 border-t-violet-600 rounded-full"></div>
                                    Evaluando Perfil...
                                </div>
                            ) : (
                                <button
                                    type="submit"
                                    className="w-full py-6 bg-gray-900 text-white rounded-2xl font-black uppercase italic tracking-widest hover:bg-violet-600 transition-all shadow-xl hover:-translate-y-1"
                                >
                                    Enviar Postulación <ArrowRight className="inline ml-2" size={20} />
                                </button>
                            )}
                            <p className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-6">
                                Al enviar, aceptas ser contactado por nuestro equipo de selección.
                            </p>
                        </div>
                    </form>
                </div>

                {/* Geo Info Footer (Subtle) */}
                {geoResult && (
                    <div className="mt-8 flex justify-center">
                        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-gray-100 shadow-sm text-[10px] font-black uppercase tracking-widest text-gray-400">
                            <Map size={14} className="text-violet-500" />
                            Estás a {formatDistance(geoResult.distanceKm)} de esta sede
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function AplicarPage({ params }: { params: Promise<{ rqId: string }> }) {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gray-50 flex items-center justify-center text-violet-600">
                <div className="animate-spin w-12 h-12 border-4 border-gray-200 border-t-violet-600 rounded-full"></div>
            </div>
        }>
            <AplicarContent params={params} />
        </Suspense>
    );
}
