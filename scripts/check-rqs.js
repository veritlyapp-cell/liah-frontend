
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('../firebase-service-account.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function checkRQs() {
  const snap = await db.collection('rqs').where('holdingId', '==', 'ngr').get();
  console.log(`Found ${snap.size} RQs for NGR`);
  snap.forEach(doc => {
    const data = doc.data();
    console.log(`RQ ${doc.id}: status=${data.status}, approvalStatus=${data.approvalStatus}, tienda=${data.tiendaNombre}`);
  });
}

checkRQs();
