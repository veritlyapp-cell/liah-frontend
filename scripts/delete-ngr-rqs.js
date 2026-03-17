
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('../firebase-service-account.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function deleteRQs() {
  const snap = await db.collection('rqs').where('holdingId', '==', 'ngr').get();
  console.log(`Deleting ${snap.size} RQs for NGR...`);
  
  const batch = db.batch();
  snap.forEach(doc => {
    batch.delete(doc.ref);
  });
  
  await batch.commit();
  console.log('RQs deleted successfully.');
}

deleteRQs();
