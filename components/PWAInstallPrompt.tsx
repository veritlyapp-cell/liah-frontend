'use client';

import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
            return;
        }

        // Check if dismissed recently
        const dismissed = localStorage.getItem('pwa-prompt-dismissed');
        if (dismissed) {
            const dismissedTime = parseInt(dismissed);
            // Show again after 7 days
            if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) {
                return;
            }
        }

        const handleBeforeInstall = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            // Show after 5 seconds to not interrupt initial experience
            setTimeout(() => setShowPrompt(true), 5000);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstall);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
        };
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            setIsInstalled(true);
        }

        setDeferredPrompt(null);
        setShowPrompt(false);
    };

    const handleDismiss = () => {
        localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
        setShowPrompt(false);
    };

    if (!showPrompt || isInstalled) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-slide-up">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 relative overflow-hidden">
                {/* Decorative gradient */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-600 to-cyan-500" />

                <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center flex-shrink-0">
                        <span className="text-2xl">📱</span>
                    </div>

                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 text-lg">Instala LIAH</h3>
                        <p className="text-sm text-gray-500 mt-1">
                            Accede más rápido y recibe notificaciones de RQs pendientes
                        </p>

                        <div className="flex gap-2 mt-3">
                            <button
                                onClick={handleInstall}
                                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-cyan-500 text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
                            >
                                Instalar
                            </button>
                            <button
                                onClick={handleDismiss}
                                className="px-4 py-2.5 text-gray-500 hover:text-gray-700 text-sm font-medium"
                            >
                                Ahora no
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
