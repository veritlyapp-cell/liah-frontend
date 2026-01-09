import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { candidateId, updateType, data, validatedBy } = body;

        if (!candidateId || !updateType) {
            return NextResponse.json(
                { error: 'candidateId and updateType are required' },
                { status: 400 }
            );
        }

        const db = getAdminFirestore();
        const candidateRef = db.collection('candidates').doc(candidateId);

        let updateData: Record<string, any> = {
            updatedAt: Timestamp.now()
        };

        if (updateType === 'dni_verification' && data) {
            // Update from DNI extraction
            const nameParts = (data.nombreCompleto || '').split(' ');
            updateData = {
                ...updateData,
                nombre: nameParts[0] || '',
                apellidoPaterno: nameParts[1] || '',
                apellidoMaterno: nameParts.slice(2).join(' ') || '',
                dni: data.dni,
                fechaNacimiento: data.fechaNacimiento,
                direccion: data.direccion || null,
                sexo: data.sexo || null,
                dniVerified: true,
                dniVerifiedAt: Timestamp.now(),
                dniExtractedData: data
            };
            console.log(`[CANDIDATE UPDATE] DNI verification for ${candidateId}`);

        } else if (updateType === 'cul_validation' && data) {
            // Update CUL validation status
            updateData = {
                ...updateData,
                culValidationStatus: data.status,
                culAiObservation: data.aiObservation || null,
                culDenunciasEncontradas: data.denunciasEncontradas || [],
                culConfidence: data.confidence || null,
                culValidatedBy: validatedBy || null,
                culValidatedAt: Timestamp.now()
            };
            console.log(`[CANDIDATE UPDATE] CUL validation for ${candidateId}: ${data.status}`);

        } else {
            return NextResponse.json(
                { error: 'Invalid updateType. Use "dni_verification" or "cul_validation"' },
                { status: 400 }
            );
        }

        await candidateRef.update(updateData);

        return NextResponse.json({
            success: true,
            message: `Candidate ${candidateId} updated successfully`,
            updateType
        });

    } catch (error: any) {
        console.error('[CANDIDATE UPDATE] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Error updating candidate' },
            { status: 500 }
        );
    }
}
