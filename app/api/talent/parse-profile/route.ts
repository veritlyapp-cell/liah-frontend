import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import mammoth from 'mammoth';

const apiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

/**
 * POST /api/talent/parse-profile
 * Parses a job profile document and extracts its text/summary
 */
export async function POST(req: NextRequest) {
    console.log('📁 [parse-profile] Request received');

    try {
        // Validate API key
        if (!apiKey) {
            console.error('❌ [parse-profile] No Gemini API key configured');
            return NextResponse.json({
                error: 'API key not configured',
                details: 'GOOGLE_GEMINI_API_KEY or GEMINI_API_KEY not found in environment'
            }, { status: 500 });
        }

        const body = await req.json();
        const { fileBase64, mimeType } = body;

        console.log('📁 [parse-profile] MimeType:', mimeType);
        console.log('📁 [parse-profile] Base64 length:', fileBase64?.length || 0);

        if (!fileBase64 || !mimeType) {
            return NextResponse.json({ error: 'File content and mimeType required' }, { status: 400 });
        }

        let contentToAnalyze: any = null;
        let isDocx = mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            mimeType === 'application/msword' ||
            mimeType.includes('officedocument.wordprocessingml');

        if (isDocx) {
            console.log('📄 [parse-profile] Processing DOCX with mammoth...');
            try {
                const buffer = Buffer.from(fileBase64, 'base64');
                console.log('📄 [parse-profile] Buffer size:', buffer.length);

                const result = await mammoth.extractRawText({ buffer });
                contentToAnalyze = result.value;
                console.log('✅ [parse-profile] Extracted text length:', contentToAnalyze?.length || 0);

                if (!contentToAnalyze || contentToAnalyze.trim().length === 0) {
                    console.warn('⚠️ [parse-profile] No text extracted from DOCX');
                    return NextResponse.json({
                        error: 'No se pudo extraer texto del archivo DOCX',
                        details: 'El archivo parece estar vacío o en un formato no soportado'
                    }, { status: 422 });
                }
            } catch (mammothError: any) {
                console.error('❌ [parse-profile] Mammoth error:', mammothError);
                return NextResponse.json({
                    error: 'Error al procesar archivo DOCX',
                    details: mammothError?.message || 'Error desconocido en mammoth'
                }, { status: 500 });
            }
        } else {
            console.log('📄 [parse-profile] Using Gemini native support for:', mimeType);
            contentToAnalyze = {
                inlineData: {
                    mimeType: mimeType,
                    data: fileBase64
                }
            };
        }

        const { getTalentAI } = await import('@/lib/ai/gemini-talent');
        const ai = getTalentAI();

        // Strictly use user-approved models (2.5 and 3)
        const modelsToTry = [
            'gemini-2.5-flash',
            'gemini-2.5-pro',
            'gemini-3-pro',
            'gemini-2.5-flash-lite'
        ];

        let responseText = '';
        let lastError = null;

        for (const modelName of modelsToTry) {
            try {
                console.log(`🤖 [parse-profile] Attempting with model: ${modelName}`);
                const model = ai.getGenerativeModel({
                    model: modelName,
                    generationConfig: { temperature: 0.4, maxOutputTokens: 2048 }
                });

                const prompt = `Analiza el siguiente contenido que describe un puesto de trabajo.
Extrae TODO el contenido relevante (misión del puesto, responsabilidades, requisitos, beneficios, etc.) y estructúralo de forma clara y profesional.
Devuelve el texto formateado directamente, listo para ser revisado por un reclutador. No incluyas introducciones ni comentarios adicionales.`;

                const result = await model.generateContent([
                    prompt,
                    contentToAnalyze
                ]);

                if (result.response) {
                    responseText = result.response.text();
                    if (responseText && responseText.trim().length > 0) {
                        console.log(`✅ [parse-profile] Success with model: ${modelName}. Length: ${responseText.length}`);
                        break;
                    }
                }
            } catch (err: any) {
                console.warn(`⚠️ [parse-profile] Model ${modelName} failed:`, err.message || err);
                lastError = err;
                continue;
            }
        }

        if (!responseText || responseText.trim().length === 0) {
            console.error('❌ [parse-profile] All approved models (2.5/3) failed');
            return NextResponse.json({
                error: 'Falla en servicios de IA (2.5/3)',
                details: lastError?.message || 'Los modelos configurados no respondieron. Por favor intenta subir el archivo nuevamente o pega el texto directamente.'
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            data: {
                content: responseText
            }
        });

    } catch (error: any) {
        console.error('❌ [parse-profile] Unexpected fatal error:', error);
        return NextResponse.json({
            error: 'Error crítico al procesar documento',
            details: error instanceof Error ? error.message : 'Error desconocido'
        }, { status: 500 });
    }
}
