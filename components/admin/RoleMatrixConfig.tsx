'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface RoleMatrixConfigProps {
    holdingId: string;
}

// Base roles that can be customized
const BASE_ROLES = [
    { key: 'recruiter', defaultName: 'Reclutador', description: 'Filtra y selecciona candidatos' },
    { key: 'store_manager', defaultName: 'Gerente de Tienda', description: 'Aprueba candidatos para su tienda' },
    { key: 'brand_manager', defaultName: 'Jefe de Marca', description: 'Supervisión a nivel de marca' },
    { key: 'supervisor', defaultName: 'Supervisor', description: 'Rol adicional configurable' }
];

interface RoleMatrix {
    recruiter: string;
    store_manager: string;
    brand_manager: string;
    supervisor: string;
}

export default function RoleMatrixConfig({ holdingId }: RoleMatrixConfigProps) {
    const [roleMatrix, setRoleMatrix] = useState<RoleMatrix>({
        recruiter: 'Reclutador',
        store_manager: 'Gerente de Tienda',
        brand_manager: 'Jefe de Marca',
        supervisor: 'Supervisor'
    });
    const [approvalFlow, setApprovalFlow] = useState<string[]>(['store_manager', 'recruiter']);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        async function loadConfig() {
            if (!holdingId || !db) return;

            try {
                const holdingDoc = await getDoc(doc(db, 'holdings', holdingId));
                if (holdingDoc.exists()) {
                    const data = holdingDoc.data();
                    if (data.roleMatrix) {
                        setRoleMatrix(prev => ({ ...prev, ...data.roleMatrix }));
                    }
                    if (data.candidateApprovalFlow) {
                        setApprovalFlow(data.candidateApprovalFlow);
                    }
                }
            } catch (error) {
                console.error('Error loading role config:', error);
            } finally {
                setLoading(false);
            }
        }
        loadConfig();
    }, [holdingId]);

    async function handleSave() {
        if (!holdingId || !db) return;

        setSaving(true);
        try {
            await updateDoc(doc(db, 'holdings', holdingId), {
                roleMatrix,
                candidateApprovalFlow: approvalFlow
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (error) {
            console.error('Error saving role config:', error);
            alert('Error al guardar configuración');
        } finally {
            setSaving(false);
        }
    }

    function moveRole(index: number, direction: 'up' | 'down') {
        const newFlow = [...approvalFlow];
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= newFlow.length) return;

        [newFlow[index], newFlow[newIndex]] = [newFlow[newIndex], newFlow[index]];
        setApprovalFlow(newFlow);
    }

    function toggleRole(roleKey: string) {
        if (approvalFlow.includes(roleKey)) {
            if (approvalFlow.length > 1) {
                setApprovalFlow(approvalFlow.filter(r => r !== roleKey));
            }
        } else {
            setApprovalFlow([...approvalFlow, roleKey]);
        }
    }

    if (loading) {
        return (
            <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="animate-pulse flex items-center gap-3">
                    <div className="w-6 h-6 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded w-48"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <span>⚙️</span>
                    Configuración de Roles y Flujo de Aprobación
                </h3>
                <p className="text-purple-100 text-sm mt-1">
                    Define los nombres de roles y el orden de aprobación de candidatos
                </p>
            </div>

            <div className="p-6 space-y-8">
                {/* Role Names Section */}
                <div>
                    <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <span className="text-lg">👤</span>
                        Nombres de Roles Personalizados
                    </h4>
                    <p className="text-gray-500 text-sm mb-4">
                        Ajusta los nombres según tu organización (ej: "Gerente de Tienda" → "Supervisor de Planta")
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {BASE_ROLES.map(role => (
                            <div key={role.key} className="bg-gray-50 rounded-lg p-4">
                                <label className="block text-sm font-medium text-gray-600 mb-1">
                                    {role.defaultName}
                                </label>
                                <input
                                    type="text"
                                    value={roleMatrix[role.key as keyof RoleMatrix]}
                                    onChange={(e) => setRoleMatrix(prev => ({
                                        ...prev,
                                        [role.key]: e.target.value
                                    }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    placeholder={role.defaultName}
                                />
                                <p className="text-xs text-gray-400 mt-1">{role.description}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Approval Flow Section */}
                <div>
                    <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <span className="text-lg">🔄</span>
                        Flujo de Aprobación de Candidatos
                    </h4>
                    <p className="text-gray-500 text-sm mb-4">
                        Define el orden en que los roles aprueban candidatos. Arrastra para reordenar.
                    </p>

                    {/* Flow Visualization */}
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 mb-4">
                        <div className="flex items-center justify-center gap-2 flex-wrap">
                            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                                Candidato Aplica
                            </span>
                            {approvalFlow.map((roleKey, idx) => (
                                <div key={roleKey} className="flex items-center gap-2">
                                    <span className="text-gray-400">→</span>
                                    <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-medium">
                                        {roleMatrix[roleKey as keyof RoleMatrix]}
                                    </span>
                                </div>
                            ))}
                            <span className="text-gray-400">→</span>
                            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                                ✓ Contratado
                            </span>
                        </div>
                    </div>

                    {/* Role Selector */}
                    <div className="space-y-2">
                        <p className="text-sm text-gray-600 font-medium">Roles en el flujo (ordenados):</p>

                        {approvalFlow.map((roleKey, idx) => (
                            <div
                                key={roleKey}
                                className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-bold">
                                        {idx + 1}
                                    </span>
                                    <span className="font-medium text-gray-700">
                                        {roleMatrix[roleKey as keyof RoleMatrix]}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => moveRole(idx, 'up')}
                                        disabled={idx === 0}
                                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                                    >
                                        ↑
                                    </button>
                                    <button
                                        onClick={() => moveRole(idx, 'down')}
                                        disabled={idx === approvalFlow.length - 1}
                                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                                    >
                                        ↓
                                    </button>
                                    <button
                                        onClick={() => toggleRole(roleKey)}
                                        disabled={approvalFlow.length <= 1}
                                        className="p-1 text-red-400 hover:text-red-600 disabled:opacity-30"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>
                        ))}

                        {/* Add role buttons */}
                        <div className="flex flex-wrap gap-2 mt-4">
                            {BASE_ROLES.filter(r => !approvalFlow.includes(r.key)).map(role => (
                                <button
                                    key={role.key}
                                    onClick={() => toggleRole(role.key)}
                                    className="px-3 py-1 bg-gray-100 hover:bg-purple-100 text-gray-600 hover:text-purple-600 rounded-full text-sm transition-colors"
                                >
                                    + {roleMatrix[role.key as keyof RoleMatrix]}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-4 border-t border-gray-100">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className={`px-6 py-2 rounded-lg font-semibold transition-all ${saved
                                ? 'bg-green-500 text-white'
                                : 'bg-purple-600 hover:bg-purple-700 text-white'
                            } disabled:opacity-50`}
                    >
                        {saving ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar Configuración'}
                    </button>
                </div>
            </div>
        </div>
    );
}
