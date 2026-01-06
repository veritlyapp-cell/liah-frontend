const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkJobProfiles() {
    // Get Dunkin job profiles
    const dunkinMarcaId = 'eZ6WZGL6rYSX63JlyH5X';

    console.log('=== JOB PROFILES FOR DUNKIN ===');

    const profilesSnap = await db.collection('perfiles_puesto')
        .where('marcaId', '==', dunkinMarcaId)
        .get();

    console.log(`Found ${profilesSnap.size} profiles for Dunkin`);

    profilesSnap.docs.forEach(doc => {
        const data = doc.data();
        console.log(`  - ${doc.id}: ${data.posicion} | ${data.modalidad} | ${data.turno}`);
    });

    // Also check Bembos for comparison
    console.log('\n=== JOB PROFILES FOR BEMBOS ===');
    const bembosMarcaId = '7MeW5A85sr9m2yxhedAI';

    const bembosProfilesSnap = await db.collection('perfiles_puesto')
        .where('marcaId', '==', bembosMarcaId)
        .get();

    console.log(`Found ${bembosProfilesSnap.size} profiles for Bembos`);

    bembosProfilesSnap.docs.forEach(doc => {
        const data = doc.data();
        console.log(`  - ${doc.id}: ${data.posicion} | ${data.modalidad} | ${data.turno}`);
    });
}

checkJobProfiles().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
