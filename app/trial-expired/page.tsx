'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function TrialExpiredPage() {
    const { claims, signOut } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // If not expired or not a trial, redirect back to launcher
        if (claims && (!claims.isTrial || claims.trialStatus === 'active')) {
            router.replace('/launcher');
        }
    }, [claims, router]);

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-slate-900 to-violet-900/30">
            {/* Ambient Background Blur */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 -right-20 w-96 h-96 bg-violet-600/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-1/4 -left-20 w-80 h-80 bg-blue-600/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

            <div className="max-w-xl w-full relative z-10">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 md:p-12 shadow-2xl text-center">
                    {/* Icon Container */}
                    <div className="mb-8 relative inline-block">
                        <div className="w-20 h-20 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-3xl flex items-center justify-center text-4xl shadow-lg shadow-violet-500/20 mx-auto">
                            ⌛
                        </div>
                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full border-2 border-slate-900 flex items-center justify-center text-[10px] font-bold text-white uppercase tracking-tighter">
                            Exp
                        </div>
                    </div>

                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
                        Tu periodo de prueba ha finalizado
                    </h1>

                    <p className="text-white/60 text-lg mb-10 leading-relaxed">
                        Esperamos que hayas disfrutado de la experiencia con <span className="text-white font-semibold">Lia Flow</span>.
                        Para continuar optimizando tus procesos de reclutamiento masivo, es momento de activar tu suscripción.
                    </p>

                    {/* Action Cards */}
                    <div className="space-y-4 mb-10">
                        <button
                            onClick={() => window.open('https://wa.me/your-number', '_blank')}
                            className="w-full group relative p-4 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl font-bold text-white hover:scale-[1.02] transition-all duration-300 shadow-xl shadow-violet-600/20"
                        >
                            <span className="relative z-10 flex items-center justify-center gap-3">
                                💬 Contactar a Ventas
                                <span className="text-xl group-hover:translate-x-1 transition-transform">→</span>
                            </span>
                        </button>

                        <button
                            onClick={() => signOut()}
                            className="w-full p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-medium text-white/80 transition-all"
                        >
                            Cerrar Sesión
                        </button>
                    </div>

                    {/* Footer Info */}
                    <p className="text-white/40 text-sm">
                        ¿Necesitas más tiempo? Conversa con uno de nuestros asesores para extender tu prueba.
                    </p>
                </div>

                <div className="mt-8 text-center">
                    <img
                        src="/logos/liah-logo.png"
                        alt="Liah Suite"
                        className="h-8 mx-auto opacity-30 invert"
                    />
                </div>
            </div>
        </div>
    );
}
