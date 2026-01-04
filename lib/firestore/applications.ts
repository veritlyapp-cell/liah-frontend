import { db } from '@/lib/firebase';
import { doc, updateDoc, arrayUnion, Timestamp } from 'firebase/firestore';
import type { Application } from './candidates';
import { v4 as uuidv4 } from 'uuid';

/**
 * Crear application cuando candidato completa invitación
 */
export async function createApplication(
    candidateId: string,
    data: {
        rqId?: string;
        rqNumber?: string;
        posicion?: string;  // Nombre del puesto
        modalidad?: 'Full Time' | 'Part Time';
        marcaId: string;
        marcaNombre: string;
        tiendaId: string;
        tiendaNombre: string;
        invitationId?: string;
        sentBy?: string;
        origenConvocatoria?: string; // [NEW]
        categoria?: 'operativo' | 'gerencial'; // [NEW]
    }
): Promise<string> {
    if (!data.rqId || !data.rqNumber) {
        // Si no hay RQ asociado, no crear application
        return ''; // Return an empty string as per the new return type
    }

    const applicationId = uuidv4();
    const application: any = {
        id: applicationId,
        marcaId: data.marcaId,
        marcaNombre: data.marcaNombre,
        tiendaId: data.tiendaId,
        tiendaNombre: data.tiendaNombre,
        rqId: data.rqId,
        rqNumber: data.rqNumber,
        posicion: data.posicion,
        modalidad: data.modalidad || 'Full Time',
        appliedAt: Timestamp.now(),
        status: 'completed',
        invitationId: data.invitationId || '',
        invitedBy: data.sentBy || '',
        origenConvocatoria: data.origenConvocatoria || 'Directo',
        categoria: data.categoria || 'operativo'
    };

    // Clean up undefined properties just in case
    Object.keys(application).forEach(key => (application[key] === undefined) && delete application[key]);

    // Agregar application al candidato
    const candidateRef = doc(db, 'candidates', candidateId);
    await updateDoc(candidateRef, {
        applications: arrayUnion(application),
        updatedAt: Timestamp.now()
    });

    return applicationId;
}
