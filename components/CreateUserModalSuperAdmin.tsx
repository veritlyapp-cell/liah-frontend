'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, Timestamp, getDocs, query, orderBy } from 'firebase/firestore';

interface CreateUserModalProps {
    show: boolean;
    onCancel: () => void;
    onSave: (userData: any) => void;
}

export default function CreateUserModalSuperAdmin({ show, onCancel, onSave }: CreateUserModalProps) {
    const [userId, setUserId] = useState('');
    const [email, setEmail] = useState('');
    const [nombre, setNombre] = useState('');
    const [rol, setRol] = useState<string>('client_admin');
    const [holdingId, setHoldingId] = useState('');
    const [holdings, setHoldings] = useState<any[]>([]);
    const [approvalLevels, setApprovalLevels] = useState<any[]>([]);
    const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchHoldings = async () => {
            const snap = await getDocs(collection(db, 'holdings'));
            setHoldings(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        };
        fetchHoldings();
    }, []);

    useEffect(() => {
        if (holdingId) {
            const holding = holdings.find(h => h.id === holdingId);
            if (holding?.config?.approvalLevels) {
                setApprovalLevels(holding.config.approvalLevels);
            } else {
                setApprovalLevels([]);
            }
        }
    }, [holdingId, holdings]);

    if (!show) return null;

    async function handleSubmit() {
        if (!userId || !email || !nombre || !holdingId) {
            alert('Por favor completa todos los campos');
            return;
        }

        setSaving(true);

        try {
            // Crear documento en Firestore
            const assignmentsRef = collection(db, 'userAssignments');
            const userData = {
                userId,
                email,
                displayName: nombre,
                role: rol,
                holdingId,
                approvalLevel: selectedLevel,
                active: true,
                createdBy: 'super_admin',
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            };

            const docRef = await addDoc(assignmentsRef, userData);

            console.log('✅ Usuario creado en Firestore:', docRef.id);
            alert(`✅ Usuario creado exitosamente!\nID: ${docRef.id}`);

            const selectedHolding = holdings.find(h => h.id === holdingId);

            onSave({
                email,
                nombre,
                rol,
                tenant: selectedHolding?.nombre || holdingId,
                activo: true
            });

            // Reset form
            setUserId('');
            setEmail('');
            setNombre('');
            setRol('client_admin');
            setHoldingId('');
            setSelectedLevel(null);
        } catch (error) {
            console.error('Error creando usuario:', error);
            alert('❌ Error creando usuario. Ver consola para detalles.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="border-b border-gray-200 px-6 py-4">
                    <h2 className="text-2xl font-bold text-gray-900">Crear Nuevo Usuario</h2>
                    <p className="text-sm text-gray-600 mt-1">Se guardará automáticamente en Firestore</p>
                </div>

                {/* Body */}
                <div className="px-6 py-6 space-y-6">
                    {/* User ID (UID de Firebase Auth) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            User ID (UID de Firebase Auth) *
                        </label>
                        <input
                            type="text"
                            value={userId}
                            onChange={(e) => setUserId(e.target.value)}
                            placeholder="ABC123xyz456def789"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Copia el UID desde Firebase Console → Authentication
                        </p>
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email *
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="admin@ngr.pe"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                    </div>

                    {/* Nombre */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Nombre Completo *
                        </label>
                        <input
                            type="text"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            placeholder="Admin NGR"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                    </div>

                    {/* Empresa / Holding */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Empresa / Holding *
                        </label>
                        <select
                            value={holdingId}
                            onChange={(e) => setHoldingId(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                        >
                            <option value="">Seleccione una empresa</option>
                            {holdings.map(h => (
                                <option key={h.id} value={h.id}>{h.nombre || h.id}</option>
                            ))}
                        </select>
                    </div>

                    {/* Rol y Nivel */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                            Rol y Configuración de Aprobación *
                        </label>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setRol('client_admin');
                                        setSelectedLevel(null);
                                    }}
                                    className={`p-4 border-2 rounded-lg transition-all text-left ${rol === 'client_admin'
                                        ? 'border-violet-600 bg-violet-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <p className="font-semibold text-gray-900">👨‍💼 Admin de Holding</p>
                                    <p className="text-xs text-gray-500">Acceso total a la empresa</p>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setRol('brand_recruiter')}
                                    className={`p-4 border-2 rounded-lg transition-all text-left ${rol === 'brand_recruiter'
                                        ? 'border-violet-600 bg-violet-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <p className="font-semibold text-gray-900">🔍 Recruiter</p>
                                    <p className="text-xs text-gray-500">Gestión de candidatos</p>
                                </button>
                            </div>

                            {approvalLevels.length > 0 && (
                                <div className="bg-violet-50/50 p-4 rounded-xl border border-violet-100">
                                    <p className="text-xs font-bold text-violet-700 uppercase tracking-wider mb-3">Niveles de Aprobación (Matriz)</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        {approvalLevels.map((lvl) => (
                                            <button
                                                key={lvl.level}
                                                type="button"
                                                onClick={() => {
                                                    setRol(lvl.role);
                                                    setSelectedLevel(lvl.level);
                                                }}
                                                className={`p-3 border-2 rounded-lg transition-all text-left bg-white ${selectedLevel === lvl.level
                                                    ? 'border-violet-600 ring-2 ring-violet-100'
                                                    : 'border-gray-200 hover:border-gray-300'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-[10px] font-bold">
                                                        {lvl.level}
                                                    </span>
                                                    <p className="font-medium text-gray-900 text-sm">{lvl.name}</p>
                                                </div>
                                                <p className="text-[10px] text-gray-500 mt-1 uppercase">{lvl.role.replace('_', ' ')}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="hidden">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Holding ID (auto-generado)
                        </label>
                        <input
                            type="text"
                            value={holdingId}
                            onChange={(e) => setHoldingId(e.target.value)}
                            placeholder="ngr, intercorp"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono text-sm bg-gray-50"
                        />
                    </div>

                    {/* Info */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <p className="text-sm text-green-900">
                            <strong>✅ Automático:</strong> Al hacer click en "Crear Usuario", se guardará automáticamente en Firestore collection <code className="bg-green-100 px-1 rounded">userAssignments</code>.
                        </p>
                        <p className="text-xs text-green-800 mt-1">
                            ⚠️ El usuario debe existir previamente en Firebase Authentication.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
                    <button
                        onClick={onCancel}
                        disabled={saving}
                        className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="px-6 py-2 gradient-bg text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                    >
                        {saving ? (
                            <>
                                <span className="animate-spin">⏳</span> Guardando...
                            </>
                        ) : (
                            <>✓ Crear en Firestore</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
