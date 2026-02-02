import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit as firestoreLimit } from 'firebase/firestore';
import type { Candidate } from './candidates';

/**
 * Obtener candidatos por tienda (basado en sus applications)
 */
export async function getCandidatesByStore(storeId: string, maxResults: number = 150): Promise<Candidate[]> {
    console.log('[getCandidatesByStore] Fetching from Firestore...');
    const candidatesRef = collection(db, 'candidates');
    const q = query(candidatesRef, firestoreLimit(maxResults));
    const snapshot = await getDocs(q);

    // Filtrar candidatos que tienen applications para esta tienda
    const candidates = snapshot.docs
        .map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Candidate))
        .filter(candidate =>
            candidate.applications?.some(app => app.tiendaId === storeId)
        );

    console.log('[getCandidatesByStore] Found:', candidates.length);
    return candidates;
}

// Clear store cache function (legacy)
export function clearStoreCache() {
    // No-op after cache removal
}

/**
 * Obtener candidatos por marca (with limit)
 */
export async function getCandidatesByMarca(marcaId: string, maxResults: number = 150): Promise<Candidate[]> {
    const candidatesRef = collection(db, 'candidates');
    const q = query(candidatesRef, firestoreLimit(maxResults));
    const snapshot = await getDocs(q);

    // Filtrar candidatos que tienen applications para esta marca
    const candidates = snapshot.docs
        .map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Candidate))
        .filter(candidate =>
            candidate.applications?.some(app => app.marcaId === marcaId)
        );

    console.log('[getCandidatesByMarca] marcaId:', marcaId, 'found:', candidates.length);
    return candidates;
}

/**
 * Obtener candidatos por lista de tiendas (para supervisores)
 */
export async function getCandidatesByMultipleStores(storeIds: string[], maxResults: number = 150): Promise<Candidate[]> {
    if (!storeIds || storeIds.length === 0) return [];

    const candidatesRef = collection(db, 'candidates');
    const q = query(candidatesRef, firestoreLimit(maxResults));
    const snapshot = await getDocs(q);

    // Filtrar candidatos que tienen applications para alguna de estas tiendas
    const candidates = snapshot.docs
        .map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Candidate))
        .filter(candidate =>
            candidate.applications?.some(app => storeIds.includes(app.tiendaId))
        );

    console.log('[getCandidatesByMultipleStores] storeIds:', storeIds.length, 'found:', candidates.length);
    return candidates;
}
