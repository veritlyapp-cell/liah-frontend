'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';

interface DocumentConfig {
    id: string;
    name: string;
    active: boolean;
    required?: boolean;
}

interface DocumentsConfigViewProps {
    holdingId: string;
}

export default function DocumentsConfigView({ holdingId }: DocumentsConfigViewProps) {
    const [documents, setDocuments] = useState<DocumentConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        loadDocumentConfig();
    }, [holdingId]);

    async function loadDocumentConfig() {
        setLoading(true);
        try {
            const holdingRef = doc(db, 'holdings', holdingId);
            const holdingSnap = await getDoc(holdingRef);

            if (holdingSnap.exists()) {
                const data = holdingSnap.data();
                const savedDocs = data.config?.requiredDocuments || [
                    { id: 'cul', name: 'Certificado Único Laboral (CUL)', active: true, required: true },
                    { id: 'cv', name: 'Curriculum Vitae (CV)', active: true, required: false },
                    { id: 'dni', name: 'Copia de DNI', active: true, required: false },
                    { id: 'antecedentes', name: 'Certificado de Antecedentes', active: false, required: false },
                    { id: 'salud', name: 'Carnet de Sanidad', active: false, required: false },
                ];
                setDocuments(savedDocs);
            }
        } catch (error) {
            console.error('Error loading document config:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        setSaving(true);
        try {
            const holdingRef = doc(db, 'holdings', holdingId);

            // Use setDoc with merge to avoid overwriting other fields
            await setDoc(holdingRef, {
                config: {
                    requiredDocuments: documents
                }
            }, { merge: true });

            setHasChanges(false);
            alert('✅ Configuración guardada exitosamente');
        } catch (error) {
            console.error('Error saving document config:', error);
            alert('Error al guardar');
        } finally {
            setSaving(false);
        }
    }

    function toggleDocument(docId: string) {
        setDocuments(docs => docs.map(d =>
            d.id === docId ? { ...d, active: !d.active } : d
        ));
        setHasChanges(true);
    }

    function addDocument() {
        const newDoc: DocumentConfig = {
            id: `doc_${Date.now()}`,
            name: '',
            active: true,
            required: false
        };
        setDocuments([...documents, newDoc]);
        setHasChanges(true);
    }

    function removeDocument(docId: string) {
        setDocuments(docs => docs.filter(d => d.id !== docId));
        setHasChanges(true);
    }

    function updateDocumentName(docId: string, name: string) {
        setDocuments(docs => docs.map(d =>
            d.id === docId ? { ...d, name } : d
        ));
        setHasChanges(true);
    }

    if (loading) {
        return (
            <div className="glass-card rounded-xl p-6">
                <div className="animate-pulse flex space-x-4">
                    <div className="flex-1 space-y-4 py-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="glass-card rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-gray-900">📄 Documentos Requeridos</h3>
                    <p className="text-sm text-gray-500 mt-1">
                        Configura qué documentos deben subir los candidatos al postular.
                    </p>
                </div>
                {hasChanges && (
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 transition-colors disabled:opacity-50"
                    >
                        {saving ? 'Guardando...' : '💾 Guardar Cambios'}
                    </button>
                )}
            </div>

            <div className="space-y-3">
                {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                        <input
                            type="text"
                            value={doc.name}
                            onChange={(e) => updateDocumentName(doc.id, e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500"
                            placeholder="Nombre del documento..."
                        />

                        <div className="flex items-center gap-3">
                            <span className={`text-xs px-2 py-1 rounded-full ${doc.active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                                {doc.active ? 'Activo' : 'Inactivo'}
                            </span>
                            <button
                                onClick={() => toggleDocument(doc.id)}
                                className={`w-12 h-6 rounded-full transition-colors relative ${doc.active ? 'bg-violet-600' : 'bg-gray-300'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow ${doc.active ? 'right-1' : 'left-1'}`} />
                            </button>

                            {!doc.required && (
                                <button
                                    onClick={() => removeDocument(doc.id)}
                                    className="text-red-500 hover:text-red-700 p-1"
                                    title="Eliminar documento"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <button
                onClick={addDocument}
                className="mt-4 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-violet-400 hover:text-violet-600 transition-colors w-full"
            >
                + Agregar Nuevo Documento
            </button>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-sm text-blue-800">
                    <strong>💡 Tip:</strong> Los documentos activos aparecerán como obligatorios en el formulario de postulación.
                    Puedes desactivar temporalmente un documento sin eliminarlo.
                </p>
            </div>
        </div>
    );
}
