import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';

export async function POST(request: NextRequest) {
    try {
        const { dni } = await request.json();

        if (!dni) {
            return NextResponse.json({ error: 'DNI is required' }, { status: 400 });
        }

        console.log(`[API/CleanReingreso] Searching for candidate with DNI: ${dni}`);

        const candidatesRef = collection(db, 'candidates');
        const q = query(candidatesRef, where('dni', '==', dni));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
        }

        const candidateDoc = snapshot.docs[0];
        const candidateData = candidateDoc.data();

        console.log(`[API/CleanReingreso] Found candidate: ${candidateData.nombre} ${candidateData.apellidoPaterno}`);

        // Mark all active assignments as 'released'
        const updatedAssignments = (candidateData.assignments || []).map((a: any) => ({
            ...a,
            status: (a.status === 'assigned' || a.status === 'confirmed') ? 'released' : a.status
        }));

        // Update the candidate document
        const candidateRef = doc(db, 'candidates', candidateDoc.id);
        await updateDoc(candidateRef, {
            assignments: updatedAssignments,
            selectionStatus: null,
            selectedForRQ: null,
            updatedAt: Timestamp.now()
        });

        return NextResponse.json({
            success: true,
            candidateId: candidateDoc.id,
            nombre: `${candidateData.nombre} ${candidateData.apellidoPaterno}`,
            message: 'Candidate cleaned for reingreso successfully'
        });

    } catch (error) {
        console.error('[API/CleanReingreso] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
