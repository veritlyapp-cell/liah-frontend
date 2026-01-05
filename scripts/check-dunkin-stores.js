const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkClaimed() {
    const assignmentsSnap = await db.collection('userAssignments').get();

    const claimedBySupervisor = new Set();
    const claimedByManager = new Set();

    console.log('=== ALL ASSIGNMENTS ===');
    assignmentsSnap.docs.forEach(doc => {
        const data = doc.data();
        const isActive = data.active !== false && data.isActive !== false;

        console.log(`\n${doc.id}:`);
        console.log(`  role: ${data.role}, active: ${isActive}`);

        if (isActive) {
            if (data.role === 'supervisor' && data.assignedStores) {
                data.assignedStores.forEach(s => {
                    console.log(`  -> Claiming store (supervisor): ${s.tiendaId}`);
                    claimedBySupervisor.add(s.tiendaId);
                });
            }
            if (data.role === 'store_manager') {
                const storeId = data.tiendaId || data.assignedStore?.tiendaId;
                if (storeId) {
                    console.log(`  -> Claiming store (manager): ${storeId}`);
                    claimedByManager.add(storeId);
                }
            }
        }
    });

    console.log('\n=== CLAIMED STORES ===');
    console.log('By Supervisor:', Array.from(claimedBySupervisor));
    console.log('By Manager:', Array.from(claimedByManager));

    // Check tiendas
    console.log('\n=== TIENDAS STATUS ===');
    const tiendasSnap = await db.collection('tiendas').get();
    tiendasSnap.docs.forEach(doc => {
        const d = doc.data();
        const bySup = claimedBySupervisor.has(doc.id) ? '🔴 CLAIMED_SUP' : '✅ FREE_SUP';
        const byMgr = claimedByManager.has(doc.id) ? '🔴 CLAIMED_MGR' : '✅ FREE_MGR';
        console.log(`${doc.id}: "${d.nombre}" | ${bySup} | ${byMgr}`);
    });
}

checkClaimed().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
