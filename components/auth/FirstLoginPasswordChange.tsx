'use client';

import { useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { updatePassword } from 'firebase/auth';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';

interface FirstLoginPasswordChangeProps {
    show: boolean;
    userEmail: string;
    onPasswordChanged: () => void;
}

export default function FirstLoginPasswordChange({ show, userEmail, onPasswordChanged }: FirstLoginPasswordChangeProps) {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);

    if (!show) return null;

    const validatePassword = (): boolean => {
        const newErrors: string[] = [];

        if (newPassword.length < 8) {
            newErrors.push('La contraseña debe tener al menos 8 caracteres');
        }

        if (!/[A-Z]/.test(newPassword)) {
            newErrors.push('Debe contener al menos una letra mayúscula');
        }

        if (!/[0-9]/.test(newPassword)) {
            newErrors.push('Debe contener al menos un número');
        }

        if (newPassword === 'NGR2024!Cambiar') {
            newErrors.push('No puedes usar la contraseña temporal');
        }

        if (newPassword !== confirmPassword) {
            newErrors.push('Las contraseñas no coinciden');
        }

        setErrors(newErrors);
        return newErrors.length === 0;
    };

    const handleSubmit = async () => {
        if (!validatePassword()) return;

        setSaving(true);

        try {
            const user = auth.currentUser;
            if (!user) {
                throw new Error('No hay usuario autenticado');
            }

            // Update password in Firebase Auth
            await updatePassword(user, newPassword);

            // Update passwordChanged flag in Firestore
            const assignmentsRef = collection(db, 'userAssignments');
            const q = query(assignmentsRef, where('email', '==', userEmail));
            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                const docRef = doc(db, 'userAssignments', snapshot.docs[0].id);
                await updateDoc(docRef, {
                    passwordChanged: true,
                    updatedAt: new Date()
                });
            }

            console.log('✅ Password changed successfully');
            onPasswordChanged();
        } catch (error: any) {
            console.error('Error changing password:', error);
            setErrors([error.message || 'Error al cambiar contraseña']);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
                {/* Header */}
                <div className="border-b border-gray-200 px-6 py-4 bg-violet-50">
                    <h2 className="text-2xl font-bold text-gray-900">🔒 Cambiar Contraseña</h2>
                    <p className="text-sm text-gray-600 mt-1">
                        Por seguridad, debes cambiar tu contraseña temporal
                    </p>
                </div>

                {/* Body */}
                <div className="px-6 py-6 space-y-6">
                    {/* Info */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-blue-900">
                            <strong>👋 Bienvenido!</strong> Esta es tu primera vez ingresando al sistema.
                        </p>
                        <p className="text-xs text-blue-800 mt-1">
                            Crea una contraseña segura que solo tú conozcas.
                        </p>
                    </div>

                    {/* New Password */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Nueva Contraseña *
                        </label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Min. 8 caracteres"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Confirmar Contraseña *
                        </label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Repite la contraseña"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                    </div>

                    {/* Requirements */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <p className="text-xs font-medium text-gray-900 mb-2">Requisitos:</p>
                        <ul className="text-xs text-gray-600 space-y-1">
                            <li className={newPassword.length >= 8 ? 'text-green-600' : ''}>
                                {newPassword.length >= 8 ? '✓' : '○'} Mínimo 8 caracteres
                            </li>
                            <li className={/[A-Z]/.test(newPassword) ? 'text-green-600' : ''}>
                                {/[A-Z]/.test(newPassword) ? '✓' : '○'} Al menos 1 mayúscula
                            </li>
                            <li className={/[0-9]/.test(newPassword) ? 'text-green-600' : ''}>
                                {/[0-9]/.test(newPassword) ? '✓' : '○'} Al menos 1 número
                            </li>
                            <li className={newPassword === confirmPassword && newPassword ? 'text-green-600' : ''}>
                                {newPassword === confirmPassword && newPassword ? '✓' : '○'} Contraseñas coinciden
                            </li>
                        </ul>
                    </div>

                    {/* Errors */}
                    {errors.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <p className="text-sm font-medium text-red-900 mb-2">❌ Errores:</p>
                            <ul className="text-xs text-red-700 space-y-1">
                                {errors.map((error, i) => (
                                    <li key={i}>• {error}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 px-6 py-4">
                    <button
                        onClick={handleSubmit}
                        disabled={saving || !newPassword || !confirmPassword}
                        className="w-full px-6 py-3 gradient-bg text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {saving ? (
                            <>
                                <span className="animate-spin">⏳</span> Guardando...
                            </>
                        ) : (
                            <>✓ Guardar Nueva Contraseña</>
                        )}
                    </button>
                    <p className="text-xs text-gray-500 text-center mt-2">
                        No puedes cerrar esta ventana sin cambiar tu contraseña
                    </p>
                </div>
            </div>
        </div>
    );
}
