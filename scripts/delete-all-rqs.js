
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('../firebase-service-account.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function deleteAllRQs() {
  const snap = await db.collection('rqs').get();
  console.log(`Deleting ALL ${snap.size} RQs in the collection...`);
  
  const chunks = [];
  const snapshotDocs = snap.docs;
  while (snapshotDocs.length > 0) {
    chunks.push(snapshotDocs.splice(0, 500));
  }

  for (const chunk of chunks) {
    const batch = db.batch();
    chunk.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  }
  
  console.log('All RQs deleted successfully.');
}

deleteAllRQs();
