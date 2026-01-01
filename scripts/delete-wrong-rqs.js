/**
 * Script to delete RQs with wrong brand (Papa Johns)
 * Run with: node scripts/delete-wrong-rqs.js
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Find service account file
const possiblePaths = [
    path.join(__dirname, '..', 'ngr-recruitment-dev-a8e89d90b0ed.json'),
    path.join(__dirname, '..', 'serviceAccountKey.json'),
    path.join(__dirname, '..', '..', 'ngr-recruitment-dev-a8e89d90b0ed.json')
];

let serviceAccountPath = null;
for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
        serviceAccountPath = p;
        break;
    }
}

if (!serviceAccountPath) {
    console.error('❌ Service account file not found');
    process.exit(1);
}

console.log('✅ Using service account:', serviceAccountPath);

const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function deleteWrongRQs() {
    console.log('🔍 Looking for RQs with marcaNombre = "Papa Johns"...\n');

    const snapshot = await db.collection('rqs').get();
    let deletedCount = 0;

    for (const doc of snapshot.docs) {
        const data = doc.data();
        if (data.marcaNombre === 'Papa Johns') {
            console.log(`🗑️ Deleting: ${doc.id} (${data.rqNumber || 'No number'})`);
            await doc.ref.delete();
            deletedCount++;
        }
    }

    console.log(`\n✅ Deleted ${deletedCount} RQs with wrong brand`);
}

deleteWrongRQs()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });
