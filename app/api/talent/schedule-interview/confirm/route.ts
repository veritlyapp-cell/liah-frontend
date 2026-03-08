import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore, getFieldValue } from '@/lib/firebase-admin';
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { candidateId, slotIso, tiendaId, vacanteId } = body;

        console.log(`[API] Confirming Web interview for candidate ${candidateId} at slot ${slotIso}`);

        const db = getAdminFirestore();
        const candidateRef = db.collection('talent_candidates').doc(candidateId);

        // Mark explicitly as scheduled
        await candidateRef.update({
            status: 'INTERVIEW_SCHEDULED',
            'entrevista.fechaHora': new Date(slotIso),
            'entrevista.estado': 'programada',
            'entrevista.tiendaId': tiendaId,
            'entrevista.origen': 'web_self_service',
            updatedAt: getFieldValue().serverTimestamp()
        });

        return NextResponse.json({ success: true, message: 'Interview scheduled successfully' });
    } catch (e: any) {
        console.error('Error scheduling confirm:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
