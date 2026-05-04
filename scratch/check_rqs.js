const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyAH8UdYN5pNFpCBdtLHQHaBe85agN0i_yo",
    authDomain: "botwhatsapp-5dac9.firebaseapp.com",
    projectId: "botwhatsapp-5dac9",
    storageBucket: "botwhatsapp-5dac9.firebasestorage.app",
    messagingSenderId: "983196968678",
    appId: "1:983196968678:web:6cf2002246108b1f887d27"
};

async function checkRQs() {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const snapshot = await getDocs(collection(db, 'rqs'));
    for (const doc of snapshot.docs) {
        const data = doc.data();
        if ((data.holdingId === 'ngr' || data.holdingId === 'ngr ') && data.approvalStatus === 'approved') {
             console.log(JSON.stringify(data, null, 2));
             break;
        }
    }
    process.exit(0);
}

checkRQs().catch(console.error);
