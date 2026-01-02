/**
 * Script to set admin custom claims for NGR Holding
 * This gives the user access to the Admin Holding dashboard
 * 
 * Usage:
 * 1. Install Firebase Admin SDK: npm install firebase-admin
 * 2. Download service account key from Firebase Console
 * 3. Run: npx ts-node scripts/set-admin-claims.ts
 */

import * as admin from 'firebase-admin';

// Initialize Firebase Admin
// IMPORTANT: Download your service account key from:
// Firebase Console → Project Settings → Service Accounts → Generate New Private Key
const serviceAccount = require('../firebase-service-account.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

async function setAdminClaims() {
    try {
        // Get user by email
        const email = 'admin@ngr.pe';
        console.log(`🔍 Looking for user: ${email}`);

        const user = await admin.auth().getUserByEmail(email);
        console.log(`✅ Found user: ${user.uid}`);

        // Set custom claims
        await admin.auth().setCustomUserClaims(user.uid, {
            role: 'client_admin'
        });

        console.log(`✅ Custom claims set successfully!`);
        console.log(`\n📋 User details:`);
        console.log(`   Email: ${user.email}`);
        console.log(`   UID: ${user.uid}`);
        console.log(`   Role: client_admin`);
        console.log(`\n🚀 User can now access: http://localhost:3000/admin`);

        // Verify claims
        const updatedUser = await admin.auth().getUser(user.uid);
        console.log(`\n✔️ Verification:`);
        console.log(`   Custom Claims:`, updatedUser.customClaims);

    } catch (error) {
        console.error('❌ Error:', error);

        if ((error as any).code === 'auth/user-not-found') {
            console.log('\n💡 User not found. Please create the user first:');
            console.log('   1. Go to Firebase Console → Authentication');
            console.log('   2. Add user: admin@ngr.pe');
            console.log('   3. Run this script again');
        }
    } finally {
        process.exit();
    }
}

// Run the script
setAdminClaims();
