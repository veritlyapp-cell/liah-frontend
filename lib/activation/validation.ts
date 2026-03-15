import { getAdminFirestore } from '@/lib/firebase-admin';

/**
 * LIAH Activation Engine: Validation Logic
 */

export interface ValidationResult {
    isBlacklisted: boolean;
    hasAntecedents: boolean;
    lastCeseReason?: string;
    details?: string;
}

/**
 * Crossing phone numbers with historical data and termination modules
 */
export async function validateCandidateAntecedents(phone: string): Promise<ValidationResult> {
    const db = getAdminFirestore();

    // 1. Check in Blacklist collection
    const blacklistDoc = await db.collection('blacklists').doc(phone).get();
    if (blacklistDoc.exists) {
        return {
            isBlacklisted: true,
            hasAntecedents: true,
            details: 'Listed in global blacklist'
        };
    }

    // 2. Check in historical 'bajas' (terminations) collection
    // The field 'celular' is used to identify perfiles with antecedents
    const bajasSnapshot = await db.collection('bajas')
        .where('celular', '==', phone)
        .orderBy('fechaCese', 'desc')
        .limit(1)
        .get();

    if (!bajasSnapshot.empty) {
        const cese = bajasSnapshot.docs[0].data();
        return {
            isBlacklisted: cese.noRecomendar || false,
            hasAntecedents: true,
            lastCeseReason: cese.motivoLabel || cese.motivo,
            details: `Previous worker. Reason: ${cese.motivoLabel || 'N/A'}`
        };
    }

    // 3. Check in previous applications to detect "reincidentes"
    const prevApps = await db.collection('candidates')
        .where('telefono', '==', phone)
        .limit(1)
        .get();

    if (!prevApps.empty) {
        return {
            isBlacklisted: false,
            hasAntecedents: true,
            details: 'Candidate already exists in talent pool'
        };
    }

    return { isBlacklisted: false, hasAntecedents: false };
}
