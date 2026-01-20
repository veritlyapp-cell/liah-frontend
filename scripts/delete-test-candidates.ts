// Script to delete test candidates
// Run with: npx ts-node --skip-project scripts/delete-test-candidates.ts

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
const serviceAccount = require('../service-account.json');
initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

async function deleteCandidates() {
    const emailsToDelete = ['oscarqv88@gmail.com', 'oscarqv@outlook.com'];

    console.log('🔍 Buscando candidatos a eliminar...');

    for (const email of emailsToDelete) {
        const snapshot = await db.collection('candidates').where('email', '==', email).get();

        if (snapshot.empty) {
            console.log(`❌ No encontrado: ${email}`);
        } else {
            for (const doc of snapshot.docs) {
                console.log(`🗑️ Eliminando: ${doc.id} (${email})`);
                await doc.ref.delete();
                console.log(`✅ Eliminado: ${email}`);
            }
        }
    }

    console.log('\n✅ Proceso completado!');
}

deleteCandidates().catch(console.error);
