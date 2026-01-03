'use client';

import { useState } from 'react';

interface DocumentValidationCardProps {
    candidateId: string;
    documentType: 'dni' | 'cul';
    documentUrl: string;
    currentStatus?: string;
    aiObservation?: string;
    extractedData?: any;
    confidence?: number;
    onStatusChange?: (newStatus: string, observation?: string) => void;
    onDataExtracted?: (data: any) => void;
}

export default function DocumentValidationCard({
    candidateId,
    documentType,
    documentUrl,
    currentStatus,
    aiObservation,
    extractedData,
    confidence,
    onStatusChange,
    onDataExtracted
}: DocumentValidationCardProps) {
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const handleAnalyze = async () => {
        setAnalyzing(true);
        setError(null);

        try {
            const response = await fetch('/api/ai/analyze-document', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    documentType,
                    documentUrl,
                    candidateId
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error analyzing document');
            }

            setResult(data);

            if (documentType === 'dni' && data.extractedData && onDataExtracted) {
                onDataExtracted(data.extractedData);
            }

            if (documentType === 'cul' && data.validationStatus && onStatusChange) {
                onStatusChange(data.validationStatus, data.aiObservation);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setAnalyzing(false);
        }
    };

    const handleManualValidation = (status: 'approved_manual' | 'rejected_manual') => {
        if (onStatusChange) {
            const observation = status === 'rejected_manual'
                ? prompt('Ingrese el motivo del rechazo:')
                : 'Aprobado manualmente por recruiter';
            onStatusChange(status, observation || undefined);
        }
    };

    const getStatusBadge = (status: string) => {
        const badges: Record<string, { icon: string; text: string; color: string }> = {
            'approved_ai': { icon: '✅', text: 'Pre-aprobado (IA)', color: 'bg-green-100 text-green-800' },
            'rejected_ai': { icon: '❌', text: 'Rechazado (IA)', color: 'bg-red-100 text-red-800' },
            'pending_review': { icon: '⚠️', text: 'Requiere revisión', color: 'bg-yellow-100 text-yellow-800' },
            'approved_manual': { icon: '✅👤', text: 'Aprobado (Manual)', color: 'bg-green-100 text-green-800' },
            'rejected_manual': { icon: '❌👤', text: 'Rechazado (Manual)', color: 'bg-red-100 text-red-800' }
        };
        return badges[status] || { icon: '❓', text: status, color: 'bg-gray-100 text-gray-800' };
    };

    const displayStatus = result?.validationStatus || currentStatus;
    const displayObservation = result?.aiObservation || aiObservation;
    const displayConfidence = result?.confidence || confidence;
    const displayExtractedData = result?.extractedData || extractedData;

    return (
        <div className="border border-gray-200 rounded-xl p-4 bg-white">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <span className="text-2xl">{documentType === 'dni' ? '🪪' : '📋'}</span>
                    <h3 className="font-semibold text-gray-900">
                        {documentType === 'dni' ? 'DNI' : 'Certificado Único Laboral'}
                    </h3>
                </div>

                {displayStatus && (
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(displayStatus).color}`}>
                        {getStatusBadge(displayStatus).icon} {getStatusBadge(displayStatus).text}
                    </span>
                )}
            </div>

            {/* Document Preview */}
            {documentUrl && (
                <div className="mb-4">
                    <a
                        href={documentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-violet-600 hover:underline text-sm"
                    >
                        📄 Ver documento
                    </a>
                </div>
            )}

            {/* Analyze Button */}
            {!result && !displayStatus && (
                <button
                    onClick={handleAnalyze}
                    disabled={analyzing || !documentUrl}
                    className="w-full px-4 py-2 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {analyzing ? (
                        <>
                            <span className="animate-spin">⏳</span> Analizando con IA...
                        </>
                    ) : (
                        <>🤖 Analizar con IA</>
                    )}
                </button>
            )}

            {/* Error */}
            {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">❌ {error}</p>
                    <button
                        onClick={() => handleManualValidation('pending_review' as any)}
                        className="mt-2 text-sm text-red-600 hover:underline"
                    >
                        Marcar para revisión manual
                    </button>
                </div>
            )}

            {/* DNI Extracted Data */}
            {documentType === 'dni' && displayExtractedData && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-green-600 text-lg">✅</span>
                        <p className="font-medium text-green-800">Datos extraídos por IA</p>
                        {displayConfidence && (
                            <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full">
                                {displayConfidence}% confianza
                            </span>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                            <p className="text-gray-500">Nombre:</p>
                            <p className="font-medium">{displayExtractedData.nombreCompleto}</p>
                        </div>
                        <div>
                            <p className="text-gray-500">DNI:</p>
                            <p className="font-medium font-mono">{displayExtractedData.dni}</p>
                        </div>
                        <div>
                            <p className="text-gray-500">Fecha Nac.:</p>
                            <p className="font-medium">{displayExtractedData.fechaNacimiento}</p>
                        </div>
                        {displayExtractedData.direccion && (
                            <div>
                                <p className="text-gray-500">Dirección:</p>
                                <p className="font-medium">{displayExtractedData.direccion}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* CUL Analysis Result */}
            {documentType === 'cul' && displayObservation && (
                <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 mb-2">Observación de la IA:</p>
                    <p className="text-sm text-gray-600">{displayObservation}</p>

                    {result?.denunciasEncontradas?.length > 0 && (
                        <div className="mt-3 p-2 bg-red-50 rounded">
                            <p className="text-sm font-medium text-red-800">⚠️ Denuncias encontradas:</p>
                            <ul className="list-disc list-inside text-sm text-red-700 mt-1">
                                {result.denunciasEncontradas.map((d: string, i: number) => (
                                    <li key={i}>{d}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {displayConfidence && (
                        <p className="text-xs text-gray-500 mt-2">
                            Confianza del análisis: {displayConfidence}%
                        </p>
                    )}
                </div>
            )}

            {/* Manual Validation Buttons */}
            {(displayStatus === 'pending_review' || displayStatus === 'approved_ai' || displayStatus === 'rejected_ai') && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600 mb-3">
                        {displayStatus === 'pending_review'
                            ? '⚠️ La IA no está segura. Por favor valida manualmente:'
                            : '👤 Puedes modificar la decisión de la IA:'
                        }
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleManualValidation('approved_manual')}
                            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
                        >
                            ✅ Aprobar
                        </button>
                        <button
                            onClick={() => handleManualValidation('rejected_manual')}
                            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700"
                        >
                            ❌ Rechazar
                        </button>
                    </div>
                </div>
            )}

            {/* Final Approved/Rejected State */}
            {(displayStatus === 'approved_manual' || displayStatus === 'rejected_manual') && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>👤</span>
                        <span>Validado manualmente por recruiter</span>
                    </div>
                </div>
            )}
        </div>
    );
}
