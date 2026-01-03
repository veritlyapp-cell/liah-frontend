import { db } from '@/lib/firebase';
import { doc, updateDoc, Timestamp, serverTimestamp } from 'firebase/firestore';

export interface DniVerificationData {
    nombreCompleto: string;
    dni: string;
    fechaNacimiento: string;
    direccion?: string | null;
    sexo?: string;
}

export interface CulValidationData {
    status: 'approved_ai' | 'rejected_ai' | 'pending_review' | 'approved_manual' | 'rejected_manual';
    aiObservation?: string;
    denunciasEncontradas?: string[];
    confidence?: number;
    validatedBy?: string;
}

/**
 * Update candidate profile with DNI extracted data
 */
export async function updateCandidateWithDniData(
    candidateId: string,
    extractedData: DniVerificationData
): Promise<void> {
    const candidateRef = doc(db, 'candidates', candidateId);

    await updateDoc(candidateRef, {
        // Basic data from DNI
        nombre: extractedData.nombreCompleto.split(' ')[0] || extractedData.nombreCompleto,
        apellidoPaterno: extractedData.nombreCompleto.split(' ')[1] || '',
        apellidoMaterno: extractedData.nombreCompleto.split(' ').slice(2).join(' ') || '',
        dni: extractedData.dni,
        fechaNacimiento: extractedData.fechaNacimiento,
        direccion: extractedData.direccion || undefined,
        sexo: extractedData.sexo || undefined,

        // Verification metadata
        dniVerified: true,
        dniVerifiedAt: Timestamp.now(),
        dniExtractedData: extractedData,

        // Update timestamp
        updatedAt: serverTimestamp()
    });

    console.log(`✅ Candidate ${candidateId} updated with DNI data`);
}

/**
 * Update candidate CUL validation status
 */
export async function updateCandidateCulValidation(
    candidateId: string,
    validationData: CulValidationData
): Promise<void> {
    const candidateRef = doc(db, 'candidates', candidateId);

    await updateDoc(candidateRef, {
        culValidationStatus: validationData.status,
        culAiObservation: validationData.aiObservation || null,
        culDenunciasEncontradas: validationData.denunciasEncontradas || [],
        culConfidence: validationData.confidence || null,
        culValidatedBy: validationData.validatedBy || null,
        culValidatedAt: Timestamp.now(),

        // Update timestamp
        updatedAt: serverTimestamp()
    });

    console.log(`✅ Candidate ${candidateId} CUL validation updated: ${validationData.status}`);
}

/**
 * Get validation status display info
 */
export function getValidationStatusInfo(status: string): {
    icon: string;
    text: string;
    color: string;
    bgColor: string;
} {
    const statusMap: Record<string, { icon: string; text: string; color: string; bgColor: string }> = {
        'approved_ai': {
            icon: '✅',
            text: 'Pre-aprobado (IA)',
            color: 'text-green-700',
            bgColor: 'bg-green-100'
        },
        'rejected_ai': {
            icon: '❌',
            text: 'Rechazado (IA)',
            color: 'text-red-700',
            bgColor: 'bg-red-100'
        },
        'pending_review': {
            icon: '⚠️',
            text: 'Validar por Usuario',
            color: 'text-yellow-700',
            bgColor: 'bg-yellow-100'
        },
        'approved_manual': {
            icon: '✅',
            text: 'Aprobado',
            color: 'text-green-700',
            bgColor: 'bg-green-100'
        },
        'rejected_manual': {
            icon: '❌',
            text: 'Rechazado',
            color: 'text-red-700',
            bgColor: 'bg-red-100'
        }
    };

    return statusMap[status] || {
        icon: '❓',
        text: 'Sin validar',
        color: 'text-gray-700',
        bgColor: 'bg-gray-100'
    };
}
