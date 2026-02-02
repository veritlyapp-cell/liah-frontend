import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, Timestamp, arrayUnion } from 'firebase/firestore';
import type { Application } from './candidates';

/**
 * Aprobar candidato para una aplicación específica
 */
export async function approveCandidate(
    candidateId: string,
    applicationId: string,
    approvedBy: string,
    priority?: 'principal' | 'backup'
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
                status: 'approved' as const,
                approvedBy,
                approvedAt: Timestamp.now(),
                priority: priority || 'backup'  // Default to backup if not specified
            };
        }
        return app;
    });

    await updateDoc(candidateRef, {
        applications: updatedApplications,
        updatedAt: Timestamp.now()
    });
}

/**
 * Rechazar candidato para una aplicación específica
 */
export async function rejectCandidate(
    candidateId: string,
    applicationId: string,
    rejectedBy: string,
    reason?: string
): Promise<void> {
    const candidateRef = doc(db, 'candidates', candidateId);

    // Actualizar el estado de la aplicación específica
    const candidateDoc = await import('./candidates').then(m => m.getCandidate(candidateId));
    if (!candidateDoc) throw new Error('Candidato no encontrado');

    const updatedApplications = candidateDoc.applications?.map(app => {
        if (app.id === applicationId) {
            return {
                ...app,
                status: 'rejected' as const,
                rejectedBy,
                rejectedAt: Timestamp.now(),
                rejectionReason: reason
            };
        }
        return app;
    });

    const updateData: any = {
        applications: updatedApplications,
        updatedAt: Timestamp.now()
    };

    // If the candidate was selected for this specific RQ, clear the global selection status
    const candidateData = candidateDoc as any;
    const isSelectedForThisRQ = candidateData.selectionStatus === 'selected' && candidateData.selectedForRQ === applicationId;

    if (isSelectedForThisRQ) {
        updateData.selectionStatus = 'rejected';
        updateData.selectedForRQ = null;
        updateData.selectedAt = null;
        updateData.selectedBy = null;
    }

    await updateDoc(candidateRef, updateData);

    // [NEW] Trigger rejection email if email exists and not already rejected
    const app = candidateDoc.applications?.find(a => a.id === applicationId);
    if (candidateDoc.email && app) {
        try {
            await fetch('/api/send-rejection-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    candidateEmail: candidateDoc.email,
                    candidateName: candidateDoc.nombre,
                    posicion: app.posicion,
                    marcaNombre: app.marcaNombre,
                    reason: reason
                })
            });
        } catch (e) {
            console.error('Error triggering rejection email:', e);
        }
    }
}

/**
 * Actualizar estado del CUL manualmente
 */
export async function updateCULStatus(
    candidateId: string,
    status: 'apto' | 'no_apto' | 'manual_review',
    checkedBy: string,
    notes?: string
): Promise<void> {
    const candidateRef = doc(db, 'candidates', candidateId);

    await updateDoc(candidateRef, {
        culStatus: status,
        culCheckedAt: Timestamp.now(),
        culCheckedBy: checkedBy,
        culNotes: notes || '',
        updatedAt: Timestamp.now()
    });
}
