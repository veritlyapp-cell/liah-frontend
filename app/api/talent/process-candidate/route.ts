/**
 * Liah Talent - Process Candidate API
 * POST /api/talent/process-candidate
 * 
 * Triggers AI analysis for candidates in PENDING_ANALYSIS status
 * Called after application submission or when recovering a rejected candidate
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { analyzeCVMatch, getTalentAI } from '@/lib/ai/gemini-talent';
import mammoth from 'mammoth';

// Get Admin Firestore instance
const adminDb = getAdminFirestore();

/**
 * Extract CV content from a URL - supports PDF, Word (DOCX), and images
 */
async function extractCVFromUrl(cvUrl: string): Promise<string> {
    try {
        console.log('[CV Extraction] Fetching CV from:', cvUrl);

        // Fetch the file
        const response = await fetch(cvUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch CV: ${response.status}`);
        }

        const contentType = response.headers.get('content-type') || '';
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        console.log('[CV Extraction] File type:', contentType, 'Size:', arrayBuffer.byteLength);

        // Check if it's a Word document
        const isWordDoc = contentType.includes('officedocument.wordprocessingml') ||
            contentType.includes('msword') ||
            cvUrl.toLowerCase().endsWith('.docx') ||
            cvUrl.toLowerCase().endsWith('.doc');

        if (isWordDoc) {
            console.log('[CV Extraction] Processing Word document with mammoth...');
            try {
                const result = await mammoth.extractRawText({ buffer });
                const extractedText = result.value;
                console.log('[CV Extraction] Word text extracted:', extractedText.length, 'characters');

                if (extractedText && extractedText.trim().length > 50) {
                    return extractedText;
                }
            } catch (mammothError) {
                console.error('[CV Extraction] Mammoth error, falling back to Gemini:', mammothError);
            }
        }

        // For PDF, images, or if Word extraction failed - use Gemini Vision
        console.log('[CV Extraction] Using Gemini 2.5 Flash for extraction...');
        const ai = getTalentAI();
        const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const base64 = buffer.toString('base64');
        let mimeType = contentType;
        if (contentType.includes('pdf')) mimeType = 'application/pdf';
        else if (isWordDoc) mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

        const result = await model.generateContent([
            `Extrae TODO el contenido de texto de este CV/currículum. 
Incluye TODA la información: datos personales, experiencia laboral (empresas, cargos, fechas, responsabilidades), 
educación, habilidades, certificaciones, logros, etc.
Devuelve el texto extraído de forma estructurada y completa, sin omitir nada importante.
Si hay números o porcentajes que indiquen logros, inclúyelos.`,
            {
                inlineData: {
                    mimeType: mimeType,
                    data: base64
                }
            }
        ]);

        const extractedText = result.response.text();
        console.log('[CV Extraction] Gemini extracted', extractedText.length, 'characters');

        return extractedText;
    } catch (error) {
        console.error('[CV Extraction] Error:', error);
        throw error;
    }
}

export async function POST(req: NextRequest) {
    try {
        const { candidateId, forceAnalysis } = await req.json();

        if (!candidateId) {
            return NextResponse.json({ error: 'candidateId is required' }, { status: 400 });
        }

        // Get candidate using Admin SDK
        const candidateRef = adminDb.collection('talent_applications').doc(candidateId);
        const candidateSnap = await candidateRef.get();

        if (!candidateSnap.exists) {
            return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
        }

        const candidate = candidateSnap.data() as any;

        // Check if should process
        if (candidate.status !== 'PENDING_ANALYSIS' && !forceAnalysis) {
            return NextResponse.json({
                error: 'Candidate not in PENDING_ANALYSIS status',
                currentStatus: candidate.status
            }, { status: 400 });
        }

        // Get job for JD content
        const jobRef = adminDb.collection('talent_jobs').doc(candidate.jobId);
        const jobSnap = await jobRef.get();

        if (!jobSnap.exists) {
            return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        }

        const job = jobSnap.data() as any;

        // Extract CV content - Force re-extraction if forceAnalysis is true
        let cvContent = candidate.cvContent;

        // Force re-extraction if forceAnalysis OR if cvContent is empty/short
        const shouldExtract = forceAnalysis || !cvContent || cvContent.length < 100;

        if (shouldExtract && candidate.cvUrl) {
            console.log('[Talent AI] Extracting CV content from URL for candidate:', candidateId);
            console.log('[Talent AI] CV URL:', candidate.cvUrl);
            console.log('[Talent AI] Force extraction:', forceAnalysis, 'Existing content length:', cvContent?.length || 0);
            try {
                cvContent = await extractCVFromUrl(candidate.cvUrl);
                console.log('[Talent AI] Extracted CV content length:', cvContent.length);

                // Store the extracted content for future use
                await candidateRef.update({
                    cvContent: cvContent,
                    cvExtractedAt: new Date()
                });
            } catch (extractError) {
                console.error('[Talent AI] Failed to extract CV, using basic info:', extractError);
                cvContent = `
                    Candidato: ${candidate.nombre}
                    Email: ${candidate.email}
                    Teléfono: ${candidate.telefono || 'No proporcionado'}
                    LinkedIn: ${candidate.linkedin || 'No proporcionado'}
                    Nota: No se pudo procesar el archivo CV adjunto.
                `;
            }
        }

        if (!cvContent) {
            cvContent = `
                Candidato: ${candidate.nombre}
                Email: ${candidate.email}
                Teléfono: ${candidate.telefono || 'No proporcionado'}
                Nota: No se proporcionó CV.
            `;
        }

        console.log(`[Talent AI] Analyzing candidate ${candidateId} for job ${candidate.jobId}`);
        console.log(`[Talent AI] CV content length: ${cvContent.length} characters`);

        // Build JD content from job profile
        const jdContent = job.jd_content || `
            Título: ${job.titulo}
            Descripción: ${job.descripcion || ''}
            Requisitos: ${job.requisitos || ''}
        `;

        // Run AI analysis with killer question answers
        const killerAnswers = candidate.killerAnswers || candidate.kqAnswers || null;
        const analysis = await analyzeCVMatch(cvContent, jdContent, killerAnswers);

        console.log(`[Talent AI] Match score: ${analysis.matchScore}%`);

        // NOTE: Auto-rejection disabled per user request
        // Candidates go to screening with visible score so recruiters can manually batch-reject
        const newStatus = 'SCREENING';

        // Update candidate with analysis results
        await candidateRef.update({
            status: newStatus,
            currentStage: 'applied',
            funnelStage: 'applied',
            matchScore: analysis.matchScore,
            aiAnalysis: analysis,
            analyzedAt: new Date()
        });

        return NextResponse.json({
            success: true,
            data: {
                candidateId,
                matchScore: analysis.matchScore,
                status: newStatus,
                cvExtracted: !!candidate.cvUrl
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
