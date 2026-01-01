/**
 * Script para limpiar datos de prueba en LIAH
 * Borra: Candidatos, Invitaciones y RQs
 * Ejecutar: node scripts/clear-all-data.js
 */

import admin from 'firebase-admin';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Inicializar Firebase Admin
let firebaseApp;

try {
    const serviceAccountPath = join(__dirname, '../../firebase-service-account.json');
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

    firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });

    console.log('✅ Firebase initialized');
} catch (error) {
    console.log('❌ Error initializing Firebase:', error.message);
    process.exit(1);
}

const db = admin.firestore();

async function deleteCollection(collectionPath, batchSize = 100) {
    const collectionRef = db.collection(collectionPath);
    const query = collectionRef.orderBy('__name__').limit(batchSize);

    return new Promise((resolve, reject) => {
        deleteQueryBatch(db, query, resolve).catch(reject);
    });
}

async function deleteQueryBatch(db, query, resolve) {
    const snapshot = await query.get();

    const batchSize = snapshot.size;
    if (batchSize === 0) {
        // When there are no documents left, we are done
        resolve();
        return;
    }

    // Delete documents in a batch
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });
    await batch.commit();

    // Recurse on the next process tick, to avoid
    // exploding the stack.
    process.nextTick(() => {
        deleteQueryBatch(db, query, resolve);
    });
}

async function main() {
    console.log('\n🗑️  Iniciando limpieza de base de datos...');

    const collections = ['candidates', 'invitations', 'rqs'];

    for (const collectionName of collections) {
        process.stdout.write(`   Limpiando ${collectionName}... `);
        try {
            await deleteCollection(collectionName);
            console.log('✅');
        } catch (error) {
            console.log('❌');
            console.error(`      Error: ${error.message}`);
        }
    }

    console.log('\n✨ Base de datos limpia (Candidatos, Invitaciones y RQs)');
    process.exit(0);
}

main().catch(err => {
    console.error('❌ Error fatal:', err);
    process.exit(1);
});
