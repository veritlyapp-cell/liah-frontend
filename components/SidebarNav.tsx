'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, LayoutDashboard, Settings, LogOut } from 'lucide-react';
import Logo from './Logo';

export interface SidebarItem {
    id: string;
    label: string;
    icon: React.ReactNode;
    hidden?: boolean;
    badge?: string | number;
}

interface SidebarNavProps {
    items: SidebarItem[];
    activeTab: string;
    onTabChange: (id: string) => void;
    holdingName?: string;
    holdingLogo?: string;
    holdingSubtitle?: string;
    onLogout?: () => void;
}

export default function SidebarNav({ items, activeTab, onTabChange, holdingName, holdingLogo, holdingSubtitle, onLogout }: SidebarNavProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);

    useEffect(() => {
        if (typeof document !== 'undefined') {
            const handleResize = () => {
                if (window.innerWidth < 768) {
                    document.documentElement.style.setProperty('--sidebar-width', '0px');
                } else {
                    document.documentElement.style.setProperty('--sidebar-width', isCollapsed ? '88px' : '280px');
                }
            };

            handleResize();
            window.addEventListener('resize', handleResize);
            return () => window.removeEventListener('resize', handleResize);
        }
    }, [isCollapsed]);

    const toggleSidebar = () => setIsCollapsed(!isCollapsed);

    return (
        <aside
            className={`bg-[#0f172a] text-white flex flex-col fixed inset-y-0 left-0 z-50 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] border-r border-white/5 hidden md:flex`}
            style={{ width: isCollapsed ? '88px' : '280px' }}
        >
            {/* White-Label Logo Section */}
            <div className={`h-24 flex items-center px-7 relative ${isCollapsed ? 'justify-center px-0' : ''}`}>
                <AnimatePresence mode="wait">
                    {!isCollapsed ? (
                        <motion.div
                            key="expanded-brand"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            className="flex items-center gap-3 w-full"
                        >
                            {holdingLogo ? (
                                <div className="p-1.5 bg-white rounded-xl shadow-sm flex-shrink-0">
                                    <img src={holdingLogo} alt={holdingName} className="h-7 w-auto object-contain" />
                                </div>
                            ) : (
                                <Logo size="sm" variant="icon" />
                            )}
                            <div className="flex flex-col min-w-0">
                                <span className="text-sm font-black tracking-tight text-white uppercase italic truncate">
                                    {holdingName || 'Liah Platform'}
                                </span>
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] truncate">
                                    {holdingSubtitle || 'Portal Liah'}
                                </span>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="collapsed-brand"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                        >
                            <Logo size="sm" variant="icon" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Universal Navigation */}
            <div className="flex-1 px-4 space-y-1.5 overflow-y-auto no-scrollbar py-6">
                {items.filter(item => !item.hidden).map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                        <div key={item.id} className="relative group">
                            <button
                                onClick={() => onTabChange(item.id)}
                                className={`w-full flex items-center gap-4 rounded-2xl transition-all duration-300 relative group/btn ${isCollapsed ? 'justify-center h-14 p-0' : 'px-4 py-3.5'
                                    } ${isActive
                                        ? 'bg-brand/10 text-brand'
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                            >
                                <span className={`flex-shrink-0 transition-all duration-300 ${isActive ? 'scale-110' : 'group-hover/btn:scale-110'}`}>
                                    {React.isValidElement(item.icon) ? React.cloneElement(item.icon as React.ReactElement<any>, { size: 20, strokeWidth: isActive ? 2.5 : 2 }) : item.icon}
                                </span>

                                {!isCollapsed && (
                                    <span className={`font-bold text-sm tracking-tight text-left flex-1 transition-colors ${isActive ? 'text-white' : ''}`}>
                                        {item.label}
                                    </span>
                                )}

                                {!isCollapsed && item.badge !== undefined && (
                                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${isActive ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'bg-slate-800 text-slate-500'}`}>
                                        {item.badge}
                                    </span>
                                )}

                                {/* Modern Active Indicator */}
                                {isActive && (
                                    <motion.div
                                        layoutId="sidebar-indicator"
                                        className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-brand rounded-l-full shadow-[0_0_20px_rgba(var(--brand-rgb),0.6)]"
                                    />
                                )}
                            </button>

                            {/* Collapsed Tooltip */}
                            {isCollapsed && (
                                <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 px-4 py-2 bg-slate-800 text-white text-[11px] font-black uppercase tracking-widest rounded-xl opacity-0 pointer-events-none group-hover:opacity-100 group-hover:translate-x-1 transition-all z-[60] shadow-2xl border border-slate-700 whitespace-nowrap">
                                    {item.label}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Bottom Section */}
            <div className="p-4 mt-auto border-t border-white/5">


                <div className="flex items-center justify-center px-2">
                    {!isCollapsed && onLogout && (
                        <button
                            onClick={onLogout}
                            className="w-full flex items-center justify-center gap-3 px-4 py-3 text-slate-500 hover:text-rose-500 transition-all bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 active:scale-95 group"
                        >
                            <LogOut size={18} />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Log Out</span>
                        </button>
                    )}
                </div>
            </div>
        </aside>
    );
}
