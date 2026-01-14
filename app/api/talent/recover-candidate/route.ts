/**
 * Liah Talent - Recover Candidate API
 * POST /api/talent/recover-candidate
 * 
 * Allows recruiters to recover AUTO_REJECTED candidates
 * Changes status to PENDING_ANALYSIS and forces AI analysis
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';

export async function POST(req: NextRequest) {
    try {
        const { candidateId, recruiterId } = await req.json();

        if (!candidateId) {
            return NextResponse.json({ error: 'candidateId is required' }, { status: 400 });
        }

        // Get candidate
        const candidateRef = doc(db, 'talent_candidates', candidateId);
        const candidateSnap = await getDoc(candidateRef);

        if (!candidateSnap.exists()) {
            return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
        }

        const candidate = candidateSnap.data();

        // Validate current status
        if (candidate.status !== 'AUTO_REJECTED') {
            return NextResponse.json({
                error: 'Only AUTO_REJECTED candidates can be recovered',
                currentStatus: candidate.status
            }, { status: 400 });
        }

        console.log(`[Talent] Recovering candidate ${candidateId} by ${recruiterId}`);

        // Update status to PENDING_ANALYSIS
        await updateDoc(candidateRef, {
            status: 'PENDING_ANALYSIS',
            recoveredBy: recruiterId,
            recoveredAt: Timestamp.now()
        });

        // Trigger AI analysis
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        await fetch(`${baseUrl}/api/talent/process-candidate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                candidateId,
                forceAnalysis: true
            })
        });

        return NextResponse.json({
            success: true,
            message: 'Candidate recovered and queued for AI analysis'
        });

    } catch (error) {
        console.error('[Talent] Error recovering candidate:', error);
        return NextResponse.json({
            error: 'Failed to recover candidate',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
