'use client';

import ProductLauncher from '@/components/ProductLauncher';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Launcher Page - Product Selector
 * Shows after login if user has access to multiple products
 */
export default function LauncherPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500" />
            </div>
        );
    }

    // ProductLauncher handles permissions internally based on role and holding config
    return (
        <ProductLauncher />
    );
}
