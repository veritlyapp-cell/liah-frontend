/**
 * Script de diagnóstico para verificar holdingIds de usuarios
 * Ejecutar con: npx ts-node scripts/check-holdings.ts
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

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

async function checkHoldings() {
    console.log('🔍 Buscando usuarios de @llamagas.pe...\n');

    const usersRef = collection(db, 'talent_users');
    const snapshot = await getDocs(usersRef);

    const llamagasUsers: any[] = [];

    snapshot.forEach(doc => {
        const data = doc.data();
        if (data.email && data.email.includes('llamagas.pe')) {
            llamagasUsers.push({
                id: doc.id,
                email: data.email,
                nombre: data.nombre,
                holdingId: data.holdingId || '⚠️ SIN HOLDING',
                rol: data.rol,
                capacidades: data.capacidades,
                activo: data.activo
            });
        }
    });

    console.log('📋 Usuarios encontrados:\n');
    console.table(llamagasUsers);

    // Check for mismatches
    const holdings = new Set(llamagasUsers.map(u => u.holdingId));
    if (holdings.size > 1) {
        console.log('\n⚠️ ALERTA: Hay usuarios con diferentes holdingIds!');
        console.log('Holdings encontrados:', Array.from(holdings));
    } else {
        console.log('\n✅ Todos los usuarios tienen el mismo holdingId');
    }

    // Also check gerencias
    console.log('\n\n🏢 Verificando Gerencias...\n');
    const gerenciasRef = collection(db, 'gerencias');
    const gSnap = await getDocs(gerenciasRef);

    const gerencias: any[] = [];
    gSnap.forEach(doc => {
        const data = doc.data();
        gerencias.push({
            id: doc.id,
            nombre: data.nombre,
            holdingId: data.holdingId || '⚠️ SIN HOLDING'
        });
    });

    console.table(gerencias);

    // Check recruiters
    console.log('\n\n👤 Verificando Recruiters...\n');
    const recruiters = llamagasUsers.filter(u =>
        u.rol === 'recruiter' ||
        (u.capacidades && u.capacidades.includes('recruiter'))
    );

    if (recruiters.length === 0) {
        console.log('⚠️ No hay usuarios con rol/capacidad de recruiter');
    } else {
        console.table(recruiters);
    }
}

checkHoldings().catch(console.error);
