/**
 * Liah Talent - Process Candidate API
 * POST /api/talent/process-candidate
 * 
 * Triggers AI analysis for candidates in PENDING_ANALYSIS status
 * Called after application submission or when recovering a rejected candidate
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { analyzeCVMatch } from '@/lib/ai/gemini-talent';

export async function POST(req: NextRequest) {
    try {
        const { candidateId, forceAnalysis } = await req.json();

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

        // Check if should process
        if (candidate.status !== 'PENDING_ANALYSIS' && !forceAnalysis) {
            return NextResponse.json({
                error: 'Candidate not in PENDING_ANALYSIS status',
                currentStatus: candidate.status
            }, { status: 400 });
        }

        // Get job for JD content
        const jobRef = doc(db, 'talent_jobs', candidate.jobId);
        const jobSnap = await getDoc(jobRef);

        if (!jobSnap.exists()) {
            return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        }

        const job = jobSnap.data();

        // For now, use a placeholder CV content
        // TODO: Implement PDF extraction from cvUrl
        const cvContent = candidate.cvContent || `
      Candidato: ${candidate.nombre}
      Email: ${candidate.email}
      LinkedIn: ${candidate.linkedin || 'No proporcionado'}
    `;

        console.log(`[Talent AI] Analyzing candidate ${candidateId} for job ${candidate.jobId}`);

        // Run AI analysis
        const analysis = await analyzeCVMatch(cvContent, job.jd_content);

        console.log(`[Talent AI] Match score: ${analysis.matchScore}%`);

        // Update candidate with analysis results
        await updateDoc(candidateRef, {
            status: 'SCREENING',
            matchScore: analysis.matchScore,
            aiAnalysis: analysis,
            analyzedAt: Timestamp.now()
        });

        return NextResponse.json({
            success: true,
            data: {
                candidateId,
                matchScore: analysis.matchScore,
                status: 'SCREENING'
            }
        });

    } catch (error) {
        console.error('[Talent AI] Error processing candidate:', error);
        return NextResponse.json({
            error: 'Failed to process candidate',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
