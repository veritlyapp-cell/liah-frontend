import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import mammoth from 'mammoth';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '');

/**
 * POST /api/talent/parse-profile
 * Parses a job profile document and extracts its text/summary
 */
export async function POST(req: NextRequest) {
    try {
        const { fileBase64, mimeType } = await req.json();

        if (!fileBase64 || !mimeType) {
            return NextResponse.json({ error: 'File content and mimeType required' }, { status: 400 });
        }

        let contentToAnalyze: any = null;
        let isDocx = mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            mimeType === 'application/msword' ||
            mimeType.includes('officedocument.wordprocessingml');

        if (isDocx) {
            console.log('📄 Processing DOCX with mammoth...');
            const buffer = Buffer.from(fileBase64, 'base64');
            const result = await mammoth.extractRawText({ buffer });
            contentToAnalyze = result.value; // Extracted text
            console.log('✅ Extracted text length:', contentToAnalyze.length);

            if (!contentToAnalyze || contentToAnalyze.trim().length === 0) {
                return NextResponse.json({ error: 'No se pudo extraer texto del archivo DOCX' }, { status: 422 });
            }
        } else {
            // Use Gemini's native support for PDF and images
            contentToAnalyze = {
                inlineData: {
                    mimeType: mimeType,
                    data: fileBase64
                }
            };
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `Analiza el siguiente contenido que describe un puesto de trabajo.
Extrae TODO el contenido relevante (misión del puesto, responsabilidades, requisitos, beneficios, etc.) y estructúralo de forma clara y profesional.
Devuelve el texto formateado directamente, listo para ser revisado por un reclutador. No incluyas introducciones ni comentarios adicionales.`;

        const result = await model.generateContent([
            prompt,
            contentToAnalyze
        ]);

        const responseText = result.response.text();

        return NextResponse.json({
            success: true,
            data: {
                content: responseText
            }
        });

    } catch (error) {
        console.error('Error parsing profile document:', error);
        return NextResponse.json({
            error: 'Failed to parse document',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
