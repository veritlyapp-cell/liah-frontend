import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, limit as firestoreLimit, Timestamp } from 'firebase/firestore';
import type { Candidate } from './candidates';

// Cache for loaded candidates to avoid redundant queries
let candidateCache: { marcaId: string; candidates: Candidate[]; timestamp: number } | null = null;
const CACHE_TTL = 60000; // 1 minute cache

/**
 * Obtener candidatos de una marca con límite y cache
 */
export async function getCandidatesByMarca(marcaId: string, maxResults: number = 200): Promise<Candidate[]> {
    // Check cache
    if (candidateCache &&
        candidateCache.marcaId === marcaId &&
        (Date.now() - candidateCache.timestamp) < CACHE_TTL) {
        console.log('[getCandidatesByMarca] Using cache');
        return candidateCache.candidates;
    }

    console.log('[getCandidatesByMarca] Fetching from Firestore...');
    const candidatesRef = collection(db, 'candidates');

    // Add limit to prevent loading too many documents
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

    // Cache results
    candidateCache = {
        marcaId,
        candidates,
        timestamp: Date.now()
    };

    console.log('[getCandidatesByMarca] Loaded:', candidates.length, 'candidates');
    return candidates;
}

// Clear cache function (call when data changes)
export function clearCandidateCache() {
    candidateCache = null;
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
    // Obtener candidatos de la marca (uses cache)
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
 * Obtener posiciones únicas de una marca (uses cached candidates)
 */
export async function getPositionsByMarca(marcaId: string): Promise<string[]> {
    const candidates = await getCandidatesByMarca(marcaId);

    const positionsSet = new Set<string>();
    candidates.forEach(candidate => {
        candidate.applications?.forEach(app => {
            if (app.posicion && app.marcaId === marcaId) {
                positionsSet.add(app.posicion);
            }
        });
    });

    return Array.from(positionsSet).sort();
}

/**
 * Obtener tiendas únicas de una marca (uses cached candidates)
 */
export async function getStoresByMarca(marcaId: string): Promise<Array<{ id: string, nombre: string }>> {
    const candidates = await getCandidatesByMarca(marcaId);

    const storesMap = new Map<string, string>();
    candidates.forEach(candidate => {
        candidate.applications?.forEach(app => {
            if (app.tiendaId && app.tiendaNombre && app.marcaId === marcaId) {
                storesMap.set(app.tiendaId, app.tiendaNombre);
            }
        });
    });

    return Array.from(storesMap, ([id, nombre]) => ({ id, nombre })).sort((a, b) =>
        a.nombre.localeCompare(b.nombre)
    );
}
