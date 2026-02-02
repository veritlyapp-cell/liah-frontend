import { db } from '../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

async function inspectData() {
    console.log('--- INSPECTING HOLDINGS ---');
    const holdingsSnap = await getDocs(collection(db, 'holdings'));
    holdingsSnap.forEach(doc => {
        console.log(`ID: ${doc.id}, Data:`, doc.data());
    });

    console.log('\n--- INSPECTING MARCAS FOR NGR ---');
    // We'll try to find brands that might belong to NGR
    const marcasSnap = await getDocs(collection(db, 'marcas'));
    marcasSnap.forEach(doc => {
        const data = doc.data();
        if (data.holdingId === 'ngr' || data.holdingId === 'ngr_holding' || (data.nombre && data.nombre.toLowerCase().includes('bembos'))) {
            console.log(`ID: ${doc.id}, Data:`, data);
        }
    });

    console.log('\n--- INSPECTING RECENT RQS ---');
    const rqsSnap = await getDocs(query(collection(db, 'rqs'), where('status', '==', 'recruiting')));
    console.log(`Total recruiting RQs: ${rqsSnap.size}`);
    rqsSnap.forEach(doc => {
        const data = doc.data();
        console.log(`RQ ID: ${doc.id}, Posicion: ${data.posicion}, MarcaId: ${data.marcaId}, Status: ${data.status}`);
    });
}

inspectData().catch(console.error);
