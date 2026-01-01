'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function ConfigurationView() {
    const { user, signOut } = useAuth();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    async function handleChangePassword(e: React.FormEvent) {
        e.preventDefault();
        setMessage(null);

        if (!user) {
            setMessage({ type: 'error', text: 'No has iniciado sesión' });
            return;
        }

        if (newPassword.length < 6) {
            setMessage({ type: 'error', text: 'La contraseña debe tener al menos 6 caracteres' });
            return;
        }

        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: 'Las contraseñas no coinciden' });
            return;
        }

        setLoading(true);

        try {
            // Re-authenticate user first
            const credential = EmailAuthProvider.credential(user.email!, currentPassword);
            await reauthenticateWithCredential(user, credential);

            // Update password
            await updatePassword(user, newPassword);

            setMessage({ type: 'success', text: '✅ Contraseña actualizada correctamente' });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            console.error('Error changing password:', error);
            if (error.code === 'auth/wrong-password') {
                setMessage({ type: 'error', text: 'La contraseña actual es incorrecta' });
            } else if (error.code === 'auth/requires-recent-login') {
                setMessage({ type: 'error', text: 'Por seguridad, cierra sesión y vuelve a iniciar para cambiar tu contraseña' });
            } else {
                setMessage({ type: 'error', text: error.message || 'Error al cambiar contraseña' });
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="max-w-2xl mx-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-6">⚙️ Configuración</h2>

            {/* Change Password Section */}
            <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">🔒 Cambiar Contraseña</h3>

                <form onSubmit={handleChangePassword} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Contraseña Actual
                        </label>
                        <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-violet-500 focus:border-violet-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nueva Contraseña
                        </label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-violet-500 focus:border-violet-500"
                            required
                            minLength={6}
                        />
                        <p className="text-xs text-gray-500 mt-1">Mínimo 6 caracteres</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Confirmar Nueva Contraseña
                        </label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-violet-500 focus:border-violet-500"
                            required
                        />
                    </div>

                    {message && (
                        <div className={`p-3 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {message.text}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full px-6 py-3 bg-violet-600 text-white font-semibold rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors"
                    >
                        {loading ? 'Cambiando...' : 'Cambiar Contraseña'}
                    </button>
                </form>
            </div>

            {/* Account Info Section */}
            <div className="mt-6 bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">👤 Información de Cuenta</h3>
                <div className="space-y-3">
                    <p className="text-gray-600"><span className="font-medium">Email:</span> {user?.email}</p>

                    <div className="pt-4 border-t border-gray-100">
                        <button
                            onClick={() => signOut()}
                            className="w-full px-6 py-3 bg-red-50 text-red-600 font-semibold rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                        >
                            <span>🚪 Cerrar Sesión</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
