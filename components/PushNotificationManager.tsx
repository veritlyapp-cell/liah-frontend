'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db, messaging } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getToken, onMessage } from 'firebase/messaging';

export default function PushNotificationManager() {
    const { user } = useAuth();
    const [token, setToken] = useState<string | null>(null);
    const [isSupported, setIsSupported] = useState(false);

    useEffect(() => {
        if (!user) return;

        async function setupPush() {
            const m = await messaging();
            if (!m) {
                console.log('Push notifications not supported in this browser');
                return;
            }
            setIsSupported(true);

            // Request permission
            if (Notification.permission === 'denied') {
                console.log('Push notifications blocked by user');
                return;
            }

            if (Notification.permission !== 'granted') {
                const permission = await Notification.requestPermission();
                if (permission !== 'granted') return;
            }

            try {
                // Get token
                // NOTE: NEXT_PUBLIC_VAPID_KEY should be in .env.local
                const currentToken = await getToken(m, {
                    vapidKey: process.env.NEXT_PUBLIC_VAPID_KEY
                });

                if (currentToken) {
                    setToken(currentToken);
                    await saveTokenToFirestore(currentToken);
                }
            } catch (err) {
                console.error('An error occurred while retrieving token:', err);
            }
        }

        async function saveTokenToFirestore(fcmToken: string) {
            if (!user) return;
            const tokenRef = doc(db, 'push_tokens', user.uid);
            await setDoc(tokenRef, {
                token: fcmToken,
                userId: user.uid,
                email: user.email,
                updatedAt: serverTimestamp(),
                active: true,
                device: navigator.userAgent
            });
            console.log('FCM Token saved to Firestore');
        }

        setupPush();

        // Listen for foreground messages
        const unsubscribe = async () => {
            const m = await messaging();
            if (m) {
                return onMessage(m, (payload) => {
                    console.log('Foreground message received:', payload);
                    // Standard notification will be shown by browser if we don't handle it
                    // but on foreground we might want to refresh the notification bell
                    new Notification(payload.notification?.title || 'LIAH', {
                        body: payload.notification?.body,
                        icon: '/liah-icon.png'
                    });
                });
            }
        };

        const cleanupPromise = unsubscribe();
        return () => {
            cleanupPromise.then(unsub => unsub?.());
        };
    }, [user]);

    // This component renders nothing, just handles logic
    return null;
}
