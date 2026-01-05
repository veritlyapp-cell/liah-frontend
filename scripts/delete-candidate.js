const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function deleteCandidate() {
    const snapshot = await db.collection('candidates').where('email', '==', 'oscarqv88@gmail.com').get();

    if (snapshot.empty) {
        console.log('No candidate found with email oscarqv88@gmail.com');
        return;
    }

    for (const doc of snapshot.docs) {
        console.log('Deleting candidate:', doc.id, doc.data().nombre);
        await db.collection('candidates').doc(doc.id).delete();
        console.log('Deleted successfully!');
    }
}

deleteCandidate().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
