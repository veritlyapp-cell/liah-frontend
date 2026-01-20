'use client';

import { useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, setDoc, Timestamp } from 'firebase/firestore';

interface CandidateDetailModalProps {
    candidate: any;
    onClose: () => void;
}

export default function CandidateDetailModal({ candidate, onClose }: CandidateDetailModalProps) {
    const [generatingInvite, setGeneratingInvite] = useState(false);
    const [inviteLink, setInviteLink] = useState<string | null>(null);

    if (!candidate) return null;

    const generateInvite = async () => {
        setGeneratingInvite(true);
        try {
            // In this version, we use the candidateId as the token for simplicity 
            // but we can also generate a dedicated invite doc if preferred.
            // For now, let's use the candidateId as the token as app/onboarding/[token]/page.tsx supports it.
            const link = `${window.location.origin}/onboarding/${candidate.id}`;
            setInviteLink(link);

            // Optionally update candidate status to 'ONBOARDING'
            // await updateDoc(doc(db, 'talent_candidates', candidate.id), { status: 'ONBOARDING' });
        } catch (error) {
            console.error('Error generating invite:', error);
        } finally {
            setGeneratingInvite(false);
        }
    };

    const copyToClipboard = () => {
        if (!inviteLink) return;
        navigator.clipboard.writeText(inviteLink);
        alert('✅ Enlace copiado al portapapeles');
    };

    const getValidationBadge = (status: string) => {
        const badges: Record<string, { bg: string; text: string; label: string }> = {
            'approved_ai': { bg: 'bg-green-100', text: 'text-green-700', label: '✅ Validado por IA' },
            'rejected_ai': { bg: 'bg-red-100', text: 'text-red-700', label: '❌ Rechazado por IA' },
            'rejected_invalid_doc': { bg: 'bg-red-100', text: 'text-red-700', label: '🚫 Documento No Válido' },
            'pending_review': { bg: 'bg-amber-100', text: 'text-amber-700', label: '⚠️ Revisión Manual' },
            'pending': { bg: 'bg-gray-100', text: 'text-gray-700', label: '⏳ Pendiente' },
        };
        const badge = badges[status] || { bg: 'bg-gray-100', text: 'text-gray-700', label: status };
        return (
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${badge.bg} ${badge.text}`}>
                {badge.label}
            </span>
        );
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">{candidate.nombre}</h2>
                        <p className="text-gray-500 text-sm">Detalles del Candidato • {candidate.email}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <span className="text-2xl">✕</span>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 bg-gray-50/50">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left Column: Info */}
                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Información de Contacto</h3>
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-xs text-gray-500">Teléfono</p>
                                        <p className="text-sm font-medium">{candidate.telefono || 'No provisto'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">LinkedIn</p>
                                        {candidate.linkedin ? (
                                            <a href={candidate.linkedin} target="_blank" className="text-sm font-medium text-violet-600 hover:underline">Ver Perfil</a>
                                        ) : (
                                            <p className="text-sm font-medium text-gray-400">No provisto</p>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">DNI / CE</p>
                                        <p className="text-sm font-medium">{candidate.dni || 'No provisto'}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Resultado CUL</h3>
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-xs text-gray-500 mb-2">Estado de Validación</p>
                                        {getValidationBadge(candidate.culValidationStatus)}
                                    </div>
                                    {candidate.culAiObservation && (
                                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                            <p className="text-xs text-gray-600 italic">"{candidate.culAiObservation}"</p>
                                        </div>
                                    )}
                                    {candidate.culExtractedData?.analysisResult?.antecedentes && (
                                        <div className="space-y-2">
                                            <p className="text-xs font-bold text-gray-500">Antecedentes Detectados:</p>
                                            {Object.entries(candidate.culExtractedData.analysisResult.antecedentes).map(([type, data]: any) => (
                                                <div key={type} className="flex items-center justify-between text-xs">
                                                    <span className="capitalize">{type}:</span>
                                                    <span className={data.estado === 'limpio' ? 'text-green-600' : 'text-red-600'}>
                                                        {data.estado === 'limpio' ? '✓ Limpio' : '✗ Con registros'}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Document Viewer */}
                        <div className="lg:col-span-2 space-y-4">
                            <div className="bg-white p-2 rounded-xl border border-gray-200 shadow-sm h-[600px] flex flex-col">
                                <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between">
                                    <h3 className="text-sm font-bold text-gray-700">Certificado Único Laboral</h3>
                                    {candidate.culUrl && (
                                        <a
                                            href={candidate.culUrl}
                                            target="_blank"
                                            className="text-xs text-violet-600 font-medium hover:underline"
                                        >
                                            Abrir en pestaña nueva ↗
                                        </a>
                                    )}
                                </div>
                                <div className="flex-1 bg-gray-200 rounded-lg overflow-hidden relative">
                                    {candidate.culUrl ? (
                                        candidate.culUrl.toLowerCase().includes('.pdf') || candidate.culUrl.includes('application/pdf') ? (
                                            <iframe src={candidate.culUrl} className="w-full h-full" title="CUL Document" />
                                        ) : (
                                            <img src={candidate.culUrl} className="w-full h-full object-contain" alt="CUL Document" />
                                        )
                                    ) : (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                                            <span className="text-5xl mb-2">📄</span>
                                            <p>No se cargó documento CUL</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="px-8 py-4 border-t border-gray-100 bg-white flex items-center justify-between sticky bottom-0">
                    <div className="flex items-center gap-2">
                        {inviteLink ? (
                            <div className="flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-lg border border-green-100">
                                <span className="text-xs text-green-700 font-medium truncate max-w-[200px]">{inviteLink}</span>
                                <button
                                    onClick={copyToClipboard}
                                    className="text-xs font-bold text-green-800 hover:underline"
                                >
                                    Copiar
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={generateInvite}
                                disabled={generatingInvite}
                                className="px-4 py-2 border border-violet-200 text-violet-700 rounded-lg text-sm font-medium hover:bg-violet-50 disabled:opacity-50"
                            >
                                {generatingInvite ? '⏳ Generando...' : '🎉 Generar Link de Ingreso'}
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
                        >
                            Cerrar
                        </button>
                        {candidate.status !== 'HIRED' && (
                            <button className="px-6 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 shadow-lg shadow-violet-200">
                                Avanzar Candidato
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
