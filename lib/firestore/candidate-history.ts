import { db } from '@/lib/firebase';
import {
    collection,
    addDoc,
    query,
    orderBy,
    getDocs,
    Timestamp,
    DocumentData
} from 'firebase/firestore';

export type HistoryActionType =
    | 'status_change'
    | 'assignment'
    | 'note_added'
    | 'interview_scheduled'
    | 'rejection'
    | 'approval'
    | 'hire'
    | 'application_created';

export interface CandidateHistoryEntry {
    timestamp: Timestamp;
    action: HistoryActionType;
    performedBy: {
        userId: string;
        userName: string;
        role: string;
    };
    changes?: {
        field: string;
        oldValue: any;
        newValue: any;
    };
    metadata?: {
        reason?: string;
        notes?: string;
        rqId?: string;
        rqTitle?: string;
        brandName?: string;
    };
}

/**
 * Add a history entry for a candidate
 */
export async function addCandidateHistoryEntry(
    candidateId: string,
    entry: Omit<CandidateHistoryEntry, 'timestamp'>
): Promise<void> {
    try {
        const historyRef = collection(db, 'candidates', candidateId, 'history');
        await addDoc(historyRef, {
            ...entry,
            timestamp: Timestamp.now()
        });
        console.log(`✅ History entry added for candidate ${candidateId}`, entry.action);
    } catch (error) {
        console.error('Error adding history entry:', error);
        throw error;
    }
}

/**
 * Get complete history for a candidate
 */
export async function getCandidateHistory(
    candidateId: string
): Promise<(CandidateHistoryEntry & { id: string })[]> {
    try {
        const historyRef = collection(db, 'candidates', candidateId, 'history');
        const q = query(historyRef, orderBy('timestamp', 'desc'));
        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data() as CandidateHistoryEntry
        }));
    } catch (error) {
        console.error('Error fetching candidate history:', error);
        return [];
    }
}

/**
 * Helper to track status changes automatically
 */
export async function trackStatusChange(
    candidateId: string,
    oldStatus: string | undefined,
    newStatus: string,
    performedBy: CandidateHistoryEntry['performedBy'],
    reason?: string
): Promise<void> {
    await addCandidateHistoryEntry(candidateId, {
        action: 'status_change',
        performedBy,
        changes: {
            field: 'status',
            oldValue: oldStatus || 'none',
            newValue: newStatus
        },
        metadata: reason ? { reason } : undefined
    });
}

/**
 * Track candidate assignment to RQ
 */
export async function trackAssignment(
    candidateId: string,
    rqId: string,
    rqTitle: string,
    brandName: string,
    performedBy: CandidateHistoryEntry['performedBy']
): Promise<void> {
    await addCandidateHistoryEntry(candidateId, {
        action: 'assignment',
        performedBy,
        metadata: {
            rqId,
            rqTitle,
            brandName
        }
    });
}

/**
 * Track interview scheduling
 */
export async function trackInterviewScheduled(
    candidateId: string,
    performedBy: CandidateHistoryEntry['performedBy'],
    notes?: string
): Promise<void> {
    await addCandidateHistoryEntry(candidateId, {
        action: 'interview_scheduled',
        performedBy,
        metadata: notes ? { notes } : undefined
    });
}

/**
 * Track candidate rejection
 */
export async function trackRejection(
    candidateId: string,
    reason: string,
    performedBy: CandidateHistoryEntry['performedBy']
): Promise<void> {
    await addCandidateHistoryEntry(candidateId, {
        action: 'rejection',
        performedBy,
        metadata: { reason }
    });
}

/**
 * Track candidate approval
 */
export async function trackApproval(
    candidateId: string,
    performedBy: CandidateHistoryEntry['performedBy'],
    notes?: string
): Promise<void> {
    await addCandidateHistoryEntry(candidateId, {
        action: 'approval',
        performedBy,
        metadata: notes ? { notes } : undefined
    });
}

/**
 * Track candidate hire
 */
export async function trackHire(
    candidateId: string,
    performedBy: CandidateHistoryEntry['performedBy']
): Promise<void> {
    await addCandidateHistoryEntry(candidateId, {
        action: 'hire',
        performedBy
    });
}
