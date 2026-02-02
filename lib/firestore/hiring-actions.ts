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
        // [NEW] Sync with Compensations (Altas)
        try {
            const { collection, addDoc } = await import('firebase/firestore');
            const candidateData = candidate.data();
            const app = updatedApplications.find((a: Application) => a.id === applicationId);

            if (app) {
                await addDoc(collection(db, 'nuevos_colaboradores'), {
                    candidateId,
                    applicationId,
                    nombres: candidateData.nombre,
                    apellidos: `${candidateData.apellidoPaterno} ${candidateData.apellidoMaterno}`,
                    nombreCompleto: `${candidateData.nombre} ${candidateData.apellidoPaterno} ${candidateData.apellidoMaterno}`,
                    numeroDocumento: candidateData.dni,
                    tipoDocumento: 'DNI',
                    posicion: app.posicion,
                    marcaId: app.marcaId,
                    marcaNombre: app.marcaNombre,
                    tiendaId: app.tiendaId,
                    tiendaNombre: app.tiendaNombre,
                    fechaIngreso: app.startDate,
                    modalidad: app.modalidad || 'Full Time',
                    hiredAt: Timestamp.now(),
                    createdAt: Timestamp.now(), // Added for sorting
                    hiredBy,
                    holdingId: candidateData.holdingId || 'ngr',
                    processedAt: null,
                    status: 'pendiente'
                });
                console.log('✅ Synchronized with Compensaciones (Altas)');
            }
        } catch (syncError) {
            console.error('Error syncing with Compensaciones:', syncError);
        }

        // Calculate and store Time to Fill
        try {
            const rqRef = doc(db, 'rqs', rqId);
            const rqSnap = await getDoc(rqRef);

            if (rqSnap.exists()) {
                const rqData = rqSnap.data();
                const approvedAt = rqData.approvedAt?.toDate?.() || rqData.createdAt?.toDate?.() || new Date();
                const hiredAt = new Date();

                // Calculate days between approval and hire
                const timeDiff = hiredAt.getTime() - approvedAt.getTime();
                const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

                // Get current TTF data or initialize
                const currentTTF = rqData.timeToFill || { total: 0, count: 0, hires: [] };

                // Update TTF metrics
                const updatedTTF = {
                    total: currentTTF.total + daysDiff,
                    count: currentTTF.count + 1,
                    average: Math.round((currentTTF.total + daysDiff) / (currentTTF.count + 1)),
                    lastHireDate: Timestamp.now(),
                    hires: [
                        ...(currentTTF.hires || []),
                        { candidateId, days: daysDiff, hiredAt: Timestamp.now() }
                    ]
                };

                await updateDoc(rqRef, {
                    timeToFill: updatedTTF,
                    updatedAt: Timestamp.now()
                });

                console.log(`📊 Time to Fill for RQ ${rqId}: ${daysDiff} days (average: ${updatedTTF.average} days)`);
            }
        } catch (ttfError) {
            console.error('Error calculating Time to Fill:', ttfError);
        }

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
