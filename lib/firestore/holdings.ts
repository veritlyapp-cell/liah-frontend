import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

export async function getHoldingBySlug(slug: string) {
    const holdingsRef = collection(db, 'holdings');
    const q = query(
        holdingsRef,
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
