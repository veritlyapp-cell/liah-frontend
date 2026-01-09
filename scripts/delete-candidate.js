const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

const auth = admin.auth();

async function deleteCandidate() {
    console.log('🔍 Searching for oscarqv88@gmail.com...');

    // 1. Delete from Firestore
    const snapshot = await db.collection('candidates').where('email', '==', 'oscarqv88@gmail.com').get();

    if (snapshot.empty) {
        console.log('ℹ️ No candidate found in Firestore with email oscarqv88@gmail.com');
    } else {
        for (const doc of snapshot.docs) {
            console.log('🗑️ Deleting candidate from Firestore:', doc.id, doc.data().nombre);
            await db.collection('candidates').doc(doc.id).delete();
            console.log('✅ Deleted successfully from Firestore!');
        }
    }

    // 2. Delete from Auth
    try {
        const user = await auth.getUserByEmail('oscarqv88@gmail.com');
        console.log('🗑️ Deleting user from Auth:', user.uid);
        await auth.deleteUser(user.uid);
        console.log('✅ Deleted successfully from Auth!');
    } catch (error) {
        if (error.code === 'auth/user-not-found') {
            console.log('ℹ️ User not found in Auth');
        } else {
            console.error('❌ Error deleting from Auth:', error);
        }
    }
}

deleteCandidate().then(() => {
    console.log('✨ Cleanup complete.');
    process.exit(0);
}).catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
});
