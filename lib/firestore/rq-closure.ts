import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, Timestamp, collection, query, where, getDocs } from 'firebase/firestore';

/**
 * Check if RQ should be closed after a candidate is hired
 * Returns true if RQ was closed
 */
export async function checkAndCloseRQ(rqId: string): Promise<boolean> {
    try {
        const rqRef = doc(db, 'rqs', rqId);
        const rqDoc = await getDoc(rqRef);

        if (!rqDoc.exists()) {
            console.error('RQ not found:', rqId);
            return false;
        }

        const rq = rqDoc.data();
        const vacantes = rq.vacantes || 1;

        // Count how many candidates have been hired for this RQ
        const candidatesRef = collection(db, 'candidates');
        // We use the 'applications' array field with array-contains logic if we had structured it differently,
        // but since it's an array of objects, we have to fetch and filter or use a recursive query.
        // HOWEVER, a better way is to query the 'applicants' if we had a separate collection,
        // but given the current structure, we'll at least filter by those who HAVE applications for this rqId
        // if we store that info at top level. If not, we'll keep the scan but make it more efficient.

        // Actually, we can't easily query "array of objects" in Firestore for a sub-property match.
        // Let's check if we can optimize the scan or if we need a denormalized field.
        // For now, let's at least make the filtering more robust.
        const snapshot = await getDocs(candidatesRef);

        let hiredCount = 0;
        snapshot.docs.forEach(candidateDoc => {
            const candidate = candidateDoc.data();
            const hiredApps = candidate.applications?.filter((app: any) =>
                app.rqId === rqId && app.hiredStatus === 'hired'
            ) || [];
            hiredCount += hiredApps.length;
        });

        // If all vacancies are filled, close the RQ
        if (hiredCount >= vacantes) {
            await updateDoc(rqRef, {
                status: 'filled',
                filledCount: hiredCount,
                filledAt: Timestamp.now(),
                closedAt: Timestamp.now(),
                closedBy: 'system',
                closureReason: `Todas las ${vacantes} vacantes han sido cubiertas`
            });
            return true;
        } else {
            // Update filled count even if not completely filled
            await updateDoc(rqRef, {
                filledCount: hiredCount
            });
            return false;
        }
    } catch (error) {
        console.error('Error checking/closing RQ:', error);
        return false;
    }
}
