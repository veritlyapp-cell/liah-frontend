'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';

interface EditUserModalProps {
    show: boolean;
    user: any;
    onCancel: () => void;
    onSave: (userData: any) => void;
}

export default function EditUserModalSuperAdmin({ show, user, onCancel, onSave }: EditUserModalProps) {
    const [nombre, setNombre] = useState('');
    const [rol, setRol] = useState<string>('client_admin');
    const [tenant, setTenant] = useState('');
    const [activo, setActivo] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (user) {
            setNombre(user.nombre || '');
            setRol(user.rol || 'client_admin');
            setTenant(user.tenant || '');
            setActivo(user.activo !== undefined ? user.activo : true);
        }
    }, [user]);

    if (!show || !user) return null;

    async function handleSubmit() {
        if (!nombre || !tenant) {
            alert('Por favor completa todos los campos');
            return;
        }

        setSaving(true);

        try {
            // Buscar el documento en Firestore por email
            const assignmentsRef = collection(db, 'userAssignments');
            const q = query(assignmentsRef, where('email', '==', user.email));
            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                const docRef = doc(db, 'userAssignments', snapshot.docs[0].id);
                await updateDoc(docRef, {
                    displayName: nombre,
                    role: rol,
                    active: activo,
                    updatedAt: new Date()
                });

                console.log('✅ Usuario actualizado en Firestore');
                alert('✅ Usuario actualizado exitosamente!');

                onSave({
                    ...user,
                    nombre,
                    rol,
                    tenant,
                    activo
                });
            } else {
                alert('❌ Usuario no encontrado en Firestore');
            }
        } catch (error) {
            console.error('Error actualizando usuario:', error);
            alert('❌ Error actualizando usuario. Ver consola para detalles.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="border-b border-gray-200 px-6 py-4">
                    <h2 className="text-2xl font-bold text-gray-900">Editar Usuario</h2>
                    <p className="text-sm text-gray-600 mt-1">{user.email}</p>
                </div>

                {/* Body */}
                <div className="px-6 py-6 space-y-6">
                    {/* Email (read-only) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email
                        </label>
                        <input
                            type="email"
                            value={user.email}
                            disabled
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                        />
                        <p className="text-xs text-gray-500 mt-1">El email no se puede modificar</p>
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

                    {/* Rol */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                            Rol *
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            <button
                                type="button"
                                onClick={() => setRol('client_admin')}
                                className={`p-4 border-2 rounded-lg transition-all ${rol === 'client_admin'
                                    ? 'border-violet-600 bg-violet-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <p className="font-semibold text-gray-900">👨‍💼 Administrador</p>
                                <p className="text-sm text-gray-500">Admin del holding/cliente</p>
                            </button>

                            <button
                                type="button"
                                onClick={() => setRol('brand_recruiter')}
                                className={`p-4 border-2 rounded-lg transition-all ${rol === 'brand_recruiter'
                                    ? 'border-violet-600 bg-violet-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <p className="font-semibold text-gray-900">Recruiter</p>
                                <p className="text-xs text-gray-600 mt-1">Evalúa candidatos</p>
                            </button>

                            <button
                                type="button"
                                onClick={() => setRol('store_manager')}
                                className={`p-4 border-2 rounded-lg transition-all ${rol === 'store_manager'
                                    ? 'border-violet-600 bg-violet-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <p className="font-semibold text-gray-900">Gerente de Tienda</p>
                                <p className="text-xs text-gray-600 mt-1">Gestiona tienda</p>
                            </button>

                            <button
                                type="button"
                                onClick={() => setRol('compensaciones')}
                                className={`p-4 border-2 rounded-lg transition-all ${rol === 'compensaciones'
                                    ? 'border-violet-600 bg-violet-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <p className="font-semibold text-gray-900">💰 Compensaciones</p>
                                <p className="text-xs text-gray-600 mt-1">Altas, Bajas y T-Registro</p>
                            </button>
                        </div>
                    </div>

                    {/* Tenant (read-only) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Empresa
                        </label>
                        <input
                            type="text"
                            value={tenant}
                            disabled
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                        />
                        <p className="text-xs text-gray-500 mt-1">La empresa no se puede modificar</p>
                    </div>

                    {/* Estado */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                            Estado
                        </label>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setActivo(true)}
                                className={`flex-1 p-4 border-2 rounded-lg transition-all ${activo
                                    ? 'border-green-600 bg-green-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <p className="font-semibold text-gray-900">✓ Activo</p>
                                <p className="text-xs text-gray-600 mt-1">Puede acceder al sistema</p>
                            </button>

                            <button
                                type="button"
                                onClick={() => setActivo(false)}
                                className={`flex-1 p-4 border-2 rounded-lg transition-all ${!activo
                                    ? 'border-red-600 bg-red-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <p className="font-semibold text-gray-900">○ Inactivo</p>
                                <p className="text-xs text-gray-600 mt-1">Sin acceso al sistema</p>
                            </button>
                        </div>
                    </div>

                    {/* Info */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-blue-900">
                            <strong>📝 Nota:</strong> Los cambios se guardarán automáticamente en Firestore.
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
                            <>✓ Guardar Cambios</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
