import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { Candidate } from './candidates';

/**
 * Obtener candidatos por tienda (basado en sus applications)
 */
export async function getCandidatesByStore(storeId: string): Promise<Candidate[]> {
    const candidatesRef = collection(db, 'candidates');
    const snapshot = await getDocs(candidatesRef);

    // Filtrar candidatos que tienen applications para esta tienda
    const candidates = snapshot.docs
        .map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Candidate))
        .filter(candidate =>
            candidate.applications?.some(app => app.tiendaId === storeId)
        );

    return candidates;
}

/**
 * Obtener candidatos por marca
 */
export async function getCandidatesByMarca(marcaId: string): Promise<Candidate[]> {
    const candidatesRef = collection(db, 'candidates');
    const snapshot = await getDocs(candidatesRef);

    // Filtrar candidatos que tienen applications para esta marca
    const candidates = snapshot.docs
        .map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Candidate))
        .filter(candidate =>
            candidate.applications?.some(app => app.marcaId === marcaId)
        );

    return candidates;
}
