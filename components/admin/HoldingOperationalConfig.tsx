'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';

interface HoldingOperationalConfigProps {
    holdingId: string;
}

export default function HoldingOperationalConfig({ holdingId }: HoldingOperationalConfigProps) {
    const [holdingName, setHoldingName] = useState('');
    const [blockRQCreation, setBlockRQCreation] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        async function loadConfig() {
            if (!holdingId) return;
            try {
                const snap = await getDoc(doc(db, 'holdings', holdingId));
                if (snap.exists()) {
                    const data = snap.data();
                    setHoldingName(data.nombre || '');
                    setBlockRQCreation(data.blockRQCreation || false);
                }
            } catch (error) {
                console.error('Error loading operational config:', error);
            } finally {
                setLoading(false);
            }
        }
        loadConfig();
    }, [holdingId]);

    async function handleSave() {
        setSaving(true);
        try {
            const holdingRef = doc(db, 'holdings', holdingId);
            await updateDoc(holdingRef, {
                nombre: holdingName,
                blockRQCreation: blockRQCreation,
                updatedAt: Timestamp.now()
            });
            alert('✅ Configuración operativa guardada');
        } catch (error) {
            console.error('Error saving operational config:', error);
            alert('❌ Error al guardar configuración');
        } finally {
            setSaving(false);
        }
    }

    if (loading) return <div className="animate-pulse h-40 bg-gray-100 rounded-xl" />;

    return (
        <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">⚙️ Configuración Operativa</h3>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nombre de la Empresa
                    </label>
                    <input
                        type="text"
                        value={holdingName}
                        onChange={(e) => setHoldingName(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                    />
                </div>

                <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-100">
                    <div>
                        <p className="font-semibold text-red-900">Bloquear Nuevos Requerimientos</p>
                        <p className="text-sm text-red-700/70">
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
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                    </label>
                </div>
            </div>

            <button
                onClick={handleSave}
                disabled={saving}
                className="w-full px-6 py-3 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-all"
            >
                {saving ? 'Guardando...' : 'Guardar Cambios Operativos'}
            </button>
        </div>
    );
}
