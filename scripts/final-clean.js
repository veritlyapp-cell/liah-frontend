/**
 * CLEANUP SCRIPT v3
 * This script wipes transactional data from LIAH Talent
 */
require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

async function cleanup() {
    console.log('--- LIAH DASHBOARD CLEANUP ---');

    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
            })
        });
    }

    const db = admin.firestore();
    const collections = ['talent_rqs', 'talent_jobs', 'talent_applications', 'rqs'];

    for (const colName of collections) {
        process.stdout.write(`Cleaning ${colName}... `);
        const snapshot = await db.collection(colName).get();
        if (snapshot.empty) {
            console.log('Already empty.');
            continue;
        }

        const batch = db.batch();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        console.log(`Deleted ${snapshot.size} items.`);
    }

    console.log('--- CLEANUP COMPLETE ---');
    process.exit(0);
}

cleanup().catch(err => {
    console.error('\nFAIL:', err.message);
    process.exit(1);
});
