// Firebase configuration for LIAH
// Estas son las credenciales públicas de Firebase (seguras para el frontend)

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging, Messaging, isSupported } from 'firebase/messaging';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// ... (existing logs)

// Initialize Firebase
function getFirebaseApp() {
    if (getApps().length === 0) {
        if (!firebaseConfig.apiKey || firebaseConfig.apiKey === 'undefined') {
            console.warn('[Firebase] ⚠️ API Key missing!');
            return null;
        }
        return initializeApp(firebaseConfig);
    }
    return getApp();
}

const app = getFirebaseApp();

// Initialize services
export const auth = app ? getAuth(app) : null as any;
export const db = app ? getFirestore(app) : null as any;
export const storage = app ? getStorage(app) : null as any;

// Messaging (Client-only)
export const messaging = async (): Promise<Messaging | null> => {
    if (typeof window === 'undefined' || !app) return null;
    const supported = await isSupported();
    return supported ? getMessaging(app) : null;
};

// Secondary app for creating new users without logging out current admin
let secondaryApp: any = null;
export function getSecondaryAuth() {
    if (!secondaryApp && firebaseConfig.apiKey) {
        const apps = getApps();
        secondaryApp = apps.find(a => a.name === 'secondary') ||
            initializeApp(firebaseConfig, 'secondary');
    }
    return secondaryApp ? getAuth(secondaryApp) : null;
}

console.log('[Firebase] db initialized:', db ? 'YES' : 'NO');

export default app;
