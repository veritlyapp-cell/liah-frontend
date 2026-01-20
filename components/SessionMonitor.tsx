'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

/**
 * SessionMonitor - Monitors user inactivity and auto-logs out
 * Default timeout: 10 minutes (600,000 ms)
 */
export default function SessionMonitor() {
    const { user, signOut } = useAuth();
    const router = useRouter();
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // 10 minutes of inactivity
    const INACTIVITY_TIMEOUT = 10 * 60 * 1000;

    const handleLogout = useCallback(async () => {
        if (user) {
            console.log('🕒 Session timed out due to inactivity. Logging out...');
            try {
                await signOut();
                router.push('/login?reason=timeout');
            } catch (error) {
                console.error('Error during auto-logout:', error);
            }
        }
    }, [user, signOut, router]);

    const resetTimer = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        if (user) {
            timeoutRef.current = setTimeout(handleLogout, INACTIVITY_TIMEOUT);
        }
    }, [user, handleLogout, INACTIVITY_TIMEOUT]);

    useEffect(() => {
        // Only monitor if user is logged in
        if (!user) {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            return;
        }

        // Events that count as activity
        const events = [
            'mousedown',
            'mousemove',
            'keypress',
            'scroll',
            'touchstart',
            'click'
        ];

        // Set initial timer
        resetTimer();

        // Add event listeners
        events.forEach(event => {
            window.addEventListener(event, resetTimer);
        });

        // Cleanup
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            events.forEach(event => {
                window.removeEventListener(event, resetTimer);
            });
        };
    }, [user, resetTimer]);

    // This component doesn't render anything
    return null;
}
