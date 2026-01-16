'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';

interface FunnelStage {
    id: string;
    nombre: string;
    color: string;
    orden: number;
}

interface FunnelStagesConfigProps {
    holdingId: string;
}

// Available colors for stages
const AVAILABLE_COLORS = [
    { id: 'gray', label: 'Gris', class: 'bg-gray-100', border: 'border-gray-300' },
    { id: 'blue', label: 'Azul', class: 'bg-blue-100', border: 'border-blue-300' },
    { id: 'cyan', label: 'Cian', class: 'bg-cyan-100', border: 'border-cyan-300' },
    { id: 'teal', label: 'Verde Agua', class: 'bg-teal-100', border: 'border-teal-300' },
    { id: 'green', label: 'Verde', class: 'bg-green-100', border: 'border-green-300' },
    { id: 'emerald', label: 'Esmeralda', class: 'bg-emerald-100', border: 'border-emerald-300' },
    { id: 'yellow', label: 'Amarillo', class: 'bg-yellow-100', border: 'border-yellow-300' },
    { id: 'amber', label: 'Ámbar', class: 'bg-amber-100', border: 'border-amber-300' },
    { id: 'orange', label: 'Naranja', class: 'bg-orange-100', border: 'border-orange-300' },
    { id: 'red', label: 'Rojo', class: 'bg-red-100', border: 'border-red-300' },
    { id: 'pink', label: 'Rosa', class: 'bg-pink-100', border: 'border-pink-300' },
    { id: 'purple', label: 'Morado', class: 'bg-purple-100', border: 'border-purple-300' },
    { id: 'violet', label: 'Violeta', class: 'bg-violet-100', border: 'border-violet-300' },
];

// Default funnel stages
const DEFAULT_STAGES: FunnelStage[] = [
    { id: 'applied', nombre: 'Postulados', color: 'bg-gray-100', orden: 1 },
    { id: 'screening', nombre: 'Screening', color: 'bg-blue-100', orden: 2 },
    { id: 'interview', nombre: 'Entrevista', color: 'bg-yellow-100', orden: 3 },
    { id: 'offer', nombre: 'Oferta', color: 'bg-green-100', orden: 4 },
    { id: 'hired', nombre: 'Contratado', color: 'bg-emerald-100', orden: 5 },
];

// These stages are fixed and cannot be removed
const FIXED_STAGES = ['applied', 'hired', 'rejected'];

