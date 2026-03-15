import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, Timestamp, writeBatch } from 'firebase/firestore';
import type { RQ } from './rqs';

async function triggerNotification(type: string, data: any) {
    try {
        await fetch('/api/notifications/notify-action', {
            method: 'POST',
            body: JSON.stringify({ type, data }),
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e) {
        console.error('Failed to trigger notification:', e);
    }
}

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
    const firstPending = updatedChain.find((item: any) => item.status === 'pending');
    let nextLevel = firstPending ? firstPending.level : currentLevel;
    let finalApprovalStatus: 'pending' | 'approved' = firstPending ? 'pending' : 'approved';

    // Update RQ
    await updateDoc(rqRef, {
        approvalChain: updatedChain,
        currentApprovalLevel: nextLevel,
        approvalStatus: finalApprovalStatus
    });

    // Notify next level or completion
    if (finalApprovalStatus === 'approved') {
        triggerNotification('RQ_APPROVED', {
            posicion: rq.posicion,
            tiendaNombre: rq.tiendaNombre,
            marcaId: rq.marcaId
        });
    } else if (nextLevel === 3 && currentLevel === 2) {
        triggerNotification('RQ_PENDING_JEFE_MARCA', {
            posicion: rq.posicion,
            tiendaNombre: rq.tiendaNombre,
            marcaId: rq.marcaId
        });
    }
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
    let lastApprovedRQ: any = null;
    let lastFinalStatus: string = 'pending';
    let lastNextLevel: number = 0;

    for (let i = 0; i < rqIds.length; i++) {
        const rqId = rqIds[i];
        try {
            const rqRef = doc(db, 'rqs', rqId);
            const rqDoc = await getDoc(rqRef);

            if (!rqDoc.exists()) {
                failedIds.push(rqId);
                continue;
            }

            const rq = rqDoc.data() as RQ;
            const currentLevel = rq.currentApprovalLevel;

            // Verify this RQ is actually pending approval
            if (rq.approvalStatus !== 'pending') {
                console.warn(`[bulkApprove] RQ ${rqId} is not pending (status: ${rq.approvalStatus}), skipping`);
                failedIds.push(rqId);
                continue;
            }

            // Update approval chain
            const updatedChain = (rq.approvalChain || []).map(item => {
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
            const firstPending = updatedChain.find((item: any) => item.status === 'pending');
            const nextLevel = firstPending ? firstPending.level : currentLevel;
            const finalApprovalStatus: 'pending' | 'approved' = firstPending ? 'pending' : 'approved';

            batch.update(rqRef, {
                approvalChain: updatedChain,
                currentApprovalLevel: nextLevel,
                approvalStatus: finalApprovalStatus
            });

            approvedCount++;
            lastApprovedRQ = rq;
            lastFinalStatus = finalApprovalStatus;
            lastNextLevel = nextLevel;
        } catch (error) {
            console.error(`[bulkApprove] Error preparing RQ ${rqId}:`, error);
            failedIds.push(rqId);
        }
    }

    // Commit batch
    if (approvedCount > 0) {
        try {
            await batch.commit();
        } catch (batchError) {
            console.error('[bulkApprove] Batch commit failed, trying individual updates:', batchError);
            // Fallback: try individual updates
            let individualSuccess = 0;
            for (let i = 0; i < rqIds.length; i++) {
                const rqId = rqIds[i];
                if (failedIds.includes(rqId)) continue;
                try {
                    await approveRQ(rqId, approverUserId, approverName, approverRole);
                    individualSuccess++;
                } catch (indivError) {
                    console.error(`[bulkApprove] Individual approve failed for ${rqId}:`, indivError);
                    failedIds.push(rqId);
                }
            }
            return { approved: individualSuccess, failed: failedIds };
        }
    }

    // Send notifications AFTER successful batch commit (non-blocking)
    if (lastApprovedRQ) {
        try {
            if (lastFinalStatus === 'approved') {
                triggerNotification('RQ_APPROVED', {
                    posicion: lastApprovedRQ.posicion,
                    tiendaNombre: lastApprovedRQ.tiendaNombre,
                    marcaId: lastApprovedRQ.marcaId
                });
            } else if (lastNextLevel === 3) {
                triggerNotification('RQ_PENDING_JEFE_MARCA', {
                    posicion: lastApprovedRQ.posicion,
                    tiendaNombre: lastApprovedRQ.tiendaNombre,
                    marcaId: lastApprovedRQ.marcaId
                });
            }
        } catch (notifError) {
            // Notification failure should never break the approval flow
            console.error('[bulkApprove] Notification failed (non-critical):', notifError);
        }
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
