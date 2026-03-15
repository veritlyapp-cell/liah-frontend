import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { getUserAssignment, updateUserAssignment, getAssignmentsByRole } from '@/lib/firestore/user-assignment-actions';
import type { UserAssignment } from '@/lib/firestore/user-assignments';

export default function ConfigurationView() {
    const { user, claims, signOut } = useAuth();
    const [assignment, setAssignment] = useState<UserAssignment | null>(null);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [vacationLoading, setVacationLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [vacationMessage, setVacationMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Vacation Mode state
    const [vacationMode, setVacationMode] = useState(false);
    const [backupUserId, setBackupUserId] = useState('');
    const [potentialBackups, setPotentialBackups] = useState<UserAssignment[]>([]);

    useEffect(() => {
        if (user) {
            loadAssignment();
        }
    }, [user]);

    async function loadAssignment() {
        if (!user) return;
        try {
            const ua = await getUserAssignment(user.uid);
            if (ua) {
                setAssignment(ua);
                setVacationMode(ua.vacationMode || false);
                setBackupUserId(ua.backupUserId || '');

                // Load supervisors and jefes de marca from the SAME BRAND as potential backups
                if (ua.role === 'supervisor' || ua.role === 'jefe_marca') {
                    const [supervisors, jefes] = await Promise.all([
                        getAssignmentsByRole('supervisor'),
                        getAssignmentsByRole('jefe_marca')
                    ]);

                    const allBackups = [...supervisors, ...jefes];
                    const userMarcaId = ua.marcaId;

                    setPotentialBackups(allBackups.filter(b =>
                        b.userId !== user.uid &&
                        b.marcaId === userMarcaId &&
                        userMarcaId !== undefined
                    ));
                }
            }
        } catch (error) {
            console.error('Error loading assignment:', error);
        }
    }

    async function handleToggleVacation() {
        if (!assignment) return;
        setVacationLoading(true);
        setVacationMessage(null);

        try {
            const backupUser = potentialBackups.find(b => b.userId === backupUserId);

            await updateUserAssignment(assignment.id, {
                vacationMode: !vacationMode,
                backupUserId: !vacationMode ? backupUserId : '',
                backupDisplayName: !vacationMode ? (backupUser?.displayName || '') : ''
            });

            setVacationMode(!vacationMode);
            setVacationMessage({
                type: 'success',
                text: !vacationMode
                    ? `✅ Modo vacaciones activado. Delegado: ${backupUser?.displayName || 'Desconocido'}`
                    : '✅ Modo vacaciones desactivado. Has retomado tus aprobaciones.'
            });
        } catch (error: any) {
            console.error('Error updating vacation mode:', error);
            setVacationMessage({ type: 'error', text: 'Error al actualizar modo vacaciones' });
        } finally {
            setVacationLoading(false);
        }
    }

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

    const showVacationSection = assignment?.role === 'supervisor' || assignment?.role === 'jefe_marca';

    return (
        <div className="max-w-2xl mx-auto space-y-6 pb-12">
            <h2 className="text-xl font-bold text-gray-900">⚙️ Configuración</h2>

            {/* Vacation Mode Section */}
            {showVacationSection && (
                <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-400">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="text-2xl">🏖️</span>
                        <h3 className="text-lg font-semibold text-gray-900">Modo Vacaciones / Delegación</h3>
                    </div>

                    <p className="text-sm text-gray-600 mb-6">
                        Si sales de vacaciones o no estarás disponible, activa esta opción para que tus aprobaciones de RQs se deleguen automáticamente a otro compañero.
                    </p>

                    <div className="space-y-4">
                        {!vacationMode && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Seleccionar Delegado (Backup)
                                </label>
                                <select
                                    value={backupUserId}
                                    onChange={(e) => setBackupUserId(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-violet-500 focus:border-violet-500"
                                    disabled={vacationLoading}
                                >
                                    <option value="">Selecciona un compañero...</option>
                                    {potentialBackups.map(b => (
                                        <option key={b.userId} value={b.userId}>
                                            {b.displayName} ({b.role})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {vacationMessage && (
                            <div className={`p-3 rounded-lg text-sm ${vacationMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                {vacationMessage.text}
                            </div>
                        )}

                        <button
                            onClick={handleToggleVacation}
                            disabled={vacationLoading || (!vacationMode && !backupUserId)}
                            className={`w-full px-6 py-3 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${vacationMode
                                ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                                : 'bg-orange-600 text-white hover:bg-orange-700'
                                } disabled:opacity-50`}
                        >
                            {vacationLoading ? (
                                <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full"></div>
                            ) : vacationMode ? (
                                <>🔚 Finalizar Vacaciones</>
                            ) : (
                                <>🏖️ Activar Modo Vacaciones</>
                            )}
                        </button>
                    </div>
                </div>
            )}

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
            <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">👤 Información de Cuenta</h3>
                <div className="space-y-3">
                    <p className="text-gray-600"><span className="font-medium">Email:</span> {user?.email}</p>
                    <p className="text-gray-600">
                        <span className="font-medium">Rol:</span>
                        <span className="capitalize ml-1">
                            {assignment?.role ? assignment.role.replace('_', ' ') : 'Cargando...'}
                        </span>
                    </p>

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

