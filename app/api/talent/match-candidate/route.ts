import { NextRequest, NextResponse } from 'next/server';
import { analyzeCVMatch } from '@/lib/ai/gemini-talent';

/**
 * POST /api/talent/match-candidate
 * Compares a candidate's CV and killer question answers against a job profile.
 * Returns a match percentage and detailed analysis.
 */
export async function POST(req: NextRequest) {
    try {
        const { jobProfile, candidateData, killerAnswers } = await req.json();

        if (!jobProfile || !candidateData) {
            return NextResponse.json({ error: 'Job profile and candidate data required' }, { status: 400 });
        }

        console.log(`[Talent AI] Analyzing match for candidate: ${candidateData.nombre}`);

        const jdContent = `
Título: ${jobProfile.titulo}
Descripción: ${jobProfile.descripcion}
Requisitos: ${jobProfile.requisitos || 'No especificados'}
`.trim();

        const cvContent = candidateData.cvText || JSON.stringify(candidateData.parsedData);

        // Analyze with Gemini using centralized logic
        const analysis = await analyzeCVMatch(cvContent, jdContent, killerAnswers);

        console.log(`[Talent AI] Match Score: ${analysis.matchScore}%`);

        return NextResponse.json({
            success: true,
            data: analysis
        });

    } catch (error) {
        console.error('[Talent AI] Error matching candidate:', error);
        return NextResponse.json({
            error: 'Failed to process match analysis',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
