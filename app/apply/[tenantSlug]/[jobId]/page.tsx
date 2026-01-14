'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, addDoc, Timestamp } from 'firebase/firestore';

interface Job {
    id: string;
    titulo: string;
    jd_content: string;
    departamento?: string;
    sede?: string;
    killerQuestions?: KillerQuestion[];
    holdingId: string;
}

interface KillerQuestion {
    question: string;
    type: 'yes_no' | 'numeric' | 'text';
    expectedAnswer?: string;
    isCritical: boolean;
}

interface KQAnswer {
    questionId: number;
    answer: string;
}

/**
 * Public Application Form for Liah Talent
 * Route: /apply/[tenantSlug]/[jobId]
 */
export default function ApplyPage() {
    const params = useParams();
    const router = useRouter();
    const tenantSlug = params.tenantSlug as string;
    const jobId = params.jobId as string;

    const [job, setJob] = useState<Job | null>(null);
    const [holding, setHolding] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [step, setStep] = useState<'info' | 'kq' | 'cv' | 'success' | 'rejected'>('info');
    const [submitting, setSubmitting] = useState(false);

    // Form data
    const [nombre, setNombre] = useState('');
    const [email, setEmail] = useState('');
    const [telefono, setTelefono] = useState('');
    const [linkedin, setLinkedin] = useState('');
    const [kqAnswers, setKqAnswers] = useState<KQAnswer[]>([]);
    const [cvFile, setCvFile] = useState<File | null>(null);

    useEffect(() => {
        loadJobData();
    }, [tenantSlug, jobId]);

    async function loadJobData() {
        try {
            // Get job
            const jobRef = doc(db, 'talent_jobs', jobId);
            const jobSnap = await getDoc(jobRef);

            if (!jobSnap.exists()) {
                setLoading(false);
                return;
            }

            const jobData = { id: jobSnap.id, ...jobSnap.data() } as Job;
            setJob(jobData);

            // Get holding info
            const holdingRef = doc(db, 'holdings', jobData.holdingId);
            const holdingSnap = await getDoc(holdingRef);
            if (holdingSnap.exists()) {
                setHolding({ id: holdingSnap.id, ...holdingSnap.data() });
            }

            // Initialize KQ answers
            if (jobData.killerQuestions) {
                setKqAnswers(jobData.killerQuestions.map((_, idx) => ({
                    questionId: idx,
                    answer: ''
                })));
            }
        } catch (error) {
            console.error('Error loading job:', error);
        } finally {
            setLoading(false);
        }
    }

    function updateKQAnswer(idx: number, answer: string) {
        setKqAnswers(prev => prev.map((kq, i) =>
            i === idx ? { ...kq, answer } : kq
        ));
    }

    /**
     * THE GATEKEEPER - Evaluates Killer Questions
     * Returns: { passed: boolean, failedCritical: boolean }
     */
    function evaluateKillerQuestions(): { passed: boolean; failedCritical: boolean } {
        if (!job?.killerQuestions) return { passed: true, failedCritical: false };

        for (let i = 0; i < job.killerQuestions.length; i++) {
            const kq = job.killerQuestions[i];
            const answer = kqAnswers[i]?.answer;

            let passed = true;

            switch (kq.type) {
                case 'yes_no':
                    passed = answer === kq.expectedAnswer;
                    break;
                case 'numeric':
                    passed = Number(answer) >= Number(kq.expectedAnswer);
                    break;
                case 'text':
                    passed = Boolean(answer && answer.trim().length > 0);
                    break;
            }

            // If failed a CRITICAL question, immediately return
            if (!passed && kq.isCritical) {
                return { passed: false, failedCritical: true };
            }
        }

        return { passed: true, failedCritical: false };
    }

    async function handleSubmit() {
        if (!job) return;

        setSubmitting(true);
        try {
            // Evaluate Killer Questions
            const kqResult = evaluateKillerQuestions();

            // Determine initial status
            // If failed critical KQ -> AUTO_REJECTED (no AI analysis!)
            // If passed -> PENDING_ANALYSIS (will trigger AI)
            const status = kqResult.failedCritical ? 'AUTO_REJECTED' : 'PENDING_ANALYSIS';

            // Prepare candidate data
            const candidateData = {
                jobId: job.id,
                holdingId: job.holdingId,
                nombre,
                email,
                telefono,
                linkedin,
                kqAnswers,
                kqPassed: kqResult.passed,
                status,
                // CV will be uploaded separately
                cvUrl: null,
                // AI analysis will be populated later if PENDING_ANALYSIS
                matchScore: null,
                aiAnalysis: null,
                appliedAt: Timestamp.now()
            };

            // Save to Firestore
            const candidatesRef = collection(db, 'talent_candidates');
            await addDoc(candidatesRef, candidateData);

            // Show appropriate result
            if (kqResult.failedCritical) {
                setStep('rejected');
            } else {
                setStep('success');
            }

        } catch (error) {
            console.error('Error submitting application:', error);
            alert('Error enviando postulación. Intenta de nuevo.');
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500" />
            </div>
        );
    }

    if (!job) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">❌</div>
                    <h1 className="text-2xl font-bold text-gray-900">Vacante no encontrada</h1>
                    <p className="text-gray-600 mt-2">Esta posición ya no está disponible</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-violet-50 to-indigo-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 py-4">
                <div className="max-w-3xl mx-auto px-6">
                    <div className="flex items-center gap-4">
                        {holding?.logo ? (
                            <img src={holding.logo} alt={holding.nombre} className="h-10" />
                        ) : (
                            <div className="h-10 w-10 bg-violet-100 rounded-lg flex items-center justify-center">
                                <span className="text-violet-600 font-bold">
                                    {holding?.nombre?.[0] || 'C'}
                                </span>
                            </div>
                        )}
                        <div>
                            <p className="text-sm text-gray-600">{holding?.nombre || 'Empresa'}</p>
                            <h1 className="font-bold text-gray-900">{job.titulo}</h1>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-6 py-8">
                {/* Progress */}
                {step !== 'success' && step !== 'rejected' && (
                    <div className="flex items-center justify-center gap-2 mb-8">
                        {['info', 'kq', 'cv'].map((s, i) => (
                            <div key={s} className="flex items-center">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step === s ? 'bg-violet-600 text-white' :
                                    ['info', 'kq', 'cv'].indexOf(step) > i ? 'bg-green-500 text-white' :
                                        'bg-gray-200 text-gray-500'
                                    }`}>
                                    {i + 1}
                                </div>
                                {i < 2 && <div className="w-12 h-1 bg-gray-200 mx-1" />}
                            </div>
                        ))}
                    </div>
                )}

                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                    {/* Step 1: Personal Info */}
                    {step === 'info' && (
                        <div className="p-8">
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Información Personal</h2>
                            <p className="text-gray-600 mb-6">Cuéntanos sobre ti</p>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo *</label>
                                    <input
                                        type="text"
                                        value={nombre}
                                        onChange={(e) => setNombre(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
                                        placeholder="Juan Pérez"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
                                        placeholder="juan@email.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono *</label>
                                    <input
                                        type="tel"
                                        value={telefono}
                                        onChange={(e) => setTelefono(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
                                        placeholder="+51 999 999 999"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn (opcional)</label>
                                    <input
                                        type="url"
                                        value={linkedin}
                                        onChange={(e) => setLinkedin(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
                                        placeholder="https://linkedin.com/in/tuusuario"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={() => job.killerQuestions?.length ? setStep('kq') : setStep('cv')}
                                disabled={!nombre || !email || !telefono}
                                className="w-full mt-6 py-4 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 transition-colors disabled:opacity-50"
                            >
                                Continuar →
                            </button>
                        </div>
                    )}

                    {/* Step 2: Killer Questions */}
                    {step === 'kq' && job.killerQuestions && (
                        <div className="p-8">
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Preguntas de Filtro</h2>
                            <p className="text-gray-600 mb-6">Responde las siguientes preguntas</p>

                            <div className="space-y-6">
                                {job.killerQuestions.map((kq, idx) => (
                                    <div key={idx} className="border border-gray-200 rounded-xl p-4">
                                        <p className="font-medium text-gray-900 mb-3">
                                            {kq.question}
                                            {kq.isCritical && <span className="text-red-500 ml-1">*</span>}
                                        </p>

                                        {kq.type === 'yes_no' && (
                                            <div className="flex gap-4">
                                                {['Sí', 'No'].map(opt => (
                                                    <button
                                                        key={opt}
                                                        onClick={() => updateKQAnswer(idx, opt)}
                                                        className={`flex-1 py-3 rounded-lg border-2 font-medium transition-colors ${kqAnswers[idx]?.answer === opt
                                                            ? 'border-violet-500 bg-violet-50 text-violet-700'
                                                            : 'border-gray-200 hover:border-gray-300'
                                                            }`}
                                                    >
                                                        {opt}
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {kq.type === 'numeric' && (
                                            <input
                                                type="number"
                                                value={kqAnswers[idx]?.answer || ''}
                                                onChange={(e) => updateKQAnswer(idx, e.target.value)}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
                                                placeholder="Ingresa un número"
                                            />
                                        )}

                                        {kq.type === 'text' && (
                                            <textarea
                                                value={kqAnswers[idx]?.answer || ''}
                                                onChange={(e) => updateKQAnswer(idx, e.target.value)}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
                                                rows={3}
                                                placeholder="Tu respuesta..."
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-4 mt-6">
                                <button
                                    onClick={() => setStep('info')}
                                    className="flex-1 py-4 border border-gray-300 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                                >
                                    ← Atrás
                                </button>
                                <button
                                    onClick={() => setStep('cv')}
                                    disabled={kqAnswers.some(a => !a.answer)}
                                    className="flex-1 py-4 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 transition-colors disabled:opacity-50"
                                >
                                    Continuar →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: CV Upload */}
                    {step === 'cv' && (
                        <div className="p-8">
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Sube tu CV</h2>
                            <p className="text-gray-600 mb-6">Adjunta tu currículum en PDF</p>

                            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
                                <input
                                    type="file"
                                    accept=".pdf"
                                    onChange={(e) => setCvFile(e.target.files?.[0] || null)}
                                    className="hidden"
                                    id="cv-upload"
                                />
                                <label htmlFor="cv-upload" className="cursor-pointer">
                                    <div className="text-5xl mb-4">📄</div>
                                    {cvFile ? (
                                        <p className="text-violet-600 font-medium">{cvFile.name}</p>
                                    ) : (
                                        <>
                                            <p className="font-medium text-gray-900">Click para subir</p>
                                            <p className="text-sm text-gray-500 mt-1">PDF, máximo 5MB</p>
                                        </>
                                    )}
                                </label>
                            </div>

                            <div className="flex gap-4 mt-6">
                                <button
                                    onClick={() => job.killerQuestions?.length ? setStep('kq') : setStep('info')}
                                    className="flex-1 py-4 border border-gray-300 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                                >
                                    ← Atrás
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    className="flex-1 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                                >
                                    {submitting ? '⏳ Enviando...' : '✓ Enviar Postulación'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Success */}
                    {step === 'success' && (
                        <div className="p-12 text-center">
                            <div className="text-6xl mb-4">🎉</div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Postulación Enviada!</h2>
                            <p className="text-gray-600 mb-6">
                                Gracias por tu interés en {job.titulo}. Revisaremos tu perfil y te contactaremos pronto.
                            </p>
                            <button
                                onClick={() => window.close()}
                                className="px-6 py-3 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 transition-colors"
                            >
                                Cerrar
                            </button>
                        </div>
                    )}

                    {/* Rejected */}
                    {step === 'rejected' && (
                        <div className="p-12 text-center">
                            <div className="text-6xl mb-4">😔</div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Gracias por tu interés</h2>
                            <p className="text-gray-600 mb-6">
                                Lamentablemente, tu perfil no cumple con los requisitos para esta posición en este momento. Te invitamos a explorar otras oportunidades.
                            </p>
                        </div>
                    )}
                </div>

                {/* Job Description Preview */}
                {step !== 'success' && step !== 'rejected' && (
                    <div className="mt-8 bg-white rounded-2xl border border-gray-200 p-6">
                        <h3 className="font-bold text-gray-900 mb-4">Sobre el puesto</h3>
                        <div className="prose prose-sm text-gray-600 max-w-none whitespace-pre-wrap">
                            {job.jd_content || 'Sin descripción disponible'}
                        </div>
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="py-6 text-center text-sm text-gray-500">
                Powered by <span className="font-semibold text-violet-600">Liah Talent</span>
            </footer>
        </div>
    );
}
