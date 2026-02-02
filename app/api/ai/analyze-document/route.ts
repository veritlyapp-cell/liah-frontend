import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini with fallback models
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');

// Model priority list (2026 - Gemini models)
const VISION_MODELS = [
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-3-pro',
    'gemini-2.0-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.0-flash-lite'
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

const CUL_PROMPT = `Analiza este Certificado Único Laboral (CUL) del Perú (Certificado CERTIJOVEN o CERTIADULTO).
Este documento es CRÍTICO para la seguridad de la empresa. Contiene el historial laboral y antecedentes penales, judiciales y policiales.

INSTRUCCIONES DE ANÁLISIS:
1. ANTECEDENTES: Busca CUALQUIER mención de "ANTECEDENTES PENALES", "ANTECEDENTES POLICIALES" o "ANTECEDENTES JUDICIALES". Reporta si hay registros o si está limpio.
2. DENUNCIAS: Busca tablas o secciones de "DENUNCIAS" o "PROCESSES".
3. FECHA DE EMISIÓN: Busca la fecha en que se generó este documento (generalmente dice "Fecha de emisión" o aparece cerca del código QR).
4. VALIDACIÓN: El documento debe ser un PDF oficial del Ministerio de Trabajo.

Responde ÚNICAMENTE con JSON válido:
{
  "tieneDenuncias": true/false (true si hay CUALQUIER antecedente o denuncia),
  "tieneAntecedentesNegativos": true/false,
  "documentoAutentico": true/false/"no_claro",
  "nombreTitular": "Nombre completo",
  "dniTitular": "DNI",
  "fechaEmision": "DD/MM/AAAA",
  "denunciasEncontradas": ["Lista detallada de antecedentes o denuncias detectadas"],
  "observacion": "Resumen ejecutivo del perfil de seguridad",
  "recomendacion": "aprobar" (si no hay nada), "rechazar" (si hay antecedentes graves), "revisar_manual" (si hay dudas o es antiguo),
  "confidence": 0-100
}`;

// Detect MIME type from URL
function getMimeType(url: string): string {
    const lowerUrl = url.toLowerCase();

    // Check by extension in path
    if (lowerUrl.includes('.pdf')) return 'application/pdf';
    if (lowerUrl.includes('.png')) return 'image/png';
    if (lowerUrl.includes('.jpg') || lowerUrl.includes('.jpeg')) return 'image/jpeg';
    if (lowerUrl.includes('.webp')) return 'image/webp';

    // If extensions are not present (common in storage URLs with tokens),
    // check for keywords in the URL or default to application/pdf for CUL and image/jpeg for rest
    if (lowerUrl.includes('pdf')) return 'application/pdf';
    if (lowerUrl.includes('image')) return 'image/jpeg';

    // Last resort based on the document's nature in this app
    return lowerUrl.includes('cul') ? 'application/pdf' : 'image/jpeg';
}

async function analyzeWithVision(documentUrl: string, prompt: string): Promise<any> {
    console.log(`[DOCUMENT IA] 🚀 Starting analysis for URL: ${documentUrl.substring(0, 80)}...`);

    // Fetch document and convert to base64
    const response = await fetch(documentUrl);
    if (!response.ok) {
        throw new Error(`Failed to fetch document: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    const base64Data = Buffer.from(buffer).toString('base64');
    const mimeType = getMimeType(documentUrl);

    console.log(`[DOCUMENT IA] 📄 Document fetched. Size: ${buffer.byteLength} bytes, Type: ${mimeType}`);

    // Try models in order until one works
    let lastError: any = null;
    for (const modelName of VISION_MODELS) {
        try {
            console.log(`[DOCUMENT IA] 🤖 Attempting with model: ${modelName}`);
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
            console.log(`[DOCUMENT IA] ✅ Model ${modelName} success! Raw Response:`, responseText.substring(0, 200));

            // Parse JSON from response
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }

            throw new Error('No JSON found in response');
        } catch (error: any) {
            console.warn(`[DOCUMENT IA] ❌ Model ${modelName} failed. Error: ${error.message}`);
            lastError = error;
            // Check for quota error
            if (error.message?.includes('429') || error.message?.toLowerCase().includes('quota')) {
                console.warn(`[DOCUMENT IA] ⚠️ Model ${modelName} Quota Exceeded. Moving to fallback...`);
            }
            continue;
        }
    }

    throw new Error(`All vision models failed. Last error: ${lastError?.message || 'Unknown'}`);
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

        console.log(`[DOCUMENT AI] ✅ Analysis result for candidate ${candidateId}:`, {
            type: documentType,
            confidence: analysisResult.confidence,
            extracted: documentType === 'dni' ? analysisResult.dni : analysisResult.nombreTitular,
            recommendation: analysisResult.recomendacion
        });

        // Determine validation status for CUL
        let validationStatus = null;
        let dniMismatch = false;

        if (documentType === 'cul') {
            // Check if DNI from CUL matches candidate's DNI (if provided)
            const candidateDni = body.candidateDni;
            const culDni = analysisResult.dniTitular?.replace(/\D/g, ''); // Remove non-digits

            // Check CUL emission date (must be less than 6 months old)
            let culExpired = false;
            if (analysisResult.fechaEmision) {
                try {
                    // Parse DD/MM/AAAA format
                    const [day, month, year] = analysisResult.fechaEmision.split('/');
                    const emissionDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                    const sixMonthsAgo = new Date();
                    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

                    if (emissionDate < sixMonthsAgo) {
                        console.log(`[DOCUMENT AI] ⚠️ CUL EXPIRED: Emission date ${analysisResult.fechaEmision} is older than 6 months`);
                        culExpired = true;
                    }
                } catch (e) {
                    console.log(`[DOCUMENT AI] Could not parse CUL emission date: ${analysisResult.fechaEmision}`);
                }
            }

            if (candidateDni && culDni && candidateDni !== culDni) {
                console.log(`[DOCUMENT AI] ⚠️ DNI MISMATCH: Candidate=${candidateDni}, CUL=${culDni}`);
                validationStatus = 'dni_mismatch';
                dniMismatch = true;
            } else if (culExpired) {
                // CUL older than 6 months - requires manual review
                validationStatus = 'pending_review';
                analysisResult.observacion = (analysisResult.observacion || '') + ' ⚠️ CUL tiene más de 6 meses de antigüedad, requiere actualización.';
            } else if (analysisResult.recomendacion === 'aprobar' && analysisResult.confidence >= 80) {
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
            } : {
                nombreTitular: analysisResult.nombreTitular,
                dniTitular: analysisResult.dniTitular
            },
            validationStatus,
            dniMismatch,
            aiObservation: dniMismatch
                ? `⚠️ DNI NO COINCIDE: El CUL pertenece a DNI ${analysisResult.dniTitular || 'no legible'}. ${analysisResult.observacion || ''}`
                : analysisResult.observacion,
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
