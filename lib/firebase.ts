// Firebase configuration for LIAH
// Estas son las credenciales públicas de Firebase (seguras para el frontend)

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Debug logging
console.log('[Firebase] Initializing...');
console.log('[Firebase] apiKey exists:', !!firebaseConfig.apiKey);
console.log('[Firebase] projectId:', firebaseConfig.projectId);

// Initialize Firebase - works in both client and server (API routes)
function getFirebaseApp() {
    if (getApps().length === 0) {
        // Check if config is valid
        if (!firebaseConfig.apiKey || firebaseConfig.apiKey === 'undefined') {
            // Only log warning, don't crash the build/runtime unless a service is actually called
            console.warn('[Firebase] ⚠️ API Key missing! Environment variables might not be loaded.');
            return null;
        }
        try {
            console.log('[Firebase] Creating new app instance...');
            return initializeApp(firebaseConfig);
        } catch (error) {
            console.error('[Firebase] Error initializing app:', error);
            return null;
        }
    }
    return getApp();
}

const app = getFirebaseApp();

// Initialize services
export const auth = app ? getAuth(app) : null as any;
export const db = app ? getFirestore(app) : null as any;
export const storage = app ? getStorage(app) : null as any;

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
