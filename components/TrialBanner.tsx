'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useFeatures } from '@/hooks/useFeatures';
import { useEffect, useState } from 'react';

export default function TrialBanner() {
    const { claims } = useAuth();
    const { isTrial, isExpired } = useFeatures();
    const [daysLeft, setDaysLeft] = useState<number | null>(null);

    useEffect(() => {
        if (claims?.trialExpiresAt) {
            const expiresAt = claims.trialExpiresAt?.toDate ? claims.trialExpiresAt.toDate() : new Date(claims.trialExpiresAt);
            const diff = expiresAt.getTime() - new Date().getTime();
            const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
            setDaysLeft(days > 0 ? days : 0);
        }
    }, [claims]);

    if (!isTrial || isExpired) return null;

    return (
        <div className="bg-gradient-to-r from-violet-600 via-indigo-600 to-indigo-700 text-white px-4 py-2 text-sm flex items-center justify-center gap-4 shadow-lg sticky top-0 z-[60]">
            <div className="flex items-center gap-2">
                <span className="text-lg">🧪</span>
                <span className="font-medium">Modo Trial Activo:</span>
                <span className="opacity-90">Tienes acceso completo a Lia Flow por 7 días.</span>
            </div>

            <div className="h-4 w-[1px] bg-white/20 hidden md:block" />

            <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full border border-white/10">
                <span className="font-bold">{daysLeft} {daysLeft === 1 ? 'día' : 'días'} restantes</span>
            </div>

            <button
                onClick={() => window.open('https://wa.me/your-number', '_blank')}
                className="hidden md:block bg-white text-indigo-600 px-4 py-1 rounded-lg font-bold text-xs hover:bg-indigo-50 transition-colors shadow-sm"
            >
                Subir a Pro
            </button>
        </div>
    );
}
