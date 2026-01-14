'use client';

import { useState } from 'react';

interface CreateJobModalProps {
    show: boolean;
    holdingId: string;
    onCancel: () => void;
    onSave: (jobData: any) => void;
}

/**
 * Create Job Modal - For creating new job positions in Liah Talent
 * Includes AI-powered JD generation
 */
export default function CreateJobModal({ show, holdingId, onCancel, onSave }: CreateJobModalProps) {
    const [step, setStep] = useState<'profile' | 'jd' | 'kq' | 'approval'>('profile');
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);

    // Job data
    const [titulo, setTitulo] = useState('');
    const [departamento, setDepartamento] = useState('');
    const [sede, setSede] = useState('');
    const [descripcionBase, setDescripcionBase] = useState('');
    const [jdContent, setJdContent] = useState('');
    const [killerQuestions, setKillerQuestions] = useState<Array<{
        question: string;
        type: 'yes_no' | 'numeric' | 'text';
        expectedAnswer?: string;
        isCritical: boolean;
    }>>([]);
    const [approvers, setApprovers] = useState<string[]>([]);

    if (!show) return null;

    const handleGenerateJD = async () => {
        if (!titulo) {
            alert('Por favor ingresa el título del puesto primero');
            return;
        }

        setGenerating(true);
        try {
            const response = await fetch('/api/talent/generate-jd', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    titulo,
                    descripcionBase,
                    jdsSimilares: [] // TODO: implement RAG search
                })
            });

            const data = await response.json();
            if (data.success) {
                setJdContent(data.data.jd_content);
                setStep('jd');
            } else {
                alert('Error generando JD: ' + data.error);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error de conexión');
        } finally {
            setGenerating(false);
        }
    };

    const addKillerQuestion = () => {
        setKillerQuestions([...killerQuestions, {
            question: '',
            type: 'yes_no',
            expectedAnswer: 'Sí',
            isCritical: false
        }]);
    };

    const removeKillerQuestion = (index: number) => {
        setKillerQuestions(killerQuestions.filter((_, i) => i !== index));
    };

    const updateKillerQuestion = (index: number, updates: Partial<typeof killerQuestions[0]>) => {
        setKillerQuestions(killerQuestions.map((kq, i) =>
            i === index ? { ...kq, ...updates } : kq
        ));
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const jobData = {
                titulo,
                departamento,
                sede,
                jd_content: jdContent,
                killerQuestions,
                approvers,
                status: 'draft',
                holdingId
            };

            onSave(jobData);
        } catch (error) {
            console.error('Error:', error);
            alert('Error creando vacante');
        } finally {
            setLoading(false);
        }
    };

    const steps = [
        { id: 'profile', label: 'Perfil', num: 1 },
        { id: 'jd', label: 'Job Description', num: 2 },
        { id: 'kq', label: 'Preguntas Filtro', num: 3 },
        { id: 'approval', label: 'Aprobadores', num: 4 },
    ];

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="border-b border-gray-200 px-6 py-4 bg-gradient-to-r from-violet-600 to-indigo-600">
                    <h2 className="text-2xl font-bold text-white">Nueva Vacante</h2>
                    <p className="text-white/80 text-sm mt-1">Crea una posición con IA</p>
                </div>

                {/* Step Indicator */}
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                    <div className="flex items-center gap-2">
                        {steps.map((s, i) => (
                            <div key={s.id} className="flex items-center">
                                <button
                                    onClick={() => setStep(s.id as any)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${step === s.id
                                        ? 'bg-violet-100 text-violet-700'
                                        : 'text-gray-500 hover:bg-gray-100'
                                        }`}
                                >
                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === s.id ? 'bg-violet-600 text-white' : 'bg-gray-300 text-gray-600'
                                        }`}>
                                        {s.num}
                                    </span>
                                    <span className="font-medium text-sm">{s.label}</span>
                                </button>
                                {i < steps.length - 1 && <div className="w-8 h-px bg-gray-300 mx-1" />}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-6">
                    {/* Step 1: Profile */}
                    {step === 'profile' && (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Título del Puesto *
                                </label>
                                <input
                                    type="text"
                                    value={titulo}
                                    onChange={(e) => setTitulo(e.target.value)}
                                    placeholder="Senior Software Engineer"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Departamento
                                    </label>
                                    <select
                                        value={departamento}
                                        onChange={(e) => setDepartamento(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
                                    >
                                        <option value="">Seleccionar...</option>
                                        <option value="tecnologia">Tecnología</option>
                                        <option value="marketing">Marketing</option>
                                        <option value="finanzas">Finanzas</option>
                                        <option value="operaciones">Operaciones</option>
                                        <option value="rrhh">Recursos Humanos</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Sede
                                    </label>
                                    <select
                                        value={sede}
                                        onChange={(e) => setSede(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
                                    >
                                        <option value="">Seleccionar...</option>
                                        <option value="lima">Lima - Sede Central</option>
                                        <option value="arequipa">Arequipa</option>
                                        <option value="remoto">Remoto</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Descripción Base (opcional)
                                </label>
                                <textarea
                                    value={descripcionBase}
                                    onChange={(e) => setDescripcionBase(e.target.value)}
                                    placeholder="Describe brevemente el rol, la IA generará un JD completo..."
                                    rows={4}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
                                />
                            </div>

                            {/* PDF Upload Option */}
                            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-violet-400 transition-colors">
                                <input
                                    type="file"
                                    accept=".pdf,.doc,.docx,.txt"
                                    className="hidden"
                                    id="jd-upload"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;

                                        // For now, just extract text from simple files
                                        // TODO: Add proper PDF parsing with pdf.js
                                        try {
                                            if (file.type === 'text/plain') {
                                                const text = await file.text();
                                                setDescripcionBase(prev => prev + '\n\n--- Contenido del archivo ---\n' + text);
                                            } else {
                                                // For PDF/DOC, just note the file name
                                                setDescripcionBase(prev => prev + `\n\n[Archivo adjunto: ${file.name}]`);
                                                alert('📎 Archivo adjunto. Para mejor interpretación, copia el contenido del documento manualmente.');
                                            }
                                        } catch (error) {
                                            console.error('Error reading file:', error);
                                            alert('Error leyendo archivo');
                                        }
                                    }}
                                />
                                <label htmlFor="jd-upload" className="cursor-pointer">
                                    <div className="text-4xl mb-2">📄</div>
                                    <p className="font-medium text-gray-900">Subir Documento</p>
                                    <p className="text-sm text-gray-500 mt-1">PDF, Word o TXT (para extraer info)</p>
                                </label>
                            </div>

                            <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
                                <p className="text-violet-900 text-sm">
                                    💡 <strong>Tip:</strong> Proporciona algunos detalles o sube un documento de referencia, y la IA generará un Job Description profesional basado en perfiles exitosos similares.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Step 2: JD */}
                    {step === 'jd' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-semibold text-gray-900">Job Description</h3>
                                    <p className="text-sm text-gray-600">Generado por IA, puedes editarlo</p>
                                </div>
                                <button
                                    onClick={handleGenerateJD}
                                    disabled={generating}
                                    className="px-4 py-2 bg-violet-100 text-violet-700 rounded-lg hover:bg-violet-200 transition-colors flex items-center gap-2 disabled:opacity-50"
                                >
                                    {generating ? (
                                        <><span className="animate-spin">⏳</span> Generando...</>
                                    ) : (
                                        <>🔄 Regenerar con IA</>
                                    )}
                                </button>
                            </div>

                            <textarea
                                value={jdContent}
                                onChange={(e) => setJdContent(e.target.value)}
                                rows={15}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono text-sm"
                                placeholder="El Job Description aparecerá aquí..."
                            />
                        </div>
                    )}

                    {/* Step 3: Killer Questions */}
                    {step === 'kq' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-semibold text-gray-900">Preguntas Filtro (Killer Questions)</h3>
                                    <p className="text-sm text-gray-600">Preguntas para filtrar candidatos automáticamente</p>
                                </div>
                                <button
                                    onClick={addKillerQuestion}
                                    className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                                >
                                    + Agregar Pregunta
                                </button>
                            </div>

                            {killerQuestions.length === 0 ? (
                                <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
                                    <div className="text-4xl mb-3">❓</div>
                                    <p className="text-gray-600">No hay preguntas filtro aún</p>
                                    <p className="text-sm text-gray-500 mt-1">Las preguntas críticas rechazan automáticamente candidatos</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {killerQuestions.map((kq, index) => (
                                        <div key={index} className="border border-gray-200 rounded-xl p-4 bg-white">
                                            <div className="flex items-start gap-4">
                                                <div className="flex-1 space-y-3">
                                                    <input
                                                        type="text"
                                                        value={kq.question}
                                                        onChange={(e) => updateKillerQuestion(index, { question: e.target.value })}
                                                        placeholder="¿Tienes disponibilidad para trabajar en turnos rotativos?"
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                                                    />
                                                    <div className="flex items-center gap-4">
                                                        <select
                                                            value={kq.type}
                                                            onChange={(e) => updateKillerQuestion(index, { type: e.target.value as any })}
                                                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                        >
                                                            <option value="yes_no">Sí/No</option>
                                                            <option value="numeric">Numérico (mínimo)</option>
                                                            <option value="text">Texto libre</option>
                                                        </select>
                                                        {kq.type === 'yes_no' && (
                                                            <select
                                                                value={kq.expectedAnswer}
                                                                onChange={(e) => updateKillerQuestion(index, { expectedAnswer: e.target.value })}
                                                                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                            >
                                                                <option value="Sí">Esperado: Sí</option>
                                                                <option value="No">Esperado: No</option>
                                                            </select>
                                                        )}
                                                        {kq.type === 'numeric' && (
                                                            <input
                                                                type="number"
                                                                value={kq.expectedAnswer}
                                                                onChange={(e) => updateKillerQuestion(index, { expectedAnswer: e.target.value })}
                                                                placeholder="Mínimo"
                                                                className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                            />
                                                        )}
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={kq.isCritical}
                                                                onChange={(e) => updateKillerQuestion(index, { isCritical: e.target.checked })}
                                                                className="w-4 h-4 text-red-600 rounded"
                                                            />
                                                            <span className={`text-sm ${kq.isCritical ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                                                                ⚠️ Crítica
                                                            </span>
                                                        </label>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => removeKillerQuestion(index)}
                                                    className="text-red-500 hover:text-red-700 p-2"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                                <p className="text-amber-900 text-sm">
                                    ⚠️ <strong>Preguntas Críticas:</strong> Si el candidato falla una pregunta crítica, será rechazado automáticamente SIN usar tokens de IA (ahorro de costos).
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Approvers */}
                    {step === 'approval' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="font-semibold text-gray-900">Flujo de Aprobación</h3>
                                <p className="text-sm text-gray-600">Define quién debe aprobar esta vacante antes de publicarla</p>
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                <p className="text-blue-900 text-sm">
                                    📋 El flujo de aprobación será: <strong>Draft → Pendiente → Aprobado → Publicado</strong>
                                </p>
                            </div>

                            <div className="space-y-3">
                                <p className="text-sm font-medium text-gray-700">Aprobadores (en orden):</p>
                                <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                                    <p className="text-gray-600 text-sm text-center py-4">
                                        🔧 Configuración de aprobadores próximamente
                                    </p>
                                </div>
                            </div>

                            {/* Summary */}
                            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mt-6">
                                <h4 className="font-semibold text-gray-900 mb-3">Resumen de la Vacante</h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div><span className="text-gray-500">Título:</span> <strong>{titulo || '-'}</strong></div>
                                    <div><span className="text-gray-500">Departamento:</span> <strong>{departamento || '-'}</strong></div>
                                    <div><span className="text-gray-500">Sede:</span> <strong>{sede || '-'}</strong></div>
                                    <div><span className="text-gray-500">Preguntas Filtro:</span> <strong>{killerQuestions.length}</strong></div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 px-6 py-4 flex justify-between bg-gray-50">
                    <button
                        onClick={onCancel}
                        disabled={loading}
                        className="px-6 py-2 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-100 transition-colors"
                    >
                        Cancelar
                    </button>

                    <div className="flex gap-3">
                        {step !== 'profile' && (
                            <button
                                onClick={() => {
                                    const idx = steps.findIndex(s => s.id === step);
                                    if (idx > 0) setStep(steps[idx - 1].id as any);
                                }}
                                className="px-6 py-2 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-100 transition-colors"
                            >
                                ← Anterior
                            </button>
                        )}

                        {step === 'profile' && (
                            <button
                                onClick={() => jdContent ? setStep('jd') : handleGenerateJD()}
                                disabled={!titulo || generating}
                                className="px-6 py-2 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {generating ? (
                                    <><span className="animate-spin">⏳</span> Generando JD...</>
                                ) : (
                                    <>🤖 Generar JD con IA</>
                                )}
                            </button>
                        )}

                        {step === 'jd' && (
                            <button
                                onClick={() => setStep('kq')}
                                disabled={!jdContent}
                                className="px-6 py-2 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700 transition-colors disabled:opacity-50"
                            >
                                Siguiente →
                            </button>
                        )}

                        {step === 'kq' && (
                            <button
                                onClick={() => setStep('approval')}
                                className="px-6 py-2 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700 transition-colors"
                            >
                                Siguiente →
                            </button>
                        )}

                        {step === 'approval' && (
                            <button
                                onClick={handleSubmit}
                                disabled={loading || !titulo || !jdContent}
                                className="px-6 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                            >
                                {loading ? (
                                    <><span className="animate-spin">⏳</span> Guardando...</>
                                ) : (
                                    <>✓ Crear Vacante (Borrador)</>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
