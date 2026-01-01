/**
 * Firebase Admin SDK initialization for server-side use only.
 * This file should ONLY be imported in:
 * - API Routes (`app/api/...`)
 * 
 * NEVER import this in client components or shared utilities.
 * 
 * All imports are dynamic to prevent Turbopack build errors.
 */

let adminApp: any = null;

async function initializeFirebaseAdmin() {
    if (adminApp) {
        return adminApp;
    }

    // Dynamic imports to prevent build-time resolution
    const admin = (await import('firebase-admin')).default;
    const { getApps, cert } = await import('firebase-admin/app');

    if (getApps().length > 0) {
        adminApp = getApps()[0];
        return adminApp;
    }

    // Try environment variables (for production)
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
        console.log('[Firebase Admin] Using environment variables');
        adminApp = admin.initializeApp({
            credential: cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            }),
        });
        return adminApp;
    }

    // Development: Try file-based service account
    try {
        const fs = await import('fs');
        const path = await import('path');

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

export async function getAdminAuth() {
    const app = await initializeFirebaseAdmin();
    const { getAuth } = await import('firebase-admin/auth');
    return getAuth(app);
}

export async function getAdminFirestore() {
    const app = await initializeFirebaseAdmin();
    const { getFirestore } = await import('firebase-admin/firestore');
    return getFirestore(app);
}

// For backward compatibility - export a simple db reference
export const adminDb = {
    get: async () => {
        return await getAdminFirestore();
    }
};
