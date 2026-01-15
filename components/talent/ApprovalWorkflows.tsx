'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import {
    collection, query, where, getDocs, addDoc, updateDoc, deleteDoc,
    doc, Timestamp
} from 'firebase/firestore';

/**
 * Tipos de aprobador:
 * - hiring_manager: El usuario que crea el RQ (dinámico)
 * - area_manager: El jefe del área del RQ (dinámico)
 * - gerencia_manager: El jefe de la gerencia del RQ (dinámico)
 * - specific_user: Un usuario específico (estático)
 * - jefe_reclutamiento: El jefe de reclutamiento (dinámico por holding)
 */
type ApproverType = 'hiring_manager' | 'area_manager' | 'gerencia_manager' | 'specific_user' | 'jefe_reclutamiento';

interface WorkflowStep {
    orden: number;
    nombre: string;
    approverType: ApproverType;
    specificUserId?: string;
    specificUserEmail?: string;
    specificUserNombre?: string;
}

interface ApprovalWorkflow {
    id: string;
    nombre: string;
    descripcion?: string;
    steps: WorkflowStep[];
    isDefault: boolean;
    holdingId: string;
    activo: boolean;
}

interface TalentUser {
    id: string;
    email: string;
    nombre: string;
    rol: string;
}

interface ApprovalWorkflowsProps {
    holdingId: string;
}

const APPROVER_TYPES = [
    { id: 'hiring_manager', label: 'Hiring Manager', icon: '📝', description: 'El usuario que creó el RQ (dinámico)' },
    { id: 'area_manager', label: 'Jefe de Área', icon: '📁', description: 'El jefe del área del puesto (dinámico)' },
    { id: 'gerencia_manager', label: 'Jefe de Gerencia', icon: '🏢', description: 'El jefe de la gerencia del puesto (dinámico)' },
    { id: 'jefe_reclutamiento', label: 'Jefe de Reclutamiento', icon: '🎯', description: 'El jefe de reclutamiento del holding (dinámico)' },
    { id: 'specific_user', label: 'Usuario Específico', icon: '👤', description: 'Un usuario fijo (ej: Director de Finanzas)' },
];

