'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface CreateJobModalProps {
    show: boolean;
    holdingId: string;
    onCancel: () => void;
    onSave: (jobData: any) => void;
}

/**
 * Create Job Modal - For creating new job positions in Liah Talent
 * Includes AI-powered JD generation and full publication fields
 */
export default function CreateJobModal({ show, holdingId, onCancel, onSave }: CreateJobModalProps) {
    const [step, setStep] = useState<'profile' | 'details' | 'jd' | 'kq' | 'funnel'>('profile');
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);

    // Job data
    const [titulo, setTitulo] = useState('');
    const [departamento, setDepartamento] = useState('');
    const [sede, setSede] = useState('');
    const [descripcionBase, setDescripcionBase] = useState('');

    // Detailed fields (matching PublishRQModal)
    const [requisitos, setRequisitos] = useState('');
    const [beneficios, setBeneficios] = useState('');
    const [tipoContrato, setTipoContrato] = useState('tiempo_completo');
    const [modalidad, setModalidad] = useState('presencial');
    const [tipoSede, setTipoSede] = useState<'tienda' | 'administrativo'>('tienda');
    const [salarioMin, setSalarioMin] = useState('');
    const [salarioMax, setSalarioMax] = useState('');
    const [mostrarSalario, setMostrarSalario] = useState(false);

    const [jdContent, setJdContent] = useState('');
    const [killerQuestions, setKillerQuestions] = useState<Array<{
        question: string;
        type: 'yes_no' | 'numeric' | 'text';
        expectedAnswer?: string;
        isCritical: boolean;
    }>>([]);
    const [funnelId, setFunnelId] = useState('default');

    useEffect(() => {
        if (show) {
            loadHoldingConfig();
        }
    }, [show]);

    async function loadHoldingConfig() {
        try {
            const holdingDoc = await getDoc(doc(db, 'holdings', holdingId));
            if (holdingDoc.exists()) {
                const config = holdingDoc.data().publishConfig;
                if (config && config.beneficiosEstandar) {
                    setBeneficios(config.beneficiosEstandar.join('\n'));
                }
            }
        } catch (error) {
            console.error('Error loading holding config:', error);
        }
    }

    if (!show) return null;

    const handleGenerateJD = async () => {
        if (!titulo) {
            alert('Por favor ingresa el título del puesto primero');
            return;
        }

        setGenerating(true);
        try {
            // Fetch latest config to pass to IA
            const holdingDoc = await getDoc(doc(db, 'holdings', holdingId));
            const publishConfig = holdingDoc.exists() ? holdingDoc.data().publishConfig : null;

            const response = await fetch('/api/talent/generate-jd', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    titulo,
                    descripcionBase: descripcionBase || `Perfil para el puesto de ${titulo}.`,
                    jdsSimilares: [],
                    holdingId,
                    publishConfig
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
                titulo: titulo.trim(),
                departamento,
                sede,
                descripcion: jdContent, // Mapping jdContent to descripcion for consistency
                requisitos: requisitos.trim() || null,
                beneficios: beneficios.trim() || null,
                tipoContrato,
                modalidad,
                tipoSede,
                salarioMin: salarioMin ? parseInt(salarioMin) : null,
                salarioMax: salarioMax ? parseInt(salarioMax) : null,
                mostrarSalario,
                killerQuestions,
                funnelId,
                status: 'published', // Manual jobs are published by default
                holdingId
            };

            console.log('[CreateJobModal] Submitting job:', jobData);
            await onSave(jobData);
            console.log('[CreateJobModal] Job saved successfully');
        } catch (error) {
            console.error('[CreateJobModal] Error:', error);
            alert('Error creando vacante');
        } finally {
            setLoading(false);
        }
    };

    const steps = [
        { id: 'profile', label: 'Perfil', num: 1 },
        { id: 'details', label: 'Detalles', num: 2 },
        { id: 'jd', label: 'Job Description', num: 3 },
        { id: 'kq', label: 'Preguntas Filtro', num: 4 },
        { id: 'funnel', label: 'Funnel / Proceso', num: 5 },
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
                                    placeholder="Ej: Supervisor de Tienda"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Gerencia / Área
                                    </label>
                                    <input
                                        type="text"
                                        value={departamento}
                                        onChange={(e) => setDepartamento(e.target.value)}
                                        placeholder="Ej: Operaciones"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Sede / Localidad
                                    </label>
                                    <input
                                        type="text"
                                        value={sede}
                                        onChange={(e) => setSede(e.target.value)}
                                        placeholder="Ej: Lima - Miraflores"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Descripción Base o Perfil
                                </label>
                                <textarea
                                    value={descripcionBase}
                                    onChange={(e) => setDescripcionBase(e.target.value)}
                                    placeholder="Describe brevemente el rol para que la IA genere el contenido completo..."
                                    rows={4}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 2: Details */}
                    {step === 'details' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Contrato</label>
                                    <select
                                        value={tipoContrato}
                                        onChange={(e) => setTipoContrato(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                                    >
                                        <option value="tiempo_completo">Tiempo Completo</option>
                                        <option value="medio_tiempo">Medio Tiempo</option>
                                        <option value="temporal">Temporal</option>
                                        <option value="practicas">Prácticas</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Modalidad</label>
                                    <select
                                        value={modalidad}
                                        onChange={(e) => setModalidad(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                                    >
                                        <option value="presencial">Presencial</option>
                                        <option value="remoto">Remoto</option>
                                        <option value="hibrido">Híbrido</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Sede</label>
                                    <select
                                        value={tipoSede}
                                        onChange={(e) => setTipoSede(e.target.value as any)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                                    >
                                        <option value="tienda">🏪 Tienda / Operativo</option>
                                        <option value="administrativo">🏢 Administrativo</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Salario (Opcional)</label>
                                    <div className="flex gap-2">
                                        <input type="number" placeholder="Min" value={salarioMin} onChange={e => setSalarioMin(e.target.value)} className="w-1/2 px-4 py-2 border border-gray-300 rounded-lg text-sm" />
                                        <input type="number" placeholder="Max" value={salarioMax} onChange={e => setSalarioMax(e.target.value)} className="w-1/2 px-4 py-2 border border-gray-300 rounded-lg text-sm" />
                                    </div>
                                    <label className="flex items-center gap-2 mt-2 text-xs text-gray-600">
                                        <input type="checkbox" checked={mostrarSalario} onChange={e => setMostrarSalario(e.target.checked)} />
                                        Mostrar en publicación
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Requisitos</label>
                                <textarea
                                    value={requisitos}
                                    onChange={(e) => setRequisitos(e.target.value)}
                                    rows={3}
                                    placeholder="- Experiencia mínima..."
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Beneficios</label>
                                <textarea
                                    value={beneficios}
                                    onChange={(e) => setBeneficios(e.target.value)}
                                    rows={3}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 3: JD */}
                    {step === 'jd' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-semibold text-gray-900">Contenido del Anuncio</h3>
                                    <p className="text-sm text-gray-600">Generado por IA, puedes editarlo</p>
                                </div>
                                <button
                                    onClick={handleGenerateJD}
                                    disabled={generating}
                                    className="px-4 py-2 bg-violet-100 text-violet-700 rounded-lg hover:bg-violet-200 disabled:opacity-50"
                                >
                                    {generating ? '⏳ Generando...' : '🔄 Regenerar con IA'}
                                </button>
                            </div>

                            <textarea
                                value={jdContent}
                                onChange={(e) => setJdContent(e.target.value)}
                                rows={12}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl font-mono text-sm"
                            />
                        </div>
                    )}

                    {/* Step 4: Killer Questions */}
                    {step === 'kq' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-semibold text-gray-900">Preguntas Filtro</h3>
                                </div>
                                <button onClick={addKillerQuestion} className="px-4 py-2 bg-violet-600 text-white rounded-lg">+ Agregar</button>
                            </div>

                            {killerQuestions.map((kq, index) => (
                                <div key={index} className="border border-gray-200 rounded-xl p-4 bg-white relative">
                                    <button onClick={() => removeKillerQuestion(index)} className="absolute top-4 right-4 text-red-400">🗑️</button>
                                    <div className="grid gap-3 pr-8">
                                        <input
                                            type="text"
                                            value={kq.question}
                                            onChange={(e) => updateKillerQuestion(index, { question: e.target.value })}
                                            placeholder="Pregunta..."
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                        />
                                        <div className="flex gap-4">
                                            <select value={kq.type} onChange={e => updateKillerQuestion(index, { type: e.target.value as any })} className="text-sm border rounded-lg px-2">
                                                <option value="yes_no">Sí/No</option>
                                                <option value="numeric">Numérico</option>
                                            </select>
                                            <label className="flex items-center gap-2 text-xs">
                                                <input type="checkbox" checked={kq.isCritical} onChange={e => updateKillerQuestion(index, { isCritical: e.target.checked })} />
                                                Es Crítica
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Step 5: Funnel */}
                    {step === 'funnel' && (
                        <div className="space-y-6 text-center py-8">
                            <div className="text-5xl mb-4">🚀</div>
                            <h3 className="text-xl font-bold">¡Todo listo para publicar!</h3>
                            <p className="text-gray-600">Al crear la vacante, estará activa inmediatamente en el portal.</p>

                            <div className="bg-gray-50 p-4 rounded-xl text-left max-w-md mx-auto mt-6">
                                <p className="text-sm"><strong>Puesto:</strong> {titulo}</p>
                                <p className="text-sm"><strong>Lugar:</strong> {sede}</p>
                                <p className="text-sm"><strong>Contrato:</strong> {tipoContrato.replace('_', ' ')}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 px-6 py-4 flex justify-between bg-gray-50">
                    <button onClick={onCancel} className="px-6 py-2 border rounded-xl">Cancelar</button>

                    <div className="flex gap-3">
                        {step !== 'profile' && (
                            <button onClick={() => {
                                const idx = steps.findIndex(s => s.id === step);
                                if (idx > 0) setStep(steps[idx - 1].id as any);
                            }} className="px-6 py-2 border rounded-xl">Anterior</button>
                        )}

                        {step === 'funnel' ? (
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="px-8 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-bold hover:opacity-90 disabled:opacity-50"
                            >
                                {loading ? 'Publicando...' : '🚀 Crear y Publicar'}
                            </button>
                        ) : (
                            <button
                                onClick={() => {
                                    if (step === 'profile') {
                                        if (!titulo) return alert('Ingresa un título');
                                        setStep('details');
                                    } else if (step === 'details') {
                                        if (jdContent) setStep('jd'); else handleGenerateJD();
                                    } else if (step === 'jd') {
                                        setStep('kq');
                                    } else if (step === 'kq') {
                                        setStep('funnel');
                                    }
                                }}
                                disabled={generating}
                                className="px-8 py-2 bg-violet-600 text-white rounded-xl font-bold hover:bg-violet-700"
                            >
                                {generating ? 'Generando...' : 'Siguiente →'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
