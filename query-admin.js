const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // assuming it exists from previous chats

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function check() {
    const docSnap = await db.collection('holdings').doc('ngr').get();
    console.log("direct doc:", docSnap.exists);

    const holds = await db.collection('holdings').where('slug', '==', 'ngr').limit(1).get();
    console.log("query slug:", holds.empty ? "empty" : holds.docs[0].id);

    if (!holds.empty) {
        console.log("Holding details:", JSON.stringify(holds.docs[0].data(), null, 2));
    }
}
check().catch(console.error);
