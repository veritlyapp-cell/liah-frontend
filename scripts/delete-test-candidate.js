const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function deleteCandidate() {
    const email = 'oscarqv88@gmail.com';
    const dni = '45329311';

    console.log(`Deleting all records for ${email} / DNI ${dni}...`);

    // 1. Delete from candidates collection
    const candidatesSnap = await db.collection('candidates')
        .where('email', '==', email)
        .get();

    console.log(`Found ${candidatesSnap.size} candidates with email ${email}`);

    for (const doc of candidatesSnap.docs) {
        console.log(`  Deleting candidate: ${doc.id}`);
        await doc.ref.delete();
    }

    // Also check by DNI
    const candidatesByDNI = await db.collection('candidates')
        .where('dni', '==', dni)
        .get();

    console.log(`Found ${candidatesByDNI.size} candidates with DNI ${dni}`);

    for (const doc of candidatesByDNI.docs) {
        console.log(`  Deleting candidate: ${doc.id}`);
        await doc.ref.delete();
    }

    // 2. Delete from users collection
    const usersSnap = await db.collection('users')
        .where('email', '==', email)
        .get();

    console.log(`Found ${usersSnap.size} users with email ${email}`);

    for (const doc of usersSnap.docs) {
        console.log(`  Deleting user: ${doc.id}`);
        await doc.ref.delete();
    }

    // 3. Delete invitations
    const invitationsSnap = await db.collection('invitations')
        .where('candidateEmail', '==', email)
        .get();

    console.log(`Found ${invitationsSnap.size} invitations for ${email}`);

    for (const doc of invitationsSnap.docs) {
        console.log(`  Deleting invitation: ${doc.id}`);
        await doc.ref.delete();
    }

    console.log('\n✅ All records deleted for', email);
}

deleteCandidate().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
