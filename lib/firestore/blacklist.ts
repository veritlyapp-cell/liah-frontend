import { db } from '@/lib/firebase';
import { collection, doc, setDoc, getDoc, query, where, getDocs, Timestamp, deleteDoc } from 'firebase/firestore';

export interface BlacklistEntry {
    id: string;
    dni: string;
    nombre: string;
    motivo: string;
    addedAt: any;
    addedBy: string;
    holdingId?: string;
}

/**
 * Check if a DNI is blacklisted
 */
export async function isBlacklisted(dni: string): Promise<BlacklistEntry | null> {
    if (!dni) return null;

    const docRef = doc(db, 'blacklist', dni);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as BlacklistEntry;
    }
    return null;
}

/**
 * Add a candidate to the blacklist
 */
export async function addToBlacklist(
    dni: string,
    nombre: string,
    motivo: string,
    addedBy: string,
    holdingId?: string
): Promise<void> {
    const docRef = doc(db, 'blacklist', dni);

    await setDoc(docRef, {
        dni,
        nombre,
        motivo,
        addedAt: Timestamp.now(),
        addedBy,
        holdingId: holdingId || null
    });
}

/**
 * Remove from blacklist (Admin only)
 */
export async function removeFromBlacklist(dni: string): Promise<void> {
    const docRef = doc(db, 'blacklist', dni);
    await deleteDoc(docRef);
}

/**
 * Get all blacklisted entries
 */
export async function getBlacklistEntries(): Promise<BlacklistEntry[]> {
    const q = query(collection(db, 'blacklist'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as BlacklistEntry));
}

/**
 * Check if candidate has previous hire history (re-entry detection)
 */
export function hasHireHistory(applications: any[]): { isReentry: boolean; lastHire: any } {
    if (!applications || applications.length === 0) {
        return { isReentry: false, lastHire: null };
    }

    const hiredApplications = applications.filter(app => app.hiredStatus === 'hired');

    if (hiredApplications.length > 0) {
        // Get most recent hire
        const lastHire = hiredApplications[hiredApplications.length - 1];
        return { isReentry: true, lastHire };
    }

    return { isReentry: false, lastHire: null };
}