export default function FunnelStagesConfig({ holdingId }: FunnelStagesConfigProps) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [stages, setStages] = useState<FunnelStage[]>(DEFAULT_STAGES);
    const [editingStage, setEditingStage] = useState<string | null>(null);
    const [newStageName, setNewStageName] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);

    useEffect(() => {
        loadConfig();
    }, [holdingId]);

    async function loadConfig() {
        setLoading(true);
        try {
            const configDoc = await getDoc(doc(db, 'funnel_config', holdingId));
            if (configDoc.exists()) {
                const data = configDoc.data();
                if (data.stages && Array.isArray(data.stages)) {
                    setStages(data.stages);
                }
            }
        } catch (error) {
            console.error('Error loading funnel config:', error);
        } finally {
            setLoading(false);
        }
    }

    async function saveConfig() {
        setSaving(true);
        try {
            await setDoc(doc(db, 'funnel_config', holdingId), {
                stages,
                holdingId,
                updatedAt: Timestamp.now()
            });
            alert('✅ Configuración guardada');
        } catch (error) {
            console.error('Error saving config:', error);
            alert('Error al guardar');
        } finally {
            setSaving(false);
        }
    }

    function updateStage(stageId: string, field: 'nombre' | 'color', value: string) {
        setStages(prev => prev.map(s =>
            s.id === stageId ? { ...s, [field]: value } : s
        ));
    }

    function moveStage(stageId: string, direction: 'up' | 'down') {
        const idx = stages.findIndex(s => s.id === stageId);
        if (idx === -1) return;

        const newIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (newIdx < 0 || newIdx >= stages.length) return;

        // Don't move past fixed stages
        if (stages[newIdx].id === 'applied' || stages[idx].id === 'applied') return;
        if (stages[newIdx].id === 'hired' || stages[idx].id === 'hired') return;

        const newStages = [...stages];
        [newStages[idx], newStages[newIdx]] = [newStages[newIdx], newStages[idx]];

        // Update order numbers
        newStages.forEach((s, i) => { s.orden = i + 1; });
        setStages(newStages);
    }

    function addStage() {
        if (!newStageName.trim()) return;

        const newId = newStageName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        if (stages.find(s => s.id === newId)) {
            alert('Ya existe una etapa con ese nombre');
            return;
        }

        // Insert before "Contratado" and "Rechazado"
        const hiredIdx = stages.findIndex(s => s.id === 'hired');
        const insertIdx = hiredIdx > 0 ? hiredIdx : stages.length;

        const newStage: FunnelStage = {
            id: newId,
            nombre: newStageName.trim(),
            color: 'bg-blue-100',
            orden: insertIdx + 1
        };

        const newStages = [...stages];
        newStages.splice(insertIdx, 0, newStage);

        // Update order numbers
        newStages.forEach((s, i) => { s.orden = i + 1; });
        setStages(newStages);

        setNewStageName('');
        setShowAddForm(false);
    }

    function removeStage(stageId: string) {
        if (FIXED_STAGES.includes(stageId)) {
            alert('Esta etapa no se puede eliminar');
            return;
        }

        if (!confirm('¿Eliminar esta etapa?')) return;

        const newStages = stages.filter(s => s.id !== stageId);
        newStages.forEach((s, i) => { s.orden = i + 1; });
        setStages(newStages);
    }

    function resetToDefault() {
        if (!confirm('¿Restaurar etapas por defecto? Se perderán los cambios.')) return;
        setStages([...DEFAULT_STAGES]);
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Configurar Etapas del Funnel</h2>
                    <p className="text-gray-600">Personaliza las etapas del proceso de reclutamiento</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={resetToDefault}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                        Restaurar
                    </button>
                    <button
                        onClick={saveConfig}
                        disabled={saving}
                        className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50"
                    >
                        {saving ? 'Guardando...' : '💾 Guardar Cambios'}
                    </button>
                </div>
            </div>

            {/* Preview */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="text-sm font-medium text-gray-500 mb-3">Vista Previa</h3>
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {stages.map(stage => (
                        <div
                            key={stage.id}
                            className={`${stage.color} px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap`}
                        >
                            {stage.nombre}
                        </div>
                    ))}
                    <div className="bg-red-100 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap">
                        Rechazados
                    </div>
                </div>
            </div>

            {/* Stages List */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="divide-y divide-gray-200">
                    {stages.map((stage, idx) => (
                        <div
                            key={stage.id}
                            className={`p-4 flex items-center gap-4 ${stage.color}`}
                        >
                            {/* Order controls */}
                            <div className="flex flex-col gap-1">
                                <button
                                    onClick={() => moveStage(stage.id, 'up')}
                                    disabled={idx === 0 || stage.id === 'applied'}
                                    className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                                >
                                    ▲
                                </button>
                                <button
                                    onClick={() => moveStage(stage.id, 'down')}
                                    disabled={idx === stages.length - 1 || stage.id === 'hired'}
                                    className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                                >
                                    ▼
                                </button>
                            </div>

                            {/* Order number */}
                            <div className="w-8 h-8 bg-white/50 rounded-full flex items-center justify-center font-bold text-gray-600">
                                {stage.orden}
                            </div>

                            {/* Stage name */}
                            <div className="flex-1">
                                {editingStage === stage.id ? (
                                    <input
                                        type="text"
                                        value={stage.nombre}
                                        onChange={(e) => updateStage(stage.id, 'nombre', e.target.value)}
                                        onBlur={() => setEditingStage(null)}
                                        onKeyDown={(e) => e.key === 'Enter' && setEditingStage(null)}
                                        autoFocus
                                        className="px-3 py-1 border border-gray-300 rounded-lg w-full max-w-xs"
                                    />
                                ) : (
                                    <div
                                        className="font-medium text-gray-900 cursor-pointer hover:underline"
                                        onClick={() => !FIXED_STAGES.includes(stage.id) && setEditingStage(stage.id)}
                                    >
                                        {stage.nombre}
                                        {FIXED_STAGES.includes(stage.id) && (
                                            <span className="ml-2 text-xs text-gray-500">(fijo)</span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Color selector */}
                            <div className="flex gap-1">
                                {AVAILABLE_COLORS.slice(0, 7).map(color => (
                                    <button
                                        key={color.id}
                                        onClick={() => updateStage(stage.id, 'color', color.class)}
                                        className={`w-6 h-6 rounded-full ${color.class} border-2 ${stage.color === color.class ? 'border-gray-800' : 'border-transparent'
                                            }`}
                                        title={color.label}
                                    />
                                ))}
                            </div>

                            {/* Delete button */}
                            {!FIXED_STAGES.includes(stage.id) && (
                                <button
                                    onClick={() => removeStage(stage.id)}
                                    className="text-red-500 hover:text-red-700 p-2"
                                >
                                    🗑️
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                {/* Add new stage */}
                <div className="p-4 bg-gray-50 border-t border-gray-200">
                    {showAddForm ? (
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newStageName}
                                onChange={(e) => setNewStageName(e.target.value)}
                                placeholder="Nombre de la etapa"
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                                onKeyDown={(e) => e.key === 'Enter' && addStage()}
                            />
                            <button
                                onClick={addStage}
                                className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
                            >
                                Agregar
                            </button>
                            <button
                                onClick={() => { setShowAddForm(false); setNewStageName(''); }}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700"
                            >
                                Cancelar
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-violet-500 hover:text-violet-600 transition-colors"
                        >
                            + Agregar Nueva Etapa
                        </button>
                    )}
                </div>
            </div>

            {/* Help text */}
            <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-800">
                <strong>💡 Tip:</strong> Las etapas "Postulados" y "Contratado" son fijas y no se pueden eliminar.
                Los candidatos rechazados siempre aparecen en una columna separada al final.
            </div>
        </div>
    );
}
