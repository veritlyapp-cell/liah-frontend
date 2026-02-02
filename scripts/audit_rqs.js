
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, query, where } = require("firebase/firestore");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");

// Load env
const envPath = path.resolve(__dirname, '../.env.local');
console.log("Loading env from:", envPath);
dotenv.config({ path: envPath });

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

console.log("Firebase Config (truncated):", {
    projectId: firebaseConfig.projectId,
    apiKey: firebaseConfig.apiKey ? "PRESENT" : "MISSING"
});

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function audit() {
    try {
        console.log("\n--- AUDIT: RQS ---");
        const rqsSnap = await getDocs(collection(db, 'rqs'));
        console.log("Total RQs in DB:", rqsSnap.size);

        rqsSnap.forEach(doc => {
            const data = doc.data();
            console.log(`[${doc.id}] Status: ${data.status}, Tienda: ${data.tiendaNombre}, Position: ${data.posicion}, Holding: ${data.holdingId}`);
            if (data.tiendaNombre?.toLowerCase().includes('jockey')) {
                console.log("   >>> [JOCKEY FOUND] Coords:", data.coords || data.coordenadas || 'MISSING');
                console.log("   >>> Data:", JSON.stringify(data));
            }
        });

        console.log("\n--- AUDIT: MARCAS ---");
        const marcasSnap = await getDocs(collection(db, 'marcas'));
        marcasSnap.forEach(doc => {
            console.log(`- Marca ID: ${doc.id}, Name: ${doc.data().nombre}, Holding: ${doc.data().holdingId}`);
        });

    } catch (e) {
        console.error("Audit failed:", e);
    }
    process.exit(0);
}

audit();
