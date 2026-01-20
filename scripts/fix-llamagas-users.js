/**
 * Script para arreglar usuarios de Llamagas
 * Ejecutar con: npx dotenv -e .env.local -- node scripts/fix-llamagas-users.js
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, setDoc, updateDoc, query, where } = require('firebase/firestore');

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

const HOLDING_ID = 'llamagas';

const REQUIRED_USERS = [
    {
        email: 'admin@llamagas.pe',
        nombre: 'Administrador Llamagas',
        rol: 'admin',
        capacidades: ['admin', 'lider_reclutamiento', 'recruiter', 'hiring_manager'],
        activo: true,
        holdingId: HOLDING_ID
    },
    {
        email: 'recruiter@llamagas.pe',
        nombre: 'Reclutador Llamagas',
        rol: 'recruiter',
        capacidades: ['recruiter'],
        activo: true,
        holdingId: HOLDING_ID
    }
];

async function fixUsers() {
    console.log('🔧 Iniciando corrección de usuarios Llamagas...\n');

    const usersRef = collection(db, 'talent_users');
    const snapshot = await getDocs(usersRef);

    let updated = 0;
    for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        if (data.email && data.email.includes('llamagas.pe')) {
            if (data.holdingId !== HOLDING_ID) {
                console.log(`  ⚡ Actualizando holdingId de ${data.email}`);
                await updateDoc(doc(db, 'talent_users', docSnap.id), { holdingId: HOLDING_ID });
                updated++;
            } else {
                console.log(`  ✅ ${data.email} OK`);
            }
        }
    }
    console.log(`\n📊 ${updated} usuarios actualizados\n`);

    console.log('🆕 Verificando usuarios requeridos...');
    for (const user of REQUIRED_USERS) {
        const q = query(usersRef, where('email', '==', user.email));
        const existing = await getDocs(q);

        if (existing.empty) {
            console.log(`  ➕ Creando ${user.email}...`);
            await setDoc(doc(db, 'talent_users', user.email.replace('@', '_at_')), {
                ...user,
                createdAt: new Date(),
                updatedAt: new Date()
            });
        } else {
            const docRef = existing.docs[0].ref;
            console.log(`  🔄 Actualizando ${user.email}...`);
            await updateDoc(docRef, {
                holdingId: HOLDING_ID,
                activo: true,
                rol: user.rol,
                capacidades: user.capacidades
            });
        }
    }

    console.log('\n🏢 Verificando gerencias...');
    const gSnap = await getDocs(collection(db, 'gerencias'));
    for (const gDoc of gSnap.docs) {
        const data = gDoc.data();
        if (data.holdingId !== HOLDING_ID) {
            await updateDoc(doc(db, 'gerencias', gDoc.id), { holdingId: HOLDING_ID });
            console.log(`  ⚡ Gerencia "${data.nombre}" actualizada`);
        }
    }

    console.log('\n📂 Verificando áreas...');
    const aSnap = await getDocs(collection(db, 'areas'));
    for (const aDoc of aSnap.docs) {
        const data = aDoc.data();
        if (data.holdingId !== HOLDING_ID) {
            await updateDoc(doc(db, 'areas', aDoc.id), { holdingId: HOLDING_ID });
            console.log(`  ⚡ Área "${data.nombre}" actualizada`);
        }
    }

    console.log('\n💼 Verificando puestos...');
    const pSnap = await getDocs(collection(db, 'puestos'));
    for (const pDoc of pSnap.docs) {
        const data = pDoc.data();
        if (data.holdingId !== HOLDING_ID) {
            await updateDoc(doc(db, 'puestos', pDoc.id), { holdingId: HOLDING_ID });
            console.log(`  ⚡ Puesto "${data.nombre}" actualizado`);
        }
    }

    console.log('\n✅ ¡Corrección completada!');
    process.exit(0);
}

fixUsers().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
});
