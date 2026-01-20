/**
 * Script para listar holdings y sus IDs
 */
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

async function listData() {
    console.log('📋 HOLDINGS:\n');
    const hSnap = await getDocs(collection(db, 'holdings'));
    hSnap.forEach(doc => {
        console.log(`  ID: "${doc.id}"`);
        console.log(`  Nombre: ${doc.data().nombre}`);
        console.log('  ---');
    });

    console.log('\n📋 TALENT_USERS:\n');
    const uSnap = await getDocs(collection(db, 'talent_users'));
    uSnap.forEach(doc => {
        const d = doc.data();
        console.log(`  ${d.email} → holdingId: "${d.holdingId || 'VACÍO'}"`);
    });

    console.log('\n📋 GERENCIAS:\n');
    const gSnap = await getDocs(collection(db, 'gerencias'));
    gSnap.forEach(doc => {
        const d = doc.data();
        console.log(`  ${d.nombre} → holdingId: "${d.holdingId || 'VACÍO'}"`);
    });

    process.exit(0);
}

listData().catch(console.error);
