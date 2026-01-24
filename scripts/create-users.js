/**
 * Script para crear usuarios iniciales en LIAH
 * Ejecutar: npm run create-users
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
    // Intentar cargar desde archivo JSON
    const serviceAccountPath = join(__dirname, '../../firebase-service-account.json');
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

    firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });

    console.log('✅ Firebase initialized with service account JSON');
} catch (error) {
    console.log('❌ Error loading service account:', error.message);
    process.exit(1);
}

const db = admin.firestore();
const auth = admin.auth();

// ============================================
// CONFIGURACIÓN DE USUARIOS
// ============================================

const USERS = [
    // Super Admin (tú - acceso global)
    {
        email: 'admin@liah.com',
        password: 'SuperAdmin2024!',
        displayName: 'Super Admin',
        role: 'super_admin',
        tenant_id: null,  // null = acceso a todos los tenants
        authorized_entities: null  // null = acceso a todas las entidades
    },

    // Admin Cliente NGR
    {
        email: 'admin@ngr.pe',
        password: 'NGRAdmin2024!',
        displayName: 'Admin NGR',
        role: 'client_admin',
        tenant_id: 'ngr_holding',
        authorized_entities: ['*']  // '*' = todas las entidades del tenant
    },

    // Reclutador Papa Johns
    {
        email: 'recruiter@papajohns.pe',
        password: 'PapaJohns2024!',
        displayName: 'Recruiter Papa Johns',
        role: 'brand_recruiter',
        tenant_id: 'ngr_holding',
        authorized_entities: ['entity_papajohns']
    },

    // Reclutador Bembos
    {
        email: 'recruiter@bembos.pe',
        password: 'Bembos2024!',
        displayName: 'Recruiter Bembos',
        role: 'brand_recruiter',
        tenant_id: 'ngr_holding',
        authorized_entities: ['entity_bembos']
    },

    // Store Manager Papa Johns San Isidro
    authorized_stores: ['store_pj_sanisidro']
    },
{
    email: 'compensaciones@ngr.pe',
        password: 'Compensaciones2024!',
            displayName: 'Compensaciones NGR',
                role: 'compensaciones',
                    tenant_id: 'ngr_holding',
                        authorized_entities: ['*']
}
];

// ============================================
// FUNCIONES
// ============================================

async function createUser(userData) {
    try {
        // Verificar si el usuario ya existe
        let user;
        try {
            user = await auth.getUserByEmail(userData.email);
            console.log(`⚠️  Usuario ${userData.email} ya existe, actualizando...`);

            // Actualizar usuario existente
            await auth.updateUser(user.uid, {
                displayName: userData.displayName,
                password: userData.password
            });
        } catch (error) {
            if (error.code === 'auth/user-not-found') {
                // Crear nuevo usuario
                user = await auth.createUser({
                    email: userData.email,
                    password: userData.password,
                    displayName: userData.displayName,
                    emailVerified: true
                });
                console.log(`✅ Usuario creado: ${userData.email}`);
            } else {
                throw error;
            }
        }

        // Establecer custom claims
        const claims = {
            role: userData.role,
            tenant_id: userData.tenant_id,
            authorized_entities: userData.authorized_entities || null,
            entity_id: userData.entity_id || null,
            authorized_stores: userData.authorized_stores || null
        };

        await auth.setCustomUserClaims(user.uid, claims);
        console.log(`   Custom claims: role=${userData.role}, tenant=${userData.tenant_id || 'global'}`);

        // Guardar en Firestore users collection
        await db.collection('users').doc(user.uid).set({
            email: userData.email,
            displayName: userData.displayName,
            role: userData.role,
            tenant_id: userData.tenant_id,
            authorized_entities: userData.authorized_entities || null,
            entity_id: userData.entity_id || null,
            authorized_stores: userData.authorized_stores || null,
            activo: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        console.log(`   Guardado en Firestore: users/${user.uid}`);
        console.log('');

        return { success: true, user: userData.email };
    } catch (error) {
        console.error(`❌ Error creando usuario ${userData.email}:`, error.message);
        return { success: false, user: userData.email, error: error.message };
    }
}

async function main() {
    console.log('');
    console.log('================================================');
    console.log('   LIAH - Creación de Usuarios Iniciales');
    console.log('================================================');
    console.log('');

    const results = [];

    for (const userData of USERS) {
        const result = await createUser(userData);
        results.push(result);
    }

    console.log('================================================');
    console.log('   RESUMEN');
    console.log('================================================');
    console.log('');

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log(`✅ Usuarios creados/actualizados: ${successful.length}`);
    successful.forEach(r => console.log(`   - ${r.user}`));

    if (failed.length > 0) {
        console.log('');
        console.log(`❌ Errores: ${failed.length}`);
        failed.forEach(r => console.log(`   - ${r.user}: ${r.error}`));
    }

    console.log('');
    console.log('================================================');
    console.log('   CREDENCIALES DE ACCESO');
    console.log('================================================');
    console.log('');

    USERS.forEach(u => {
        console.log(`${u.displayName}:`);
        console.log(`  Email:    ${u.email}`);
        console.log(`  Password: ${u.password}`);
        console.log(`  Role:     ${u.role}`);
        console.log(`  Tenant:   ${u.tenant_id || 'Global (Super Admin)'}`);
        console.log('');
    });

    console.log('================================================');
    console.log('✅ Script completado');
    console.log('================================================');
    console.log('');

    process.exit(0);
}

// Ejecutar
main().catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
});
