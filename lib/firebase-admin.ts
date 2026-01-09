/**
 * Firebase Admin SDK initialization for server-side use only.
 * This file should ONLY be imported in:
 * - API Routes (`app/api/...`)
 * 
 * NEVER import this in client components or shared utilities.
 */

import * as admin from 'firebase-admin';
import { getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

let adminApp: App | null = null;

function initializeFirebaseAdmin(): App {
    if (adminApp) {
        return adminApp;
    }

    if (getApps().length > 0) {
        adminApp = getApps()[0];
        return adminApp;
    }

    // Try environment variables (for production)
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
        console.log('[Firebase Admin] Using environment variables');

        // Robust sanitization
        let privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').trim();

        // Remove any surrounding quotes (single or double)
        privateKey = privateKey.replace(/^["']|["']$/g, '');

        // Replace literal \n or escaped \\n with actual newlines
        privateKey = privateKey.replace(/\\+n/g, '\n');

        // Check for headers
        if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
            console.error('[Firebase Admin] ❌ Private key missing headers. Starts with:', privateKey.substring(0, 20));
        }

        adminApp = admin.initializeApp({
            credential: cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: privateKey,
            }),
        });
        console.log('[Firebase Admin] ✅ Initialized for project:', process.env.FIREBASE_PROJECT_ID);
        return adminApp;
    }

    // Development: Try file-based service account
    try {
        const fs = require('fs');
        const path = require('path');

        const possiblePaths = [
            path.join(process.cwd(), '../firebase-service-account.json'),
            path.join(process.cwd(), 'firebase-service-account.json'),
        ];

        for (const filePath of possiblePaths) {
            if (fs.existsSync(filePath)) {
                console.log('[Firebase Admin] Using service account file:', filePath);
                const serviceAccount = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                adminApp = admin.initializeApp({
                    credential: cert(serviceAccount),
                });
                return adminApp;
            }
        }
    } catch (error) {
        // File system not available (edge runtime)
    }

    throw new Error(
        'Firebase Admin SDK: Missing credentials. ' +
        'Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY environment variables.'
    );
}

export function getAdminAuth() {
    const app = initializeFirebaseAdmin();
    return getAuth(app);
}

export function getAdminFirestore() {
    const app = initializeFirebaseAdmin();
    return getFirestore(app);
}

export function getFieldValue() {
    initializeFirebaseAdmin();
    return FieldValue;
}
