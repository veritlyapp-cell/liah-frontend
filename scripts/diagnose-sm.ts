import { db } from '../lib/firebase';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';

async function diagnoseStoreManager() {
    console.log('🚀 Starting Store Manager Diagnosis...\n');

    // 1. Get all Store Manager assignments
    console.log('--- 🛡️ User Assignments (Store Managers) ---');
    const assignmentsRef = collection(db, 'userAssignments');
    const q = query(assignmentsRef, where('role', '==', 'store_manager'));
    const snapshot = await getDocs(q);

    console.log(`Found ${snapshot.size} Store Manager assignments.\n`);

    for (const d of snapshot.docs) {
        const data = d.data();
        console.log(`👤 User: ${data.displayName} (${data.email})`);
        console.log(`   ID: ${data.userId}`);
        console.log(`   Active: ${data.active || data.isActive}`);
        console.log(`   Holding ID: ${data.holdingId}`);

        const store = data.assignedStore || (data.assignedStores && data.assignedStores[0]);
        if (store) {
            console.log(`   📍 Assigned Store: ${store.tiendaNombre} (${store.tiendaId})`);
            console.log(`   🏷️ Brand ID: ${store.marcaId}`);

            // Validate Brand exists
            if (store.marcaId) {
                const marcaDoc = await getDoc(doc(db, 'marcas', store.marcaId));
                if (marcaDoc.exists()) {
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
            const holdingDoc = await getDoc(doc(db, 'holdings', data.holdingId));
            if (holdingDoc.exists()) {
                console.log(`   ✅ Holding Document found: ${holdingDoc.data().nombre}`);
            } else {
                console.log(`   ❌ Holding Document MISSING for ID: ${data.holdingId}`);
            }
        }

        console.log('---');
    }

    // 2. Check for RQs that might be blocking for a specific brand/store if provided
    // (This can be expanded if we have a specific user to debug)
}

diagnoseStoreManager().catch(err => {
    console.error('❌ Diagnostic failed:', err);
});
