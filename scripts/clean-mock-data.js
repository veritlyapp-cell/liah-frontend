/**
 * Script para limpiar datos transaccionales (RQs, Vacantes, Postulaciones)
 * USANDO FIREBASE-ADMIN para mayor confiabilidad en Node.js
 * Ejecutar con: node scripts/clean-mock-data.js
 */

require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

if (!process.env.FIREBASE_PROJECT_ID && !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    console.error('❌ ERROR: No se cargaron las variables de entorno. Verifica .env.local');
    process.exit(1);
}

// Inicializar Admin SDK
try {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
        })
    });
} catch (e) {
    // Si ya está inicializado o falla el cert, intentar por defecto
    if (!admin.apps.length) {
        admin.initializeApp({
            projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
        });
    }
}

const db = admin.firestore();

async function deleteCollection(collectionName) {
    console.log(`🧹 Limpiando colección: ${collectionName}...`);
    const collectionRef = db.collection(collectionName);
    const snapshot = await collectionRef.get();

    if (snapshot.empty) {
        console.log(`   ℹ️ No se encontraron documentos.`);
        return 0;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`   ✅ Se eliminaron ${snapshot.size} documentos.`);
    return snapshot.size;
}

async function runClean() {
    console.log('🚀 INICIANDO LIMPIEZA DE DATOS MOCK (ADMIN)...\n');

    const targetCollections = [
        'talent_rqs',
        'talent_jobs',
        'talent_applications',
        'rqs'
    ];

    for (const col of targetCollections) {
        try {
            await deleteCollection(col);
        } catch (e) {
            console.error(`   ❌ Error en ${col}:`, e.message);
        }
    }

    console.log('\n✨ ¡LIMPIEZA COMPLETADA!');
    console.log('Los tableros están listos para datos reales.');
    process.exit(0);
}

runClean().catch(err => {
    console.error('❌ Error fatal:', err);
    process.exit(1);
});
