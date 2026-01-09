/**
 * Script para borrar un candidato y toda su información relacionada
 * Uso: node scripts/delete-test-candidate.js
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
    // Intentar cargar desde archivo JSON en la raíz del proyecto
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
const auth = admin.auth();

const TARGET_EMAIL = 'mlozadarivera1@gmail.com';

async function deleteCandidate() {
    console.log(`\n🔍 Buscando candidato: ${TARGET_EMAIL}...`);

    try {
        // 1. Buscar en la colección 'candidates'
        const candidatesSnapshot = await db.collection('candidates')
            .where('email', '==', TARGET_EMAIL)
            .get();

        if (candidatesSnapshot.empty) {
            console.log('ℹ️  No se encontró candidato en Firestore.');
        } else {
            for (const doc of candidatesSnapshot.docs) {
                console.log(`🗑️  Borrando candidato en Firestore: ${doc.id}`);
                await db.collection('candidates').doc(doc.id).delete();
                console.log('   ✅ Candidato borrado de Firestore.');
            }
        }

        // 2. Buscar en 'userAssignments' (por si acaso)
        const assignmentsSnapshot = await db.collection('userAssignments')
            .where('email', '==', TARGET_EMAIL)
            .get();

        if (assignmentsSnapshot.empty) {
            console.log('ℹ️  No se encontró userAssignment.');
        } else {
            for (const doc of assignmentsSnapshot.docs) {
                console.log(`🗑️  Borrando userAssignment: ${doc.id}`);
                await db.collection('userAssignments').doc(doc.id).delete();
                console.log('   ✅ userAssignment borrado.');
            }
        }

        // 3. Buscar en Firebase Auth
        try {
            const user = await auth.getUserByEmail(TARGET_EMAIL);
            console.log(`🗑️  Borrando usuario de Firebase Auth: ${user.uid}`);
            await auth.deleteUser(user.uid);
            console.log('   ✅ Usuario borrado de Firebase Auth.');
        } catch (error) {
            if (error.code === 'auth/user-not-found') {
                console.log('ℹ️  El usuario no existe en Firebase Auth.');
            } else {
                throw error;
            }
        }

        console.log('\n✨ Proceso de limpieza completado.');

    } catch (error) {
        console.error('\n❌ Error durante el proceso:', error.message);
    } finally {
        process.exit(0);
    }
}

deleteCandidate();
