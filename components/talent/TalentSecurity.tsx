'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';

export default function TalentSecurity() {
    const { user } = useAuth();
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

        if (newPassword.length < 8) {
            setMessage({ type: 'error', text: 'La contraseña debe tener al menos 8 caracteres' });
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
                setMessage({ type: 'error', text: 'Por seguridad, cierra sesión y vuelve a iniciar sesión para cambiar tu contraseña' });
            } else {
                setMessage({ type: 'error', text: error.message || 'Error al cambiar contraseña' });
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="max-w-xl mx-auto space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center text-2xl text-violet-600">
                        🔒
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Seguridad</h2>
                        <p className="text-sm text-gray-500">Administra la seguridad de tu cuenta</p>
                    </div>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Contraseña Actual
                        </label>
                        <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all outline-none"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Nueva Contraseña
                        </label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all outline-none"
                            placeholder="Mínimo 8 caracteres"
                            required
                            minLength={8}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Confirmar Nueva Contraseña
                        </label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all outline-none"
                            placeholder="Repite tu nueva contraseña"
                            required
                        />
                    </div>

                    {message && (
                        <div className={`p-4 rounded-xl text-sm font-medium animate-in fade-in slide-in-from-top-1 duration-200 ${message.type === 'success'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                : 'bg-rose-50 text-rose-700 border border-rose-100'
                            }`}>
                            {message.text}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full px-6 py-3.5 bg-violet-600 text-white font-bold rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-all shadow-md hover:shadow-lg active:scale-[0.98] flex items-center justify-center"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            'Guardar Nueva Contraseña'
                        )}
                    </button>
                </form>
            </div>

            <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100">
                <div className="flex gap-3 text-amber-800">
                    <span className="text-xl">💡</span>
                    <div>
                        <p className="text-sm font-bold">Consejo de seguridad</p>
                        <p className="text-xs mt-1 leading-relaxed opacity-80">
                            Asegúrate de que tu nueva contraseña sea difícil de adivinar. Combina mayúsculas, minúsculas, números y símbolos para mayor protección.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
