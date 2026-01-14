'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Logo from '@/components/Logo';

export default function StoreManagerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, claims, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // TEMPORAL: Comentado para testing sin custom claims
        /*
        if (!loading && !user) {
            router.push('/login');
        }

        if (!loading && user && claims?.role !== 'store_manager') {
            // Si no es store manager, redirigir al dashboard correcto
            switch (claims?.role) {
                case 'super_admin':
                    router.push('/super-admin');
                    break;
                case 'client_admin':
                    router.push('/admin');
                    break;
                case 'brand_recruiter':
                    router.push('/recruiter');
                    break;
                default:
                    router.push('/login');
            }
        }
        */
    }, [user, claims, loading, router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-pulse-slow mb-4">
                        <Logo size="lg" />
                    </div>
                    <p className="text-gray-500">Cargando...</p>
                </div>
            </div>
        );
    }

    // TEMPORAL: Comentado para testing
    /*
    if (!user || claims?.role !== 'store_manager') {
        return null;
    }
    */

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Mobile-First Layout */}
            <div className="max-w-7xl mx-auto">
                {/* Main Content */}
                <main className="p-0 pb-20">
                    {children}
                </main>

                {/* Bottom Navigation (Mobile) */}
                <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden">
                    <div className="flex items-center justify-around py-3">
                        <button className="flex flex-col items-center gap-1 text-violet-600">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-xs font-medium">Hoy</span>
                        </button>

                        <button className="flex flex-col items-center gap-1 text-gray-400">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <span className="text-xs">Candidatos</span>
                        </button>

                        <button className="flex flex-col items-center gap-1 text-gray-400">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            <span className="text-xs">Reportes</span>
                        </button>
                    </div>
                </nav>
            </div>
        </div>
    );
}
