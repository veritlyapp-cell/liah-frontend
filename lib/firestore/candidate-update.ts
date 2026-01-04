import { db } from '@/lib/firebase';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';

/**
 * Actualizar datos de candidato existente
 */
export async function updateCandidate(
    candidateId: string,
    updates: {
        dni?: string;
        documentType?: 'DNI' | 'CE';
        nombre?: string;
        apellidoPaterno?: string;
        apellidoMaterno?: string;
        departamento?: string;
        provincia?: string;
        distrito?: string;
        direccion?: string;
        certificadoUnicoLaboral?: string;
        telefono?: string;
        culStatus?: 'pending' | 'apto' | 'no_apto' | 'manual_review';
        culUploadedAt?: Date | null;
        source?: string;
        origenConvocatoria?: string;
        documents?: Record<string, string>;
    }
): Promise<void> {
    const candidateRef = doc(db, 'candidates', candidateId);

    const updateData: any = {
        ...updates,
        updatedAt: Timestamp.now()
    };

    // Si se sube nuevo CUL, actualizar fechas
    if (updates.certificadoUnicoLaboral) {
        updateData.culUploadedAt = Timestamp.now();
        updateData.culExpiresAt = Timestamp.fromDate(
            new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000) // +6 meses
        );
        updateData.culStatus = 'pending'; // Requiere nueva revisión
    }

    await updateDoc(candidateRef, updateData);
}
