'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

export default function VerifyCulPage() {
    const params = useParams();
    const token = params.token as string;

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [applicationData, setApplicationData] = useState<any>(null);
    const [applicationId, setApplicationId] = useState<string | null>(null);

    // Upload states
    const [culFile, setCulFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<any>(null);

    useEffect(() => {
        validateToken();
    }, [token]);

    async function validateToken() {
        if (!token) {
            setError('Token inválido');
            setLoading(false);
            return;
        }

        try {
            // Find application with this token
            const q = query(
                collection(db, 'talent_applications'),
                where('culToken', '==', token)
            );
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                setError('Enlace inválido o expirado');
                setLoading(false);
                return;
            }

            const appDoc = snapshot.docs[0];
            const data = appDoc.data();

            // Check if token is expired
            if (data.culTokenExpiresAt) {
                const expiresAt = data.culTokenExpiresAt.toDate();
                if (new Date() > expiresAt) {
                    setError('Este enlace ha expirado. Solicita uno nuevo.');
                    setLoading(false);
                    return;
                }
            }

            // Check if already submitted
            if (data.culStatus === 'uploaded' || data.culStatus === 'verified') {
                setError('Ya has subido tu CUL. Gracias!');
                setLoading(false);
                return;
            }

            setApplicationId(appDoc.id);
            setApplicationData(data);
            setLoading(false);

        } catch (err) {
            console.error('Error validating token:', err);
            setError('Error al validar el enlace');
            setLoading(false);
        }
    }

    async function handleUpload() {
        if (!culFile || !applicationId) return;

        setUploading(true);

        try {
            // Upload CUL file to storage
            const fileExt = culFile.name.split('.').pop();
            const filePath = `cul/${applicationData.holdingId || 'unknown'}/${applicationId}/cul.${fileExt}`;
            const storageRef = ref(storage, filePath);

            await uploadBytes(storageRef, culFile);
            const downloadUrl = await getDownloadURL(storageRef);

            // Update application with CUL file info
            await updateDoc(doc(db, 'talent_applications', applicationId), {
                culFileUrl: downloadUrl,
                culFilePath: filePath,
                culFileName: culFile.name,
                culUploadedAt: Timestamp.now(),
                culStatus: 'uploaded',
                updatedAt: Timestamp.now()
            });

            setUploading(false);
            setAnalyzing(true);

            // Analyze CUL with AI
            try {
                // Read file as base64
                const reader = new FileReader();
                reader.onload = async (event) => {
                    const base64String = (event.target?.result as string).split(',')[1];

                    const response = await fetch('/api/talent/analyze-cul', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            applicationId,
                            culBase64: base64String,
                            mimeType: culFile.type
                        })
                    });

                    if (response.ok) {
                        const { data } = await response.json();
                        setAnalysisResult(data);

                        // Update application with analysis results
                        await updateDoc(doc(db, 'talent_applications', applicationId), {
                            culAnalysis: data,
                            culStatus: 'verified',
                            updatedAt: Timestamp.now()
                        });
                    }

                    setAnalyzing(false);
                    setSubmitted(true);
                };
                reader.readAsDataURL(culFile);
            } catch (analysisErr) {
                console.error('Error analyzing CUL:', analysisErr);
                setAnalyzing(false);
                setSubmitted(true);
            }

        } catch (err) {
            console.error('Error uploading CUL:', err);
            setError('Error al subir el archivo');
            setUploading(false);
        }
    }

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-violet-50 to-indigo-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-600">Validando enlace...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
                    <div className="text-6xl mb-4">❌</div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
                    <p className="text-gray-600">{error}</p>
                </div>
            </div>
        );
    }

    // Success state
    if (submitted) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
                    <div className="text-6xl mb-4">✅</div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">¡CUL Recibido!</h1>
                    <p className="text-gray-600 mb-4">
                        Hemos recibido tu Certificado Único Laboral correctamente.
                    </p>
                    {analysisResult && (
                        <div className="bg-gray-50 rounded-xl p-4 text-left mb-4">
                            <h3 className="font-semibold text-gray-900 mb-2">Información extraída:</h3>
                            <ul className="text-sm text-gray-600 space-y-1">
                                {analysisResult.nombreCompleto && (
                                    <li>👤 <strong>Nombre:</strong> {analysisResult.nombreCompleto}</li>
                                )}
                                {analysisResult.dni && (
                                    <li>🪪 <strong>DNI:</strong> {analysisResult.dni}</li>
                                )}
                                {analysisResult.estadoLaboral && (
                                    <li>💼 <strong>Estado:</strong> {analysisResult.estadoLaboral}</li>
                                )}
                            </ul>
                        </div>
                    )}
                    <p className="text-sm text-gray-500">
                        El equipo de selección revisará tu información y te contactará pronto.
                    </p>
                </div>
            </div>
        );
    }

    // Upload form
    return (
        <div className="min-h-screen bg-gradient-to-br from-violet-50 to-indigo-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="text-5xl mb-4">📋</div>
                    <h1 className="text-2xl font-bold text-gray-900">Subir CUL</h1>
                    <p className="text-gray-600 mt-2">
                        Hola <strong>{applicationData?.nombre}</strong>, por favor sube tu Certificado Único Laboral.
                    </p>
                </div>

                {/* Info box */}
                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg mb-6">
                    <h3 className="font-semibold text-amber-800 mb-1">¿Qué es el CUL?</h3>
                    <p className="text-sm text-amber-700">
                        El Certificado Único Laboral es un documento gratuito que puedes obtener en{' '}
                        <a
                            href="https://www.trabajo.gob.pe/cul/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline font-medium"
                        >
                            trabajo.gob.pe/cul
                        </a>
                    </p>
                </div>

                {/* File upload */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Archivo CUL (PDF, JPG, PNG)
                    </label>
                    <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => setCulFile(e.target.files?.[0] || null)}
                        className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 focus:border-violet-500 focus:bg-white transition-colors"
                    />
                    {culFile && (
                        <p className="text-sm text-green-600 mt-2">
                            ✓ {culFile.name}
                        </p>
                    )}
                </div>

                {/* Submit button */}
                <button
                    onClick={handleUpload}
                    disabled={!culFile || uploading || analyzing}
                    className="w-full py-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                    {uploading ? '📤 Subiendo...' : analyzing ? '🤖 Analizando con IA...' : '📤 Subir CUL'}
                </button>

                {/* Footer */}
                <p className="text-xs text-gray-500 text-center mt-4">
                    Tu información será tratada de forma confidencial.
                </p>
            </div>
        </div>
    );
}
