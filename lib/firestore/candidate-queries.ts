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

    console.log('[getCandidatesByMarca] marcaId:', marcaId, 'found:', candidates.length);
    if (candidates.length === 0 && snapshot.docs.length > 0) {
        console.log('[getCandidatesByMarca] All candidates apps:', snapshot.docs.map(d => d.data().applications?.map((a: any) => a.marcaId)));
    }

    return candidates;
}

/**
 * Obtener candidatos por lista de tiendas (para supervisores)
 */
export async function getCandidatesByMultipleStores(storeIds: string[]): Promise<Candidate[]> {
    if (!storeIds || storeIds.length === 0) return [];

    const candidatesRef = collection(db, 'candidates');
    const snapshot = await getDocs(candidatesRef);

    // Filtrar candidatos que tienen applications para alguna de estas tiendas
    const candidates = snapshot.docs
        .map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Candidate))
        .filter(candidate =>
            candidate.applications?.some(app => storeIds.includes(app.tiendaId))
        );

    console.log('[getCandidatesByMultipleStores] storeIds:', storeIds, 'found:', candidates.length);
    if (candidates.length === 0 && snapshot.docs.length > 0) {
        console.log('[getCandidatesByMultipleStores] All candidates apps tiendaIds:', snapshot.docs.map(d => d.data().applications?.map((a: any) => a.tiendaId)));
    }

    return candidates;
}
