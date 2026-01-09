'use client';

import { useState, useRef } from 'react';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, Timestamp, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface CreateBrandModalProps {
    show: boolean;
    holdingId: string;
    onCancel: () => void;
    onSave: (brandData: any) => void;
}

export default function CreateBrandModal({ show, holdingId, onCancel, onSave }: CreateBrandModalProps) {
    const [nombre, setNombre] = useState('');
    const [logo, setLogo] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!show) return null;

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
            // We don't have a brand ID yet, so we use a temp name or a random one
            const tempId = Math.random().toString(36).substring(7);
            const fileName = `logos/marcas/new_${tempId}_${Date.now()}.${file.name.split('.').pop()}`;
            const storageRef = ref(storage, fileName);

            // Upload the file
            await uploadBytes(storageRef, file);

            // Get the download URL
            const downloadUrl = await getDownloadURL(storageRef);

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

    async function handleSubmit() {
        if (!nombre) {
            alert('Por favor ingresa el nombre de la marca');
            return;
        }

        setSaving(true);
        try {
            // Check brand limit
            const holdingRef = doc(db, 'holdings', holdingId);
            const holdingSnap = await getDoc(holdingRef);

            if (holdingSnap.exists()) {
                const config = holdingSnap.data().config;
                const maxBrands = config?.maxBrands || 1;

                const marcasRef = collection(db, 'marcas');
                const q = query(marcasRef, where('holdingId', '==', holdingId));
                const marcasSnap = await getDocs(q);

                if (marcasSnap.size >= maxBrands) {
                    alert(`❌ Límite de marcas alcanzado (${maxBrands}). Contacta a soporte para aumentar tu plan.`);
                    setSaving(false);
                    return;
                }
            }

            const marcasRef = collection(db, 'marcas');
            const brandData = {
                nombre,
                logo: logo || nombre.charAt(0), // Default: primera letra si no hay logo
                logoUrl: logoUrl || null, // URL de imagen del logo
                holdingId,
                activa: true,
                tiendasActivas: 0,
                candidatos: 0,
                entrevistas: 0,
                rqs: 0,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            };

            const docRef = await addDoc(marcasRef, brandData);

            console.log('✅ Marca creada en Firestore:', docRef.id);
            alert(`✅ Marca "${nombre}" creada exitosamente!`);

            onSave({ id: docRef.id, ...brandData });

            // Reset form
            setNombre('');
            setLogo('');
            setLogoUrl('');
            setPreviewUrl('');
        } catch (error) {
            console.error('Error creando marca:', error);
            alert('❌ Error creando marca. Ver consola para detalles.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4">
                {/* Header */}
                <div className="border-b border-gray-200 px-6 py-4">
                    <h2 className="text-2xl font-bold text-gray-900">Crear Nueva Marca</h2>
                    <p className="text-sm text-gray-600 mt-1">Agregar marca al holding</p>
                </div>

                {/* Body */}
                <div className="px-6 py-6 space-y-6">
                    {/* Nombre */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Nombre de la Marca *
                        </label>
                        <input
                            type="text"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            placeholder="Papa John's, Pizza Hut, etc."
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                    </div>

                    {/* Logo (emoji o texto) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Logo (emoji o letra)
                        </label>
                        <input
                            type="text"
                            value={logo}
                            onChange={(e) => setLogo(e.target.value)}
                            placeholder="🍕 o PJ"
                            maxLength={2}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 text-center text-2xl"
                        />
                        <p className="text-xs text-gray-500 mt-1">Para mostrar cuando no hay imagen</p>
                    </div>

                    {/* Logo Upload */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Logo (imagen)
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
                                        alt="Preview"
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
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
                    <button
                        onClick={onCancel}
                        disabled={saving || uploading}
                        className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={saving || uploading}
                        className="px-6 py-2 gradient-bg text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                    >
                        {saving ? (
                            <>
                                <span className="animate-spin">⏳</span> Guardando...
                            </>
                        ) : (
                            <>✓ Crear Marca</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
