'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

interface ApprovalFlowConfigProps {
    holdingId: string;
}

export default function ApprovalFlowConfig({ holdingId }: ApprovalFlowConfigProps) {
    const [approvalLevels, setApprovalLevels] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        loadConfig();
    }, [holdingId]);

    const loadConfig = async () => {
        setLoading(true);
        try {
            const docRef = doc(db, 'holdings', holdingId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                const config = data.config || {};

                if (config.approvalLevels && Array.isArray(config.approvalLevels)) {
                    setApprovalLevels(config.approvalLevels);
                } else {
                    // Default fallback
                    setApprovalLevels([
                        { level: 1, name: 'Gerente de Tienda', role: 'store_manager' },
                        { level: 2, name: 'Jefe de Marca', role: 'jefe_marca' }
                    ]);
                }
            }
        } catch (error) {
            console.error('Error loading config:', error);
            setMessage({ type: 'error', text: 'Error al cargar la configuración.' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            const docRef = doc(db, 'holdings', holdingId);
            await updateDoc(docRef, {
                'config.approvalLevels': approvalLevels
            });
            setMessage({ type: 'success', text: '✅ Flujo de aprobación guardado correctamente.' });

            // Clear message after 3 seconds
            setTimeout(() => setMessage(null), 3000);
        } catch (error) {
            console.error('Error saving config:', error);
            setMessage({ type: 'error', text: 'Error al guardar la configuración.' });
        } finally {
            setSaving(false);
        }
    };

    const handleAddLevel = () => {
        const nextLevel = approvalLevels.length + 1;
        setApprovalLevels([...approvalLevels, { level: nextLevel, name: '', role: 'supervisor' }]);
    };

    const handleRemoveLevel = (index: number) => {
        const filtered = approvalLevels.filter((_, i) => i !== index);
        // Re-leveling so numbers are consecutive 1, 2, 3...
        const releveled = filtered.map((l, idx) => ({ ...l, level: idx + 1 }));
        setApprovalLevels(releveled);
    };

    const handleUpdateLevel = (index: number, field: string, value: string) => {
        const updated = [...approvalLevels];
        updated[index][field] = value;
        setApprovalLevels(updated);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">⚖️ Matriz de Aprobación de Requerimientos (RQ)</h3>
            <p className="text-sm text-gray-500 mb-6">
                Define cuántos niveles de aprobación debe pasar un RQ antes de llegar a los reclutadores.
                El flujo va desde el nivel alto numérico hasta el nivel 1 (que es el creador original o base).
            </p>

            <div className="space-y-4 max-w-2xl">
                {approvalLevels.length === 0 && (
                    <p className="text-sm text-orange-600 bg-orange-50 p-3 rounded-lg border border-orange-100">
                        ⚠️ No hay niveles definidos. Se aprobarán automáticamente.
                    </p>
                )}

                {approvalLevels.map((lvl, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row items-center gap-4 bg-violet-50 p-4 rounded-xl border border-violet-100">
                        <div className="w-10 h-10 shrink-0 rounded-full bg-violet-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                            {lvl.level}
                        </div>

                        <div className="flex-1 w-full space-y-2 sm:space-y-0 sm:flex sm:gap-4">
                            <div className="flex-1">
                                <label className="text-xs text-gray-500 font-semibold uppercase ml-1">Nombre (ej: Supervisor, Jefe)</label>
                                <input
                                    type="text"
                                    value={lvl.name}
                                    onChange={(e) => handleUpdateLevel(idx, 'name', e.target.value)}
                                    className="w-full mt-1 px-3 py-2 border border-violet-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-violet-500 outline-none transition-all"
                                    placeholder="Nombre del cargo"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="text-xs text-gray-500 font-semibold uppercase ml-1">Rol Sistema</label>
                                <select
                                    value={lvl.role}
                                    onChange={(e) => handleUpdateLevel(idx, 'role', e.target.value)}
                                    className="w-full mt-1 px-3 py-2 border border-violet-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-violet-500 outline-none transition-all"
                                >
                                    <option value="store_manager">Gerente de Tienda (Creator)</option>
                                    <option value="supervisor">Supervisor</option>
                                    <option value="jefe_marca">Jefe de Marca</option>
                                    <option value="recruiter">Recruiter / Talent (Aprobador Final)</option>
                                    <option value="holding_admin">Admin General</option>
                                </select>
                            </div>
                        </div>

                        <button
                            onClick={() => handleRemoveLevel(idx)}
                            className="p-2 sm:p-0 mt-2 sm:mt-0 text-red-500 hover:text-red-700 bg-red-50 sm:bg-transparent rounded-lg sm:rounded-none w-full sm:w-auto flex items-center justify-center gap-2 sm:block transition-colors"
                        >
                            <span className="sm:hidden text-sm font-medium">Eliminar Nivel</span>
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                ))}

                <button
                    onClick={handleAddLevel}
                    className="w-full sm:w-auto px-4 py-3 bg-violet-100 text-violet-700 font-semibold rounded-xl hover:bg-violet-200 transition-colors flex items-center justify-center gap-2"
                >
                    <span>➕ Agregar Nivel de Aprobación</span>
                </button>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between">
                {message ? (
                    <p className={`text-sm font-medium ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                        {message.text}
                    </p>
                ) : (
                    <p className="text-sm text-gray-500 invisible">Spacer</p>
                )}

                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-8 py-3 bg-violet-600 text-white font-bold rounded-xl shadow-md cursor-pointer hover:bg-violet-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {saving ? (
                        <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Guardando...</span>
                        </>
                    ) : (
                        <span>💾 Guardar Flujo</span>
                    )}
                </button>
            </div>
        </div>
    );
}
