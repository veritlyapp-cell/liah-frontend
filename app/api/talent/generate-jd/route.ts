/**
 * Liah Talent - JD Generation API
 * POST /api/talent/generate-jd
 * 
 * Generates optimized Job Description using AI and RAG
 * Uses Gemini 2.5 Pro for creative generation
 */
import { NextRequest, NextResponse } from 'next/server';
import { generateJD } from '@/lib/ai/gemini-talent';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function POST(req: NextRequest) {
    try {
        const { titulo, descripcionBase, jdsSimilares, holdingId } = await req.json();

        // Validate input
        if (!titulo) {
            return NextResponse.json(
                { error: 'titulo is required' },
                { status: 400 }
            );
        }

        console.log(`[Talent AI] Generating JD for: ${titulo}`);

        // Fetch holding name if holdingId provided
        let holdingName = 'Nuestra empresa';
        if (holdingId) {
            try {
                const holdingDoc = await getDoc(doc(db, 'holdings', holdingId));
                if (holdingDoc.exists()) {
                    holdingName = holdingDoc.data()?.nombre || holdingName;
                }
            } catch (e) {
                console.warn('[Talent AI] Could not fetch holding name:', e);
            }
        }

        console.log(`[Talent AI] Using holding name: ${holdingName}`);

        // Generate with Gemini 2.5 Pro
        const jdContent = await generateJD(
            titulo,
            descripcionBase || '',
            jdsSimilares || [],
            holdingName
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
