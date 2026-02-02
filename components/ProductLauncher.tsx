'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface ProductLauncherProps {
    accessFlow?: boolean;
    accessTalent?: boolean;
}

/**
 * Product Launcher - Shows after login if user has access to multiple products
 * Reads holding config to determine product access
 */
export default function ProductLauncher({ accessFlow, accessTalent }: ProductLauncherProps) {
    const router = useRouter();
    const { user, claims, signOut } = useAuth();
    const [loading, setLoading] = useState(true);
    const [hasFlow, setHasFlow] = useState(accessFlow ?? true);
    const [hasTalent, setHasTalent] = useState(accessTalent ?? false);

    // Fetch holding config to determine product access
    useEffect(() => {
        async function fetchHoldingConfig() {
            if (!user?.email) return;

            setLoading(true);
            try {
                let foundHoldingId: string | null = (claims?.holdingId as string) || (claims?.tenant_id as string) || null;

                // Step 1: Find user's holdingId from any collection if not in claims
                if (!foundHoldingId) {
                    console.log('🔍 Launcher: holdingId not in claims, checking collections...');

                    // Try userAssignments (UID search is most reliable)
                    const assignmentsRef = collection(db, 'userAssignments');
                    const flowSnapByUid = await getDocs(query(assignmentsRef, where('userId', '==', user.uid)));

                    if (!flowSnapByUid.empty) {
                        foundHoldingId = flowSnapByUid.docs[0].data().holdingId;
                    }

                    // Try userAssignments (Email search as backup)
                    if (!foundHoldingId && user.email) {
                        const flowSnapByEmail = await getDocs(query(assignmentsRef, where('email', '==', user.email.toLowerCase())));
                        if (!flowSnapByEmail.empty) {
                            foundHoldingId = flowSnapByEmail.docs[0].data().holdingId;
                        }
                    }

                    // Try legacy 'users' collection (UID search)
                    if (!foundHoldingId) {
                        const { getDoc, doc } = await import('firebase/firestore');
                        const userDoc = await getDoc(doc(db, 'users', user.uid));
                        if (userDoc.exists()) {
                            foundHoldingId = userDoc.data().tenant_id || userDoc.data().holdingId;
                        }
                    }

                    // If still not found, try talent_users
                    if (!foundHoldingId && user.email) {
                        const talentRef = collection(db, 'talent_users');
                        const talentSnap = await getDocs(query(talentRef, where('email', '==', user.email.toLowerCase())));
                        if (!talentSnap.empty) {
                            foundHoldingId = talentSnap.docs[0].data().holdingId;
                        }
                    }
                }

                console.log('🛡️ Launcher: Found holdingId:', foundHoldingId);

                // Fallback for admins: if we can't find holdingId but they are in /launcher, they are likely admins
                const isAdmin = ['client_admin', 'admin', 'gerente', 'super_admin'].includes(claims?.role || '');

                if (!foundHoldingId) {
                    console.warn('⚠️ No holdingId found for user:', user.email);
                    if (isAdmin) {
                        console.log('🛡️ User is admin, enabling Liah Flow as default fallback');
                        setHasFlow(true);
                        setHasTalent(false);
                        // No logic to auto-redirect admins without holdingId yet, so show choosing screen
                    } else {
                        setHasFlow(false);
                        setHasTalent(false);
                    }
                    setLoading(false); // CRITICAL: Stop loading even if no holdingId
                    return;
                }

                // Step 2: Fetch holding config to determine product access
                const { getDoc, doc } = await import('firebase/firestore');
                const holdingDoc = await getDoc(doc(db, 'holdings', foundHoldingId));

                if (holdingDoc.exists()) {
                    const holdingData = holdingDoc.data();
                    const config = holdingData.config || {};

                    // Read product access - check both top-level and config object
                    const flowAccess = holdingData.hasLiahFlow !== false && config.hasLiahFlow !== false;
                    const talentAccess = holdingData.hasLiahTalent === true || config.hasLiahTalent === true;

                    setHasFlow(flowAccess);
                    setHasTalent(talentAccess);

                    console.log('🛡️ Launcher: Product access from holding config:', {
                        holdingId: foundHoldingId,
                        hasLiahFlow: flowAccess,
                        hasLiahTalent: talentAccess
                    });

                    // Step 3: Determine enabled products
                    const flowPath = ['recruiter', 'brand_recruiter'].includes(claims?.role || '') ? '/recruiter' : '/admin';

                    const products = [
                        { id: 'flow', path: flowPath, enabled: flowAccess },
                        { id: 'talent', path: '/talent', enabled: talentAccess }
                    ];

                    const enabledList = products.filter(p => p.enabled);

                    // Step 4: Immediate redirect if only one product is enabled
                    if (enabledList.length === 1) {
                        const targetPath = enabledList[0].path;
                        console.log('🚀 Launcher: Auto-redirecting to:', targetPath);
                        router.replace(targetPath);
                        return; // Exit fetchHoldingConfig, router will handle the rest
                    }

                    // If we reach here, either multiple or zero products (will show choice or lock screen)
                    setLoading(false);
                } else {
                    // Holding not found, default to Flow only
                    console.warn('⚠️ Holding document not found:', foundHoldingId);
                    setHasFlow(true);
                    setHasTalent(false);
                    setLoading(false);
                }

            } catch (error) {
                console.error('Error fetching access control:', error);
                // On error, allow both as fallback
                setHasFlow(true);
                setHasTalent(true);
                setLoading(false);
            }
        }

        fetchHoldingConfig();
    }, [user, claims, router]);

    const products = [
        {
            id: 'flow',
            name: 'Liah Flow',
            description: 'Reclutamiento Masivo',
            icon: '🚀',
            color: 'from-orange-500 to-red-500',
            path: ['recruiter', 'brand_recruiter'].includes(claims?.role || '') ? '/recruiter' : '/admin',
            enabled: hasFlow
        },
        {
            id: 'talent',
            name: 'Liah Talent',
            description: 'Reclutamiento Corporativo',
            icon: '💼',
            color: 'from-violet-500 to-indigo-500',
            path: '/talent',
            enabled: hasTalent
        }
    ];

    const enabledProducts = products.filter(p => p.enabled);

    // Consolidate the effect that handles the redirect once loading is done
    // This is for users who landed on /launcher and were NOT auto-redirected in the fetchHoldingConfig
    useEffect(() => {
        if (!loading && enabledProducts.length === 1) {
            const targetPath = enabledProducts[0].path;
            console.log('🚀 Launcher: Fallback redirect triggering to:', targetPath);
            router.replace(targetPath);
        }
    }, [loading, enabledProducts.length, router]);

    // If loading, show spinner
    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500" />
            </div>
        );
    }

    // While redirecting or if only one product
    if (enabledProducts.length === 1) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center text-center p-6">
                <div>
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500 mx-auto mb-4" />
                    <p className="text-white/60">Redirigiendo...</p>
                </div>
            </div>
        );
    }

    // If no products enabled
    if (enabledProducts.length === 0) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center text-center p-6">
                <div>
                    <div className="text-6xl mb-4">🔒</div>
                    <h1 className="text-2xl font-bold text-white">Sin acceso a productos</h1>
                    <p className="text-white/60 mt-2 mb-8">Contacta al administrador para habilitar tu acceso</p>

                    <button
                        onClick={() => signOut()}
                        className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 transition-all font-medium"
                    >
                        Cerrar Sesión
                    </button>
                </div>
            </div>
        );
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
                <div className="mt-12 flex flex-col items-center gap-4">
                    <p className="text-white/40 text-sm">
                        Liah Suite by Relie Labs
                    </p>
                    <button
                        onClick={() => signOut()}
                        className="text-white/30 hover:text-white/60 text-sm transition-colors flex items-center gap-2"
                    >
                        <span>Cerrar Sesión</span>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
