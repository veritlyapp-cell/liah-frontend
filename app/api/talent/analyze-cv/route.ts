/**
 * Liah Talent - CV Analysis API
 * POST /api/talent/analyze-cv
 * 
 * Analyzes a candidate's CV against a Job Description
 * Uses Gemini 2.5 Pro for complex reasoning
 */
import { NextRequest, NextResponse } from 'next/server';
import { analyzeCVMatch } from '@/lib/ai/gemini-talent';

export async function POST(req: NextRequest) {
    try {
        const { cvContent, jdContent } = await req.json();

        // Validate input
        if (!cvContent || !jdContent) {
            return NextResponse.json(
                { error: 'cvContent and jdContent are required' },
                { status: 400 }
            );
        }

        console.log('[Talent AI] Analyzing CV match...');

        // Analyze with Gemini 2.5 Pro
        const analysis = await analyzeCVMatch(cvContent, jdContent);

        console.log(`[Talent AI] Match score: ${analysis.matchScore}%`);

        return NextResponse.json({
            success: true,
            data: analysis
        });

    } catch (error) {
        console.error('[Talent AI] Error analyzing CV:', error);

        return NextResponse.json(
            {
                error: 'Failed to analyze CV',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
