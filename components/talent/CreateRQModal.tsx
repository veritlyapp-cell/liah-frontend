'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, Timestamp, doc, runTransaction } from 'firebase/firestore';

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
    creatorNombre?: string;
    userGerenciaId?: string; // Auto-filter puestos by user's gerencia
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
    creatorNombre,
    userGerenciaId,
    onCancel,
    onSave
}: CreateRQModalProps) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [puestos, setPuestos] = useState<Puesto[]>([]);
    const [loadingPuestos, setLoadingPuestos] = useState(true);
    const [potentialApprovers, setPotentialApprovers] = useState<any[]>([]);
    const [loadingApprovers, setLoadingApprovers] = useState(false);

    // Form data
    const [tipoPosition, setTipoPosition] = useState<'reemplazo' | 'nueva'>('reemplazo');
    const [selectedPuestoId, setSelectedPuestoId] = useState('');
    const [nuevoPuestoNombre, setNuevoPuestoNombre] = useState(''); // For nueva position
    const [perfilContent, setPerfilContent] = useState('');
    const [perfilFile, setPerfilFile] = useState<File | null>(null);
    const [cantidad, setCantidad] = useState(1);
    const [justificacion, setJustificacion] = useState('');
    const [selectedApproverId, setSelectedApproverId] = useState('');
    const [confidencial, setConfidencial] = useState(false);

    const selectedPuesto = puestos.find(p => p.id === selectedPuestoId);

    // Filter puestos by user's gerencia if provided
    const filteredPuestos = userGerenciaId
        ? puestos.filter(p => p.gerenciaId === userGerenciaId)
        : puestos;

    useEffect(() => {
        if (show) {
            loadPuestos();
            if (userGerenciaId) {
                loadPotentialApprovers(userGerenciaId);
            }
            resetForm();
        }
    }, [show, holdingId, userGerenciaId]);

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

    async function loadPotentialApprovers(gerenciaId: string) {
        setLoadingApprovers(true);
        try {
            console.log('🔍 [CreateRQModal] Loading approvers for gerencia:', gerenciaId);
            const usersRef = collection(db, 'talent_users');
            const uQuery = query(
                usersRef,
                where('holdingId', '==', holdingId),
                where('gerenciaId', '==', gerenciaId),
                where('activo', '==', true)
            );
            const uSnap = await getDocs(uQuery);
            const users = uSnap.docs.map(d => {
                const data = d.data();
                return {
                    id: d.id,
                    email: data.email,
                    nombre: data.nombre,
                    rol: data.rol,
                    ...data
                };
            }).filter(u => u.email !== creatorEmail); // Don't approve yourself

            console.log('✅ [CreateRQModal] Found potential approvers:', users.length);
            setPotentialApprovers(users);
        } catch (error) {
            console.error('Error loading potential approvers:', error);
        } finally {
            setLoadingApprovers(false);
        }
    }

    function resetForm() {
        setStep(1);
        setTipoPosition('reemplazo');
        setSelectedPuestoId('');
        setNuevoPuestoNombre('');
        setPerfilContent('');
        setPerfilFile(null);
        setCantidad(1);
        setJustificacion('');
        setSelectedApproverId('');
        setConfidencial(false);
    }

    const [parsingProfile, setParsingProfile] = useState(false);

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        setPerfilFile(file);
        setParsingProfile(true);

        try {
            // For text files, read directly
            if (file.type === 'text/plain') {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const text = event.target?.result as string;
                    setPerfilContent(text);
                    setParsingProfile(false);
                };
                reader.readAsText(file);
            } else {
                // For PDF/DOC, use AI parsing
                const reader = new FileReader();
                reader.onload = async (event) => {
                    try {
                        const base64String = (event.target?.result as string).split(',')[1];

                        const resp = await fetch('/api/talent/parse-profile', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                fileBase64: base64String,
                                mimeType: file.type
                            })
                        });

                        if (resp.ok) {
                            const { data } = await resp.json();
                            if (data && data.content) {
                                setPerfilContent(data.content);
                            }
                        } else {
                            // Log the actual error from the API
                            const errorData = await resp.json().catch(() => ({}));
                            console.error('❌ [CreateRQModal] Parse profile error:', resp.status, errorData);
                            setPerfilContent(`[Error al analizar archivo: ${file.name}]\n\nDetalles: ${errorData?.details || errorData?.error || 'Error desconocido'}`);
                        }
                    } catch (err: any) {
                        console.error('Error in reader onload:', err);
                        setPerfilContent(`[Error de conexión/lectura: ${file.name}]\n\nDetalles: No se pudo conectar con el servidor de análisis. Si estás en local, verifica que el server esté corriendo. Si estás en producción, intenta nuevamente.`);
                    } finally {
                        setParsingProfile(false);
                    }
                };
                reader.readAsDataURL(file);
            }
        } catch (error) {
            console.error('Error handling file change:', error);
            setParsingProfile(false);
        }
    }

    async function generateRQCode(): Promise<string> {
        const year = new Date().getFullYear();
        const counterRef = doc(db, 'counters', `talent_rqs_${holdingId}`);

        try {
            const nextNumber = await runTransaction(db, async (transaction) => {
                const counterDoc = await transaction.get(counterRef);
                let currentNumber = 0;

                if (counterDoc.exists()) {
                    currentNumber = counterDoc.data().lastNumber || 0;
                }

                const next = currentNumber + 1;
                transaction.set(counterRef, {
                    lastNumber: next,
                    updatedAt: Timestamp.now(),
                    holdingId: holdingId,
                    type: 'talent_rqs'
                }, { merge: true });

                return next;
            });

            return `RQ-${year}-${nextNumber.toString().padStart(3, '0')}`;
        } catch (error) {
            console.error('Error generating RQ code:', error);
            // Fallback to legacy count method if transaction fails, but log it
            const rqsRef = collection(db, 'talent_rqs');
            const rqQuery = query(rqsRef, where('holdingId', '==', holdingId));
            const rqSnap = await getDocs(rqQuery);
            const count = rqSnap.size + 1;
            return `RQ-${year}-${count.toString().padStart(3, '0')}-FB`;
        }
    }

    async function handleSubmit() {
        const isExistingPuesto = tipoPosition === 'reemplazo' && selectedPuestoId;
        const isNewPuesto = tipoPosition === 'nueva' && nuevoPuestoNombre.trim();

        if ((!isExistingPuesto && !isNewPuesto) || !perfilContent.trim()) {
            alert('Selecciona un puesto (o escribe el nombre del nuevo) y asegúrate de tener un perfil');
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

                const manualApproverUser = potentialApprovers.find(u => u.id === selectedApproverId);

                resolvedApprovers = await resolveWorkflowApprovers(
                    workflow.steps,
                    {
                        holdingId,
                        puestoId: selectedPuestoId,
                        areaId: selectedPuesto?.areaId || '',
                        gerenciaId: selectedPuesto?.gerenciaId || '',
                        createdByEmail: creatorEmail,
                        createdByNombre: creatorNombre || creatorEmail
                    },
                    manualApproverUser ? {
                        email: manualApproverUser.email,
                        nombre: manualApproverUser.nombre
                    } : undefined
                );
            } else {
                console.warn('⚠️ No default workflow found for holding:', holdingId);
                // Even without workflow, we use the manual approver as step 1
                const manualApproverUser = potentialApprovers.find(u => u.id === selectedApproverId);
                if (manualApproverUser) {
                    resolvedApprovers = [{
                        stepOrden: 1,
                        stepNombre: 'Aprobación Superior Directo',
                        approverType: 'specific_user' as any,
                        userId: manualApproverUser.id || '',
                        email: manualApproverUser.email,
                        nombre: manualApproverUser.nombre,
                        skipped: false
                    }];
                }
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
                perfilContent: perfilContent || '',
                perfilFileName: perfilFile?.name || null,
                justificacion: justificacion || '',
                confidencial: confidencial || false,
                status: 'pending_approval',
                currentStep,
                workflowId: workflowId || null,
                workflowName: workflowName || null,
                resolvedApprovers: resolvedApprovers || [],
                aprobaciones: [],
                createdBy: creatorEmail || '',
                creatorNombre: creatorNombre || creatorEmail || '',
                holdingId: holdingId || '',
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            };

            // CRITICAL: Remove any undefined values (Firebase doesn't accept undefined)
            const cleanedRqData = Object.fromEntries(
                Object.entries(rqData).filter(([_, v]) => v !== undefined)
            );

            console.log('🚀 [CreateRQModal] DEBUG SUBMIT V5 (22:40):', cleanedRqData);

            await onSave(cleanedRqData);
            console.log('✅ [CreateRQModal] RQ Saved successfully');
            resetForm();
        } catch (error: any) {
            console.error('❌ [CreateRQModal] CRITICAL ERROR:', error);
            // Internal investigation
            const errorDetail = error.message || error.code || JSON.stringify(error) || 'Error sin mensaje';
            const stack = error.stack || 'No stack trace';

            alert(`🚨 REPORTE DE ERROR FATAL (v22:55):
----------------------------------
MENSAJE: ${errorDetail}
----------------------------------
TÉCNICO: ${stack.substring(0, 200)}...

Por favor reporta esto de inmediato.`);
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
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-lg font-semibold">Nuevo Requerimiento (RQ)</h3>
                        <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded shadow-sm border border-white/30 animate-pulse">DEBUG: v22:45</span>
                    </div>
                    <div className="flex gap-4">
                        {[1, 2, 3, 4].map(s => (
                            <div key={s} className="flex items-center gap-2">
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === s ? 'bg-white text-violet-600' : step > s ? 'bg-white/50 text-violet-600' : 'bg-white/20'
                                    }`}>
                                    {step > s ? '✓' : s}
                                </span>
                                <span className={`text-sm ${step >= s ? 'text-white' : 'text-white/50'}`}>
                                    {s === 1 ? 'Puesto' : s === 2 ? 'Perfil' : s === 3 ? 'Detalles' : 'Aprobador'}
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
                            {/* Tipo de Posición */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Posición *</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button type="button" onClick={() => setTipoPosition('reemplazo')}
                                        className={`p-4 rounded-lg border-2 text-left transition-colors ${tipoPosition === 'reemplazo' ? 'border-violet-500 bg-violet-50' : 'border-gray-200 hover:border-gray-300'}`}>
                                        <div className="font-medium text-gray-900">🔄 Reemplazo</div>
                                        <p className="text-xs text-gray-500 mt-1">Puesto existente</p>
                                    </button>
                                    <button type="button" onClick={() => setTipoPosition('nueva')}
                                        className={`p-4 rounded-lg border-2 text-left transition-colors ${tipoPosition === 'nueva' ? 'border-violet-500 bg-violet-50' : 'border-gray-200 hover:border-gray-300'}`}>
                                        <div className="font-medium text-gray-900">✨ Nueva Posición</div>
                                        <p className="text-xs text-gray-500 mt-1">Requiere aprobación especial</p>
                                    </button>
                                </div>
                            </div>

                            {/* Reemplazo: Seleccionar puesto existente */}
                            {tipoPosition === 'reemplazo' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Selecciona el puesto *
                                        {userGerenciaId && <span className="text-xs text-gray-400 ml-2">(Solo tu gerencia)</span>}
                                    </label>
                                    {loadingPuestos ? (
                                        <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600 mx-auto" /></div>
                                    ) : filteredPuestos.length === 0 ? (
                                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-700">
                                            No hay puestos disponibles. {userGerenciaId ? 'Tu gerencia no tiene puestos.' : 'Ve a "Estructura Org" para crearlos.'}
                                        </div>
                                    ) : (
                                        <div className="grid gap-2 max-h-60 overflow-y-auto">
                                            {filteredPuestos.map(p => (
                                                <button key={p.id} onClick={() => setSelectedPuestoId(p.id)}
                                                    className={`text-left p-4 rounded-lg border transition-colors ${selectedPuestoId === p.id ? 'border-violet-500 bg-violet-50' : 'border-gray-200 hover:border-gray-300'}`}>
                                                    <div className="font-medium text-gray-900">{p.nombre}</div>
                                                    <div className="text-sm text-gray-500">{p.gerenciaNombre} → {p.areaNombre}</div>
                                                    {p.perfilBase && <span className="inline-block mt-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">✓ Tiene perfil</span>}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Nueva: Escribir nombre del puesto */}
                            {tipoPosition === 'nueva' && (
                                <div className="space-y-4">
                                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-700 text-sm">
                                        ⚠️ Las posiciones nuevas requieren <strong>aprobación especial</strong> y se crearán después de aprobar.
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del nuevo puesto *</label>
                                        <input type="text" value={nuevoPuestoNombre} onChange={(e) => setNuevoPuestoNombre(e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500" placeholder="Ej: Analista de Datos Senior" />
                                    </div>
                                </div>
                            )}
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
                                {parsingProfile && (
                                    <div className="mt-2 flex items-center gap-2 text-sm text-violet-600 animate-pulse">
                                        <span>✨ Analizando contenido con IA...</span>
                                    </div>
                                )}
                                {perfilFile && !parsingProfile && (
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
                                <p className="font-semibold text-gray-900">{tipoPosition === 'nueva' ? nuevoPuestoNombre : selectedPuesto?.nombre}</p>
                                <p className="text-sm text-gray-500">{selectedPuesto?.gerenciaNombre} → {selectedPuesto?.areaNombre}</p>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
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

                            {/* Confidencial Toggle */}
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={confidencial}
                                        onChange={(e) => setConfidencial(e.target.checked)}
                                        className="w-5 h-5 text-amber-600 rounded border-gray-300 focus:ring-amber-500"
                                    />
                                    <div>
                                        <p className="font-medium text-gray-900 flex items-center gap-2">
                                            🔒 Vacante Confidencial
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            No se publicará en el portal público. Solo visible para el reclutador asignado.
                                        </p>
                                    </div>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Select Approver */}
                    {step === 4 && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    ¿Quién debe aprobar este requerimiento? *
                                </label>
                                <p className="text-xs text-gray-500 mb-4">
                                    Selecciona a tu jefe directo o superior de tu gerencia para iniciar el flujo de aprobación.
                                </p>

                                {loadingApprovers ? (
                                    <div className="text-center py-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600 mx-auto" />
                                        <p className="text-sm text-gray-500 mt-2">Buscando aprobadores...</p>
                                    </div>
                                ) : potentialApprovers.length === 0 ? (
                                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-700">
                                        <p className="font-medium text-sm">No se encontraron otros usuarios en tu gerencia.</p>
                                        <p className="text-xs mt-1">Si necesitas un aprobador específico, contacta al administrador.</p>
                                    </div>
                                ) : (
                                    <div className="grid gap-2 max-h-60 overflow-y-auto pr-2">
                                        {potentialApprovers.map(u => (
                                            <button
                                                key={u.id}
                                                onClick={() => setSelectedApproverId(u.id)}
                                                className={`text-left p-4 rounded-lg border transition-all ${selectedApproverId === u.id
                                                    ? 'border-violet-500 bg-violet-50'
                                                    : 'border-gray-200 hover:border-gray-300'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <div className="font-medium text-gray-900">{u.nombre}</div>
                                                        <div className="text-xs text-gray-500">{u.email}</div>
                                                    </div>
                                                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-[10px] rounded uppercase font-bold">
                                                        {u.rol?.replace('_', ' ')}
                                                    </span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
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

                    {step < 4 ? (
                        <button
                            onClick={() => setStep(step + 1)}
                            disabled={
                                (step === 1 && tipoPosition === 'reemplazo' && !selectedPuestoId) ||
                                (step === 1 && tipoPosition === 'nueva' && !nuevoPuestoNombre.trim()) ||
                                (step === 2 && !perfilContent.trim() && !parsingProfile) ||
                                (step === 3 && !justificacion.trim())
                            }
                            className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50"
                        >
                            Siguiente →
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={loading || !selectedApproverId}
                            className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                        >
                            {loading ? '⏳ Creando...' : '✓ Crear Requerimiento'}
                        </button>
                    )}
                </div>
            </div>
        </div >
    );
}
