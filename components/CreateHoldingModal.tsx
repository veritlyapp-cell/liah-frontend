'use client';

import { useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

interface CreateHoldingModalProps {
    show: boolean;
    onCancel: () => void;
    onSave: (holdingData: any) => void;
}

export default function CreateHoldingModal({ show, onCancel, onSave }: CreateHoldingModalProps) {
    const [nombre, setNombre] = useState('');
    const [id, setId] = useState('');
    const [plan, setPlan] = useState<'bot_only' | 'rq_only' | 'full_stack'>('full_stack');
    const [saving, setSaving] = useState(false);

    if (!show) return null;

    async function handleSubmit() {
        if (!nombre || !id) {
            alert('Por favor completa todos los campos');
            return;
        }

        setSaving(true);

        try {
            const holdingsRef = collection(db, 'holdings');
            const holdingData = {
                id,
                nombre,
                plan,
                marcas: 0,
                usuarios: 0,
                activo: true,
                config: {
                    maxUsuarios: plan === 'full_stack' ? 20 : plan === 'rq_only' ? 10 : 2,
                    maxMarcas: plan === 'full_stack' ? 10 : 5,
                    maxTiendas: plan === 'full_stack' ? 50 : 20,
                    precioMensual: plan === 'full_stack' ? 499 : plan === 'rq_only' ? 199 : 99
                },
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            };

            const docRef = await addDoc(holdingsRef, holdingData);

            console.log('✅ Empresa creada en Firestore:', docRef.id);
            alert(`✅ Empresa "${nombre}" creada exitosamente en Firestore!`);

            onSave(holdingData);

            // Reset form
            setNombre('');
            setId('');
            setPlan('full_stack');
        } catch (error: any) {
            console.error('Error creando empresa:', error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
            alert(`❌ Error creando empresa: ${error.message || 'Error desconocido'}\n\nCódigo: ${error.code || 'N/A'}`);
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="border-b border-gray-200 px-6 py-4">
                    <h2 className="text-2xl font-bold text-gray-900">Crear Nueva Empresa</h2>
                    <p className="text-sm text-gray-600 mt-1">Se guardará en Firestore automáticamente</p>
                </div>

                {/* Body */}
                <div className="px-6 py-6 space-y-6">
                    {/* Nombre de la Empresa */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Nombre de la Empresa *
                        </label>
                        <input
                            type="text"
                            value={nombre}
                            onChange={(e) => {
                                setNombre(e.target.value);
                                // Auto-generate ID
                                setId(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
                            }}
                            placeholder="NGR Holding, Intercorp, Delosi, etc."
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                    </div>

                    {/* ID de la Empresa */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            ID de la Empresa *
                        </label>
                        <input
                            type="text"
                            value={id}
                            onChange={(e) => setId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                            placeholder="ngr, intercorp, delosi, etc."
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">Solo letras minúsculas, números y guiones</p>
                    </div>

                    {/* Selección de Plan */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                            Plan de Suscripción *
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            {/* Bot Only */}
                            <button
                                type="button"
                                onClick={() => setPlan('bot_only')}
                                className={`p-4 border-2 rounded-lg transition-all ${plan === 'bot_only'
                                    ? 'border-violet-600 bg-violet-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <div className="text-center">
                                    <p className="font-semibold text-gray-900">Bot Only</p>
                                    <p className="text-2xl font-bold text-violet-600 mt-2">$99</p>
                                    <p className="text-xs text-gray-500 mt-1">/mes</p>
                                    <ul className="text-xs text-gray-600 mt-3 space-y-1 text-left">
                                        <li>• 1K mensajes/mes</li>
                                        <li>• 2 usuarios</li>
                                        <li>• Sin RQs</li>
                                    </ul>
                                </div>
                            </button>

                            {/* RQ Only */}
                            <button
                                type="button"
                                onClick={() => setPlan('rq_only')}
                                className={`p-4 border-2 rounded-lg transition-all ${plan === 'rq_only'
                                    ? 'border-violet-600 bg-violet-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <div className="text-center">
                                    <p className="font-semibold text-gray-900">RQ Only</p>
                                    <p className="text-2xl font-bold text-violet-600 mt-2">$199</p>
                                    <p className="text-xs text-gray-500 mt-1">/mes</p>
                                    <ul className="text-xs text-gray-600 mt-3 space-y-1 text-left">
                                        <li>• Sin bot</li>
                                        <li>• 10 usuarios</li>
                                        <li>• RQs ilimitados</li>
                                    </ul>
                                </div>
                            </button>

                            {/* Full Stack */}
                            <button
                                type="button"
                                onClick={() => setPlan('full_stack')}
                                className={`p-4 border-2 rounded-lg transition-all relative ${plan === 'full_stack'
                                    ? 'border-violet-600 bg-violet-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <span className="absolute -top-2 -right-2 bg-violet-600 text-white text-xs px-2 py-0.5 rounded-full">
                                    Popular
                                </span>
                                <div className="text-center">
                                    <p className="font-semibold text-gray-900">Full Stack</p>
                                    <p className="text-2xl font-bold text-violet-600 mt-2">$499</p>
                                    <p className="text-xs text-gray-500 mt-1">/mes</p>
                                    <ul className="text-xs text-gray-600 mt-3 space-y-1 text-left">
                                        <li>• 10K mensajes/mes</li>
                                        <li>• 20 usuarios</li>
                                        <li>• RQs ilimitados</li>
                                    </ul>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Info */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <p className="text-sm text-green-900">
                            <strong>✅ Automático:</strong> Se guardará en Firestore collection <code className="bg-green-100 px-1 rounded">holdings</code>
                        </p>
                        <p className="text-xs text-green-800 mt-2">
                            <strong>📝 Siguiente paso:</strong> Crear el Admin de la empresa en tab "Usuarios"
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
                    <button
                        onClick={onCancel}
                        disabled={saving}
                        className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="px-6 py-2 gradient-bg text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                    >
                        {saving ? (
                            <>
                                <span className="animate-spin">⏳</span> Guardando...
                            </>
                        ) : (
                            <>✓ Crear en Firestore</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
