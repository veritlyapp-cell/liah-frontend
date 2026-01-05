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
        fechaNacimiento?: string;
        edad?: number;
        culStatus?: 'pending' | 'apto' | 'no_apto' | 'manual_review';
        culUploadedAt?: Date | null;
        source?: string;
        origenConvocatoria?: string;
        documents?: Record<string, string>;
    }

): Promise<void> {
    const candidateRef = doc(db, 'candidates', candidateId);

    // Extract only valid candidate fields to avoid saving form-specific fields
    const updateData: Record<string, any> = {
        updatedAt: Timestamp.now()
    };

    // Copy only defined fields
    if (updates.dni !== undefined) updateData.dni = updates.dni;
    if (updates.documentType !== undefined) updateData.documentType = updates.documentType;
    if (updates.nombre !== undefined) updateData.nombre = updates.nombre;
    if (updates.apellidoPaterno !== undefined) updateData.apellidoPaterno = updates.apellidoPaterno;
    if (updates.apellidoMaterno !== undefined) updateData.apellidoMaterno = updates.apellidoMaterno;
    if (updates.departamento !== undefined) updateData.departamento = updates.departamento;
    if (updates.provincia !== undefined) updateData.provincia = updates.provincia;
    if (updates.distrito !== undefined) updateData.distrito = updates.distrito;
    if (updates.direccion !== undefined) updateData.direccion = updates.direccion;
    if (updates.telefono !== undefined) updateData.telefono = updates.telefono;
    if (updates.fechaNacimiento !== undefined) updateData.fechaNacimiento = updates.fechaNacimiento;
    if (updates.edad !== undefined) updateData.edad = updates.edad;
    if (updates.source !== undefined) updateData.source = updates.source;
    if (updates.origenConvocatoria !== undefined) updateData.origenConvocatoria = updates.origenConvocatoria;
    if (updates.documents !== undefined) updateData.documents = updates.documents;
    if (updates.culStatus !== undefined) updateData.culStatus = updates.culStatus;


    // Handle CUL specially
    if (updates.certificadoUnicoLaboral) {
        updateData.certificadoUnicoLaboral = updates.certificadoUnicoLaboral;
        updateData.culUploadedAt = Timestamp.now();
        updateData.culExpiresAt = Timestamp.fromDate(
            new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000) // +6 meses
        );
        updateData.culStatus = 'pending'; // Requiere nueva revisión
    }

    console.log('[updateCandidate] Saving to Firestore:', { candidateId, updateData });

    await updateDoc(candidateRef, updateData);
}