export default function ApprovalWorkflows({ holdingId }: ApprovalWorkflowsProps) {
    const [loading, setLoading] = useState(true);
    const [workflows, setWorkflows] = useState<ApprovalWorkflow[]>([]);
    const [users, setUsers] = useState<TalentUser[]>([]);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingWorkflow, setEditingWorkflow] = useState<ApprovalWorkflow | null>(null);

    // Form state
    const [formNombre, setFormNombre] = useState('');
    const [formDescripcion, setFormDescripcion] = useState('');
    const [formSteps, setFormSteps] = useState<WorkflowStep[]>([]);
    const [formIsDefault, setFormIsDefault] = useState(false);

    useEffect(() => {
        loadData();
    }, [holdingId]);

    async function loadData() {
        setLoading(true);
        try {
            // Load workflows
            const wfRef = collection(db, 'approval_workflows');
            const wfQuery = query(wfRef, where('holdingId', '==', holdingId));
            const wfSnap = await getDocs(wfQuery);
            const loadedWorkflows = wfSnap.docs.map(d => ({
                id: d.id,
                ...d.data()
            })) as ApprovalWorkflow[];
            setWorkflows(loadedWorkflows);

            // Load users for specific_user selection
            const usersRef = collection(db, 'talent_users');
            const usersQuery = query(usersRef, where('holdingId', '==', holdingId));
            const usersSnap = await getDocs(usersQuery);
            const loadedUsers = usersSnap.docs.map(d => ({
                id: d.id,
                email: d.data().email,
                nombre: d.data().nombre,
                rol: d.data().rol
            }));
            setUsers(loadedUsers);

        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    }

    function resetForm() {
        setFormNombre('');
        setFormDescripcion('');
        setFormSteps([]);
        setFormIsDefault(false);
        setEditingWorkflow(null);
    }

    function openCreate() {
        resetForm();
        // Default: 2 steps template
        setFormSteps([
            { orden: 1, nombre: 'Aprobación Jefe de Área', approverType: 'area_manager' },
            { orden: 2, nombre: 'Aprobación Final', approverType: 'jefe_reclutamiento' }
        ]);
        setShowModal(true);
    }

    function openEdit(workflow: ApprovalWorkflow) {
        setEditingWorkflow(workflow);
        setFormNombre(workflow.nombre);
        setFormDescripcion(workflow.descripcion || '');
        setFormSteps(workflow.steps);
        setFormIsDefault(workflow.isDefault);
        setShowModal(true);
    }

    function addStep() {
        setFormSteps([...formSteps, {
            orden: formSteps.length + 1,
            nombre: `Paso ${formSteps.length + 1}`,
            approverType: 'specific_user'
        }]);
    }

    function removeStep(index: number) {
        const newSteps = formSteps.filter((_, i) => i !== index);
        // Reorder
        newSteps.forEach((step, i) => step.orden = i + 1);
        setFormSteps(newSteps);
    }

    function updateStep(index: number, field: string, value: any) {
        const newSteps = [...formSteps];
        (newSteps[index] as any)[field] = value;

        // If changing to specific_user, clear the user data
        if (field === 'approverType' && value !== 'specific_user') {
            delete newSteps[index].specificUserId;
            delete newSteps[index].specificUserEmail;
            delete newSteps[index].specificUserNombre;
        }

        setFormSteps(newSteps);
    }

    function setSpecificUser(index: number, userId: string) {
        const user = users.find(u => u.id === userId);
        if (!user) return;

        const newSteps = [...formSteps];
        newSteps[index].specificUserId = user.id;
        newSteps[index].specificUserEmail = user.email;
        newSteps[index].specificUserNombre = user.nombre;
        setFormSteps(newSteps);
    }

    async function handleSave() {
        if (!formNombre.trim() || formSteps.length === 0) {
            alert('Nombre y al menos 1 paso son requeridos');
            return;
        }

        try {
            const workflowData = {
                nombre: formNombre.trim(),
                descripcion: formDescripcion.trim() || null,
                steps: formSteps,
                isDefault: formIsDefault,
                holdingId,
                activo: true,
                updatedAt: Timestamp.now()
            };

            // If this is set as default, unset others
            if (formIsDefault) {
                for (const wf of workflows) {
                    if (wf.isDefault && wf.id !== editingWorkflow?.id) {
                        await updateDoc(doc(db, 'approval_workflows', wf.id), { isDefault: false });
                    }
                }
            }

            if (editingWorkflow) {
                await updateDoc(doc(db, 'approval_workflows', editingWorkflow.id), workflowData);
            } else {
                await addDoc(collection(db, 'approval_workflows'), {
                    ...workflowData,
                    createdAt: Timestamp.now()
                });
            }

            setShowModal(false);
            resetForm();
            loadData();
            alert('✅ Workflow guardado');
        } catch (error) {
            console.error('Error saving workflow:', error);
            alert('Error al guardar');
        }
    }

    async function handleDelete(workflow: ApprovalWorkflow) {
        if (!confirm(`¿Eliminar el workflow "${workflow.nombre}"?`)) return;
        try {
            await deleteDoc(doc(db, 'approval_workflows', workflow.id));
            loadData();
        } catch (error) {
            console.error('Error deleting workflow:', error);
        }
    }

    async function setAsDefault(workflow: ApprovalWorkflow) {
        try {
            // Unset all others
            for (const wf of workflows) {
                if (wf.isDefault) {
                    await updateDoc(doc(db, 'approval_workflows', wf.id), { isDefault: false });
                }
            }
            // Set this one
            await updateDoc(doc(db, 'approval_workflows', workflow.id), { isDefault: true });
            loadData();
        } catch (error) {
            console.error('Error setting default:', error);
        }
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
                    <h2 className="text-xl font-bold text-gray-900">Flujos de Aprobación</h2>
                    <p className="text-gray-600">Configura los pasos y aprobadores para los RQs</p>
                </div>
                <button
                    onClick={openCreate}
                    className="px-4 py-2 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 transition-colors"
                >
                    + Nuevo Flujo
                </button>
            </div>

            {/* Info box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
                <strong>💡 Tip:</strong> Usa aprobadores dinámicos (Jefe de Área/Gerencia) para que el sistema
                automáticamente asigne al responsable correcto según el puesto del RQ.
            </div>

            {/* Workflows List */}
            {workflows.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <div className="text-6xl mb-4">⚙️</div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No hay flujos configurados</h3>
                    <p className="text-gray-600 mb-6">Crea un flujo de aprobación para comenzar</p>
                    <button
                        onClick={openCreate}
                        className="px-6 py-3 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700"
                    >
                        Crear Primer Flujo
                    </button>
                </div>
            ) : (
                <div className="grid gap-4">
                    {workflows.map(wf => (
                        <div key={wf.id} className={`bg-white rounded-xl border-2 p-6 ${wf.isDefault ? 'border-violet-500' : 'border-gray-200'}`}>
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-lg font-semibold text-gray-900">{wf.nombre}</h3>
                                        {wf.isDefault && (
                                            <span className="px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full text-xs font-medium">
                                                ⭐ Por defecto
                                            </span>
                                        )}
                                    </div>
                                    {wf.descripcion && (
                                        <p className="text-sm text-gray-500 mt-1">{wf.descripcion}</p>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    {!wf.isDefault && (
                                        <button
                                            onClick={() => setAsDefault(wf)}
                                            className="px-3 py-1 text-sm text-violet-600 hover:bg-violet-50 rounded-lg"
                                        >
                                            Usar por defecto
                                        </button>
                                    )}
                                    <button
                                        onClick={() => openEdit(wf)}
                                        className="px-3 py-1 text-sm text-violet-600 hover:bg-violet-50 rounded-lg"
                                    >
                                        Editar
                                    </button>
                                    <button
                                        onClick={() => handleDelete(wf)}
                                        className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                                    >
                                        Eliminar
                                    </button>
                                </div>
                            </div>

                            {/* Steps visualization */}
                            <div className="flex items-center gap-2 flex-wrap">
                                {wf.steps.map((step, index) => {
                                    const typeInfo = APPROVER_TYPES.find(t => t.id === step.approverType);
                                    return (
                                        <div key={index} className="flex items-center">
                                            <div className="px-3 py-2 bg-gray-100 rounded-lg text-sm">
                                                <span className="font-medium">{step.orden}.</span>{' '}
                                                {typeInfo?.icon} {step.nombre}
                                                {step.approverType === 'specific_user' && step.specificUserNombre && (
                                                    <span className="text-gray-500"> ({step.specificUserNombre})</span>
                                                )}
                                            </div>
                                            {index < wf.steps.length - 1 && (
                                                <span className="mx-2 text-gray-400">→</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full my-8">
                        <div className="border-b border-gray-200 px-6 py-4">
                            <h3 className="text-lg font-semibold text-gray-900">
                                {editingWorkflow ? 'Editar Flujo' : 'Nuevo Flujo de Aprobación'}
                            </h3>
                        </div>
                        <div className="px-6 py-4 space-y-6 max-h-[60vh] overflow-y-auto">
                            {/* Basic info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                                    <input
                                        type="text"
                                        value={formNombre}
                                        onChange={(e) => setFormNombre(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                                        placeholder="Ej: Flujo Corporativo"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                                    <input
                                        type="text"
                                        value={formDescripcion}
                                        onChange={(e) => setFormDescripcion(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                                        placeholder="Descripción opcional"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="isDefault"
                                    checked={formIsDefault}
                                    onChange={(e) => setFormIsDefault(e.target.checked)}
                                    className="w-4 h-4 text-violet-600 border-gray-300 rounded"
                                />
                                <label htmlFor="isDefault" className="text-sm text-gray-700">
                                    Usar como flujo por defecto para nuevos RQs
                                </label>
                            </div>

                            {/* Steps */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <label className="text-sm font-medium text-gray-700">Pasos de Aprobación *</label>
                                    <button
                                        type="button"
                                        onClick={addStep}
                                        className="text-sm text-violet-600 hover:text-violet-800"
                                    >
                                        + Agregar Paso
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {formSteps.map((step, index) => (
                                        <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="font-medium text-gray-700">Paso {step.orden}</span>
                                                {formSteps.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeStep(index)}
                                                        className="text-red-600 hover:text-red-800 text-sm"
                                                    >
                                                        × Eliminar
                                                    </button>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs text-gray-500 mb-1">Nombre del paso</label>
                                                    <input
                                                        type="text"
                                                        value={step.nombre}
                                                        onChange={(e) => updateStep(index, 'nombre', e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                        placeholder="Ej: Aprobación Gerencia"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-gray-500 mb-1">Tipo de aprobador</label>
                                                    <select
                                                        value={step.approverType}
                                                        onChange={(e) => updateStep(index, 'approverType', e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                    >
                                                        {APPROVER_TYPES.map(type => (
                                                            <option key={type.id} value={type.id}>
                                                                {type.icon} {type.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            {step.approverType === 'specific_user' && (
                                                <div className="mt-3">
                                                    <label className="block text-xs text-gray-500 mb-1">Seleccionar usuario</label>
                                                    <select
                                                        value={step.specificUserId || ''}
                                                        onChange={(e) => setSpecificUser(index, e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                    >
                                                        <option value="">Seleccionar usuario...</option>
                                                        {users.map(user => (
                                                            <option key={user.id} value={user.id}>
                                                                {user.nombre} ({user.email})
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}

                                            <p className="text-xs text-gray-500 mt-2">
                                                {APPROVER_TYPES.find(t => t.id === step.approverType)?.description}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
                            <button
                                onClick={() => { setShowModal(false); resetForm(); }}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
                            >
                                {editingWorkflow ? 'Actualizar' : 'Crear Flujo'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
