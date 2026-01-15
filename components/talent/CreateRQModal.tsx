'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, Timestamp } from 'firebase/firestore';

interface Puesto {
    id: string;
    nombre: string;
    areaId: string;
    areaNombre?: string;
    gerenciaId: string;
    gerenciaNombre?: string;
    perfilBase?: string;
}

interface CreateRQModalProps {
    show: boolean;
    holdingId: string;
    creatorEmail: string;
    onCancel: () => void;
    onSave: (rq: any) => Promise<void>;
}

/**
 * Modal para crear un nuevo Requerimiento (RQ)
 * Paso 1: Seleccionar puesto
 * Paso 2: Revisar/editar perfil
 * Paso 3: Cantidad, fecha límite, justificación
 */
export default function CreateRQModal({
    show,
    holdingId,
    creatorEmail,
    onCancel,
    onSave
}: CreateRQModalProps) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [puestos, setPuestos] = useState<Puesto[]>([]);
    const [loadingPuestos, setLoadingPuestos] = useState(true);

    // Form data
    const [selectedPuestoId, setSelectedPuestoId] = useState('');
    const [perfilContent, setPerfilContent] = useState('');
    const [perfilFile, setPerfilFile] = useState<File | null>(null);
    const [cantidad, setCantidad] = useState(1);
    const [fechaLimite, setFechaLimite] = useState('');
    const [justificacion, setJustificacion] = useState('');
    const [urgente, setUrgente] = useState(false);

    const selectedPuesto = puestos.find(p => p.id === selectedPuestoId);

    useEffect(() => {
        if (show) {
            loadPuestos();
            resetForm();
        }
    }, [show, holdingId]);

    useEffect(() => {
        // When puesto is selected, load its base profile
        if (selectedPuesto?.perfilBase) {
            setPerfilContent(selectedPuesto.perfilBase);
        } else {
            setPerfilContent('');
        }
    }, [selectedPuestoId, selectedPuesto]);

    async function loadPuestos() {
        setLoadingPuestos(true);
        try {
            // Load puestos with area and gerencia names
            const puestosRef = collection(db, 'puestos');
            const pQuery = query(puestosRef, where('holdingId', '==', holdingId));
            const pSnap = await getDocs(pQuery);

            // Load areas
            const areasRef = collection(db, 'areas');
            const aQuery = query(areasRef, where('holdingId', '==', holdingId));
            const aSnap = await getDocs(aQuery);
            const areasMap = new Map(aSnap.docs.map(d => [d.id, d.data().nombre]));

            // Load gerencias
            const gerenciasRef = collection(db, 'gerencias');
            const gQuery = query(gerenciasRef, where('holdingId', '==', holdingId));
            const gSnap = await getDocs(gQuery);
            const gerenciasMap = new Map(gSnap.docs.map(d => [d.id, d.data().nombre]));

            const loadedPuestos = pSnap.docs.map(d => {
                const data = d.data();
                return {
                    id: d.id,
                    nombre: data.nombre,
                    areaId: data.areaId,
                    areaNombre: areasMap.get(data.areaId) || '',
                    gerenciaId: data.gerenciaId,
                    gerenciaNombre: gerenciasMap.get(data.gerenciaId) || '',
                    perfilBase: data.perfilBase
                };
            });

            setPuestos(loadedPuestos);
        } catch (error) {
            console.error('Error loading puestos:', error);
        } finally {
            setLoadingPuestos(false);
        }
    }

    function resetForm() {
        setStep(1);
        setSelectedPuestoId('');
        setPerfilContent('');
        setPerfilFile(null);
        setCantidad(1);
        setFechaLimite('');
        setJustificacion('');
        setUrgente(false);
    }

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        setPerfilFile(file);

        // If it's a text file, read its content
        if (file.type === 'text/plain') {
            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target?.result as string;
                setPerfilContent(text);
            };
            reader.readAsText(file);
        } else {
            // For PDF/DOC, just note that a file was uploaded
            setPerfilContent(`[Archivo adjunto: ${file.name}]`);
        }
    }

    async function generateRQCode(): Promise<string> {
        const year = new Date().getFullYear();
        const rqsRef = collection(db, 'talent_rqs');
        const rqQuery = query(rqsRef, where('holdingId', '==', holdingId));
        const rqSnap = await getDocs(rqQuery);
        const count = rqSnap.size + 1;
        return `RQ-${year}-${count.toString().padStart(3, '0')}`;
    }

    async function handleSubmit() {
        if (!selectedPuestoId || !perfilContent.trim()) {
            alert('Selecciona un puesto y asegúrate de tener un perfil');
            return;
        }

        setLoading(true);
        try {
            const codigo = await generateRQCode();

            // Import workflow resolution dynamically
            const { resolveWorkflowApprovers, getDefaultWorkflow } = await import('@/lib/workflow/resolve-approvers');

            // Get default workflow
            const workflow = await getDefaultWorkflow(holdingId);

            // Resolve approvers for this RQ
            let resolvedApprovers: any[] = [];
            let workflowId: string | null = null;
            let workflowName: string | null = null;

            if (workflow && workflow.steps) {
                workflowId = workflow.id;
                workflowName = workflow.nombre;

                resolvedApprovers = await resolveWorkflowApprovers(
                    workflow.steps,
                    {
                        holdingId,
                        puestoId: selectedPuestoId,
                        areaId: selectedPuesto?.areaId || '',
                        gerenciaId: selectedPuesto?.gerenciaId || '',
                        createdByEmail: creatorEmail,
                        createdByNombre: creatorEmail // TODO: get from user profile
                    }
                );
            }

            // Find the first non-skipped step
            const firstPendingStep = resolvedApprovers.find(a => !a.skipped);
            const currentStep = firstPendingStep?.stepOrden || 1;

            const rqData = {
                codigo,
                puestoId: selectedPuestoId,
                puestoNombre: selectedPuesto?.nombre || '',
                areaId: selectedPuesto?.areaId || '',
                areaNombre: selectedPuesto?.areaNombre || '',
                gerenciaId: selectedPuesto?.gerenciaId || '',
                gerenciaNombre: selectedPuesto?.gerenciaNombre || '',
                cantidad,
                perfilContent,
                perfilFileName: perfilFile?.name || null,
                justificacion,
                urgente,
                fechaLimite: fechaLimite ? Timestamp.fromDate(new Date(fechaLimite)) : null,
                status: 'pending_approval',
                currentStep, // Which step we're waiting for
                workflowId,
                workflowName,
                resolvedApprovers, // The resolved workflow with actual approver emails
                aprobaciones: [], // Will store each approval as it happens
                createdBy: creatorEmail,
                holdingId,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            };

            await onSave(rqData);
            resetForm();
        } catch (error) {
            console.error('Error creating RQ:', error);
            alert('Error al crear el requerimiento');
        } finally {
            setLoading(false);
        }
    }

    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-4 text-white">
                    <h3 className="text-lg font-semibold">Nuevo Requerimiento (RQ)</h3>
                    <div className="flex gap-4 mt-3">
                        {[1, 2, 3].map(s => (
                            <div key={s} className="flex items-center gap-2">
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === s ? 'bg-white text-violet-600' : step > s ? 'bg-white/50 text-violet-600' : 'bg-white/20'
                                    }`}>
                                    {step > s ? '✓' : s}
                                </span>
                                <span className={`text-sm ${step >= s ? 'text-white' : 'text-white/50'}`}>
                                    {s === 1 ? 'Puesto' : s === 2 ? 'Perfil' : 'Detalles'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Step 1: Select Puesto */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Selecciona el puesto a solicitar *
                                </label>
                                {loadingPuestos ? (
                                    <div className="text-center py-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600 mx-auto" />
                                    </div>
                                ) : puestos.length === 0 ? (
                                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-700">
                                        No hay puestos creados. Ve a "Estructura Org" para crear puestos primero.
                                    </div>
                                ) : (
                                    <div className="grid gap-2 max-h-80 overflow-y-auto">
                                        {puestos.map(p => (
                                            <button
                                                key={p.id}
                                                onClick={() => setSelectedPuestoId(p.id)}
                                                className={`text-left p-4 rounded-lg border transition-colors ${selectedPuestoId === p.id
                                                    ? 'border-violet-500 bg-violet-50'
                                                    : 'border-gray-200 hover:border-gray-300'
                                                    }`}
                                            >
                                                <div className="font-medium text-gray-900">{p.nombre}</div>
                                                <div className="text-sm text-gray-500">
                                                    {p.gerenciaNombre} → {p.areaNombre}
                                                </div>
                                                {p.perfilBase && (
                                                    <span className="inline-block mt-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                                                        ✓ Tiene perfil base
                                                    </span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Step 2: Review/Edit Profile */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Perfil del puesto *
                                </label>
                                {selectedPuesto?.perfilBase ? (
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 mb-3">
                                        ✓ Se cargó el perfil base del puesto. Puedes editarlo o reemplazarlo.
                                    </div>
                                ) : (
                                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700 mb-3">
                                        Este puesto no tiene perfil base. Escribe el perfil o sube un documento.
                                    </div>
                                )}
                                <textarea
                                    value={perfilContent}
                                    onChange={(e) => setPerfilContent(e.target.value)}
                                    rows={8}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                                    placeholder="Descripción del puesto, requisitos, funciones..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    O sube un documento (PDF, Word, TXT)
                                </label>
                                <input
                                    type="file"
                                    accept=".pdf,.doc,.docx,.txt"
                                    onChange={handleFileChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                />
                                {perfilFile && (
                                    <p className="text-sm text-gray-500 mt-1">
                                        📎 {perfilFile.name}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Step 3: Details */}
                    {step === 3 && (
                        <div className="space-y-4">
                            <div className="bg-gray-50 rounded-lg p-4">
                                <p className="text-sm text-gray-600">Puesto seleccionado:</p>
                                <p className="font-semibold text-gray-900">{selectedPuesto?.nombre}</p>
                                <p className="text-sm text-gray-500">{selectedPuesto?.gerenciaNombre} → {selectedPuesto?.areaNombre}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Cantidad de posiciones *
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={cantidad}
                                        onChange={(e) => setCantidad(parseInt(e.target.value) || 1)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Fecha límite
                                    </label>
                                    <input
                                        type="date"
                                        value={fechaLimite}
                                        onChange={(e) => setFechaLimite(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Justificación / Comentarios
                                </label>
                                <textarea
                                    value={justificacion}
                                    onChange={(e) => setJustificacion(e.target.value)}
                                    rows={3}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                                    placeholder="¿Por qué se necesita esta posición?"
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="urgente"
                                    checked={urgente}
                                    onChange={(e) => setUrgente(e.target.checked)}
                                    className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                                />
                                <label htmlFor="urgente" className="text-sm text-gray-700">
                                    Marcar como urgente 🔥
                                </label>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 px-6 py-4 flex justify-between">
                    <button
                        onClick={step === 1 ? onCancel : () => setStep(step - 1)}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                        {step === 1 ? 'Cancelar' : '← Anterior'}
                    </button>

                    {step < 3 ? (
                        <button
                            onClick={() => setStep(step + 1)}
                            disabled={step === 1 && !selectedPuestoId}
                            className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50"
                        >
                            Siguiente →
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={loading || !perfilContent.trim()}
                            className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                        >
                            {loading ? '⏳ Creando...' : '✓ Crear Requerimiento'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
