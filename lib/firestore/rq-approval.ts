import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, Timestamp, writeBatch } from 'firebase/firestore';
import type { RQ } from './rqs';

/**
 * Approve a single RQ
 */
export async function approveRQ(
    rqId: string,
    approverUserId: string,
    approverName: string,
    approverRole: 'supervisor' | 'jefe_marca'
): Promise<void> {
    const rqRef = doc(db, 'rqs', rqId);
    const rqDoc = await getDoc(rqRef);

    if (!rqDoc.exists()) {
        throw new Error('RQ not found');
    }

    const rq = rqDoc.data() as RQ;

    // Determine which level is being approved
    const currentLevel = rq.currentApprovalLevel;

    // Update approval chain
    const updatedChain = rq.approvalChain.map(item => {
        if (item.level === currentLevel) {
            return {
                ...item,
                status: 'approved' as const,
                approvedBy: approverUserId,
                approvedByName: approverName,
                approvedAt: Timestamp.now()
            };
        }
        return item;
    });

    // Determine next level
    let nextLevel = currentLevel;
    let finalApprovalStatus: 'pending' | 'approved' = 'pending';

    if (approverRole === 'supervisor') {
        // Supervisor approved, move to jefe de marca level
        nextLevel = 3;
    } else if (approverRole === 'jefe_marca') {
        // Jefe approved, RQ is fully approved
        nextLevel = 3; // Stay at 3
        finalApprovalStatus = 'approved';
    }

    // Update RQ
    await updateDoc(rqRef, {
        approvalChain: updatedChain,
        currentApprovalLevel: nextLevel,
        approvalStatus: finalApprovalStatus
    });
}

/**
 * Reject an RQ
 */
export async function rejectRQ(
    rqId: string,
    approverUserId: string,
    approverName: string,
    approverRole: 'supervisor' | 'jefe_marca',
    reason: string
): Promise<void> {
    const rqRef = doc(db, 'rqs', rqId);
    const rqDoc = await getDoc(rqRef);

    if (!rqDoc.exists()) {
        throw new Error('RQ not found');
    }

    const rq = rqDoc.data() as RQ;
    const currentLevel = rq.currentApprovalLevel;

    // Update approval chain
    const updatedChain = rq.approvalChain.map(item => {
        if (item.level === currentLevel) {
            return {
                ...item,
                status: 'rejected' as const,
                approvedBy: approverUserId,
                approvedByName: approverName,
                approvedAt: Timestamp.now(),
                rejectionReason: reason
            };
        }
        return item;
    });

    // Update RQ
    await updateDoc(rqRef, {
        approvalChain: updatedChain,
        approvalStatus: 'rejected',
        status: 'cancelled'
    });
}

/**
 * Bulk approve multiple RQs
 */
export async function bulkApproveRQs(
    rqIds: string[],
    approverUserId: string,
    approverName: string,
    approverRole: 'supervisor' | 'jefe_marca'
): Promise<{ approved: number, failed: string[] }> {
    const batch = writeBatch(db);
    const failedIds: string[] = [];
    let approvedCount = 0;

    for (const rqId of rqIds) {
        try {
            const rqRef = doc(db, 'rqs', rqId);
            const rqDoc = await getDoc(rqRef);

            if (!rqDoc.exists()) {
                failedIds.push(rqId);
                continue;
            }

            const rq = rqDoc.data() as RQ;
            const currentLevel = rq.currentApprovalLevel;

            // Update approval chain
            const updatedChain = rq.approvalChain.map(item => {
                if (item.level === currentLevel) {
                    return {
                        ...item,
                        status: 'approved' as const,
                        approvedBy: approverUserId,
                        approvedByName: approverName,
                        approvedAt: Timestamp.now()
                    };
                }
                return item;
            });

            // Determine next level
            let nextLevel = currentLevel;
            let finalApprovalStatus: 'pending' | 'approved' = 'pending';

            if (approverRole === 'supervisor') {
                nextLevel = 3;
            } else if (approverRole === 'jefe_marca') {
                nextLevel = 3;
                finalApprovalStatus = 'approved';
            }

            // Add to batch
            batch.update(rqRef, {
                approvalChain: updatedChain,
                currentApprovalLevel: nextLevel,
                approvalStatus: finalApprovalStatus
            });

            approvedCount++;
        } catch (error) {
            console.error(`Error approving RQ ${rqId}:`, error);
            failedIds.push(rqId);
        }
    }

    // Commit batch
    if (approvedCount > 0) {
        await batch.commit();
    }

    return { approved: approvedCount, failed: failedIds };
}

/**
 * Bulk reject multiple RQs
 */
export async function bulkRejectRQs(
    rqIds: string[],
    approverUserId: string,
    approverName: string,
    approverRole: 'supervisor' | 'jefe_marca',
    reason: string
): Promise<{ rejected: number, failed: string[] }> {
    const batch = writeBatch(db);
    const failedIds: string[] = [];
    let rejectedCount = 0;

    for (const rqId of rqIds) {
        try {
            const rqRef = doc(db, 'rqs', rqId);
            const rqDoc = await getDoc(rqRef);

            if (!rqDoc.exists()) {
                failedIds.push(rqId);
                continue;
            }

            const rq = rqDoc.data() as RQ;
            const currentLevel = rq.currentApprovalLevel;

            // Update approval chain
            const updatedChain = rq.approvalChain.map(item => {
                if (item.level === currentLevel) {
                    return {
                        ...item,
                        status: 'rejected' as const,
                        approvedBy: approverUserId,
                        approvedByName: approverName,
                        approvedAt: Timestamp.now(),
                        rejectionReason: reason
                    };
                }
                return item;
            });

            // Add to batch
            batch.update(rqRef, {
                approvalChain: updatedChain,
                approvalStatus: 'rejected',
                status: 'cancelled'
            });

            rejectedCount++;
        } catch (error) {
            console.error(`Error rejecting RQ ${rqId}:`, error);
            failedIds.push(rqId);
        }
    }

    // Commit batch
    if (rejectedCount > 0) {
        await batch.commit();
    }

    return { rejected: rejectedCount, failed: failedIds };
}

/**
 * Delete an RQ directly (for Store Manager to cancel their own RQs)
 */
export async function deleteRQDirectly(rqId: string): Promise<void> {
    const rqRef = doc(db, 'rqs', rqId);
    const rqDoc = await getDoc(rqRef);

    if (!rqDoc.exists()) {
        throw new Error('RQ not found');
    }

    // Mark as deleted/cancelled
    await updateDoc(rqRef, {
        status: 'cancelled',
        approvalStatus: 'rejected',
        cancelledAt: Timestamp.now()
    });
}

/**
 * Permanently delete RQ from Firestore (for cleanup)
 */
export async function permanentlyDeleteRQ(rqId: string): Promise<void> {
    const { deleteDoc } = await import('firebase/firestore');
    const rqRef = doc(db, 'rqs', rqId);
    await deleteDoc(rqRef);
}
