'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import {
    collection, query, where, getDocs, addDoc, updateDoc, doc, Timestamp
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
    const [killerQuestions, setKillerQuestions] = useState<KillerQuestion[]>([]);

    useEffect(() => {
        if (show && rq) {
            // Pre-fill with RQ data
            setTitulo(rq.puestoNombre);
            setDescripcion(rq.perfilContent);
            setRequisitos('');
            setBeneficios('');
            setKillerQuestions([]);
        }
    }, [show, rq]);

    async function generateWithAI() {
        if (!rq) return;

        setGenerating(true);
        try {
            // Call gemini-talent API to generate JD
            const response = await fetch('/api/talent/generate-jd', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    puestoNombre: rq.puestoNombre,
                    areaNombre: rq.areaNombre,
                    gerenciaNombre: rq.gerenciaNombre,
                    perfilBase: rq.perfilContent,
                    holdingId
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.descripcion) setDescripcion(data.descripcion);
                if (data.requisitos) setRequisitos(data.requisitos);
                if (data.beneficios) setBeneficios(data.beneficios);
            }
        } catch (error) {
            console.error('Error generating JD:', error);
        } finally {
            setGenerating(false);
        }
    }

    async function handlePublish() {
        if (!rq || !titulo.trim() || !descripcion.trim()) {
            alert('Título y descripción son requeridos');
            return;
        }

        setLoading(true);
        try {
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
                vacantes: rq.cantidad,
                fechaLimite: rq.fechaLimite || null,
                urgente: rq.urgente,
                // Killer Questions
                killerQuestions,
                // Link to RQ
                rqId: rq.id,
                rqCodigo: rq.codigo,
                // Status
                status: 'published',
                holdingId,
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

                    {/* Info from RQ */}
                    <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-medium text-gray-700 mb-2">Información del RQ</h4>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                                <span className="text-gray-500">Vacantes:</span>{' '}
                                <span className="font-medium">{rq.cantidad}</span>
                            </div>
                            <div>
                                <span className="text-gray-500">Urgente:</span>{' '}
                                <span className="font-medium">{rq.urgente ? '🔥 Sí' : 'No'}</span>
                            </div>
                            <div>
                                <span className="text-gray-500">Fecha límite:</span>{' '}
                                <span className="font-medium">
                                    {rq.fechaLimite
                                        ? new Date(rq.fechaLimite.seconds * 1000).toLocaleDateString()
                                        : 'No especificada'
                                    }
                                </span>
                            </div>
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
                        className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                    >
                        {loading ? '⏳ Publicando...' : '📣 Publicar Vacante'}
                    </button>
                </div>
            </div>
        </div>
    );
}
