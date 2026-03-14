'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';
import NotificationBell from '@/components/NotificationBell';
import UserAvatarMenu from '@/components/UserAvatarMenu';

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
    storeId?: string; // For notification bell
    storeIds?: string[]; // For supervisor notification bell
    showLogout?: boolean;
    showProductSwitcher?: boolean; // Show button to switch between Flow/Talent
    onConfigClick?: () => void;
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
    storeId,
    storeIds,
    showLogout = true,
    showProductSwitcher = false,
    onConfigClick
}: DashboardHeaderProps) {
    const { user, claims, signOut } = useAuth();
    const router = useRouter();
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
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-100/50">
            <div className="container-main">
                <div className="h-20 flex items-center justify-between">
                    {/* Left: Branding & Breadcrumbs */}
                    <div className="flex items-center gap-3 md:gap-6 min-w-0 flex-1 pr-2">
                        {/* Compact Logo Area for Mobile */}
                        <div className="md:hidden flex-shrink-0">
                            <Logo size="sm" variant="icon" />
                        </div>

                        {/* White-Label Breadcrumbs */}
                        <nav className="flex items-center gap-1.5 md:gap-2.5 overflow-hidden min-w-0">
                            <span className="hidden md:inline text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">Platform</span>
                            <span className="hidden md:block text-slate-300 w-px h-3 bg-slate-200 rotate-12 flex-shrink-0" />
                            {displayMarcaName && (
                                <>
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] truncate min-w-[30px]">{displayMarcaName}</span>
                                    <span className="text-slate-300 w-px h-3 bg-slate-200 rotate-12 flex-shrink-0" />
                                </>
                            )}
                            <h1 className="text-xs md:text-sm font-black text-slate-900 uppercase tracking-tight truncate flex items-center gap-2 italic">
                                {title}
                                {subtitle && <span className="text-xs font-medium text-slate-400 normal-case tracking-normal hidden lg:block opacity-60">/ {subtitle}</span>}
                            </h1>
                        </nav>
                    </div>

                    {/* Right Side: Action Tools */}
                    <div className="flex items-center gap-1.5 md:gap-3 flex-shrink-0">
                        {showProductSwitcher && (
                            <button
                                onClick={() => router.push('/launcher')}
                                className="hidden md:flex h-10 px-4 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl transition-all border border-slate-100 items-center gap-2 group"
                            >
                                <div className="w-5 h-5 rounded-lg bg-white shadow-sm flex items-center justify-center text-[10px] group-hover:rotate-12 transition-transform">🔄</div>
                                <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">Switch</span>
                            </button>
                        )}



                        <div className="flex items-center gap-1.5 p-1 bg-slate-50/50 rounded-2xl border border-slate-100/50">

                            <NotificationBell
                                marcaId={marcaId}
                                storeId={storeId}
                                storeIds={storeIds}
                            />

                            <div className="w-px h-6 bg-slate-200 mx-1" />

                            <UserAvatarMenu
                                subtitle={subtitle}
                                onConfigClick={onConfigClick}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
