'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, addDoc, Timestamp } from 'firebase/firestore';
import { uploadCUL } from '@/lib/storage/cul-upload';

interface Job {
    id: string;
    titulo: string;
    jd_content: string;
    killerQuestions?: Array<{
        question: string;
        type: 'yes_no' | 'numeric' | 'text';
        expectedAnswer?: string;
        isCritical: boolean;
    }>;
    holdingId: string;
}

/**
 * Public Application Form for Liah Talent Jobs
 * Route: /talent-apply/[jobId]
 */
export default function TalentApplyPage() {
    const params = useParams();
    const jobId = params.jobId as string;

    const [step, setStep] = useState<'info' | 'kq' | 'cul' | 'cv' | 'schedule' | 'done'>('info');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [job, setJob] = useState<Job | null>(null);
    const [error, setError] = useState('');

    // Form data
    const [nombre, setNombre] = useState('');
    const [email, setEmail] = useState('');
    const [telefono, setTelefono] = useState('');
    const [linkedin, setLinkedin] = useState('');
    const [kqAnswers, setKqAnswers] = useState<Record<number, string>>({});
    const [culFile, setCulFile] = useState<File | null>(null);
    const [dni, setDni] = useState('');
    const [validatingCUL, setValidatingCUL] = useState(false);
    const [culError, setCulError] = useState<string | null>(null);

    // Scheduling data
    const [availableSlots, setAvailableSlots] = useState<{ iso: string, display: string }[]>([]);
    const [selectedSlot, setSelectedSlot] = useState<string>('');
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [candidateId, setCandidateId] = useState<string | null>(null);

    useEffect(() => {
        async function loadJob() {
            if (!jobId) return;

            try {
                const jobRef = doc(db, 'talent_jobs', jobId);
                const jobDoc = await getDoc(jobRef);

                if (!jobDoc.exists()) {
                    setError('Vacante no encontrada');
                    return;
                }

                setJob({
                    id: jobDoc.id,
                    ...jobDoc.data()
                } as Job);
            } catch (err) {
                console.error('Error loading job:', err);
                setError('Error cargando la vacante');
            } finally {
                setLoading(false);
            }
        }

        loadJob();
    }, [jobId]);

    const handleSubmit = async () => {
        if (!job) return;

        setSubmitting(true);
        try {
            // Evaluate Killer Questions
            let autoRejected = false;
            let failedKQ = '';

            if (job.killerQuestions) {
                for (let i = 0; i < job.killerQuestions.length; i++) {
                    const kq = job.killerQuestions[i];
                    const answer = kqAnswers[i] || '';

                    if (kq.isCritical) {
                        let passed = true;

                        if (kq.type === 'yes_no') {
                            passed = answer === kq.expectedAnswer;
                        } else if (kq.type === 'numeric') {
                            const min = parseInt(kq.expectedAnswer || '0');
                            const userVal = parseInt(answer);
                            passed = !isNaN(userVal) && userVal >= min;
                        }

                        if (!passed) {
                            autoRejected = true;
                            failedKQ = kq.question;
                            break;
                        }
                    }
                }
            }

            // Save candidate application (Base data)
            const candidateData = {
                jobId: job.id,
                holdingId: job.holdingId,
                nombre,
                email,
                telefono,
                linkedin,
                kqAnswers,
                status: autoRejected ? 'AUTO_REJECTED' : 'PENDING_ANALYSIS',
                autoRejectedReason: autoRejected ? `Falló KQ crítica: ${failedKQ}` : null,
                appliedAt: Timestamp.now(),
                matchScore: null,
                aiAnalysis: null,
                culUrl: null,
                culValidationStatus: 'pending',
                dni
            };

            const candidateDoc = await addDoc(collection(db, 'talent_candidates'), candidateData);
            const newCandidateId = candidateDoc.id;
            setCandidateId(newCandidateId);

            // Handle CUL Upload and Validation
            if (culFile) {
                try {
                    const { url } = await uploadCUL(culFile, job.holdingId, job.id, email);

                    // Trigger AI validation
                    fetch('/api/talent/auto-validate-cul', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            candidateId: newCandidateId,
                            culUrl: url,
                            candidateDni: dni
                        })
                    }).catch(err => console.error('Error starting CUL AI validation:', err));
                } catch (culErr) {
                    console.error('Error in CUL process:', culErr);
                }
            }

            if (autoRejected) {
                setStep('done');
            } else {
                // If not rejected, try to load time slots and go to schedule
                loadTimeSlots();
                setStep('schedule');
            }
        } catch (err) {
            console.error('Error submitting application:', err);
            alert('Error al enviar la aplicación');
            setSubmitting(false);
        }
    };

    const loadTimeSlots = async () => {
        setLoadingSlots(true);
        try {
            // Hardcode Tambo Store logic - we assume job.holdingId is what is used, or there's a specific store map.
            // Using talent_jobs generally means the job ID or the JD has the tienda data. For now, fetch generic.
            // We pass a dummy 'tienda1' just to test the concept
            const res = await fetch(`/api/talent/schedule-interview?tiendaId=tienda_demo_tambo`);
            const data = await res.json();
            if (data.slots) {
                setAvailableSlots(data.slots);
            }
        } catch (e) {
            console.error('Error loading slots:', e);
        } finally {
            setLoadingSlots(false);
        }
    };

    const handleConfirmSchedule = async () => {
        if (!selectedSlot || !candidateId) return;
        setSubmitting(true);
        try {
            await fetch('/api/talent/schedule-interview/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    candidateId,
                    slotIso: selectedSlot,
                    tiendaId: 'tienda_demo_tambo', // In real life, fetch from job
                    vacanteId: job?.id
                })
            });
            setStep('done');
        } catch (e) {
            console.error('Error confirming slot:', e);
            alert('Error al agendar. Intenta de nuevo.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleVerifyCUL = async () => {
        if (!culFile) {
            setCulError('Es necesario subir tu Certificado Único Laboral (PDF o Imagen) para continuar.');
            return;
        }

        setValidatingCUL(true);
        setCulError(null);

        try {
            const formData = new FormData();
            formData.append('file', culFile);

            const res = await fetch('/api/validate-cul', {
                method: 'POST',
                body: formData
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Error procesando el documento');
            }

            const data = await res.json();

            if (!data.isValid || !data.dni) {
                setCulError('⚠️ El documento subido no parece ser válido o sus datos están ilegibles. Asegúrate de que sea tu CUL/DNI real.');
                return;
            }

            // Verify DNI match
            const inputDni = dni.trim();
            const extractedDni = data.dni.trim();

            if (inputDni !== extractedDni) {
                setCulError(`❌ Error de validación: El DNI que ingresaste en el Paso 1 (${inputDni}) no coincide con el DNI extraído del documento (${extractedDni}). Por favor, corrige tus datos o sube el certificado que te corresponde.`);
                return;
            }

            // Nombres Verification could be added here if needed, but for now DNI matching is the critical blocker indicator.

            // Si pasamos todas las validaciones:
            setStep('cv');

        } catch (err: any) {
            console.error('Validation error:', err);
            setCulError('Hubo un error al contactar al servicio de verificación (IA). Intenta de nuevo.');
        } finally {
            setValidatingCUL(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600" />
            </div>
        );
    }

    if (error || !job) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">❌</div>
                    <h1 className="text-2xl font-bold text-gray-900">{error || 'Vacante no encontrada'}</h1>
                </div>
            </div>
        );
    }

    if (step === 'done') {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
                    <div className="text-6xl mb-4">✅</div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">¡Aplicación Recibida!</h1>
                    <p className="text-gray-600 mb-6">
                        Gracias por tu interés en <strong>{job.titulo}</strong>.
                        Te contactaremos pronto.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-t-2xl p-6 text-white">
                    <h1 className="text-2xl font-bold">{job.titulo}</h1>
                    <p className="text-white/80 mt-1">Aplica a esta posición</p>
                </div>

                {/* Step Indicator */}
                <div className="bg-white border-b border-gray-100 px-6 py-4">
                    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
                        {['info', 'kq', 'cv', 'schedule'].map((s, i) => (
                            <div key={s} className="flex items-center gap-2 flex-shrink-0">
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === s ? 'bg-violet-600 text-white' : 'bg-gray-200 text-gray-600'
                                    }`}>
                                    {i + 1}
                                </span>
                                <span className={`text-sm ${step === s ? 'text-violet-700 font-medium' : 'text-gray-500'}`}>
                                    {s === 'info' ? 'Datos' : s === 'kq' ? 'Preguntas' : s === 'cul' ? 'CUL' : 'Entrevista'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Form */}
                <div className="bg-white rounded-b-2xl shadow-xl p-6">
                    {/* Step 1: Personal Info */}
                    {step === 'info' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo *</label>
                                <input
                                    type="text"
                                    value={nombre}
                                    onChange={(e) => setNombre(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500"
                                    placeholder="Tu nombre"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500"
                                    placeholder="tu@email.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                                <input
                                    type="tel"
                                    value={telefono}
                                    onChange={(e) => setTelefono(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500"
                                    placeholder="+51 999 999 999"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                                <input
                                    type="tel"
                                    value={telefono}
                                    onChange={(e) => setTelefono(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500"
                                    placeholder="+51 999 999 999"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn</label>
                                <input
                                    type="url"
                                    value={linkedin}
                                    onChange={(e) => setLinkedin(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500"
                                    placeholder="https://linkedin.com/in/tu-perfil"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">DNI / CE (Para validación CUL) *</label>
                                <input
                                    type="text"
                                    maxLength={12}
                                    value={dni}
                                    onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500"
                                    placeholder="Tu número de documento"
                                    required
                                />
                            </div>
                            <button
                                onClick={() => setStep(job.killerQuestions?.length ? 'kq' : 'cul')}
                                disabled={!nombre || !email || !dni}
                                className="w-full py-3 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700 disabled:opacity-50"
                            >
                                Siguiente →
                            </button>
                        </div>
                    )}

                    {/* Step 2: Killer Questions */}
                    {step === 'kq' && job.killerQuestions && (
                        <div className="space-y-6">
                            {job.killerQuestions.map((kq: any, idx: number) => (
                                <div key={idx} className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-900">
                                        {kq.question}
                                        {kq.isCritical && <span className="text-red-500 ml-1">*</span>}
                                    </label>
                                    {kq.type === 'yes_no' ? (
                                        <div className="flex gap-4">
                                            <button
                                                onClick={() => setKqAnswers({ ...kqAnswers, [idx]: 'Sí' })}
                                                className={`px-6 py-2 rounded-lg font-medium ${kqAnswers[idx] === 'Sí'
                                                    ? 'bg-violet-600 text-white'
                                                    : 'bg-gray-100 text-gray-700'
                                                    }`}
                                            >
                                                Sí
                                            </button>
                                            <button
                                                onClick={() => setKqAnswers({ ...kqAnswers, [idx]: 'No' })}
                                                className={`px-6 py-2 rounded-lg font-medium ${kqAnswers[idx] === 'No'
                                                    ? 'bg-violet-600 text-white'
                                                    : 'bg-gray-100 text-gray-700'
                                                    }`}
                                            >
                                                No
                                            </button>
                                        </div>
                                    ) : kq.type === 'numeric' ? (
                                        <input
                                            type="number"
                                            value={kqAnswers[idx] || ''}
                                            onChange={(e) => setKqAnswers({ ...kqAnswers, [idx]: e.target.value })}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                                            placeholder="Ingresa un número"
                                        />
                                    ) : (
                                        <textarea
                                            value={kqAnswers[idx] || ''}
                                            onChange={(e) => setKqAnswers({ ...kqAnswers, [idx]: e.target.value })}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                                            rows={3}
                                            placeholder="Tu respuesta..."
                                        />
                                    )}
                                </div>
                            ))}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setStep('info')}
                                    className="flex-1 py-3 border border-gray-300 rounded-xl font-medium"
                                >
                                    ← Anterior
                                </button>
                                <button
                                    onClick={() => setStep('cul')}
                                    className="flex-1 py-3 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700"
                                >
                                    Siguiente →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 2.5: CUL Upload */}
                    {step === 'cul' && (
                        <div className="space-y-6">
                            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-amber-800 text-sm">
                                💡 <strong>Certificado Único Laboral (CUL):</strong> Es un documento gratuito del Ministerio de Trabajo que unifica tus antecedentes y experiencia. <a href="https://www.empleosperu.gob.pe/CertificadoUnicoLaboral/" target="_blank" className="font-bold underline">Obtenlo aquí</a>
                            </div>

                            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center bg-gray-50 relative">
                                <div className="text-4xl mb-3">🛡️</div>
                                <p className="font-medium text-gray-900">Sube tu CUL (CERTIJOVEN / CERTIADULTO)</p>
                                <p className="text-xs text-gray-500 mt-1">El documento será validado automáticamente por IA</p>
                                <input
                                    type="file"
                                    accept=".pdf,image/*"
                                    onChange={(e) => setCulFile(e.target.files?.[0] || null)}
                                    className="mt-4 w-full cursor-pointer"
                                />
                                {culFile && (
                                    <div className="mt-4 p-2 bg-green-100 text-green-700 text-xs rounded-lg flex items-center justify-center gap-2">
                                        ✓ Archivo seleccionado: {culFile.name}
                                    </div>
                                )}
                                {culError && (
                                    <div className="mt-4 p-3 bg-red-100 text-red-700 text-sm font-semibold rounded-lg border border-red-300">
                                        {culError}
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setStep(job.killerQuestions?.length ? 'kq' : 'info')}
                                    className="flex-1 py-3 border border-gray-300 rounded-xl font-medium"
                                    disabled={validatingCUL}
                                >
                                    ← Anterior
                                </button>
                                <button
                                    onClick={handleVerifyCUL}
                                    disabled={validatingCUL}
                                    className="flex-1 py-3 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {validatingCUL ? (
                                        <>
                                            <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                                            <span>Verificando IA...</span>
                                        </>
                                    ) : (
                                        <span>Siguiente →</span>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: CV Upload */}
                    {step === 'cv' && (
                        <div className="space-y-6">
                            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
                                <div className="text-4xl mb-3">📄</div>
                                <p className="font-medium text-gray-900">Sube tu CV (opcional)</p>
                                <p className="text-sm text-gray-500 mt-1">PDF o Word</p>
                                <input
                                    type="file"
                                    accept=".pdf,.doc,.docx"
                                    className="mt-4"
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setStep('cul')}
                                    className="flex-1 py-3 border border-gray-300 rounded-xl font-medium"
                                >
                                    ← Anterior
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    className="flex-1 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50"
                                >
                                    {submitting ? '⏳ Guardando Aplicación...' : 'Siguiente →'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Schedule Interview */}
                    {step === 'schedule' && (
                        <div className="space-y-6">
                            <div className="text-center">
                                <h2 className="text-xl font-bold text-gray-900 mb-2">¡Datos verificados! ✅</h2>
                                <p className="text-gray-600">Por favor, elige el horario de tu entrevista presencial con nuestro Gerente de Tienda.</p>
                            </div>

                            {loadingSlots ? (
                                <div className="py-12 flex justify-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
                                </div>
                            ) : availableSlots.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {availableSlots.map((slot) => (
                                        <button
                                            key={slot.iso}
                                            onClick={() => setSelectedSlot(slot.iso)}
                                            className={`p-4 rounded-xl border-2 text-left transition-all ${selectedSlot === slot.iso
                                                ? 'border-violet-600 bg-violet-50 text-violet-900 font-semibold'
                                                : 'border-gray-200 hover:border-violet-300 hover:bg-violet-50/50 text-gray-700'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedSlot === slot.iso ? 'border-violet-600' : 'border-gray-300'
                                                    }`}>
                                                    {selectedSlot === slot.iso && <div className="w-2.5 h-2.5 bg-violet-600 rounded-full" />}
                                                </div>
                                                {slot.display}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-6 bg-gray-50 text-center rounded-xl text-gray-600">
                                    Todos los horarios de esta tienda están ocupados actualmente. Recurso Humanos se comunicará contigo pronto para más opciones.
                                </div>
                            )}

                            <div className="flex gap-3 pt-4 border-t border-gray-100">
                                <button
                                    onClick={() => setStep('done')}
                                    className="flex-1 py-3 text-gray-500 font-medium hover:text-gray-700"
                                >
                                    Saltar (Agendar luego)
                                </button>

                                {availableSlots.length > 0 && (
                                    <button
                                        onClick={handleConfirmSchedule}
                                        disabled={!selectedSlot || submitting}
                                        className="flex-1 py-3 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700 disabled:opacity-50"
                                    >
                                        {submitting ? '⏳ Confirmando...' : '✓ Confirmar Entrevista'}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
