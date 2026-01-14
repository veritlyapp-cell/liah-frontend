'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function MagicLinkAuthPage() {
    const params = useParams();
    const router = useRouter();
    const [status, setStatus] = useState<'verifying' | 'success' | 'error' | 'expired'>('verifying');

    useEffect(() => {
        async function verifyToken() {
            const token = params.token as string;

            if (!token) {
                setStatus('error');
                return;
            }

            try {
                const response = await fetch('/api/portal/verify-magic-link', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    setStatus('success');
                    // Redirect to vacancies with session
                    setTimeout(() => {
                        router.push(`/portal/vacantes?token=${data.sessionToken}`);
                    }, 1500);
                } else if (data.expired) {
                    setStatus('expired');
                } else {
                    setStatus('error');
                }
            } catch (error) {
                console.error('Error verifying token:', error);
                setStatus('error');
            }
        }

        verifyToken();
    }, [params.token, router]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-violet-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-20 left-10 w-72 h-72 bg-violet-500/20 rounded-full blur-3xl"></div>
                <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl"></div>
            </div>

            <div className="relative z-10 max-w-md w-full">
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl text-center">
                    {status === 'verifying' && (
                        <>
                            <div className="animate-spin w-16 h-16 border-4 border-white/20 border-t-violet-400 rounded-full mx-auto mb-6"></div>
                            <h2 className="text-xl font-bold text-white mb-2">
                                Verificando tu enlace...
                            </h2>
                            <p className="text-white/60">
                                Por favor espera un momento
                            </p>
                        </>
                    )}

                    {status === 'success' && (
                        <>
                            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                <span className="text-4xl">✓</span>
                            </div>
                            <h2 className="text-xl font-bold text-white mb-2">
                                ¡Acceso verificado!
                            </h2>
                            <p className="text-white/60">
                                Redirigiendo al portal...
                            </p>
                        </>
                    )}

                    {status === 'expired' && (
                        <>
                            <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                <span className="text-4xl">⏰</span>
                            </div>
                            <h2 className="text-xl font-bold text-white mb-2">
                                Enlace expirado
                            </h2>
                            <p className="text-white/60 mb-6">
                                Este enlace ya no es válido. Por favor solicita uno nuevo.
                            </p>
                            <button
                                onClick={() => router.push('/portal')}
                                className="px-6 py-3 bg-gradient-to-r from-violet-500 to-cyan-500 text-white font-bold rounded-xl hover:from-violet-600 hover:to-cyan-600 transition-all"
                            >
                                Volver al inicio
                            </button>
                        </>
                    )}

                    {status === 'error' && (
                        <>
                            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                <span className="text-4xl">✕</span>
                            </div>
                            <h2 className="text-xl font-bold text-white mb-2">
                                Enlace inválido
                            </h2>
                            <p className="text-white/60 mb-6">
                                No pudimos verificar tu enlace.
                            </p>
                            <button
                                onClick={() => router.push('/portal')}
                                className="px-6 py-3 bg-gradient-to-r from-violet-500 to-cyan-500 text-white font-bold rounded-xl hover:from-violet-600 hover:to-cyan-600 transition-all"
                            >
                                Volver al inicio
                            </button>
                        </>
                    )}
                </div>

                <p className="text-white/40 text-center text-sm mt-6">
                    Powered by <span className="text-violet-400 font-semibold">LIAH</span>
                </p>
            </div>
        </div>
    );
}
