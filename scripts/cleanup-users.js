/**
 * Script para limpiar usuarios del script inicial
 * Ejecutar: node scripts/cleanup-users.js
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
const auth = admin.auth();

// Usuarios a eliminar (excepto superadmin)
const USERS_TO_DELETE = [
    'admin@liah.com',
    'admin@ngr.pe',
    'recruiter@papajohns.pe',
    'recruiter@bembos.pe',
    'manager.sanisidro@papajohns.pe'
];

async function deleteUser(email) {
    try {
        // 1. Buscar usuario en Auth
        const user = await auth.getUserByEmail(email);

        // 2. Eliminar de Auth
        await auth.deleteUser(user.uid);
        console.log(`✅ Auth: Eliminado ${email}`);

        // 3. Eliminar de Firestore 'users' collection
        await db.collection('users').doc(user.uid).delete();
        console.log(`✅ Firestore users: Eliminado ${email}`);

        // 4. Buscar y eliminar de userAssignments (si existe)
        const assignmentsSnapshot = await db.collection('userAssignments')
            .where('email', '==', email)
            .get();

        for (const doc of assignmentsSnapshot.docs) {
            await doc.ref.delete();
            console.log(`✅ Firestore userAssignments: Eliminado ${email}`);
        }

        return true;
    } catch (error) {
        if (error.code === 'auth/user-not-found') {
            console.log(`⚠️  Usuario ${email} no existe en Auth, saltando...`);
        } else {
            console.error(`❌ Error eliminando ${email}:`, error.message);
        }
        return false;
    }
}

async function main() {
    console.log('');
    console.log('================================================');
    console.log('   LIAH - Limpieza de Usuarios');
    console.log('================================================');
    console.log('');
    console.log('⚠️  Esto eliminará los siguientes usuarios:');
    USERS_TO_DELETE.forEach(email => console.log(`   - ${email}`));
    console.log('');

    let deleted = 0;
    for (const email of USERS_TO_DELETE) {
        const success = await deleteUser(email);
        if (success) deleted++;
    }

    console.log('');
    console.log('================================================');
    console.log(`✅ Eliminados: ${deleted} usuarios`);
    console.log('================================================');
    console.log('');
    console.log('Ahora puedes crear usuarios desde el Super Admin.');
    console.log('');

    process.exit(0);
}

main().catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
});
