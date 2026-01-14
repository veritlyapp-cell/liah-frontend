/**
 * Liah Talent - JD Generation API
 * POST /api/talent/generate-jd
 * 
 * Generates optimized Job Description using AI and RAG
 * Uses Gemini 2.5 Pro for creative generation
 */
import { NextRequest, NextResponse } from 'next/server';
import { generateJD } from '@/lib/ai/gemini-talent';

export async function POST(req: NextRequest) {
    try {
        const { titulo, descripcionBase, jdsSimilares } = await req.json();

        // Validate input
        if (!titulo) {
            return NextResponse.json(
                { error: 'titulo is required' },
                { status: 400 }
            );
        }

        console.log(`[Talent AI] Generating JD for: ${titulo}`);

        // Generate with Gemini 2.5 Pro
        const jdContent = await generateJD(
            titulo,
            descripcionBase || '',
            jdsSimilares || []
        );

        console.log('[Talent AI] JD generated successfully');

        return NextResponse.json({
            success: true,
            data: {
                titulo,
                jd_content: jdContent
            }
        });

    } catch (error) {
        console.error('[Talent AI] Error generating JD:', error);

        return NextResponse.json(
            {
                error: 'Failed to generate JD',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
