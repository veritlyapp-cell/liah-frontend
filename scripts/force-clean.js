require('isomorphic-fetch');
require('dotenv').config({ path: '.env.local' });
const { initializeApp } = require('firebase/app');
const { initializeFirestore, collection, getDocs, deleteDoc, doc, terminate } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
// Usamos experimentalForceLongPolling para evitar errores de red/gRPC en Node local
const db = initializeFirestore(app, { experimentalForceLongPolling: true });

async function clean() {
    console.log('🚀 INICIANDO LIMPIEZA FORZADA (Long Polling)...');
    console.log('Proyecto:', firebaseConfig.projectId);

    const cols = ['talent_rqs', 'talent_jobs', 'talent_applications', 'rqs'];

    for (const colName of cols) {
        process.stdout.write(`🧹 Limpiando ${colName}... `);
        try {
            const snap = await getDocs(collection(db, colName));
            if (snap.empty) {
                console.log('Vacía.');
                continue;
            }

            console.log(`Eliminando ${snap.size} docs...`);
            for (const d of snap.docs) {
                await deleteDoc(doc(db, colName, d.id));
            }
            console.log('✅ Listo.');
        } catch (e) {
            console.log('❌ Error:', e.message);
        }
    }

    await terminate(db);
    console.log('\n✨ ¡LIMPIEZA FINALIZADA! Tableros despejados.');
    process.exit(0);
}

clean().catch(err => {
    console.error('Error fatal:', err);
    process.exit(1);
});
