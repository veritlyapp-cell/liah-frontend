import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

export async function getStoreBySlug(marcaId: string, slug: string) {
    const tiendasRef = collection(db, 'tiendas');
    const q = query(
        tiendasRef,
        where('marcaId', '==', marcaId),
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

export async function getStoresByMarca(marcaId: string) {
    const tiendasRef = collection(db, 'tiendas');
    const q = query(
        tiendasRef,
        where('marcaId', '==', marcaId),
        where('activa', '==', true)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
}

export async function getStoreById(storeId: string) {
    const tiendasRef = collection(db, 'tiendas');
    const snapshot = await getDocs(query(tiendasRef, where('__name__', '==', storeId)));
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
}
