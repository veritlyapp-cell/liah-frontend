import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import type { Application } from './candidates';

/**
 * Marcar candidato como ingresado
 */
export async function markCandidateHired(
    candidateId: string,
    applicationId: string,
    hiredBy: string,
    startDate: Date
): Promise<void> {
    const candidateRef = doc(db, 'candidates', candidateId);
    const candidate = await getDoc(candidateRef);

    if (!candidate.exists()) {
        throw new Error('Candidato no encontrado');
    }

    const applications = candidate.data().applications || [];
    let rqId: string | undefined;

    const updatedApplications = applications.map((app: Application) => {
        if (app.id === applicationId) {
            rqId = app.rqId; // Save RQ ID to check later
            return {
                ...app,
                hiredStatus: 'hired',
                hiredBy,
                hiredAt: Timestamp.now(),
                startDate: Timestamp.fromDate(startDate)
            };
        }
        return app;
    });

    await updateDoc(candidateRef, {
        applications: updatedApplications,
        updatedAt: Timestamp.now()
    });

    // Check if RQ should be closed (all vacancies filled)
    if (rqId) {
        const { checkAndCloseRQ } = await import('./rq-closure');
        const wasClosed = await checkAndCloseRQ(rqId);
        if (wasClosed) {
            console.log(`RQ ${rqId} was automatically closed (all vacancies filled)`);
        }
    }
}

/**
 * Marcar candidato como NO ingresado
 */
export async function markCandidateNotHired(
    candidateId: string,
    applicationId: string,
    hiredBy: string,
    reason: string
): Promise<void> {
    const candidateRef = doc(db, 'candidates', candidateId);
    const candidate = await getDoc(candidateRef);

    if (!candidate.exists()) {
        throw new Error('Candidato no encontrado');
    }

    const applications = candidate.data().applications || [];
    const updatedApplications = applications.map((app: Application) => {
        if (app.id === applicationId) {
            return {
                ...app,
                hiredStatus: 'not_hired',
                hiredBy,
                hiredAt: Timestamp.now(),
                notHiredReason: reason
            };
        }
        return app;
    });

    await updateDoc(candidateRef, {
        applications: updatedApplications,
        updatedAt: Timestamp.now()
    });
}
