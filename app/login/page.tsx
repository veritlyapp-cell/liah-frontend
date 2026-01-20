'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Logo from '@/components/Logo';
import { useAuth } from '@/contexts/AuthContext';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showResetModal, setShowResetModal] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetSending, setResetSending] = useState(false);
    const [resetSuccess, setResetSuccess] = useState(false);

    const { signIn, user, claims, loading: authLoading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const isTimeout = searchParams.get('reason') === 'timeout';

    // Auto-redirect if already logged in
    useEffect(() => {
        if (!authLoading && user && claims?.role) {
            console.log('🔄 User already logged in, redirecting to dashboard...');
            switch (claims.role) {
                case 'super_admin':
                    router.push('/super-admin');
                    break;
                case 'client_admin':
                case 'admin':
                case 'gerente':
                    router.push('/launcher');
                    break;
                case 'jefe_marca':
                    router.push('/jefe-marca');
                    break;
                case 'supervisor':
                    router.push('/supervisor');
                    break;
                case 'brand_recruiter':
                case 'recruiter':
                    router.push('/launcher');
                    break;
                case 'store_manager':
                    router.push('/store-manager');
                    break;
                // Talent users
                case 'lider_reclutamiento':
                case 'hiring_manager':
                case 'approver':
                    router.push('/talent');
                    break;
                default:
                    // Any unknown role goes to talent dashboard
                    router.push('/talent');
            }
        }
    }, [user, claims, authLoading, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            await signIn(email, password);
            // El redirect se maneja automáticamente en AuthContext
        } catch (err: any) {
            setError(err.message || 'Credenciales inválidas');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePasswordReset = async () => {
        if (!resetEmail) {
            alert('Por favor ingresa tu correo electrónico');
            return;
        }

        setResetSending(true);
        try {
            await sendPasswordResetEmail(auth, resetEmail);
            setResetSuccess(true);
        } catch (error: any) {
            // Don't reveal if email exists or not
            setResetSuccess(true);
        } finally {
            setResetSending(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-white px-4">
            {/* Background gradient blur */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div
                    className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 rounded-full opacity-20 blur-3xl"
                    style={{ background: 'radial-gradient(circle, #7C3AED 0%, transparent 70%)' }}
                />
                <div
                    className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 rounded-full opacity-20 blur-3xl"
                    style={{ background: 'radial-gradient(circle, #06B6D4 0%, transparent 70%)' }}
                />
            </div>

            {/* Login Card */}
            <div className="relative w-full max-w-md">
                {/* Logo */}
                <div className="flex justify-center mb-12 animate-fade-in">
                    <Logo size="lg" variant="color" />
                </div>

                {/* Card */}
                <div className="glass-card rounded-2xl p-8 shadow-xl animate-fade-in">
                    {/* Title */}
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold mb-2">
                            <span className="gradient-primary">Bienvenido</span>
                        </h1>
                        <p className="text-gray-500 text-sm">
                            Sistema de Reclutamiento Masivo
                        </p>
                    </div>

                    {/* Error Alert */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl animate-fade-in">
                            <p className="text-sm text-red-600 text-center">{error}</p>
                        </div>
                    )}

                    {/* Timeout Alert */}
                    {isTimeout && !error && (
                        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl animate-fade-in">
                            <p className="text-sm text-amber-600 text-center">
                                Tu sesión ha expirado por inactividad. Por seguridad, por favor inicia sesión nuevamente.
                            </p>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Email Input */}
                        <div className="space-y-2">
                            <label
                                htmlFor="email"
                                className="block text-sm font-medium text-gray-700"
                            >
                                Correo electrónico
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 
                          focus:outline-none focus:ring-2 focus:ring-violet-500 
                          transition-all duration-200
                          bg-white/50 backdrop-blur-sm"
                                placeholder="tu@email.com"
                                required
                            />
                        </div>

                        {/* Password Input */}
                        <div className="space-y-2">
                            <label
                                htmlFor="password"
                                className="block text-sm font-medium text-gray-700"
                            >
                                Contraseña
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 
                          focus:outline-none focus:ring-2 focus:ring-violet-500 
                          transition-all duration-200
                          bg-white/50 backdrop-blur-sm"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        {/* Forgot Password */}
                        <div className="text-right">
                            <button
                                type="button"
                                onClick={() => {
                                    setResetEmail(email);
                                    setShowResetModal(true);
                                    setResetSuccess(false);
                                }}
                                className="text-sm text-violet-600 hover:text-violet-700 
                          transition-colors duration-200"
                            >
                                ¿Olvidaste tu contraseña?
                            </button>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 px-4 rounded-xl font-medium text-white
                        gradient-bg hover:opacity-90
                        transition-all duration-200 transform hover:scale-[1.02]
                        disabled:opacity-50 disabled:cursor-not-allowed
                        shadow-md hover:shadow-lg"
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg
                                        className="animate-spin h-5 w-5"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                            fill="none"
                                        />
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        />
                                    </svg>
                                    Iniciando sesión...
                                </span>
                            ) : (
                                'Iniciar sesión'
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <p className="text-center mt-8 text-sm text-gray-500">
                    ¿No tienes acceso?{' '}
                    <button className="text-violet-600 hover:text-violet-700 font-medium">
                        Contacta a tu administrador
                    </button>
                </p>
            </div>

            {/* Password Reset Modal */}
            {showResetModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full animate-fade-in">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Restablecer Contraseña</h3>

                        {resetSuccess ? (
                            <div className="text-center py-4">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <p className="text-gray-600 mb-4">
                                    Si el correo existe en nuestro sistema, recibirás un enlace para restablecer tu contraseña.
                                </p>
                                <button
                                    onClick={() => setShowResetModal(false)}
                                    className="px-6 py-2 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700"
                                >
                                    Entendido
                                </button>
                            </div>
                        ) : (
                            <>
                                <p className="text-gray-600 mb-4">
                                    Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
                                </p>
                                <input
                                    type="email"
                                    value={resetEmail}
                                    onChange={(e) => setResetEmail(e.target.value)}
                                    placeholder="tu@email.com"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-violet-500"
                                />
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowResetModal(false)}
                                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handlePasswordReset}
                                        disabled={resetSending}
                                        className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 disabled:opacity-50"
                                    >
                                        {resetSending ? 'Enviando...' : 'Enviar Enlace'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

