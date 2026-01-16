'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, addDoc, collection, Timestamp, updateDoc } from 'firebase/firestore';
import { uploadCV } from '@/lib/storage/cv-upload';

interface KillerQuestion {
    id: string;
    pregunta: string;
    tipo: 'text' | 'yes_no' | 'multiple_choice';
    opciones?: string[];
    respuestaCorrecta?: string;
    esEliminatoria: boolean;
    orden: number;
}

interface Job {
    id: string;
    titulo: string;
    descripcion: string;
    requisitos?: string;
    beneficios?: string;
    tipoContrato: string;
    modalidad: string;
    salarioMin?: number;
    salarioMax?: number;
    mostrarSalario: boolean;
    vacantes: number;
    killerQuestions: KillerQuestion[];
    holdingId: string;
    status: string;
}

export default function JobApplicationPage() {
    const params = useParams();
    const jobId = params?.jobId as string;

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [job, setJob] = useState<Job | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Form fields
    const [nombre, setNombre] = useState('');
    const [email, setEmail] = useState('');
    const [telefono, setTelefono] = useState('');
    const [cvFile, setCvFile] = useState<File | null>(null);
    const [cvBase64, setCvBase64] = useState<string | null>(null);
    const [cvMimeType, setCvMimeType] = useState<string | null>(null);
    const [cvText, setCvText] = useState<string | null>(null);
    const [parsingCV, setParsingCV] = useState(false);
    const [killerAnswers, setKillerAnswers] = useState<Record<string, string>>({});

    useEffect(() => {
        if (jobId) {
            loadJob();
        }
    }, [jobId]);

    async function loadJob() {
        setLoading(true);
        try {
            const jobDoc = await getDoc(doc(db, 'talent_jobs', jobId));
            if (!jobDoc.exists()) {
                setError('Vacante no encontrada');
                return;
            }

            const jobData = { id: jobDoc.id, ...jobDoc.data() } as Job;

            if (jobData.status !== 'published') {
                setError('Esta vacante ya no está disponible');
                return;
            }

            setJob(jobData);
        } catch (err) {
            console.error('Error loading job:', err);
            setError('Error al cargar la vacante');
        } finally {
            setLoading(false);
        }
    }

    function updateAnswer(questionId: string, value: string) {
        setKillerAnswers(prev => ({ ...prev, [questionId]: value }));
    }

    function validateKillerQuestions(): { passed: boolean; failedQuestions: string[] } {
        if (!job?.killerQuestions) return { passed: true, failedQuestions: [] };

        const failedQuestions: string[] = [];

        for (const q of job.killerQuestions) {
            if (q.esEliminatoria && q.respuestaCorrecta) {
                const answer = killerAnswers[q.id]?.toLowerCase().trim();
                const expected = q.respuestaCorrecta.toLowerCase().trim();

                if (answer !== expected) {
                    failedQuestions.push(q.pregunta);
                }
            }
        }

        return {
            passed: failedQuestions.length === 0,
            failedQuestions
        };
    }

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        setCvFile(file);
        setCvMimeType(file.type);
        setParsingCV(true);

        try {
            const reader = new FileReader();

            // For AI parsing, we want base64 for vision/multimodal models
            reader.onload = async (event) => {
                const base64String = (event.target?.result as string).split(',')[1];
                setCvBase64(base64String);

                // Call Parse API
                const resp = await fetch('/api/talent/parse-cv', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        cvBase64: base64String,
                        mimeType: file.type
                    })
                });

                if (resp.ok) {
                    const { data } = await resp.json();
                    if (data) {
                        if (data.nombre && !nombre) setNombre(data.nombre);
                        if (data.email && !email) setEmail(data.email);
                        if (data.telefono && !telefono) setTelefono(data.telefono);
                        // Store parsed data for matching
                        setCvText(JSON.stringify(data));
                    }
                }
                setParsingCV(false);
            };
            reader.readAsDataURL(file);

        } catch (error) {
            console.error('Error parsing CV:', error);
            setParsingCV(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!job) return;

        // Validate required fields
        if (!nombre.trim() || !email.trim()) {
            alert('Nombre y email son requeridos');
            return;
        }

        // Validate all killer questions answered
        const unanswered = (job.killerQuestions || []).filter(
            q => !killerAnswers[q.id]?.trim()
        );
        if (unanswered.length > 0) {
            alert('Por favor responde todas las preguntas');
            return;
        }

        setSubmitting(true);
        try {
            // Check killer questions
            const { passed, failedQuestions } = validateKillerQuestions();

            // Upload CV to storage if provided
            let cvUrl: string | null = null;
            let cvPath: string | null = null;
            if (cvFile) {
                try {
                    const uploadResult = await uploadCV(cvFile, job.holdingId, job.id, email.trim());
                    cvUrl = uploadResult.url;
                    cvPath = uploadResult.path;
                } catch (uploadError) {
                    console.error('Error uploading CV:', uploadError);
                    // Continue without CV URL - not a blocking error
                }
            }

            // Prepare application data
            const applicationData = {
                jobId: job.id,
                jobTitulo: job.titulo,
                holdingId: job.holdingId,
                nombre: nombre.trim(),
                email: email.trim().toLowerCase(),
                telefono: telefono.trim() || null,
                cvFileName: cvFile?.name || null,
                cvUrl,
                cvPath,
                killerAnswers,
                killerQuestionsPassed: passed,
                failedKillerQuestions: failedQuestions,
                // Status based on KQ results
                status: passed ? 'new' : 'rejected_kq',
                matchScore: null, // Will be set by AI analysis if KQ passed
                funnelStage: passed ? 'applied' : 'rejected',
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            };

            const docRef = await addDoc(collection(db, 'talent_applications'), applicationData);

            // If passed KQ, run AI Matching
            if (passed) {
                try {
                    const matchResp = await fetch('/api/talent/match-candidate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            jobProfile: {
                                titulo: job.titulo,
                                descripcion: job.descripcion,
                                requisitos: job.requisitos
                            },
                            candidateData: {
                                nombre,
                                cvText: cvText || '', // Use parsed text or raw text if available
                                parsedData: applicationData // Full data
                            },
                            killerAnswers
                        })
                    });

                    if (matchResp.ok) {
                        const { data: matchData } = await matchResp.json();
                        await updateDoc(doc(db, 'talent_applications', docRef.id), {
                            matchScore: matchData.matchScore,
                            aiAnalysis: matchData,
                            updatedAt: Timestamp.now()
                        });
                    }
                } catch (matchErr) {
                    console.error('Error during AI matching:', matchErr);
                }
            }

            setSubmitted(true);

        } catch (err) {
            console.error('Error submitting application:', err);
            alert('Error al enviar la postulación');
        } finally {
            setSubmitting(false);
        }
    }

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
                    <div className="text-6xl mb-4">😔</div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">{error}</h1>
                    <p className="text-gray-600">Por favor verifica el enlace e intenta nuevamente</p>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
                    <div className="text-6xl mb-4">✅</div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">¡Postulación Enviada!</h1>
                    <p className="text-gray-600 mb-4">
                        Gracias por tu interés en <strong>{job?.titulo}</strong>.
                        Revisaremos tu perfil y te contactaremos pronto.
                    </p>
                    <p className="text-sm text-gray-500">
                        Recibirás un email de confirmación en {email}
                    </p>
                </div>
            </div>
        );
    }

    if (!job) return null;

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

    return (
        <div className="min-h-screen bg-gradient-to-br from-violet-50 to-indigo-100">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold">L</span>
                        </div>
                        <span className="font-semibold text-gray-900">Liah Careers</span>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-8">
                <div className="grid md:grid-cols-3 gap-8">
                    {/* Job Details */}
                    <div className="md:col-span-2 space-y-6">
                        <div className="bg-white rounded-2xl shadow-lg p-6">
                            <h1 className="text-2xl font-bold text-gray-900 mb-2">{job.titulo}</h1>

                            <div className="flex flex-wrap gap-2 mb-4">
                                <span className="px-3 py-1 bg-violet-100 text-violet-700 rounded-full text-sm font-medium">
                                    {tipoContratoLabels[job.tipoContrato] || job.tipoContrato}
                                </span>
                                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                                    {modalidadLabels[job.modalidad] || job.modalidad}
                                </span>
                                {job.mostrarSalario && job.salarioMin && (
                                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                                        💰 S/ {job.salarioMin.toLocaleString()}{job.salarioMax ? ` - ${job.salarioMax.toLocaleString()}` : '+'}
                                    </span>
                                )}
                            </div>

                            <div className="prose prose-gray max-w-none">
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">Descripción</h3>
                                <p className="text-gray-700 whitespace-pre-wrap">{job.descripcion}</p>

                                {job.requisitos && (
                                    <>
                                        <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">Requisitos</h3>
                                        <p className="text-gray-700 whitespace-pre-wrap">{job.requisitos}</p>
                                    </>
                                )}

                                {job.beneficios && (
                                    <>
                                        <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">Beneficios</h3>
                                        <p className="text-gray-700 whitespace-pre-wrap">{job.beneficios}</p>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Application Form */}
                    <div className="md:col-span-1">
                        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-6 sticky top-24">
                            <h2 className="text-lg font-bold text-gray-900 mb-4">Postúlate ahora</h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Nombre completo *
                                    </label>
                                    <input
                                        type="text"
                                        value={nombre}
                                        onChange={(e) => setNombre(e.target.value)}
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Email *
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Teléfono
                                    </label>
                                    <input
                                        type="tel"
                                        value={telefono}
                                        onChange={(e) => setTelefono(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        CV (PDF, Word) {parsingCV && <span className="text-violet-600 animate-pulse ml-2">✨ Analizando...</span>}
                                    </label>
                                    <input
                                        type="file"
                                        accept=".pdf,.doc,.docx"
                                        onChange={handleFileChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
                                    />
                                    {parsingCV && (
                                        <p className="text-xs text-violet-500 mt-1">
                                            IA está completando tus datos automáticamente...
                                        </p>
                                    )}
                                </div>

                                {/* Killer Questions */}
                                {job.killerQuestions && job.killerQuestions.length > 0 && (
                                    <div className="border-t border-gray-200 pt-4 mt-4">
                                        <h3 className="font-medium text-gray-900 mb-3">Preguntas filtro</h3>
                                        <div className="space-y-4">
                                            {job.killerQuestions.map((q) => (
                                                <div key={q.id}>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        {q.pregunta} *
                                                    </label>

                                                    {q.tipo === 'yes_no' ? (
                                                        <div className="flex gap-4">
                                                            <label className="flex items-center gap-2">
                                                                <input
                                                                    type="radio"
                                                                    name={`kq_${q.id}`}
                                                                    value="si"
                                                                    checked={killerAnswers[q.id] === 'si'}
                                                                    onChange={() => updateAnswer(q.id, 'si')}
                                                                    required
                                                                    className="text-violet-600"
                                                                />
                                                                <span>Sí</span>
                                                            </label>
                                                            <label className="flex items-center gap-2">
                                                                <input
                                                                    type="radio"
                                                                    name={`kq_${q.id}`}
                                                                    value="no"
                                                                    checked={killerAnswers[q.id] === 'no'}
                                                                    onChange={() => updateAnswer(q.id, 'no')}
                                                                    className="text-violet-600"
                                                                />
                                                                <span>No</span>
                                                            </label>
                                                        </div>
                                                    ) : q.tipo === 'multiple_choice' ? (
                                                        <select
                                                            value={killerAnswers[q.id] || ''}
                                                            onChange={(e) => updateAnswer(q.id, e.target.value)}
                                                            required
                                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                                        >
                                                            <option value="">Selecciona...</option>
                                                            {q.opciones?.map((opt, i) => (
                                                                <option key={i} value={opt}>{opt}</option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <input
                                                            type="text"
                                                            value={killerAnswers[q.id] || ''}
                                                            onChange={(e) => updateAnswer(q.id, e.target.value)}
                                                            required
                                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                                        />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
                                >
                                    {submitting ? '⏳ Enviando...' : '📨 Enviar Postulación'}
                                </button>

                                <p className="text-xs text-gray-500 text-center">
                                    Al postularte aceptas nuestra política de privacidad
                                </p>
                            </div>
                        </form>
                    </div>
                </div>
            </main>
        </div>
    );
}
