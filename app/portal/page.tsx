'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

function PortalContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const holdingSlug = searchParams.get('holding');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [vacancyCount, setVacancyCount] = useState<number | null>(null);
    const [step, setStep] = useState<'landing' | 'email' | 'checking' | 'magic_link_sent'>('landing');
    const [brandColor, setBrandColor] = useState<string | null>(null);
    const [brandName, setBrandName] = useState<string | null>(null);
    const [brandLogo, setBrandLogo] = useState<string | null>(null);

    useEffect(() => {
        // Redirection logic to consolidate URLs
        if (holdingSlug) {
            router.replace(`/empleos/${holdingSlug.toLowerCase()}`);
            return;
        }

        // Fetch vacancy count
        async function fetchVacancyCount() {
            try {
                const res = await fetch('/api/portal/vacancy-count');
                const data = await res.json();
                setVacancyCount(data.count || 0);
            } catch (error) {
                console.error('Error fetching vacancy count:', error);
            }
        }
        fetchVacancyCount();

        async function fetchHoldingConfig() {
            if (!holdingSlug) return;
            try {
                const q = query(collection(db, 'holdings'), where('slug', '==', holdingSlug.toLowerCase()));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    const data = snap.docs[0].data();
                    const b = data.config?.branding || data.branding || {};
                    if (b?.primaryColor) setBrandColor(b.primaryColor);
                    if (data.nombre) setBrandName(data.nombre);
                    if (data.logoUrl) setBrandLogo(data.logoUrl);
                }
                
                // NGR Orange Fallback
                if (holdingSlug.toLowerCase() === 'ngr' || (brandName && brandName.toLowerCase() === 'ngr')) {
                    if (!brandColor || brandColor === '#1E1B4B') {
                        setBrandColor('#FF6B35');
                    }
                }
            } catch (error) {
                console.error('Error fetching holding:', error);
            }
        }
        fetchHoldingConfig();
    }, [holdingSlug]);

    async function handleEmailSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!email.trim()) return;

        setLoading(true);
        setStep('checking');

        try {
            // Check if user exists
            const response = await fetch('/api/portal/check-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (data.exists) {
                // Send magic link
                await fetch('/api/portal/magic-link', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });
                setStep('magic_link_sent');
            } else {
                // New user - redirect to registration
                let url = `/portal/registro?email=${encodeURIComponent(email)}`;
                if (holdingSlug) url += `&holding=${holdingSlug}`;
                router.push(url);
            }
        } catch (error) {
            console.error('Error checking user:', error);
            alert('Error al verificar el correo. Intenta de nuevo.');
            setStep('email');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div
            className="min-h-screen flex items-center justify-center p-4 transition-colors duration-500"
            style={{ backgroundColor: brandColor || '#1E1B4B' }}
        >
            {/* Background Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-10 w-72 h-72 bg-white/5 rounded-full blur-3xl"></div>
                <div className="absolute bottom-20 right-10 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
            </div>

            <div className="relative z-10 max-w-lg w-full">
                {/* Logo & Title */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-xl rounded-2xl mb-4 border border-white/20 overflow-hidden">
                        {brandLogo ? <img src={brandLogo} alt="Logo" className="w-full h-full object-cover p-2" /> : <span className="text-4xl">💼</span>}
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-2 italic uppercase tracking-tighter">
                        Portal de Empleos
                    </h1>
                    <p className="text-white/70 text-lg">
                        {brandName ? `Encuentra oportunidades en ${brandName}` : 'Encuentra oportunidades cerca de ti'}
                    </p>
                </div>

                {/* Card */}
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl">
                    {step === 'landing' && (
                        <>
                            {/* Vacancy Counter */}
                            {vacancyCount !== null && vacancyCount > 0 && (
                                <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-400/30 rounded-xl p-4 mb-6 text-center">
                                    <p className="text-green-300 text-sm">Vacantes disponibles ahora</p>
                                    <p className="text-4xl font-bold text-white my-2">{vacancyCount}</p>
                                    <p className="text-green-300/70 text-xs">en diferentes ubicaciones</p>
                                </div>
                            )}

                            {/* Benefits */}
                            <h2 className="text-xl font-bold text-white mb-4 text-center">
                                ¿Por qué trabajar con nosotros?
                            </h2>
                            <div className="space-y-3 mb-6">
                                <div className="flex items-center gap-3 text-white/80">
                                    <span className="w-8 h-8 bg-violet-500/30 rounded-full flex items-center justify-center text-sm">📍</span>
                                    <span>Encuentra empleo cerca de tu casa</span>
                                </div>
                                <div className="flex items-center gap-3 text-white/80">
                                    <span className="w-8 h-8 bg-cyan-500/30 rounded-full flex items-center justify-center text-sm">⏰</span>
                                    <span>Horarios flexibles (mañana, tarde, noche)</span>
                                </div>
                                <div className="flex items-center gap-3 text-white/80">
                                    <span className="w-8 h-8 bg-green-500/30 rounded-full flex items-center justify-center text-sm">💰</span>
                                    <span>Sueldo competitivo + beneficios</span>
                                </div>
                                <div className="flex items-center gap-3 text-white/80">
                                    <span className="w-8 h-8 bg-amber-500/30 rounded-full flex items-center justify-center text-sm">🚀</span>
                                    <span>Crecimiento y desarrollo profesional</span>
                                </div>
                            </div>

                            <button
                                onClick={() => setStep('email')}
                                className="w-full py-4 bg-gradient-to-r from-violet-500 to-cyan-500 text-white font-bold rounded-xl hover:from-violet-600 hover:to-cyan-600 transition-all shadow-lg hover:shadow-xl"
                            >
                                ¡Postula Ahora! →
                            </button>

                            <p className="text-white/40 text-xs text-center mt-4">
                                Regístrate para ver las vacantes disponibles
                            </p>
                        </>
                    )}

                    {step === 'email' && (
                        <>
                            <button
                                onClick={() => setStep('landing')}
                                className="text-white/60 hover:text-white text-sm mb-4 flex items-center gap-1"
                            >
                                ← Volver
                            </button>

                            <h2 className="text-2xl font-bold text-white mb-2 text-center">
                                Ingresa tu correo
                            </h2>
                            <p className="text-white/60 text-center mb-6">
                                Para ver vacantes cerca de ti
                            </p>

                            <form onSubmit={handleEmailSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-white/80 mb-2">
                                        Correo Electrónico
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="tu@email.com"
                                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
                                        required
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-4 bg-gradient-to-r from-violet-500 to-cyan-500 text-white font-bold rounded-xl hover:from-violet-600 hover:to-cyan-600 transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
                                >
                                    {loading ? 'Verificando...' : 'Continuar →'}
                                </button>
                            </form>
                        </>
                    )}

                    {step === 'checking' && (
                        <div className="text-center py-8">
                            <div className="animate-spin w-12 h-12 border-4 border-white/20 border-t-violet-400 rounded-full mx-auto mb-4"></div>
                            <p className="text-white/80">Verificando tu correo...</p>
                        </div>
                    )}

                    {step === 'magic_link_sent' && (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-4xl">✉️</span>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">
                                ¡Revisa tu correo!
                            </h3>
                            <p className="text-white/60 mb-4">
                                Te hemos enviado un enlace mágico a:
                            </p>
                            <p className="text-violet-300 font-medium mb-6">
                                {email}
                            </p>
                            <p className="text-white/40 text-sm">
                                El enlace expira en 24 horas
                            </p>

                            <button
                                onClick={() => setStep('email')}
                                className="mt-6 text-white/60 hover:text-white underline text-sm"
                            >
                                Usar otro correo
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <p className="text-white/30 text-center text-[10px] font-black uppercase tracking-[0.3em] mt-8">
                    POWERED BY <span className="text-white/50">LIAH</span> DESIGN BY <span className="text-white/50">RELIÉ LABS</span>
                </p>
            </div>
        </div>
    );
}

export default function PortalPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#1E1B4B]"></div>}>
            <PortalContent />
        </Suspense>
    );
}
