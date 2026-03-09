'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { ChevronLeft } from 'lucide-react';

interface Vacancy {
    id: string;
    rqNumber: string;
    posicion: string;
    modalidad: string;
    tiendaNombre: string;
    tiendaDistrito?: string;
    marcaNombre: string;
    marcaId?: string;
    holdingSlug?: string;
    vacantes: number;
    turno?: string;
    killerQuestions?: KQQuestion[];
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

// Default KQ if none configured
const DEFAULT_KQ: KQQuestion[] = [];

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
    const [kqList, setKqList] = useState<KQQuestion[]>(DEFAULT_KQ);

    // Brand colors
    const [brandColor, setBrandColor] = useState<string | null>(null);
    const [brandName, setBrandName] = useState<string | null>(null);
    const [brandLogo, setBrandLogo] = useState<string | null>(null);

    const holdingSlug = searchParams.get('holding');
    const token = searchParams.get('token');

    useEffect(() => {
        async function loadBrandConfig(slug: string) {
            try {
                const q = query(collection(db, 'holdings'), where('slug', '==', slug.toLowerCase()));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    const data = snap.docs[0].data();
                    const b = data.config?.branding || data.branding || {};
                    if (b?.primaryColor) setBrandColor(b.primaryColor);
                    if (data.nombre) setBrandName(data.nombre);
                    if (data.logoUrl) setBrandLogo(data.logoUrl);
                }
            } catch (e) {
                console.warn('Could not load brand config:', e);
            }
        }

        async function loadData() {
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
                    const errData = await vacancyRes.json().catch(() => ({}));
                    alert(errData.error || 'Vacante no disponible');
                    let backUrl = `/portal/vacantes?token=${token}`;
                    if (holdingSlug) backUrl += `&holding=${holdingSlug}`;
                    router.push(backUrl);
                    return;
                }

                const vacancyData = await vacancyRes.json();
                const v = vacancyData.vacancy;
                setVacancy(v);

                // Use KQs from the vacancy if available, otherwise use defaults
                if (v.killerQuestions && v.killerQuestions.length > 0) {
                    setKqList(v.killerQuestions);
                }

                // Load brand config from vacancy data if available
                if (v.branding) {
                    if (v.branding.primaryColor) setBrandColor(v.branding.primaryColor);
                    if (v.branding.name) setBrandName(v.branding.name);
                    if (v.branding.logoUrl) setBrandLogo(v.branding.logoUrl);
                } else if (holdingSlug || v.holdingSlug) {
                    loadBrandConfig(holdingSlug || v.holdingSlug);
                }

            } catch (error) {
                console.error('Error loading data:', error);
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, [params.rqId, searchParams, router, token, holdingSlug]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!vacancy || !candidate) return;

        // Validate required answers
        for (const kq of kqList) {
            if (kq.isRequired && !answers[kq.id]) {
                alert(`Por favor responde: ${kq.question}`);
                return;
            }
        }

        setSubmitting(true);

