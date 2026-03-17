
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('../firebase-service-account.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function checkNGR() {
  const doc = await db.collection('holdings').doc('ngr').get();
  if (doc.exists) {
    console.log(JSON.stringify(doc.data(), null, 2));
  } else {
    // Try by slug
    const snap = await db.collection('holdings').where('slug', '==', 'ngr').get();
    if (!snap.empty) {
      console.log(JSON.stringify(snap.docs[0].data(), null, 2));
    } else {
      console.log('NGR not found');
    }
  }
}

checkNGR();
