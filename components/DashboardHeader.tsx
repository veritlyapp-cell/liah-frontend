'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Logo from '@/components/Logo';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface DashboardHeaderProps {
    title: string;
    subtitle?: string;
    holdingId?: string;
    holdingName?: string;
    holdingLogo?: string;
    marcaId?: string; // For auto-loading marca logo
    marcaName?: string;
    marcaLogo?: string;
    showLogout?: boolean;
}

interface HoldingInfo {
    nombre: string;
    logoUrl?: string;
}

interface MarcaInfo {
    nombre: string;
    logoUrl?: string;
}

export default function DashboardHeader({
    title,
    subtitle,
    holdingId,
    holdingName,
    holdingLogo,
    marcaId,
    marcaName,
    marcaLogo,
    showLogout = true
}: DashboardHeaderProps) {
    const { user, signOut } = useAuth();
    const [holdingInfo, setHoldingInfo] = useState<HoldingInfo | null>(null);
    const [marcaInfo, setMarcaInfo] = useState<MarcaInfo | null>(null);

    // Load holding info if not provided
    useEffect(() => {
        async function loadHoldingInfo() {
            if (holdingLogo || !holdingId) return;

            try {
                const holdingRef = doc(db, 'holdings', holdingId);
                const holdingDoc = await getDoc(holdingRef);
                if (holdingDoc.exists()) {
                    const data = holdingDoc.data();
                    setHoldingInfo({
                        nombre: data.nombre || holdingName,
                        logoUrl: data.logoUrl
                    });
                }
            } catch (error) {
                console.error('Error loading holding info:', error);
            }
        }
        loadHoldingInfo();
    }, [holdingId, holdingLogo, holdingName]);

    // Load marca info if marcaId provided but no logo passed
    useEffect(() => {
        async function loadMarcaInfo() {
            if (marcaLogo || !marcaId) return;

            try {
                const marcaRef = doc(db, 'marcas', marcaId);
                const marcaDoc = await getDoc(marcaRef);
                if (marcaDoc.exists()) {
                    const data = marcaDoc.data();
                    setMarcaInfo({
                        nombre: data.nombre || marcaName,
                        logoUrl: data.logoUrl
                    });
                }
            } catch (error) {
                console.error('Error loading marca info:', error);
            }
        }
        loadMarcaInfo();
    }, [marcaId, marcaLogo, marcaName]);

    const displayHoldingLogo = holdingLogo || holdingInfo?.logoUrl;
    const displayHoldingName = holdingName || holdingInfo?.nombre;
    const displayMarcaLogo = marcaLogo || marcaInfo?.logoUrl;
    const displayMarcaName = marcaName || marcaInfo?.nombre;

    return (
        <header className="bg-white border-b border-gray-200 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div className="flex items-center justify-between">
                    {/* Left: Logos and Title */}
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                        {/* Primary Logo: Holding or LIAH fallback */}
                        <div className="flex-shrink-0">
                            {displayHoldingLogo ? (
                                <img
                                    src={displayHoldingLogo}
                                    alt={displayHoldingName || 'Empresa'}
                                    className="h-8 w-auto object-contain"
                                />
                            ) : (
                                <Logo size="sm" />
                            )}
                        </div>

                        {/* Marca Logo (if exists and we are already showing a primary logo) */}
                        {displayMarcaLogo && (
                            <div className="flex items-center gap-4 flex-shrink-0">
                                <span className="text-gray-300">|</span>
                                <img
                                    src={displayMarcaLogo}
                                    alt={displayMarcaName || 'Marca'}
                                    className="h-8 w-auto object-contain"
                                />
                            </div>
                        )}

                        {/* Additional Branding (LIAH if not shown as primary, or if user specifically needs it) */}
                        {/* Note: We show LIAH as primary if no Holding logo exists. 
                            If Holding exists, LIAH is hidden to avoid clutter as per user request. */}

                        {/* Title */}
                        <div className="ml-4 min-width-0 overflow-hidden">
                            <h1 className="text-xl font-bold text-gray-900 truncate">
                                {title}
                            </h1>
                            {subtitle && (
                                <p className="text-sm text-gray-500 truncate">{subtitle}</p>
                            )}
                        </div>
                    </div>

                    {/* Right: User info and logout */}
                    <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                        <span className="text-sm text-gray-600 hidden lg:block truncate max-w-[150px]">
                            {user?.displayName || user?.email}
                        </span>
                        {showLogout && (
                            <button
                                onClick={() => signOut()}
                                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
                            >
                                <span className="hidden sm:inline">Cerrar Sesión</span>
                                <span className="sm:hidden">Salir</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
