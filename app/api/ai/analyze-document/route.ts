import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini with fallback models
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');

// Model priority list (2026 models)
const VISION_MODELS = [
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.0-flash',
    'gemini-2.5-pro'
];

// Prompts for document analysis
const DNI_PROMPT = `Analiza esta imagen de un DNI peruano y extrae los datos.
Busca:
1. Nombre completo (nombres y apellidos)
2. Número de DNI (8 dígitos)
3. Fecha de nacimiento
4. Dirección (si es visible)
5. Sexo (M/F)

Responde ÚNICAMENTE con JSON válido, sin markdown ni explicaciones:
{
  "nombreCompleto": "string",
  "dni": "string de 8 dígitos",
  "fechaNacimiento": "DD/MM/AAAA",
  "direccion": "string o null si no es visible",
  "sexo": "M" o "F",
  "confidence": número del 0 al 100,
  "observacion": "cualquier nota relevante"
}`;

const CUL_PROMPT = `Analiza este Certificado Único Laboral (CUL) del Perú.
Este documento contiene el historial laboral y posibles denuncias de un trabajador.

Busca cuidadosamente:
1. ¿Tiene denuncias laborales registradas? (demandas, multas, sanciones)
2. ¿Tiene antecedentes negativos? (despidos por falta grave, etc.)
3. ¿El documento parece auténtico? (sellos, formato oficial)
4. Nombre del titular
5. DNI del titular

Responde ÚNICAMENTE con JSON válido, sin markdown ni explicaciones:
{
  "tieneDenuncias": true o false,
  "tieneAntecedentesNegativos": true o false,
  "documentoAutentico": true, false, o "no_claro",
  "nombreTitular": "string",
  "dniTitular": "string",
  "denunciasEncontradas": ["lista de denuncias si las hay"],
  "observacion": "Descripción detallada de lo encontrado",
  "recomendacion": "aprobar" o "rechazar" o "revisar_manual",
  "confidence": número del 0 al 100
}`;

// Detect MIME type from URL
function getMimeType(url: string): string {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('.pdf')) return 'application/pdf';
    if (lowerUrl.includes('.png')) return 'image/png';
    if (lowerUrl.includes('.jpg') || lowerUrl.includes('.jpeg')) return 'image/jpeg';
    if (lowerUrl.includes('.webp')) return 'image/webp';
    // For Firebase Storage URLs, try to detect from token part or default to PDF for CUL
    if (lowerUrl.includes('pdf')) return 'application/pdf';
    return 'image/jpeg';  // fallback
}

async function analyzeWithVision(documentUrl: string, prompt: string): Promise<any> {
    console.log(`[DOCUMENT AI] Starting analysis for URL: ${documentUrl.substring(0, 100)}...`);

    // Fetch document and convert to base64
    const response = await fetch(documentUrl);
    if (!response.ok) {
        throw new Error(`Failed to fetch document: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    const base64Data = Buffer.from(buffer).toString('base64');
    const mimeType = getMimeType(documentUrl);

    console.log(`[DOCUMENT AI] Document fetched. Size: ${buffer.byteLength} bytes, Type: ${mimeType}`);

    // Try models in order until one works
    for (const modelName of VISION_MODELS) {
        try {
            console.log(`[DOCUMENT AI] Trying model: ${modelName}`);
            const model = genAI.getGenerativeModel({ model: modelName });

            const result = await model.generateContent([
                prompt,
                {
                    inlineData: {
                        data: base64Data,
                        mimeType: mimeType
                    }
                }
            ]);

            const responseText = result.response.text();
            console.log(`[DOCUMENT AI] Raw response:`, responseText.substring(0, 500));

            // Parse JSON from response
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }

            throw new Error('No JSON found in response');
        } catch (error: any) {
            console.error(`[DOCUMENT AI] Model ${modelName} failed:`, error.message);
            continue;
        }
    }

    throw new Error('All vision models failed');
}


export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { documentType, documentUrl, candidateId } = body;

        console.log(`[DOCUMENT AI] Analyzing ${documentType} for candidate ${candidateId}`);

        if (!documentType || !documentUrl) {
            return NextResponse.json(
                { error: 'documentType and documentUrl are required' },
                { status: 400 }
            );
        }

        if (!['dni', 'cul'].includes(documentType)) {
            return NextResponse.json(
                { error: 'documentType must be "dni" or "cul"' },
                { status: 400 }
            );
        }

        const prompt = documentType === 'dni' ? DNI_PROMPT : CUL_PROMPT;
        const analysisResult = await analyzeWithVision(documentUrl, prompt);

        console.log(`[DOCUMENT AI] Analysis complete:`, analysisResult);

        // Determine validation status for CUL
        let validationStatus = null;
        if (documentType === 'cul') {
            if (analysisResult.recomendacion === 'aprobar' && analysisResult.confidence >= 80) {
                validationStatus = 'approved_ai';
            } else if (analysisResult.recomendacion === 'rechazar' && analysisResult.confidence >= 80) {
                validationStatus = 'rejected_ai';
            } else {
                validationStatus = 'pending_review';
            }
        }

        return NextResponse.json({
            success: true,
            documentType,
            extractedData: documentType === 'dni' ? {
                nombreCompleto: analysisResult.nombreCompleto,
                dni: analysisResult.dni,
                fechaNacimiento: analysisResult.fechaNacimiento,
                direccion: analysisResult.direccion,
                sexo: analysisResult.sexo
            } : null,
            validationStatus,
            aiObservation: analysisResult.observacion,
            denunciasEncontradas: analysisResult.denunciasEncontradas || [],
            confidence: analysisResult.confidence,
            rawAnalysis: analysisResult
        });

    } catch (error: any) {
        console.error('[DOCUMENT AI] Error:', error);
        return NextResponse.json(
            {
                error: error.message || 'Error analyzing document',
                suggestion: 'El documento no pudo ser analizado. Marcar para revisión manual.'
            },
            { status: 500 }
        );
    }
}
