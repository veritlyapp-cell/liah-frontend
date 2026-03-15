'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SidebarNav from '@/components/SidebarNav';
import DashboardHeader from '@/components/DashboardHeader';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface SidebarItem {
    id: string;
    label: string;
    icon: React.ReactNode;
    hidden?: boolean;
    badge?: string | number;
}

interface DashboardLayoutProps {
    children: React.ReactNode;
    items: SidebarItem[];
    activeTab: string;
    onTabChange: (id: string) => void;
    title: string;
    subtitle?: string;
    holdingId?: string;
    holdingName?: string;
    holdingLogo?: string;
    marcaId?: string;
    marcaName?: string;
    marcaLogo?: string;
    storeId?: string;
    storeIds?: string[];
    onConfigClick?: () => void;
    brandColor?: string;
    holdingSubtitle?: string;
}

export default function DashboardLayout({
    children,
    items,
    activeTab,
    onTabChange,
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
    onConfigClick,
    brandColor = '#7c3aed',
    holdingSubtitle
}: DashboardLayoutProps) {
    const { signOut } = useAuth();
    const [isMobile, setIsMobile] = React.useState(true);
    const [holdingInfo, setHoldingInfo] = React.useState<{ nombre: string; logoUrl?: string } | null>(null);
    const [marcaInfo, setMarcaInfo] = React.useState<{ nombre: string; logoUrl?: string } | null>(null);

    // Track mobile status for layout
    React.useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const [hasLiahFlow, setHasLiahFlow] = React.useState(true);
    const [hasLiahTalent, setHasLiahTalent] = React.useState(false);

    // Fetch holding info if not provided
    React.useEffect(() => {
        const fetchHolding = async () => {
            if (!holdingId) return;
            try {
                const hDoc = await getDoc(doc(db, 'holdings', holdingId));
                if (hDoc.exists()) {
                    const data = hDoc.data();
                    if (!holdingName) {
                        setHoldingInfo({
                            nombre: data.nombre,
                            logoUrl: data.logoUrl
                        });
                    }
                    setHasLiahFlow(data.config?.hasLiahFlow !== false);
                    setHasLiahTalent(data.config?.hasLiahTalent || false);
                }
            } catch (e) { console.error(e); }
        };
        fetchHolding();
    }, [holdingId, holdingName]);

    // Fetch marca info if not provided
    React.useEffect(() => {
        const fetchMarca = async () => {
            if (!marcaId || marcaName) return;
            try {
                const mDoc = await getDoc(doc(db, 'marcas', marcaId));
                if (mDoc.exists()) {
                    setMarcaInfo({
                        nombre: mDoc.data().nombre,
                        logoUrl: mDoc.data().logoUrl
                    });
                }
            } catch (e) { console.error(e); }
        };
        fetchMarca();
    }, [marcaId, marcaName]);

    const displayHoldingName = holdingName || holdingInfo?.nombre;
    const displayHoldingLogo = holdingLogo || holdingInfo?.logoUrl;
    const displayMarcaName = marcaName || marcaInfo?.nombre;
    const displayMarcaLogo = marcaLogo || marcaInfo?.logoUrl;

    // Dynamic Theme Applicator
    React.useEffect(() => {
        if (typeof document !== 'undefined') {
            const root = document.documentElement;
            root.style.setProperty('--brand-solid', brandColor);

            const hexToRgb = (hex: string) => {
                const r = parseInt(hex.slice(1, 3), 16);
                const g = parseInt(hex.slice(3, 5), 16);
                const b = parseInt(hex.slice(5, 7), 16);
                return `${r}, ${g}, ${b}`;
            };

            if (brandColor.startsWith('#')) {
                root.style.setProperty('--brand-rgb', hexToRgb(brandColor));
            }
        }
    }, [brandColor]);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
            {/* Desktop Sidebar - Hidden on MB */}
            <div className="hidden md:block">
                <SidebarNav
                    items={items}
                    activeTab={activeTab}
                    onTabChange={onTabChange}
                    holdingName={displayMarcaName || displayHoldingName}
                    holdingLogo={displayMarcaLogo || displayHoldingLogo}
                    holdingSubtitle={displayMarcaName ? displayHoldingName : (holdingSubtitle || 'Portal Liah')}
                    onLogout={signOut}
                />
            </div>

            {/* Content Area */}
            <div
                className="flex-1 flex flex-col transition-all duration-300 min-w-0"
                style={{ marginLeft: isMobile ? '0px' : 'var(--sidebar-width, 0px)' }}
            >
                {/* Standard Unified Header */}
                <DashboardHeader
                    title={title}
                    subtitle={subtitle}
                    holdingId={holdingId}
                    holdingName={displayHoldingName}
                    holdingLogo={displayHoldingLogo}
                    marcaId={marcaId}
                    marcaName={displayMarcaName}
                    marcaLogo={displayMarcaLogo}
                    storeId={storeId}
                    storeIds={storeIds}
                    onConfigClick={onConfigClick}
                    showProductSwitcher={hasLiahFlow && hasLiahTalent}
                />

                {/* Main Content with Consistent Padding */}
                <main className="p-6 md:p-10 pb-[calc(100px+env(safe-area-inset-bottom))] md:pb-20 max-w-[1600px] w-full mx-auto">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, scale: 0.99, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.99, y: -10 }}
                            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                        >
                            {children}
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>

            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                <div className="flex items-center justify-around h-[64px] px-2">
                    {items.filter(item => !item.hidden).slice(0, 6).map((item) => {
                        const isActive = activeTab === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => onTabChange(item.id)}
                                className={`flex flex-col items-center justify-center flex-1 h-full min-w-[64px] transition-all duration-300 ${isActive ? 'text-brand' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <span className={`${isActive ? '-translate-y-0.5 scale-110' : ''} transition-all duration-300`}>
                                    {React.isValidElement(item.icon) ? React.cloneElement(item.icon as React.ReactElement<any>, { size: 24, strokeWidth: isActive ? 2.5 : 2 }) : item.icon}
                                </span>
                                <span className={`text-[10px] font-black uppercase tracking-widest leading-none mt-1 transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-70'}`}>{item.label.slice(0, 10)}</span>
                            </button>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
}
