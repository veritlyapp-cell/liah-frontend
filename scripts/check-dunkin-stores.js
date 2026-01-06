const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkMultiBrandProfiles() {
    const DUNKIN_ID = 'eZ6WZGL6rYSX63JlyH5X';

    console.log('=== CHECKING FOR MULTI-BRAND PROFILES ===\n');

    const snap = await db.collection('job_profiles').get();

    snap.docs.forEach(doc => {
        const data = doc.data();

        // Check if marcaIds array exists
        if (data.marcaIds && Array.isArray(data.marcaIds)) {
            console.log(`  - ${doc.id}: "${data.posicion}"`);
            console.log(`    marcaId (primary): "${data.marcaId}"`);
            console.log(`    marcaIds (array): ${JSON.stringify(data.marcaIds)}`);

            if (data.marcaIds.includes(DUNKIN_ID)) {
                console.log(`    ✅ INCLUDES DUNKIN!`);
            }
        }
    });

    console.log('\n=== PROFILES WHERE marcaId = DUNKIN OR marcaIds INCLUDES DUNKIN ===');

    snap.docs.forEach(doc => {
        const data = doc.data();
        const hasDunkin =
            data.marcaId === DUNKIN_ID ||
            (data.marcaIds && data.marcaIds.includes(DUNKIN_ID));

        if (hasDunkin) {
            console.log(`  ✅ ${doc.id}: "${data.posicion}"`);
        }
    });
}

checkMultiBrandProfiles().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
