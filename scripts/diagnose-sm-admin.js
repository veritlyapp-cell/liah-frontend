const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

async function diagnoseStoreManager() {
    console.log('🚀 Starting Store Manager Diagnosis (Admin SDK)...\n');

    try {
        const serviceAccountPath = path.resolve(__dirname, '../firebase-service-account.json');
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log('✅ Firebase Admin initialized.\n');
    } catch (error) {
        console.error('❌ Error initializing Firebase Admin:', error.message);
        return;
    }

    const db = admin.firestore();

    // 1. Get all Store Manager assignments
    console.log('--- 🛡️ User Assignments (Store Managers) ---');
    const assignmentsRef = db.collection('userAssignments');
    const snapshot = await assignmentsRef.where('role', '==', 'store_manager').get();

    console.log(`Found ${snapshot.size} Store Manager assignments.\n`);

    for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        console.log(`👤 User: ${data.displayName} (${data.email})`);
        console.log(`   ID: ${data.userId}`);
        const isActive = data.active === true || data.isActive === true;
        console.log(`   Active: ${isActive}`);
        console.log(`   Holding ID: ${data.holdingId}`);

        const store = data.assignedStore || (data.assignedStores && data.assignedStores[0]);
        if (store) {
            console.log(`   📍 Assigned Store: ${store.tiendaNombre} (${store.tiendaId})`);
            console.log(`   🏷️ Brand ID: ${store.marcaId}`);

            // Validate Brand exists
            if (store.marcaId) {
                const marcaDoc = await db.collection('marcas').doc(store.marcaId).get();
                if (marcaDoc.exists) {
                    console.log(`   ✅ Brand Document found: ${marcaDoc.data().nombre}`);
                } else {
                    console.log(`   ❌ Brand Document MISSING for ID: ${store.marcaId}`);
                }
            } else {
                console.log(`   ⚠️ No Brand ID in assignment!`);
            }
        } else {
            console.log(`   ⚠️ No Store assigned!`);
        }

        // Validate Holding exists
        if (data.holdingId) {
            const holdingDoc = await db.collection('holdings').doc(data.holdingId).get();
            if (holdingDoc.exists) {
                console.log(`   ✅ Holding Document found: ${holdingDoc.data().nombre}`);
                console.log(`   🔒 Block RQ Creation: ${holdingDoc.data().blockRQCreation || false}`);
            } else {
                console.log(`   ❌ Holding Document MISSING for ID: ${data.holdingId}`);
            }
        }

        console.log('---');
    }

    console.log('\n--- 📋 RQs Snapshot ---');
    const rqsSnapshot = await db.collection('rqs').limit(5).get();
    console.log(`Recent RQs Sample (${rqsSnapshot.size}):`);
    rqsSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`- RQ: ${data.rqNumber || doc.id}, Posicion: ${data.posicion}, Status: ${data.status}`);
    });

    console.log('\n✅ Diagnosis Complete.');
}

diagnoseStoreManager().catch(err => {
    console.error('❌ Diagnostic failed:', err);
    process.exit(1);
});
