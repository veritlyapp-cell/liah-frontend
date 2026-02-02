import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

export async function getBrandBySlug(holdingId: string, slug: string) {
    const marcasRef = collection(db, 'marcas');
    const q = query(
        marcasRef,
        where('holdingId', '==', holdingId),
        where('slug', '==', slug),
        limit(1)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    return {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data()
    };
}

export async function getBrandsByHolding(holdingId: string) {
    const marcasRef = collection(db, 'marcas');
    const q = query(
        marcasRef,
        where('holdingId', '==', holdingId),
        where('activa', '==', true)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
}
