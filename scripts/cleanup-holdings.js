/**
 * Script para limpiar holdings duplicados
 * Ejecutar: node scripts/cleanup-holdings.js
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
    console.log('❌ Error loading service account:', error.message);
    process.exit(1);
}

const db = admin.firestore();

async function main() {
    console.log('');
    console.log('================================================');
    console.log('   LIAH - Limpieza de Holdings');
    console.log('================================================');
    console.log('');

    // 1. Obtener todos los holdings
    const holdingsSnapshot = await db.collection('holdings').get();

    console.log(`📦 Holdings encontrados: ${holdingsSnapshot.size}`);

    holdingsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log(`   - ${doc.id}: ${data.nombre || 'Sin nombre'}`);
    });

    console.log('');
    console.log('⚠️  Eliminando TODOS los holdings...');
    console.log('');

    let deleted = 0;
    for (const doc of holdingsSnapshot.docs) {
        await doc.ref.delete();
        console.log(`   ✅ Eliminado: ${doc.id}`);
        deleted++;
    }

    // 2. También limpiar marcas y tiendas huérfanas
    console.log('');
    console.log('🧹 Limpiando marcas huérfanas...');
    const marcasSnapshot = await db.collection('marcas').get();
    for (const doc of marcasSnapshot.docs) {
        await doc.ref.delete();
        console.log(`   ✅ Marca eliminada: ${doc.id}`);
    }

    console.log('');
    console.log('🧹 Limpiando tiendas huérfanas...');
    const tiendasSnapshot = await db.collection('tiendas').get();
    for (const doc of tiendasSnapshot.docs) {
        await doc.ref.delete();
        console.log(`   ✅ Tienda eliminada: ${doc.id}`);
    }

    console.log('');
    console.log('================================================');
    console.log(`✅ Eliminados: ${deleted} holdings`);
    console.log(`✅ Eliminadas: ${marcasSnapshot.size} marcas`);
    console.log(`✅ Eliminadas: ${tiendasSnapshot.size} tiendas`);
    console.log('================================================');
    console.log('');
    console.log('Ahora puedes crear empresas desde el Super Admin.');
    console.log('');

    process.exit(0);
}

main().catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
});
