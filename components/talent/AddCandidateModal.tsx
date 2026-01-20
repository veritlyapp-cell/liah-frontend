'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, Timestamp, query, where, getDocs } from 'firebase/firestore';
import { uploadCV } from '@/lib/storage/cv-upload';

interface Job {
    id: string;
    titulo: string;
    holdingId?: string;
    status: string;
}

interface AddCandidateModalProps {
    isOpen: boolean;
    onClose: () => void;
    holdingId: string;
    jobs: Job[];
    stages: { id: string; nombre: string }[];
    onCandidateAdded: () => void;
}

export default function AddCandidateModal({
    isOpen,
    onClose,
    holdingId,
    jobs,
    stages,
    onCandidateAdded
}: AddCandidateModalProps) {
    // Form state
    const [nombre, setNombre] = useState('');
    const [email, setEmail] = useState('');
    const [telefono, setTelefono] = useState('');
    const [selectedJobId, setSelectedJobId] = useState('');
    const [selectedStage, setSelectedStage] = useState('applied');
    const [salaryExpectation, setSalaryExpectation] = useState<number | null>(null);
    const [salaryNegotiable, setSalaryNegotiable] = useState(false);
    const [source, setSource] = useState('manual'); // manual, linkedin, computrabajo, bumeran, other

    // CV state
    const [cvFile, setCvFile] = useState<File | null>(null);
    const [parsingCV, setParsingCV] = useState(false);

    // Onboarding options (for hired stage)
    const [sendWelcomeEmail, setSendWelcomeEmail] = useState(true);
    const [startOnboarding, setStartOnboarding] = useState(true);

    // UI state
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setNombre('');
            setEmail('');
            setTelefono('');
            setSelectedJobId(jobs[0]?.id || '');
            setSelectedStage('applied');
            setSalaryExpectation(null);
            setSalaryNegotiable(false);
            setSource('manual');
            setCvFile(null);
            setError(null);
        }
    }, [isOpen, jobs]);

    // Handle CV upload with AI parsing
    async function handleCVUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        setCvFile(file);
        setParsingCV(true);

        try {
            // Read file as base64
            const reader = new FileReader();
            reader.onload = async (event) => {
                const base64String = (event.target?.result as string).split(',')[1];

                // Call parse API
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
                    }
                }
                setParsingCV(false);
            };
            reader.readAsDataURL(file);
        } catch (err) {
            console.error('Error parsing CV:', err);
            setParsingCV(false);
        }
    }

    // Submit candidate
    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!nombre.trim() || !email.trim() || !selectedJobId) {
            setError('Nombre, email y proceso son requeridos');
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            // Check for duplicate
            const existingQuery = query(
                collection(db, 'talent_applications'),
                where('email', '==', email.trim().toLowerCase()),
                where('jobId', '==', selectedJobId)
            );
            const existingSnap = await getDocs(existingQuery);

            if (!existingSnap.empty) {
                setError('Este candidato ya está registrado en este proceso');
                setSubmitting(false);
                return;
            }

            // Upload CV if provided
            let cvUrl: string | null = null;
            let cvPath: string | null = null;
            const selectedJob = jobs.find(j => j.id === selectedJobId);

            if (cvFile && selectedJob) {
                try {
                    const uploadResult = await uploadCV(cvFile, holdingId, selectedJobId, email.trim());
                    cvUrl = uploadResult.url;
                    cvPath = uploadResult.path;
                } catch (uploadErr) {
                    console.error('Error uploading CV:', uploadErr);
                }
            }

            // Create application
            const applicationData = {
                jobId: selectedJobId,
                jobTitulo: selectedJob?.titulo || '',
                holdingId,
                nombre: nombre.trim(),
                email: email.trim().toLowerCase(),
                telefono: telefono.trim() || null,
                cvFileName: cvFile?.name || null,
                cvUrl,
                cvPath,
                salaryExpectation: salaryExpectation || null,
                salaryNegotiable,
                source, // Track where candidate came from
                killerAnswers: {},
                killerQuestionsPassed: true, // Manual candidates bypass KQ
                status: selectedStage === 'hired' ? 'hired' : 'new',
                funnelStage: selectedStage,
                matchScore: null,
                isManualEntry: true, // Flag to identify manual entries
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            };

            const docRef = await addDoc(collection(db, 'talent_applications'), applicationData);

            // If hired, send welcome email and start onboarding
            if (selectedStage === 'hired') {
                if (sendWelcomeEmail) {
                    try {
                        await fetch('/api/talent/send-onboarding-email', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                applicationId: docRef.id,
                                candidateName: nombre.trim(),
                                candidateEmail: email.trim().toLowerCase(),
                                jobTitle: selectedJob?.titulo,
                                holdingId
                            })
                        });
                    } catch (emailErr) {
                        console.error('Error sending welcome email:', emailErr);
                    }
                }
            }

            // Success - close modal and refresh
            onCandidateAdded();
            onClose();

        } catch (err) {
            console.error('Error adding candidate:', err);
            setError('Error al agregar el candidato');
        } finally {
            setSubmitting(false);
        }
    }

    if (!isOpen) return null;

    const isHired = selectedStage === 'hired' || selectedStage === 'onboarding';

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white p-6 rounded-t-2xl">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold">➕ Agregar Candidato</h2>
                            <p className="text-violet-200 text-sm mt-1">
                                Para candidatos de LinkedIn, Computrabajo, u otras fuentes
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white/80 hover:text-white text-2xl"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {error && (
                        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
                            ⚠️ {error}
                        </div>
                    )}

                    {/* CV Upload */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            📄 Subir CV (PDF, Word)
                            {parsingCV && <span className="text-violet-600 ml-2 animate-pulse">✨ Analizando...</span>}
                        </label>
                        <input
                            type="file"
                            accept=".pdf,.doc,.docx"
                            onChange={handleCVUpload}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm bg-white"
                        />
                        {parsingCV && (
                            <p className="text-xs text-violet-600 mt-1">
                                IA extrayendo datos automáticamente...
                            </p>
                        )}
                    </div>

                    {/* Personal Info */}
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nombre completo *
                            </label>
                            <input
                                type="text"
                                value={nombre}
                                onChange={(e) => setNombre(e.target.value)}
                                required
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500"
                                placeholder="Juan Pérez García"
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
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500"
                                placeholder="juan@email.com"
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
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500"
                                placeholder="999 888 777"
                            />
                        </div>
                    </div>

                    {/* Salary */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            💰 Expectativa Salarial (S/)
                        </label>
                        <div className="flex items-center gap-4">
                            <input
                                type="number"
                                value={salaryExpectation || ''}
                                onChange={(e) => setSalaryExpectation(e.target.value ? parseInt(e.target.value) : null)}
                                placeholder="3500"
                                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500"
                            />
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

                    {/* Source */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            📍 Fuente del candidato
                        </label>
                        <select
                            value={source}
                            onChange={(e) => setSource(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500"
                        >
                            <option value="manual">Carga manual</option>
                            <option value="linkedin">LinkedIn</option>
                            <option value="computrabajo">Computrabajo</option>
                            <option value="bumeran">Bumeran</option>
                            <option value="referido">Referido</option>
                            <option value="other">Otra fuente</option>
                        </select>
                    </div>

                    {/* Process Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            🎯 Asignar a Proceso *
                        </label>
                        <select
                            value={selectedJobId}
                            onChange={(e) => setSelectedJobId(e.target.value)}
                            required
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500"
                        >
                            <option value="">Selecciona un proceso...</option>
                            {jobs.filter(j => j.status === 'published').map(job => (
                                <option key={job.id} value={job.id}>{job.titulo}</option>
                            ))}
                        </select>
                    </div>

                    {/* Stage Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            📊 Etapa del Pipeline
                        </label>
                        <select
                            value={selectedStage}
                            onChange={(e) => setSelectedStage(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500"
                        >
                            {stages.filter(s => s.id !== 'rejected').map(stage => (
                                <option key={stage.id} value={stage.id}>{stage.nombre}</option>
                            ))}
                        </select>
                    </div>

                    {/* Onboarding Options (if hired) */}
                    {isHired && (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                            <h4 className="font-medium text-green-800 mb-3">
                                🎉 Opciones de Contratación
                            </h4>
                            <div className="space-y-3">
                                <label className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        checked={sendWelcomeEmail}
                                        onChange={(e) => setSendWelcomeEmail(e.target.checked)}
                                        className="w-4 h-4 text-green-600 rounded"
                                    />
                                    <span className="text-sm text-green-800">
                                        📧 Enviar email de bienvenida
                                    </span>
                                </label>
                                <label className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        checked={startOnboarding}
                                        onChange={(e) => setStartOnboarding(e.target.checked)}
                                        className="w-4 h-4 text-green-600 rounded"
                                    />
                                    <span className="text-sm text-green-800">
                                        🚀 Iniciar proceso de onboarding
                                    </span>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || parsingCV}
                            className="flex-1 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50"
                        >
                            {submitting ? '⏳ Guardando...' : '✅ Agregar Candidato'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
