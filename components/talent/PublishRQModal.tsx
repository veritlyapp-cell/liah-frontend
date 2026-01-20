'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import {
    collection, query, where, getDocs, addDoc, updateDoc, doc, getDoc, Timestamp
} from 'firebase/firestore';
import KillerQuestionsEditor, { KillerQuestion } from './KillerQuestionsEditor';

interface RQ {
    id: string;
    codigo: string;
    puestoId: string;
    puestoNombre: string;
    areaId: string;
    areaNombre: string;
    gerenciaId: string;
    gerenciaNombre: string;
    cantidad: number;
    urgente: boolean;
    fechaLimite?: any;
    justificacion: string;
    perfilContent: string;
    status: string;
    workflowName?: string;
    confidencial?: boolean;
    createdBy: string;
    createdAt: any;
}

interface PublishRQModalProps {
    show: boolean;
    holdingId: string;
    rq: RQ | null;
    onClose: () => void;
    onPublished: () => void;
}

export default function PublishRQModal({
    show,
    holdingId,
    rq,
    onClose,
    onPublished
}: PublishRQModalProps) {
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);

    // Form fields
    const [titulo, setTitulo] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [requisitos, setRequisitos] = useState('');
    const [beneficios, setBeneficios] = useState('');
    const [tipoContrato, setTipoContrato] = useState('tiempo_completo');
    const [modalidad, setModalidad] = useState('presencial');
    const [salarioMin, setSalarioMin] = useState('');
    const [salarioMax, setSalarioMax] = useState('');
    const [mostrarSalario, setMostrarSalario] = useState(false);
    const [tipoSede, setTipoSede] = useState<'tienda' | 'administrativo'>('tienda');
    const [killerQuestions, setKillerQuestions] = useState<KillerQuestion[]>([]);

    useEffect(() => {
        if (show && rq) {
            // Pre-fill with RQ data
            setTitulo(rq.puestoNombre);
            setDescripcion(rq.perfilContent);
            setRequisitos('');
            setKillerQuestions([]);

            // Clear benefits initially, will be filled by config
            setBeneficios('');

            // Load holding config for benefits and AI context
            loadHoldingConfig();
        }
    }, [show, rq]);

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

    async function generateWithAI() {
        if (!rq) return;

        setGenerating(true);
        try {
            // Fetch latest config to pass to IA
            const holdingDoc = await getDoc(doc(db, 'holdings', holdingId));
            const publishConfig = holdingDoc.exists() ? holdingDoc.data().publishConfig : null;

            // Call gemini-talent API to generate JD
            const response = await fetch('/api/talent/generate-jd', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    titulo: rq.puestoNombre,
                    descripcionBase: rq.perfilContent || `Perfil para el puesto de ${rq.puestoNombre}.`,
                    jdsSimilares: [],
                    holdingId,
                    publishConfig // Pass the config for tone, slogan, etc.
                })
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data?.jd_content) {
                    setDescripcion(result.data.jd_content);
                }
            } else {
                const errorData = await response.json();
                console.error('AI Error:', errorData);
                alert('No se pudo generar el contenido con IA');
            }
        } catch (error) {
            console.error('Error generating JD:', error);
            alert('Error conectando con el servicio de IA');
        } finally {
            setGenerating(false);
        }
    }

    async function handlePublish() {
        if (!rq || !titulo.trim() || !descripcion.trim()) {
            alert('Título y descripción son requeridos');
            return;
        }

        if (loading) return; // Prevent multiple clicks

        setLoading(true);
        try {
            // Double check status before creating
            const rqRef = doc(db, 'talent_rqs', rq.id);
            const rqSnap = await getDoc(rqRef);
            if (rqSnap.exists() && rqSnap.data().status === 'published') {
                alert('⚠️ Este requerimiento ya fue publicado anteriormente.');
                onClose();
                return;
            }

            // Create the job/vacancy
            const jobData = {
                titulo: titulo.trim(),
                descripcion: descripcion.trim(),
                requisitos: requisitos.trim() || null,
                beneficios: beneficios.trim() || null,
                departamento: `${rq.gerenciaNombre} / ${rq.areaNombre}`,
                gerenciaId: rq.gerenciaId,
                gerenciaNombre: rq.gerenciaNombre,
                areaId: rq.areaId,
                areaNombre: rq.areaNombre,
                puestoId: rq.puestoId,
                puestoNombre: rq.puestoNombre,
                tipoContrato,
                modalidad,
                salarioMin: salarioMin ? parseInt(salarioMin) : null,
                salarioMax: salarioMax ? parseInt(salarioMax) : null,
                mostrarSalario,
                tipoSede,
                vacantes: rq.cantidad,
                fechaLimite: rq.fechaLimite || null,
                urgente: rq.urgente || false,
                // Killer Questions
                killerQuestions,
                // Link to RQ
                rqId: rq.id,
                rqCodigo: rq.codigo,
                // Status
                status: 'published',
                holdingId,
                confidencial: rq.confidencial || false,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            };

            await addDoc(collection(db, 'talent_jobs'), jobData);

            // Update RQ status
            await updateDoc(doc(db, 'talent_rqs', rq.id), {
                status: 'published',
                publishedAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            });

            alert('✅ Vacante publicada exitosamente');
            onPublished();
        } catch (error) {
            console.error('Error publishing:', error);
            alert('Error al publicar');
        } finally {
            setLoading(false);
        }
    }

    if (!show || !rq) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full my-8 max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-mono bg-white/20 px-2 py-1 rounded text-sm">
                                    {rq.codigo}
                                </span>
                                <span>→</span>
                                <span className="bg-white/20 px-2 py-1 rounded text-sm">📣 Publicar Vacante</span>
                            </div>
                            <h3 className="text-lg font-semibold mt-1">{rq.puestoNombre}</h3>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white/70 hover:text-white text-2xl"
                        >
                            ×
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* AI Generate button */}
                    <div className="flex justify-end">
                        <button
                            onClick={generateWithAI}
                            disabled={generating}
                            className="px-4 py-2 bg-violet-100 text-violet-700 rounded-lg hover:bg-violet-200 disabled:opacity-50"
                        >
                            {generating ? '⏳ Generando...' : '✨ Generar con IA'}
                        </button>
                    </div>

                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Título de la Vacante *
                        </label>
                        <input
                            type="text"
                            value={titulo}
                            onChange={(e) => setTitulo(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                            placeholder="Ej: Supervisor de Seguridad"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Descripción del Puesto *
                        </label>
                        <textarea
                            value={descripcion}
                            onChange={(e) => setDescripcion(e.target.value)}
                            rows={6}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                            placeholder="Descripción detallada del puesto..."
                        />
                    </div>

                    {/* Requirements */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Requisitos
                        </label>
                        <textarea
                            value={requisitos}
                            onChange={(e) => setRequisitos(e.target.value)}
                            rows={4}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                            placeholder="- Experiencia mínima de 2 años&#10;- Estudios en..."
                        />
                    </div>

                    {/* Benefits */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Beneficios
                        </label>
                        <textarea
                            value={beneficios}
                            onChange={(e) => setBeneficios(e.target.value)}
                            rows={3}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                            placeholder="- Seguro de salud&#10;- Capacitaciones..."
                        />
                    </div>

                    {/* Contract & Modality */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Tipo de Contrato
                            </label>
                            <select
                                value={tipoContrato}
                                onChange={(e) => setTipoContrato(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                            >
                                <option value="tiempo_completo">Tiempo Completo</option>
                                <option value="medio_tiempo">Medio Tiempo</option>
                                <option value="temporal">Temporal</option>
                                <option value="practicas">Prácticas</option>
                                <option value="freelance">Freelance</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Modalidad
                            </label>
                            <select
                                value={modalidad}
                                onChange={(e) => setModalidad(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                            >
                                <option value="presencial">Presencial</option>
                                <option value="remoto">Remoto</option>
                                <option value="hibrido">Híbrido</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Tipo de Sede
                            </label>
                            <select
                                value={tipoSede}
                                onChange={(e) => setTipoSede(e.target.value as 'tienda' | 'administrativo')}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                            >
                                <option value="tienda">🏪 Tienda / Operativo</option>
                                <option value="administrativo">🏢 Administrativo</option>
                            </select>
                        </div>
                    </div>

                    {/* Salary */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Rango Salarial (opcional)
                        </label>
                        <div className="flex items-center gap-4">
                            <input
                                type="number"
                                value={salarioMin}
                                onChange={(e) => setSalarioMin(e.target.value)}
                                className="w-32 px-4 py-2 border border-gray-300 rounded-lg"
                                placeholder="Mínimo"
                            />
                            <span className="text-gray-400">-</span>
                            <input
                                type="number"
                                value={salarioMax}
                                onChange={(e) => setSalarioMax(e.target.value)}
                                className="w-32 px-4 py-2 border border-gray-300 rounded-lg"
                                placeholder="Máximo"
                            />
                            <label className="flex items-center gap-2 text-sm text-gray-600">
                                <input
                                    type="checkbox"
                                    checked={mostrarSalario}
                                    onChange={(e) => setMostrarSalario(e.target.checked)}
                                    className="w-4 h-4 text-green-600"
                                />
                                Mostrar en vacante
                            </label>
                        </div>
                    </div>


                    {/* Killer Questions Section */}
                    <div className="border-t border-gray-200 pt-6">
                        <KillerQuestionsEditor
                            questions={killerQuestions}
                            onChange={setKillerQuestions}
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="border-t border-gray-200 px-6 py-4 flex justify-between">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handlePublish}
                        disabled={loading || !titulo.trim() || !descripcion.trim()}
                        className={`px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg transition-opacity ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}`}
                    >
                        {loading ? '⏳ Publicando...' : '📣 Publicar Vacante'}
                    </button>

                </div>
            </div>
        </div>
    );
}
