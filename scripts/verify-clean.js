require('isomorphic-fetch');
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

async function check() {
    console.log('Verificando colecciones...');
    const cols = ['talent_rqs', 'talent_jobs', 'talent_applications'];
    for (const col of cols) {
        try {
            const snap = await getDocs(collection(db, col));
            console.log(`Colección ${col}: ${snap.size} documentos`);
        } catch (e) {
            console.error(`Error en ${col}:`, e.message);
        }
    }
    process.exit(0);
}

check();
