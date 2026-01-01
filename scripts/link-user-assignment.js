const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

async function initializeFirebaseAdmin() {
    if (admin.apps.length > 0) return admin.apps[0];

    try {
        // Try service account file first
        const serviceAccountPath = path.join(__dirname, '../../firebase-service-account.json');
        if (fs.existsSync(serviceAccountPath)) {
            console.log('Using service account file:', serviceAccountPath);
            const serviceAccount = require(serviceAccountPath);
            return admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        }
        throw new Error('No service account found');
    } catch (error) {
        console.error('Init failed:', error);
        process.exit(1);
    }
}

async function linkUser(email) {
    try {
        const app = await initializeFirebaseAdmin();
        const auth = app.auth();
        const db = app.firestore();

        console.log(`🔍 Linking user: ${email}`);

        // 1. Get Auth User
        console.log('Fetching Auth user...');
        let userRecord;
        try {
            userRecord = await auth.getUserByEmail(email);
            console.log(`✅ Found Auth User: ${userRecord.uid}`);
        } catch (e) {
            console.error('❌ Auth user not found. Run create-auth-user.js first.');
            process.exit(1);
        }

        // 2. Find Firestore Assignment by Email
        console.log('Searching Firestore assignment...');
        const assignmentsRef = db.collection('userAssignments');
        const snapshot = await assignmentsRef.where('email', '==', email).get();

        if (snapshot.empty) {
            console.error('❌ No userAssignment found for email:', email);
            console.log('Did you create the user in the Admin Dashboard first?');
            process.exit(1);
        }

        // 3. Update Assignment with Real UID
        const doc = snapshot.docs[0];
        console.log(`✅ Found Assignment: ${doc.id} (Current userId: ${doc.data().userId})`);

        await doc.ref.update({
            userId: userRecord.uid,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log('🎉 LINK SUCCESSFUL!');
        console.log('The user can now log in and will be redirected correctly.');
        process.exit(0);

    } catch (error) {
        console.error('Error linking user:', error);
        process.exit(1);
    }
}

const email = process.argv[2];
if (!email) {
    console.log('Usage: node scripts/link-user-assignment.js <email>');
    process.exit(1);
}

linkUser(email);
