'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface ProductLauncherProps {
    accessFlow?: boolean;
    accessTalent?: boolean;
}

/**
 * Product Launcher - Shows after login if user has access to multiple products
 */
export default function ProductLauncher({ accessFlow = true, accessTalent = true }: ProductLauncherProps) {
    const router = useRouter();
    const { user } = useAuth();

    const products = [
        {
            id: 'flow',
            name: 'Liah Flow',
            description: 'Reclutamiento Masivo',
            icon: '🚀',
            color: 'from-orange-500 to-red-500',
            path: '/dashboard',
            enabled: accessFlow
        },
        {
            id: 'talent',
            name: 'Liah Talent',
            description: 'Reclutamiento Corporativo',
            icon: '💼',
            color: 'from-violet-500 to-indigo-500',
            path: '/talent',
            enabled: accessTalent
        }
    ];

    const enabledProducts = products.filter(p => p.enabled);

    // If only one product, redirect directly
    if (enabledProducts.length === 1) {
        router.push(enabledProducts[0].path);
        return null;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-violet-900 via-indigo-900 to-slate-900 flex items-center justify-center p-6">
            {/* Animated background */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            </div>

            <div className="relative z-10 text-center max-w-4xl w-full">
                {/* Logo */}
                <img
                    src="/logos/liah-logo.png"
                    alt="Liah Suite"
                    className="h-16 mx-auto mb-8"
                />

                {/* Welcome */}
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
                    ¡Bienvenido{user?.email ? `, ${user.email.split('@')[0]}` : ''}!
                </h1>
                <p className="text-white/70 text-lg mb-12">
                    Selecciona el producto al que deseas acceder
                </p>

                {/* Product Cards */}
                <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
                    {enabledProducts.map((product) => (
                        <button
                            key={product.id}
                            onClick={() => router.push(product.path)}
                            className="group relative p-8 bg-white/10 backdrop-blur-sm rounded-3xl border border-white/20 hover:bg-white/20 hover:scale-105 transition-all duration-300"
                        >
                            {/* Gradient overlay on hover */}
                            <div className={`absolute inset-0 bg-gradient-to-br ${product.color} opacity-0 group-hover:opacity-20 rounded-3xl transition-opacity`} />

                            <div className="relative z-10">
                                <div className="text-6xl mb-4">{product.icon}</div>
                                <h2 className="text-2xl font-bold text-white mb-2">{product.name}</h2>
                                <p className="text-white/60">{product.description}</p>
                            </div>

                            {/* Arrow indicator */}
                            <div className="absolute bottom-6 right-6 text-white/40 group-hover:text-white/80 group-hover:translate-x-1 transition-all">
                                →
                            </div>
                        </button>
                    ))}
                </div>

                {/* Footer */}
                <p className="text-white/40 text-sm mt-12">
                    Liah Suite by Relie Labs
                </p>
            </div>
        </div>
    );
}