        try {
            // Calculate if KQs passed
            let kqPassed = true;
            const kqResults: Record<string, { passed: boolean; answer: string }> = {};

            for (const kq of kqList) {
                const answer = answers[kq.id] || '';
                let passed = true;

                if (kq.requiredAnswer) {
                    passed = answer === kq.requiredAnswer;
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
                    candidateId: candidate.id,
                    rqId: vacancy.id,
                    kqAnswers: answers,
                    kqResults,
                    kqPassed,
                    flow: kqPassed ? 'A' : 'B',
                    sessionToken: token,
                    holdingSlug: holdingSlug || vacancy.holdingSlug || ''
                })
            });

            if (!response.ok) {
                throw new Error('Error al postular');
            }

            const appData = await response.json();
            const appId = appData.applicationId || '';

            setResult(kqPassed ? 'match' : 'review');

            // Flow A (passed KQs): redirect to interview scheduling
            if (kqPassed) {
                setTimeout(() => {
                    let url = `/portal/agendar/${vacancy.id}?token=${token}&appId=${appId}`;
                    if (holdingSlug) url += `&holding=${holdingSlug}`;
                    router.push(url);
                }, 1500);
            }

        } catch (error) {
            console.error('Error submitting application:', error);
            alert('Error al enviar postulación. Intenta de nuevo.');
        } finally {
            setSubmitting(false);
        }
    }

    const accentColor = brandColor || '#4F46E5';

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: accentColor }}>
                <div className="text-center text-white">
                    <div className="animate-spin w-12 h-12 border-4 border-white/30 border-t-white rounded-full mx-auto mb-4"></div>
                    <p>Cargando vacante...</p>
                </div>
            </div>
        );
    }

    if (result === 'match') {
        return (
            <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: accentColor }}>
                <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
                    {brandLogo && <img src={brandLogo} alt="Logo" className="h-16 w-auto mx-auto mb-4 object-contain" />}
                    <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: accentColor + '20' }}>
                        <span className="text-5xl">🎉</span>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Felicidades!</h2>
                    <p className="text-gray-600 mb-4">Tu perfil calza con esta vacante. El equipo de selección se contactará contigo pronto.</p>
                    <div className="rounded-xl p-4 mb-6" style={{ backgroundColor: accentColor + '15' }}>
                        <p className="font-bold italic uppercase" style={{ color: accentColor }}>{vacancy?.posicion}</p>
                        <p className="text-sm text-gray-600">{vacancy?.marcaNombre} • {vacancy?.tiendaNombre}</p>
                    </div>
                </div>
            </div>
        );
    }

    if (result === 'review') {
        return (
            <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: accentColor }}>
                <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
                    {brandLogo && <img src={brandLogo} alt="Logo" className="h-16 w-auto mx-auto mb-4 object-contain" />}
                    <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: accentColor + '20' }}>
                        <span className="text-5xl">📋</span>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Postulación Recibida</h2>
                    <p className="text-gray-600 mb-4">Tu perfil está siendo evaluado. Te contactaremos si eres seleccionado.</p>
                    <div className="rounded-xl p-4 mb-6" style={{ backgroundColor: accentColor + '15' }}>
                        <p className="font-bold italic uppercase" style={{ color: accentColor }}>{vacancy?.posicion}</p>
                        <p className="text-sm text-gray-600">{vacancy?.marcaNombre} • {vacancy?.tiendaNombre}</p>
                    </div>
                    <button
                        onClick={() => {
                            let url = `/empleos/${holdingSlug || vacancy?.holdingSlug || 'tambo'}`;
                            router.push(url);
                        }}
                        className="px-8 py-3 text-white rounded-2xl font-bold transition-all hover:brightness-110 shadow-lg"
                        style={{ backgroundColor: accentColor }}
                    >
                        Volver al Portal
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-20">
            {/* Top Navigation & Brand Header */}
            <div className="text-white relative overflow-hidden flex flex-col items-center" style={{ backgroundColor: accentColor }}>
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 80%, white 0%, transparent 50%)' }} />
                <div className="max-w-4xl w-full px-6 pt-8 pb-10 relative z-10 text-center">
                    <div className="flex justify-between items-center mb-6">
                        <button
                            onClick={() => router.back()}
                            className="text-white/70 hover:text-white transition-colors flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest"
                        >
                            <ChevronLeft size={16} /> Volver
                        </button>
                        {brandLogo && (
                            <div className="bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/20">
                                <img src={brandLogo} alt="Logo" className="h-6 w-auto object-contain" />
                            </div>
                        )}
                    </div>
                    <div className="inline-flex px-3 py-1 bg-white/20 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] mb-4">
                        Proceso de Postulación
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter leading-tight mb-3 px-4">{vacancy?.posicion}</h1>
                    <p className="text-white/80 text-xs font-bold uppercase tracking-widest bg-black/10 inline-block px-4 py-1.5 rounded-full">
                        {vacancy?.tiendaNombre} {vacancy?.tiendaDistrito ? ` • ${vacancy.tiendaDistrito}` : ''}
                    </p>
                </div>
            </div>

            {/* KQ Form */}
            <div className="max-w-4xl mx-auto px-5 -mt-6">
                <div className="bg-white rounded-[2.5rem] border border-gray-100 p-8 md:p-12 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)]">
                    <div className="mb-10 text-center">
                        <h2 className="text-xl font-black text-gray-900 uppercase italic tracking-tight">Preguntas de Filtro</h2>
                        <p className="text-gray-400 text-[13px] font-medium mt-1">Valida tus requisitos para completar tu postulación a <strong>{brandName || vacancy?.marcaNombre}</strong></p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-10">
                        {kqList.map((kq, index) => (
                            <div key={kq.id} className="group">
                                <label className="block text-gray-900 font-black uppercase italic tracking-tight text-base mb-4 flex items-center gap-3">
                                    <span className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] not-italic border-2 transition-colors group-focus-within:bg-gray-900 group-focus-within:text-white group-focus-within:border-gray-900" style={{ borderColor: accentColor + '40', color: accentColor }}>
                                        {index + 1}
                                    </span>
                                    {kq.question}
                                    {kq.isRequired && <span className="text-red-500 ml-1">*</span>}
                                </label>

                                <div className="pl-11">
                                    {kq.type === 'boolean' && (
                                        <div className="flex gap-3">
                                            {[
                                                { id: 'yes', label: '✓ Sí, cumplo', icon: '✅' },
                                                { id: 'no', label: '✗ No cumplo', icon: '❌' }
                                            ].map(val => (
                                                <label
                                                    key={val.id}
                                                    className={`flex-1 flex items-center justify-center gap-2 cursor-pointer px-5 py-3.5 rounded-xl border-2 transition-all font-black uppercase italic text-xs tracking-tight ${answers[kq.id] === val.id
                                                        ? 'border-transparent text-white shadow-md scale-[1.02]'
                                                        : 'border-gray-100 bg-gray-50/30 text-gray-400 hover:border-gray-200'
                                                        }`}
                                                    style={answers[kq.id] === val.id ? { backgroundColor: accentColor, borderColor: accentColor } : {}}
                                                >
                                                    <input
                                                        type="radio"
                                                        name={kq.id}
                                                        value={val.id}
                                                        checked={answers[kq.id] === val.id}
                                                        onChange={(e) => setAnswers({ ...answers, [kq.id]: e.target.value })}
                                                        className="sr-only"
                                                    />
                                                    {val.label}
                                                </label>
                                            ))}
                                        </div>
                                    )}

                                    {kq.type === 'select' && kq.options && (
                                        <select
                                            value={answers[kq.id] || ''}
                                            onChange={(e) => setAnswers({ ...answers, [kq.id]: e.target.value })}
                                            className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl hover:border-gray-200 focus:bg-white focus:ring-4 focus:ring-opacity-10 font-bold text-gray-900 appearance-none transition-all outline-none"
                                            style={{ '--tw-ring-color': accentColor } as any}
                                            onFocus={e => e.target.style.borderColor = accentColor}
                                            onBlur={e => e.target.style.borderColor = '#F3F4F6'}
                                        >
                                            <option value="">Selecciona una opción...</option>
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
                                            placeholder="Escribe tu respuesta aquí..."
                                            className="w-full px-5 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-xl hover:border-gray-200 focus:bg-white focus:ring-4 focus:ring-opacity-5 font-bold text-gray-900 text-sm transition-all outline-none"
                                            onFocus={e => e.target.style.borderColor = accentColor}
                                            onBlur={e => e.target.style.borderColor = '#F3F4F6'}
                                        />
                                    )}
                                </div>
                            </div>
                        ))}

                        <div className="pt-6">
                            {submitting ? (
                                <div className="w-full py-5 text-white font-black uppercase italic tracking-widest text-lg rounded-2xl flex items-center justify-center gap-3 shadow-xl"
                                    style={{ backgroundColor: accentColor }}>
                                    <div className="animate-spin w-6 h-6 border-4 border-white/20 border-t-white rounded-full"></div>
                                    <span>Procesando postulación...</span>
                                </div>
                            ) : (
                                <button
                                    type="submit"
                                    className="w-full py-4.5 text-white font-black uppercase italic tracking-widest text-base rounded-2xl transition-all hover:brightness-110 hover:-translate-y-0.5 shadow-xl active:scale-[0.98] flex items-center justify-center gap-3"
                                    style={{ backgroundColor: accentColor, padding: '1.2rem' }}
                                >
                                    📨 Enviar mi Postulación
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                <p className="text-center text-gray-300 text-[10px] font-black uppercase tracking-[0.4em] mt-10">
                    POWERED BY <span className="text-gray-400">LIAH BOT</span>
                </p>
            </div>
        </div>

    );
}

export default function PostularPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-indigo-900 flex items-center justify-center">
                <div className="animate-spin w-12 h-12 border-4 border-white/30 border-t-white rounded-full"></div>
            </div>
        }>
            <PostularContent />
        </Suspense>
    );
}
