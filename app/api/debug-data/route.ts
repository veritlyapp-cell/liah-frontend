import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';

export async function GET(request: NextRequest) {
    try {
        const holdingsSnap = await getDocs(collection(db, 'holdings'));
        const holdings = holdingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const marcasSnap = await getDocs(collection(db, 'marcas'));
        const marcas = marcasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const rqsSnap = await getDocs(query(collection(db, 'rqs'), where('status', '==', 'recruiting'), limit(10)));
        const rqs = rqsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        return NextResponse.json({
            holdings,
            marcasCount: marcas.length,
            marcasSample: marcas.filter((m: any) => m.holdingId?.includes('ngr') || m.nombre?.toLowerCase().includes('bembos') || m.nombre?.toLowerCase().includes('popeyes')),
            rqsSample: rqs.map((r: any) => ({ id: r.id, brandId: r.marcaId, holdingId: r.holdingId, status: r.status, position: r.posicion }))
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
