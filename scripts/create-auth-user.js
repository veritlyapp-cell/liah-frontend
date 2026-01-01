const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
    console.log('Loading .env.local...');
    require('dotenv').config({ path: envPath });
} else {
    console.warn('⚠️ .env.local not found!');
}

async function initializeFirebaseAdmin() {
    if (admin.apps.length > 0) return admin.apps[0];

    try {
        console.log('Initializing Firebase Admin...');

        // Try service account file first (more reliable for scripts)
        const serviceAccountPath = path.join(__dirname, '../../firebase-service-account.json');
        if (fs.existsSync(serviceAccountPath)) {
            console.log('Using service account file:', serviceAccountPath);
            const serviceAccount = require(serviceAccountPath);
            return admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        }

        // Try environment variables as fallback
        if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
            console.log('Using environment variables');
            return admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                })
            });
        }

        throw new Error('Missing credentials. No service account file found at ../../firebase-service-account.json and no env vars.');
    } catch (error) {
        console.error('Initialization failed:', error);
        process.exit(1);
    }
}

async function createUser(email, password, displayName) {
    try {
        const app = await initializeFirebaseAdmin();
        const auth = app.auth();

        console.log(`Creating user: ${email}`);
        const userRecord = await auth.createUser({
            email,
            password,
            displayName,
            emailVerified: true,
            disabled: false
        });

        console.log(`✅ User created successfully: ${userRecord.uid}`);
        process.exit(0);
    } catch (error) {
        if (error.code === 'auth/email-already-exists') {
            console.log('⚠️ User already exists. Updating password...');
            try {
                const app = await initializeFirebaseAdmin();
                const auth = app.auth();
                const user = await auth.getUserByEmail(email);
                await auth.updateUser(user.uid, { password });
                console.log(`✅ Password updated for: ${email}`);
                process.exit(0);
            } catch (updateError) {
                console.error('❌ Failed to update user:', updateError.message);
                process.exit(1);
            }
        } else {
            console.error('❌ Error creating user:', error.message);
            process.exit(1);
        }
    }
}

// Get args
const args = process.argv.slice(2);
const email = args[0];
const password = args[1] || 'Liah2025!';
const displayName = args[2] || 'Usuario Nuevo';

if (!email) {
    console.log('Usage: node scripts/create-auth-user.js <email> [password] [displayName]');
    process.exit(1);
}

createUser(email, password, displayName);
