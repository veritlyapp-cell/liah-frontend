require('dotenv').config({ path: '.env.local' });
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function verify() {
    const cols = ['talent_rqs', 'talent_jobs', 'talent_applications'];
    console.log('--- REPORTE DE LIMPIEZA ---');
    for (const colName of cols) {
        try {
            const snap = await getDocs(collection(db, colName));
            console.log(`${colName}: ${snap.size} documentos.`);
        } catch (e) {
            console.log(`Error checking ${colName}: ${e.message}`);
        }
    }
    process.exit(0);
}

verify();
