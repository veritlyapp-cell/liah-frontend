'use client';

import { useState, useRef, useEffect } from 'react';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';

interface HoldingLogoUploadProps {
    holdingId: string;
}

export default function HoldingLogoUpload({ holdingId }: HoldingLogoUploadProps) {
    const [holdingName, setHoldingName] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [blockRQCreation, setBlockRQCreation] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [previewUrl, setPreviewUrl] = useState('');
    const [costoReposicion, setCostoReposicion] = useState(700);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load current holding data
    useEffect(() => {
        async function loadHolding() {
            if (!holdingId) return;

            try {
                const holdingRef = doc(db, 'holdings', holdingId);
                const holdingDoc = await getDoc(holdingRef);

                if (holdingDoc.exists()) {
                    const data = holdingDoc.data();
                    setHoldingName(data.nombre || '');
                    setLogoUrl(data.logoUrl || '');
                    setPreviewUrl(data.logoUrl || '');
                    setBlockRQCreation(data.blockRQCreation || false);
                    if (data.settings?.costoReposicionPromedio) {
                        setCostoReposicion(data.settings.costoReposicionPromedio);
                    }
                }
            } catch (error) {
                console.error('Error loading holding:', error);
            }
        }

        loadHolding();
    }, [holdingId]);

    async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Por favor selecciona un archivo de imagen');
            return;
        }

        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            alert('La imagen debe ser menor a 2MB');
            return;
        }

        setUploading(true);

        try {
            // Create a reference to Firebase Storage
            const fileName = `logos/holdings/${holdingId}_${Date.now()}.${file.name.split('.').pop()}`;
            const storageRef = ref(storage, fileName);

            // Upload the file
            const snapshot = await uploadBytes(storageRef, file);
            console.log('✅ Archivo subido:', snapshot.metadata.fullPath);

            // Get the download URL
            const downloadUrl = await getDownloadURL(storageRef);
            console.log('✅ URL obtenida:', downloadUrl);

            // Update state
            setLogoUrl(downloadUrl);
            setPreviewUrl(downloadUrl);

            alert('✅ Logo subido exitosamente');
        } catch (error: any) {
            console.error('Error subiendo logo:', error);
            alert(`❌ Error subiendo logo: ${error.message || 'Error desconocido'}`);
        } finally {
            setUploading(false);
        }
    }

    async function handleSave() {
        if (!holdingId) return;

        setSaving(true);

        try {
            const holdingRef = doc(db, 'holdings', holdingId);
            const { setDoc } = await import('firebase/firestore');
            await setDoc(holdingRef, {
                nombre: holdingName,
                logoUrl: logoUrl || null,
                blockRQCreation: blockRQCreation,
                settings: {
                    costoReposicionPromedio: Number(costoReposicion)
                },
                updatedAt: Timestamp.now()
            }, { merge: true });

            alert('✅ Configuración de empresa guardada');
        } catch (error: any) {
            console.error('Error guardando:', error);
            alert('❌ Error guardando configuración');
        } finally {
            setSaving(false);
        }
    }

    if (!holdingId) {
        return (
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-lg">
                <p className="text-sm text-yellow-800">
                    No se encontró información de la empresa.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🏢 Configuración de Empresa</h3>

            <div className="space-y-4">
                {/* Nombre de la empresa */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nombre de la Empresa
                    </label>
                    <input
                        type="text"
                        value={holdingName}
                        onChange={(e) => setHoldingName(e.target.value)}
                        placeholder="Nombre de tu empresa"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                </div>

                {/* Logo Upload */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Logo de la Empresa
                    </label>

                    {/* File Input */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                    />

                    {/* Upload Button and Preview */}
                    <div className="flex items-center gap-4">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-violet-500 hover:text-violet-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {uploading ? (
                                <>
                                    <span className="animate-spin">⏳</span> Subiendo...
                                </>
                            ) : (
                                <>📁 Subir Logo</>
                            )}
                        </button>

                        {/* Preview */}
                        {previewUrl && (
                            <div className="flex items-center gap-2">
                                <img
                                    src={previewUrl}
                                    alt="Logo Preview"
                                    className="h-12 w-auto object-contain rounded border border-gray-200"
                                    onError={() => setPreviewUrl('')}
                                />
                                <span className="text-xs text-green-600">✓</span>
                            </div>
                        )}
                    </div>

                    {/* Manual URL Option */}
                    <details className="mt-3">
                        <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                            O pegar URL manualmente
                        </summary>
                        <input
                            type="text"
                            value={logoUrl}
                            onChange={(e) => {
                                setLogoUrl(e.target.value);
                                setPreviewUrl(e.target.value);
                            }}
                            placeholder="https://ejemplo.com/logo.png"
                            className="w-full mt-2 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                    </details>
                </div>

                {/* RQ Lock Toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div>
                        <p className="font-semibold text-gray-900">Bloquear Nuevos Requerimientos</p>
                        <p className="text-sm text-gray-500">
                            Si se activa, los Gerentes de Tienda no podrán crear nuevos RQs.
                        </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={blockRQCreation}
                            onChange={(e) => setBlockRQCreation(e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                    </label>
                </div>

                {/* Financial Settings */}
                <div className="p-4 bg-violet-50 rounded-lg border border-violet-100">
                    <p className="font-semibold text-gray-900">Analítica Financiera</p>
                    <p className="text-sm text-gray-500 mb-3">
                        Define los costos operativos para calcular el impacto de la rotación.
                    </p>
                    <div className="flex items-center gap-4">
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-violet-600 uppercase mb-1">Costo Reposición Promedio (S/.)</label>
                            <input
                                type="number"
                                value={costoReposicion}
                                onChange={(e) => setCostoReposicion(Number(e.target.value))}
                                className="w-full px-3 py-2 border border-violet-200 rounded-lg focus:ring-2 focus:ring-violet-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <button
                    onClick={handleSave}
                    disabled={saving || uploading}
                    className="w-full px-6 py-3 gradient-bg text-white font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                    {saving ? 'Guardando...' : '✅ Guardar Configuración'}
                </button>
            </div>
        </div>
    );
}
