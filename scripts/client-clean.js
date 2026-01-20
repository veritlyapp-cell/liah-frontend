require('isomorphic-fetch');
require('dotenv').config({ path: '.env.local' });
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc, doc } = require('firebase/firestore');

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

async function clean() {
    console.log('--- STARTING CLIENT CLEANUP ---');
    const cols = ['talent_rqs', 'talent_jobs', 'talent_applications', 'rqs'];

    for (const colName of cols) {
        process.stdout.write(`Checking ${colName}... `);
        try {
            const snap = await getDocs(collection(db, colName));
            if (snap.empty) {
                console.log('Empty.');
                continue;
            }
            console.log(`Found ${snap.size}. Deleting...`);
            for (const d of snap.docs) {
                await deleteDoc(doc(db, colName, d.id));
            }
            console.log('Done.');
        } catch (e) {
            console.log('Error:', e.message);
        }
    }
    console.log('--- CLIENT CLEANUP COMPLETE ---');
    process.exit(0);
}

clean().catch(err => {
    console.error(err);
    process.exit(1);
});
