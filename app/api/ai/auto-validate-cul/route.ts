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

// CUL validation prompt based on real document format
const CUL_VALIDATION_PROMPT = `Analiza esta imagen de un Certificado Único Laboral (CUL) del Perú.

PRIMERO: Verifica que sea un CUL válido. Características:
- Logo "PERÚ Ministerio de Trabajo y Promoción del Empleo" en la esquina superior izquierda
- Título "CERTIFICADO ÚNICO LABORAL" 
- Código QR de verificación
- Número de certificado (formato: 20XXXXXXXXX)
- Secciones: IDENTIDAD, ANTECEDENTES POLICIALES, ANTECEDENTES JUDICIALES, ANTECEDENTES PENALES
- Fuentes: RENIEC, PNP, INPE, Poder Judicial

Si NO es un CUL válido, responde:
{
  "esDocumentoValido": false,
  "tipoDocumentoDetectado": "descripción de qué parece ser",
  "recomendacion": "rechazar",
  "observacion": "El documento subido no es un Certificado Único Laboral válido"
}

Si SÍ es un CUL válido, extrae TODA esta información:

1. DATOS PERSONALES (de la sección IDENTIDAD - Fuente RENIEC):
   - Nombres
   - Apellidos  
   - N° de documento (DNI - 8 dígitos)
   - Fecha de nacimiento (formato DD/MM/AAAA)
   - Domicilio

2. ANTECEDENTES (CRÍTICO - revisar con cuidado):
   - ANTECEDENTES POLICIALES (Fuente - PNP): ¿Dice "No registra antecedentes" o tiene contenido?
   - ANTECEDENTES JUDICIALES (Fuente - INPE): ¿Dice "No registra antecedentes" o tiene contenido?
   - ANTECEDENTES PENALES (Fuente - Poder Judicial): ¿Dice "No registra antecedentes" o tiene contenido?

3. EXPERIENCIA LABORAL (si está visible):
   - Lista de empresas donde trabajó

REGLAS DE VALIDACIÓN:
- Si TODOS los antecedentes dicen "No registra antecedentes" → APROBAR
- Si CUALQUIER antecedente tiene contenido diferente → RECHAZAR y listar los antecedentes
- Si no puedes leer claramente los antecedentes → REVISIÓN MANUAL

Responde ÚNICAMENTE con este JSON:
{
  "esDocumentoValido": true,
  "datosPersonales": {
    "nombres": "string",
    "apellidos": "string",
    "dni": "string de 8 dígitos",
    "fechaNacimiento": "DD/MM/AAAA",
    "domicilio": "string"
  },
  "antecedentes": {
    "policiales": {
      "estado": "limpio" o "con_registros",
      "detalle": "texto exacto que aparece"
    },
    "judiciales": {
      "estado": "limpio" o "con_registros", 
      "detalle": "texto exacto que aparece"
    },
    "penales": {
      "estado": "limpio" o "con_registros",
      "detalle": "texto exacto que aparece"
    }
  },
  "experienciaLaboral": ["lista de empresas"],
  "recomendacion": "aprobar" o "rechazar" o "revisar_manual",
  "observacion": "resumen de la evaluación",
  "confidence": número del 0 al 100
}`;

async function analyzeWithVision(imageUrl: string, prompt: string): Promise<any> {
    // Fetch image and convert to base64
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');

    // Determine mime type from URL
    let mimeType = 'image/jpeg';
    if (imageUrl.includes('.png')) mimeType = 'image/png';
    if (imageUrl.includes('.pdf')) mimeType = 'application/pdf';

    // Try models in order until one works
    for (const modelName of VISION_MODELS) {
        try {
            console.log(`[AUTO-VALIDATE] Trying model: ${modelName}`);
            const model = genAI.getGenerativeModel({ model: modelName });

            const result = await model.generateContent([
                prompt,
                {
                    inlineData: {
                        data: base64Image,
                        mimeType: mimeType
                    }
                }
            ]);

            const responseText = result.response.text();
            console.log(`[AUTO-VALIDATE] Raw response length:`, responseText.length);

            // Parse JSON from response
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }

            throw new Error('No JSON found in response');
        } catch (error: any) {
            console.error(`[AUTO-VALIDATE] Model ${modelName} failed:`, error.message);
            continue;
        }
    }

    throw new Error('All vision models failed');
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { candidateId, culUrl } = body;

        console.log(`[AUTO-VALIDATE] Processing CUL for candidate ${candidateId}`);

        if (!culUrl) {
            return NextResponse.json(
                { error: 'culUrl is required' },
                { status: 400 }
            );
        }

        // Analyze with AI
        const analysisResult = await analyzeWithVision(culUrl, CUL_VALIDATION_PROMPT);

        console.log(`[AUTO-VALIDATE] Analysis complete:`, JSON.stringify(analysisResult, null, 2));

        // Determine validation status
        let validationStatus = 'pending_review';
        let validationMessage = '';

        if (!analysisResult.esDocumentoValido) {
            validationStatus = 'rejected_invalid_doc';
            validationMessage = analysisResult.observacion || 'Documento no válido';
        } else if (analysisResult.recomendacion === 'aprobar' && analysisResult.confidence >= 80) {
            validationStatus = 'approved_ai';
            validationMessage = '✅ CUL verificado - Sin antecedentes registrados';
        } else if (analysisResult.recomendacion === 'rechazar') {
            validationStatus = 'rejected_ai';
            validationMessage = analysisResult.observacion || 'Antecedentes encontrados';
        } else {
            validationStatus = 'pending_review';
            validationMessage = '⚠️ Requiere revisión manual - La IA no pudo determinar con certeza';
        }

        // If we have candidate ID, update the candidate record
        if (candidateId) {
            try {
                await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/candidates/update-validation`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        candidateId,
                        updateType: 'cul_validation',
                        data: {
                            status: validationStatus,
                            aiObservation: validationMessage,
                            denunciasEncontradas: analysisResult.antecedentes ?
                                Object.entries(analysisResult.antecedentes)
                                    .filter(([_, v]: any) => v.estado === 'con_registros')
                                    .map(([key, v]: any) => `${key}: ${v.detalle}`) : [],
                            confidence: analysisResult.confidence,
                            extractedData: analysisResult.datosPersonales
                        }
                    })
                });
                console.log(`[AUTO-VALIDATE] Candidate ${candidateId} updated with status: ${validationStatus}`);
            } catch (updateError) {
                console.error(`[AUTO-VALIDATE] Failed to update candidate:`, updateError);
            }
        }

        return NextResponse.json({
            success: true,
            validationStatus,
            validationMessage,
            esDocumentoValido: analysisResult.esDocumentoValido,
            datosPersonales: analysisResult.datosPersonales,
            antecedentes: analysisResult.antecedentes,
            experienciaLaboral: analysisResult.experienciaLaboral,
            confidence: analysisResult.confidence,
            recomendacion: analysisResult.recomendacion
        });

    } catch (error: any) {
        console.error('[AUTO-VALIDATE] Error:', error);
        return NextResponse.json(
            {
                error: error.message || 'Error validating document',
                validationStatus: 'pending_review',
                validationMessage: 'Error en validación automática - Requiere revisión manual'
            },
            { status: 500 }
        );
    }
}
