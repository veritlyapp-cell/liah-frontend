'use client';

import { useState } from 'react';

export interface KillerQuestion {
    id: string;
    pregunta: string;
    tipo: 'text' | 'yes_no' | 'multiple_choice';
    opciones?: string[]; // For multiple choice
    respuestaCorrecta?: string; // Expected answer (for auto-rejection)
    esEliminatoria: boolean; // If wrong → auto-reject
    orden: number;
}

interface KillerQuestionsEditorProps {
    questions: KillerQuestion[];
    onChange: (questions: KillerQuestion[]) => void;
}

export default function KillerQuestionsEditor({
    questions,
    onChange
}: KillerQuestionsEditorProps) {
    const [editingId, setEditingId] = useState<string | null>(null);

    function generateId() {
        return `kq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    function addQuestion() {
        const newQuestion: KillerQuestion = {
            id: generateId(),
            pregunta: '',
            tipo: 'yes_no',
            esEliminatoria: true,
            orden: questions.length + 1
        };
        onChange([...questions, newQuestion]);
        setEditingId(newQuestion.id);
    }

    function updateQuestion(id: string, updates: Partial<KillerQuestion>) {
        onChange(questions.map(q => q.id === id ? { ...q, ...updates } : q));
    }

    function removeQuestion(id: string) {
        const filtered = questions.filter(q => q.id !== id);
        // Reorder
        filtered.forEach((q, i) => q.orden = i + 1);
        onChange(filtered);
    }

    function moveQuestion(id: string, direction: 'up' | 'down') {
        const index = questions.findIndex(q => q.id === id);
        if (direction === 'up' && index > 0) {
            const newQuestions = [...questions];
            [newQuestions[index - 1], newQuestions[index]] = [newQuestions[index], newQuestions[index - 1]];
            newQuestions.forEach((q, i) => q.orden = i + 1);
            onChange(newQuestions);
        } else if (direction === 'down' && index < questions.length - 1) {
            const newQuestions = [...questions];
            [newQuestions[index], newQuestions[index + 1]] = [newQuestions[index + 1], newQuestions[index]];
            newQuestions.forEach((q, i) => q.orden = i + 1);
            onChange(newQuestions);
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h4 className="font-medium text-gray-900">Killer Questions</h4>
                    <p className="text-sm text-gray-500">
                        Preguntas filtro - si responden mal las eliminatorias, son rechazados automáticamente
                    </p>
                </div>
                <button
                    type="button"
                    onClick={addQuestion}
                    className="px-3 py-1.5 bg-violet-100 text-violet-700 rounded-lg text-sm hover:bg-violet-200"
                >
                    + Agregar Pregunta
                </button>
            </div>

            {questions.length === 0 ? (
                <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <p className="text-gray-500">No hay killer questions configuradas</p>
                    <button
                        type="button"
                        onClick={addQuestion}
                        className="mt-2 text-violet-600 hover:text-violet-700 text-sm font-medium"
                    >
                        + Agregar primera pregunta
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {questions.map((q, index) => (
                        <div
                            key={q.id}
                            className={`bg-white border rounded-lg p-4 ${q.esEliminatoria ? 'border-red-200' : 'border-gray-200'
                                }`}
                        >
                            <div className="flex items-start gap-3">
                                {/* Order & controls */}
                                <div className="flex flex-col items-center gap-1">
                                    <span className="text-xs font-medium text-gray-500 bg-gray-100 rounded px-2 py-0.5">
                                        {q.orden}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => moveQuestion(q.id, 'up')}
                                        disabled={index === 0}
                                        className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                                    >
                                        ↑
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => moveQuestion(q.id, 'down')}
                                        disabled={index === questions.length - 1}
                                        className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                                    >
                                        ↓
                                    </button>
                                </div>

                                {/* Question content */}
                                <div className="flex-1 space-y-3">
                                    {/* Question text */}
                                    <input
                                        type="text"
                                        value={q.pregunta}
                                        onChange={(e) => updateQuestion(q.id, { pregunta: e.target.value })}
                                        placeholder="Escribe la pregunta..."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500"
                                    />

                                    <div className="flex items-center gap-4 flex-wrap">
                                        {/* Question type */}
                                        <div className="flex items-center gap-2">
                                            <label className="text-xs text-gray-500">Tipo:</label>
                                            <select
                                                value={q.tipo}
                                                onChange={(e) => updateQuestion(q.id, {
                                                    tipo: e.target.value as KillerQuestion['tipo'],
                                                    opciones: e.target.value === 'multiple_choice' ? ['', ''] : undefined,
                                                    respuestaCorrecta: undefined
                                                })}
                                                className="px-2 py-1 border border-gray-300 rounded text-sm"
                                            >
                                                <option value="yes_no">Sí/No</option>
                                                <option value="multiple_choice">Opción múltiple</option>
                                                <option value="text">Texto abierto</option>
                                            </select>
                                        </div>

                                        {/* Eliminatory toggle */}
                                        <label className="flex items-center gap-2 text-sm">
                                            <input
                                                type="checkbox"
                                                checked={q.esEliminatoria}
                                                onChange={(e) => updateQuestion(q.id, { esEliminatoria: e.target.checked })}
                                                className="w-4 h-4 text-red-600 border-gray-300 rounded"
                                            />
                                            <span className={q.esEliminatoria ? 'text-red-600 font-medium' : 'text-gray-600'}>
                                                ⚠️ Eliminatoria
                                            </span>
                                        </label>
                                    </div>

                                    {/* Yes/No correct answer */}
                                    {q.tipo === 'yes_no' && q.esEliminatoria && (
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-gray-500">Respuesta esperada:</span>
                                            <label className="flex items-center gap-1">
                                                <input
                                                    type="radio"
                                                    name={`yesno_${q.id}`}
                                                    checked={q.respuestaCorrecta === 'si'}
                                                    onChange={() => updateQuestion(q.id, { respuestaCorrecta: 'si' })}
                                                    className="text-violet-600"
                                                />
                                                <span className="text-sm">Sí</span>
                                            </label>
                                            <label className="flex items-center gap-1">
                                                <input
                                                    type="radio"
                                                    name={`yesno_${q.id}`}
                                                    checked={q.respuestaCorrecta === 'no'}
                                                    onChange={() => updateQuestion(q.id, { respuestaCorrecta: 'no' })}
                                                    className="text-violet-600"
                                                />
                                                <span className="text-sm">No</span>
                                            </label>
                                        </div>
                                    )}

                                    {/* Multiple choice options */}
                                    {q.tipo === 'multiple_choice' && (
                                        <div className="space-y-2">
                                            <span className="text-xs text-gray-500">Opciones (marca la correcta si es eliminatoria):</span>
                                            {(q.opciones || []).map((opcion, optIndex) => (
                                                <div key={optIndex} className="flex items-center gap-2">
                                                    {q.esEliminatoria && (
                                                        <input
                                                            type="radio"
                                                            name={`mc_${q.id}`}
                                                            checked={q.respuestaCorrecta === opcion}
                                                            onChange={() => updateQuestion(q.id, { respuestaCorrecta: opcion })}
                                                            className="text-violet-600"
                                                        />
                                                    )}
                                                    <input
                                                        type="text"
                                                        value={opcion}
                                                        onChange={(e) => {
                                                            const newOpciones = [...(q.opciones || [])];
                                                            newOpciones[optIndex] = e.target.value;
                                                            updateQuestion(q.id, { opciones: newOpciones });
                                                        }}
                                                        placeholder={`Opción ${optIndex + 1}`}
                                                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                                                    />
                                                    {(q.opciones || []).length > 2 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const newOpciones = (q.opciones || []).filter((_, i) => i !== optIndex);
                                                                updateQuestion(q.id, { opciones: newOpciones });
                                                            }}
                                                            className="text-red-500 hover:text-red-700"
                                                        >
                                                            ×
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newOpciones = [...(q.opciones || []), ''];
                                                    updateQuestion(q.id, { opciones: newOpciones });
                                                }}
                                                className="text-violet-600 text-sm hover:text-violet-700"
                                            >
                                                + Agregar opción
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Delete button */}
                                <button
                                    type="button"
                                    onClick={() => removeQuestion(q.id)}
                                    className="text-red-500 hover:text-red-700 p-1"
                                >
                                    🗑️
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Info box */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                <strong>💡 Tip:</strong> Los candidatos que fallen las preguntas eliminatorias serán
                rechazados automáticamente sin pasar por el análisis de IA.
            </div>
        </div>
    );
}
