'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, getDoc, updateDoc, doc, Timestamp, addDoc } from 'firebase/firestore';
import { notifyNewApplication } from '@/lib/notifications/notification-service';
import { uploadCV } from '@/lib/storage/cv-upload';
import JobPostingSchema from '@/components/seo/JobPostingSchema';

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
    holdingNombre?: string;
    holdingLogo?: string;
    ubicacion?: string;
    createdAt?: any;
    assignedRecruiterEmail?: string;
    assignedRecruiterNombre?: string;
}

// Holding branding configs
const HOLDING_CONFIGS: Record<string, {
    name: string;
    logo: string;
    colors: { primary: string; primaryDeep: string; accent: string; light: string }
}> = {
    'llamagas': {
        name: 'Llamagas',
        logo: '/logos/llamagas-full-logo.png',
        colors: { primary: '#572483', primaryDeep: '#3D1C5C', accent: '#FFB800', light: '#E0CFF2' }
    },
    'ngr': {
        name: 'NGR',
        logo: '/logos/ngr-logo.png',
        colors: { primary: '#1A1A1A', primaryDeep: '#0A0A0A', accent: '#FF6B35', light: '#A0A0A0' }
    }
};

export default function JobApplicationPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const jobId = params?.jobId as string;
    const inviteId = searchParams?.get('inviteId');

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [job, setJob] = useState<Job | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [brandColors, setBrandColors] = useState({ primary: '#7c3aed', primaryDeep: '#5b21b6', accent: '#7c3aed', light: '#ede9fe' });

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
    const [salaryExpectation, setSalaryExpectation] = useState<number | null>(null);
    const [salaryNegotiable, setSalaryNegotiable] = useState(false);

    useEffect(() => {
        if (jobId) {
            loadJob();
        }
        if (inviteId) {
            loadInvitation();
        }
    }, [jobId, inviteId]);

    // Dynamic page title
    useEffect(() => {
        if (job) {
            document.title = `${job.titulo} - ${job.holdingNombre || 'Empleo'}`;
        }
    }, [job]);

    async function loadInvitation() {
        if (!inviteId) return;
        try {
            const appDoc = await getDoc(doc(db, 'talent_applications', inviteId));
            if (appDoc.exists()) {
                const data = appDoc.data();
                setNombre(data.nombre || '');
                setEmail(data.email || '');
                setTelefono(data.telefono || '');
            }
        } catch (err) {
            console.error('Error loading invitation:', err);
        }
    }

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

            // Fetch holding info for SEO schema and branding
            if (jobData.holdingId) {
                const holdingSlug = jobData.holdingId.toLowerCase();
                const predefinedConfig = HOLDING_CONFIGS[holdingSlug];

                // Set brand colors from predefined config
                if (predefinedConfig?.colors) {
                    setBrandColors(predefinedConfig.colors);
                }

                // Try to fetch from Firestore first
                try {
                    const holdingDoc = await getDoc(doc(db, 'holdings', jobData.holdingId));
                    if (holdingDoc.exists()) {
                        const holdingData = holdingDoc.data();
                        jobData.holdingNombre = holdingData.nombre || predefinedConfig?.name;
                        jobData.holdingLogo = holdingData.logoUrl || predefinedConfig?.logo;
                    } else if (predefinedConfig) {
                        // Use predefined config as fallback
                        jobData.holdingNombre = predefinedConfig.name;
                        jobData.holdingLogo = predefinedConfig.logo;
                    }
                } catch (holdingErr) {
                    console.error('Error loading holding:', holdingErr);
                    // Use predefined config on error
                    if (predefinedConfig) {
                        jobData.holdingNombre = predefinedConfig.name;
                        jobData.holdingLogo = predefinedConfig.logo;
                    }
                }
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
            // Check for duplicate application
            const existingQuery = query(
                collection(db, 'talent_applications'),
                where('email', '==', email.trim().toLowerCase()),
                where('jobId', '==', job.id)
            );
            const existingSnap = await getDocs(existingQuery);

            if (!existingSnap.empty) {
                setSubmitting(false);
                alert('Ya has postulado a esta vacante anteriormente. Revisa tu correo para más información.');
                return;
            }

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
                salaryExpectation: salaryExpectation || null,
                salaryNegotiable: salaryNegotiable,
                killerAnswers,
                killerQuestionsPassed: passed,
                failedKillerQuestions: failedQuestions,
                // Status based on KQ results
                status: passed ? 'new' : 'rejected_kq',
                matchScore: null, // Will be set by AI analysis if KQ passed
                funnelStage: passed ? 'applied' : 'rejected',
                updatedAt: Timestamp.now(),
                isInvitation: !!inviteId, // Keep track if it was an invitation
                ...(inviteId ? {} : { createdAt: Timestamp.now() }) // Only add createdAt if new
            };

            let applicationId = inviteId;

            if (inviteId) {
                // Update existing invitation
                await updateDoc(doc(db, 'talent_applications', inviteId), applicationData);
            } else {
                // Create new application
                const docRef = await addDoc(collection(db, 'talent_applications'), applicationData);
                applicationId = docRef.id;
            }

            // If passed KQ, run AI Matching
            if (passed && applicationId) {
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
                        await updateDoc(doc(db, 'talent_applications', applicationId), {
                            matchScore: matchData.matchScore,
                            aiAnalysis: matchData,
                            updatedAt: Timestamp.now()
                        });
                    }
                } catch (matchErr) {
                    console.error('Error during AI matching:', matchErr);
                }
            }

            // Send confirmation email to candidate
            try {
                await fetch('/api/talent/send-application-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        applicationId,
                        candidateName: nombre.trim(),
                        candidateEmail: email.trim().toLowerCase(),
                        jobTitle: job.titulo,
                        holdingId: job.holdingId
                    })
                });
            } catch (emailErr) {
                console.error('Error sending confirmation email:', emailErr);
            }

            // Internal Notification for Recruiter
            if (passed && job.assignedRecruiterEmail) {
                try {
                    await notifyNewApplication(
                        job.holdingId,
                        job.assignedRecruiterEmail,
                        nombre.trim(),
                        job.titulo,
                        jobId,
                        // We might have matchScore from previous AI analysis step
                    );
                } catch (notifyErr) {
                    console.error('Error sending recruiter notification:', notifyErr);
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
        <>
            {/* Google Jobs Schema */}
            <JobPostingSchema
                job={job}
                companyName={job.holdingNombre || 'Empresa'}
                companyLogo={job.holdingLogo}
                location={job.ubicacion}
            />

            <div style={{ minHeight: '100vh', background: `linear-gradient(135deg, ${brandColors.light}20 0%, white 100%)` }}>
                {/* Header - Dynamic holding branding */}
                <header style={{
                    backgroundColor: brandColors.primary,
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
                }}>
                    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <a
                            href={`/empleos/${job.holdingId?.toLowerCase() || 'llamagas'}`}
                            style={{ display: 'flex', alignItems: 'center', gap: 16, textDecoration: 'none', cursor: 'pointer' }}
                        >
                            {job.holdingLogo && (
                                <img
                                    src={job.holdingLogo}
                                    alt={job.holdingNombre || 'Logo'}
                                    style={{ height: 50, objectFit: 'contain' }}
                                />
                            )}
                            <span style={{ fontSize: 22, fontWeight: 700, color: brandColors.accent }}>{job.holdingNombre || 'Careers'}</span>
                        </a>

                        {/* Share button - Web Share API */}
                        <button
                            onClick={async () => {
                                const shareData = {
                                    title: `${job.titulo} - ${job.holdingNombre}`,
                                    text: `¡Mira esta oportunidad laboral en ${job.holdingNombre}! ${job.titulo}`,
                                    url: window.location.href
                                };

                                if (navigator.share) {
                                    try {
                                        await navigator.share(shareData);
                                    } catch (err) {
                                        // User cancelled or error
                                        console.log('Share cancelled');
                                    }
                                } else {
                                    // Fallback: copy to clipboard
                                    navigator.clipboard.writeText(window.location.href);
                                    alert('¡Link copiado al portapapeles!');
                                }
                            }}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: brandColors.accent,
                                border: 'none',
                                borderRadius: 8,
                                color: brandColors.primaryDeep,
                                fontSize: 14,
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                            }}
                        >
                            🔗 Compartir
                        </button>
                    </div>
                </header>

                <main style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 24px 80px' }}>
                    {/* Mobile-first: stacked, Desktop: 2:1 grid (job description 2fr : form 1fr) */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Job Details - Takes 2 columns on desktop */}
                        <div className="lg:col-span-2 space-y-6">
                            <div style={{ backgroundColor: 'white', borderRadius: 24, boxShadow: '0 10px 40px rgba(0,0,0,0.1)', padding: 32 }}>
                                <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.25rem)', fontWeight: 700, color: '#111827', marginBottom: 16 }}>{job.titulo}</h1>

                                <div className="flex flex-wrap gap-2 mb-6">
                                    <span className="px-3 py-1.5 bg-violet-100 text-violet-700 rounded-full text-sm font-medium">
                                        {tipoContratoLabels[job.tipoContrato] || job.tipoContrato}
                                    </span>
                                    <span className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                                        {modalidadLabels[job.modalidad] || job.modalidad}
                                    </span>
                                    {job.mostrarSalario && job.salarioMin && (
                                        <span className="px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                                            💰 S/ {job.salarioMin.toLocaleString()}{job.salarioMax ? ` - ${job.salarioMax.toLocaleString()}` : '+'}
                                        </span>
                                    )}
                                </div>

                                <div className="prose prose-gray max-w-none">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Descripción</h3>
                                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{job.descripcion}</p>

                                    {job.requisitos && (
                                        <>
                                            <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">Requisitos</h3>
                                            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{job.requisitos}</p>
                                        </>
                                    )}

                                    {job.beneficios && (
                                        <>
                                            <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">Beneficios</h3>
                                            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{job.beneficios}</p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Application Form - Takes 1 column on desktop */}
                        <div className="lg:col-span-1">
                            <form onSubmit={handleSubmit} style={{ backgroundColor: '#f9fafb', borderRadius: 24, boxShadow: '0 10px 40px rgba(0,0,0,0.1)', padding: 32, position: 'sticky', top: 100, border: '1px solid #e5e7eb' }}>
                                <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111827', marginBottom: 24 }}>Postúlate ahora</h2>

                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Nombre completo *
                                        </label>
                                        <input
                                            type="text"
                                            value={nombre}
                                            onChange={(e) => setNombre(e.target.value)}
                                            required
                                            className="w-full px-4 py-3 min-h-[48px] border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 bg-white"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Email *
                                        </label>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            className="w-full px-4 py-3 min-h-[48px] border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 bg-white"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Teléfono *
                                        </label>
                                        <input
                                            type="tel"
                                            value={telefono}
                                            onChange={(e) => setTelefono(e.target.value)}
                                            required
                                            className="w-full px-4 py-3 min-h-[48px] border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 bg-white"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            CV (PDF, Word) * {parsingCV && <span className="text-violet-600 animate-pulse ml-2">✨ Analizando...</span>}
                                        </label>
                                        <input
                                            type="file"
                                            accept=".pdf,.doc,.docx"
                                            onChange={handleFileChange}
                                            required
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
                                        />
                                        {parsingCV && (
                                            <p className="text-xs text-violet-500 mt-1">
                                                IA está completando tus datos automáticamente...
                                            </p>
                                        )}
                                    </div>

                                    {/* Salary Expectations - Fixed question */}
                                    <div className="border-t border-gray-200 pt-4 mt-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            💰 Expectativas Salariales (S/) *
                                        </label>
                                        <div className="flex items-center gap-4">
                                            <div className="flex-1">
                                                <input
                                                    type="number"
                                                    value={salaryExpectation || ''}
                                                    onChange={(e) => setSalaryExpectation(e.target.value ? parseInt(e.target.value) : null)}
                                                    placeholder="Ej: 3500"
                                                    min={0}
                                                    required
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                                                />
                                            </div>
                                            <label className="flex items-center gap-2 text-sm text-gray-600 whitespace-nowrap">
                                                <input
                                                    type="checkbox"
                                                    checked={salaryNegotiable}
                                                    onChange={(e) => setSalaryNegotiable(e.target.checked)}
                                                    className="w-4 h-4 text-violet-600 rounded"
                                                />
                                                Negociable
                                            </label>
                                        </div>
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
                                        style={{
                                            width: '100%',
                                            padding: '16px',
                                            minHeight: 48,
                                            background: `linear-gradient(135deg, ${brandColors.primary} 0%, ${brandColors.primaryDeep} 100%)`,
                                            color: 'white',
                                            borderRadius: 12,
                                            fontWeight: 600,
                                            fontSize: 18,
                                            border: 'none',
                                            cursor: submitting ? 'not-allowed' : 'pointer',
                                            opacity: submitting ? 0.5 : 1,
                                            boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
                                            transition: 'transform 0.2s, opacity 0.2s'
                                        }}
                                    >
                                        {submitting ? '⏳ Enviando...' : '📨 Enviar Postulación'}
                                    </button>

                                    <p className="text-xs text-gray-500 text-center mt-4">
                                        Al postularte aceptas nuestra política de privacidad
                                    </p>
                                </div>
                            </form>
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
}
