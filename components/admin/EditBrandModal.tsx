'use client';

import { useState, useRef } from 'react';
import { db, storage } from '@/lib/firebase';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface Brand {
    id: string;
    nombre: string;
    logo?: string;
    logoUrl?: string;
    activa?: boolean;
}

interface EditBrandModalProps {
    brand: Brand;
    onClose: () => void;
    onSave: () => void;
}

export default function EditBrandModal({ brand, onClose, onSave }: EditBrandModalProps) {
    const [nombre, setNombre] = useState(brand.nombre);
    const [logo, setLogo] = useState(brand.logo || '');
    const [logoUrl, setLogoUrl] = useState(brand.logoUrl || '');
    const [activa, setActiva] = useState(brand.activa !== false);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(brand.logoUrl || '');
    const fileInputRef = useRef<HTMLInputElement>(null);

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
            const fileName = `logos/marcas/${brand.id}_${Date.now()}.${file.name.split('.').pop()}`;
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

    async function handleSubmit() {
        if (!nombre) {
            alert('Por favor ingresa el nombre de la marca');
            return;
        }

        setSaving(true);

        try {
            const brandRef = doc(db, 'marcas', brand.id);
            await updateDoc(brandRef, {
                nombre,
                logo: logo || nombre.charAt(0),
                logoUrl: logoUrl || null,
                activa,
                updatedAt: Timestamp.now()
            });

            console.log('✅ Marca actualizada:', brand.id);
            alert(`✅ Marca "${nombre}" actualizada exitosamente!`);
            onSave();
        } catch (error) {
            console.error('Error actualizando marca:', error);
            alert('❌ Error actualizando marca. Ver consola para detalles.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4">
                {/* Header */}
                <div className="border-b border-gray-200 px-6 py-4">
                    <h2 className="text-2xl font-bold text-gray-900">Editar Marca</h2>
                    <p className="text-sm text-gray-600 mt-1">{brand.nombre}</p>
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
                        <p className="text-xs text-gray-500 mt-1">Se muestra cuando no hay imagen</p>
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

                    {/* Estado */}
                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            id="activa"
                            checked={activa}
                            onChange={(e) => setActiva(e.target.checked)}
                            className="w-5 h-5 text-violet-600 rounded focus:ring-violet-500"
                        />
                        <label htmlFor="activa" className="text-sm font-medium text-gray-700">
                            Marca activa
                        </label>
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
                    <button
                        onClick={onClose}
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
                            <>✓ Guardar Cambios</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
