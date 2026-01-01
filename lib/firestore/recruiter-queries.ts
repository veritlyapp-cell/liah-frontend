import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import type { Candidate } from './candidates';

/**
 * Obtener todos los candidatos de una marca (todas las tiendas)
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

interface FilterOptions {
    marcaId: string;
    tiendaId?: string;
    posicion?: string;
    culStatus?: string;
    dateRange?: {
        from: Date;
        to: Date;
    };
}

/**
 * Obtener candidatos con filtros múltiples
 */
export async function getFilteredCandidates(filters: FilterOptions): Promise<Candidate[]> {
    // Obtener todos los candidatos de la marca primero
    let candidates = await getCandidatesByMarca(filters.marcaId);

    // Aplicar filtros adicionales
    if (filters.tiendaId) {
        candidates = candidates.filter(c =>
            c.applications?.some(app => app.tiendaId === filters.tiendaId)
        );
    }

    if (filters.posicion) {
        candidates = candidates.filter(c =>
            c.applications?.some(app => app.posicion === filters.posicion)
        );
    }

    if (filters.culStatus) {
        candidates = candidates.filter(c => c.culStatus === filters.culStatus);
    }

    if (filters.dateRange) {
        candidates = candidates.filter(c => {
            const createdAt = c.createdAt?.toDate ? c.createdAt.toDate() : new Date(c.createdAt);
            return createdAt >= filters.dateRange!.from && createdAt <= filters.dateRange!.to;
        });
    }

    return candidates;
}

/**
 * Obtener posiciones únicas de una marca
 */
export async function getPositionsByMarca(marcaId: string): Promise<string[]> {
    const candidates = await getCandidatesByMarca(marcaId);

    const positionsSet = new Set<string>();
    candidates.forEach(candidate => {
        candidate.applications?.forEach(app => {
            if (app.posicion) {
                positionsSet.add(app.posicion);
            }
        });
    });

    return Array.from(positionsSet).sort();
}

/**
 * Obtener tiendas únicas de una marca
 */
export async function getStoresByMarca(marcaId: string): Promise<Array<{ id: string, nombre: string }>> {
    const candidates = await getCandidatesByMarca(marcaId);

    const storesMap = new Map<string, string>();
    candidates.forEach(candidate => {
        candidate.applications?.forEach(app => {
            if (app.tiendaId && app.tiendaNombre) {
                storesMap.set(app.tiendaId, app.tiendaNombre);
            }
        });
    });

    return Array.from(storesMap.entries())
        .map(([id, nombre]) => ({ id, nombre }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre));
}
