'use client';

import { useRouter, usePathname } from 'next/navigation';

interface MobileNavigationProps {
    role: 'admin' | 'recruiter' | 'store_manager' | 'jefe_marca';
}

const navigationConfig = {
    admin: [
        { icon: '🏠', label: 'Inicio', path: '/admin' },
        { icon: '📋', label: 'RQs', path: '/admin?tab=rqs' },
        { icon: '👥', label: 'Candidatos', path: '/admin?tab=candidatos' },
        { icon: '📊', label: 'Analytics', path: '/analytics' },
        { icon: '⚙️', label: 'Config', path: '/admin?tab=config' },
    ],
    recruiter: [
        { icon: '🏠', label: 'Inicio', path: '/recruiter' },
        { icon: '📋', label: 'RQs', path: '/recruiter?tab=rqs' },
        { icon: '👥', label: 'Candidatos', path: '/recruiter?tab=candidatos' },
        { icon: '📊', label: 'Analytics', path: '/analytics' },
    ],
    store_manager: [
        { icon: '🏠', label: 'Inicio', path: '/store-manager' },
        { icon: '📋', label: 'RQs', path: '/store-manager?tab=rqs' },
        { icon: '✅', label: 'Aptos', path: '/store-manager?tab=aptos' },
        { icon: '👥', label: 'Invitar', path: '/store-manager?tab=invitar' },
    ],
    jefe_marca: [
        { icon: '🏠', label: 'Inicio', path: '/jefe-marca' },
        { icon: '📋', label: 'RQs', path: '/jefe-marca?tab=rqs' },
        { icon: '🏪', label: 'Tiendas', path: '/jefe-marca?tab=tiendas' },
        { icon: '📊', label: 'Analytics', path: '/analytics' },
    ],
};

export default function MobileNavigation({ role }: MobileNavigationProps) {
    const router = useRouter();
    const pathname = usePathname();

    const items = navigationConfig[role] || navigationConfig.recruiter;

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 md:hidden safe-area-inset-bottom">
            <div className="flex justify-around items-center h-16">
                {items.map((item) => {
                    const isActive = pathname === item.path ||
                        (pathname?.startsWith(item.path.split('?')[0]) && item.path.includes('?'));

                    return (
                        <button
                            key={item.path}
                            onClick={() => router.push(item.path)}
                            className={`flex flex-col items-center justify-center w-full h-full transition-colors touch-manipulation
                                ${isActive
                                    ? 'text-violet-600'
                                    : 'text-gray-500 hover:text-gray-700 active:bg-gray-100'
                                }`}
                        >
                            <span className="text-xl mb-0.5">{item.icon}</span>
                            <span className={`text-[10px] font-medium ${isActive ? 'text-violet-600' : 'text-gray-500'}`}>
                                {item.label}
                            </span>
                            {isActive && (
                                <div className="absolute bottom-0 w-12 h-0.5 bg-gradient-to-r from-violet-600 to-cyan-500 rounded-full" />
                            )}
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}
