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
   - N° de documento (DNI o Carnet de Extranjería)
   - Fecha de nacimiento (formato DD/MM/AAAA)
   - Domicilio

2. ANTECEDENTES (CRÍTICO - revisar con cuidado):
   - ANTECEDENTES POLICIALES (Fuente - PNP): ¿Dice "No registra antecedentes" o tiene contenido?
   - ANTECEDENTES JUDICIALES (Fuente - INPE): ¿Dice "No registra antecedentes" o tiene contenido?
   - ANTECEDENTES PENALES (Fuente - Poder Judicial): ¿Dice "No registra antecedentes" o tiene contenido?

3. EXPERIENCIA LABORAL (si está visible):
   - Lista de empresas donde trabajó

REGLAS DE VALIDACIÓN:
- Si el documento NO es un CUL válido → RECHAZAR
- Si el DNI o Carnet de Extranjería NO coincide con el del candidato ({candidateDni}) → RECHAZAR (Indicar "DNI mismatch")
- Si el documento tiene más de 6 meses desde su emisión (Hoy es: {hoy}) → REVISIÓN MANUAL (Indicar "Vencido")
- Si TODOS los antecedentes dicen "No registra antecedentes" → APROBAR
- Si CUALQUIER antecedente tiene contenido diferente → RECHAZAR (Listar los antecedentes)
- Si no puedes leer claramente los antecedentes → REVISIÓN MANUAL

Responde ÚNICAMENTE con este JSON:
{
  "esDocumentoValido": true,
  "datosPersonales": {
    "nombres": "string",
    "apellidos": "string",
    "numeroDocumento": "string",
    "tipoDocumento": "DNI" o "CE",
    "fechaNacimiento": "DD/MM/AAAA",
    "domicilio": "string"
  },
  "fechaEmision": "DD/MM/AAAA",
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
  "observacion": "resumen detallado de lo encontrado",
  "confidence": número del 0 al 100
}
`;

async function analyzeWithVision(imageUrl: string, prompt: string): Promise<any> {
    // Fetch image and convert to base64
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');

    // Determine mime type from URL
    let mimeType = 'image/jpeg';
    const lowerUrl = imageUrl.toLowerCase();
    if (lowerUrl.includes('.png')) mimeType = 'image/png';
    else if (lowerUrl.includes('.pdf') || lowerUrl.includes('alt=media')) {
        // Firebase Storage URLs often end with alt=media, but the file might be a PDF
        // Try to check if 'pdf' is in the path
        if (lowerUrl.includes('pdf')) mimeType = 'application/pdf';
        else mimeType = 'application/pdf'; // Default to PDF for CUL as it's common
    } else if (lowerUrl.includes('.jpg') || lowerUrl.includes('.jpeg')) {
        mimeType = 'image/jpeg';
    }

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

    throw new Error('All vision models failed to analyze the document. Please check the document quality or format.');
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

        const { getAdminFirestore } = await import('@/lib/firebase-admin');
        const dbAdmin = await getAdminFirestore();

        // 1. Fetch candidate info to get DNI for comparison
        let candidateDni = 'No provisto';
        if (candidateId) {
            const candDoc = await dbAdmin.collection('candidates').doc(candidateId).get();
            if (candDoc.exists) {
                candidateDni = candDoc.data()?.dni || 'No provisto';
            }
        }

        // 2. Prepare dynamic prompt
        const hoy = new Date().toLocaleDateString('es-PE');
        const dynamicPrompt = CUL_VALIDATION_PROMPT
            .replace('{candidateDni}', candidateDni)
            .replace('{hoy}', hoy);

        // 3. Analyze with AI
        const analysisResult = await analyzeWithVision(culUrl, dynamicPrompt);

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
                const { Timestamp } = await import('firebase-admin/firestore');

                const updateData = {
                    updatedAt: Timestamp.now(),
                    culStatus: validationStatus === 'approved_ai' ? 'apto' :
                        validationStatus === 'rejected_ai' || validationStatus === 'rejected_invalid_doc' ? 'no_apto' :
                            validationStatus === 'pending_review' ? 'manual_review' : 'pending',
                    culValidationStatus: validationStatus,
                    culAiObservation: validationMessage,
                    culFechaEmision: analysisResult.fechaEmision || null,
                    culDocumentoNumero: analysisResult.datosPersonales?.numeroDocumento || null,
                    culDenunciasEncontradas: analysisResult.antecedentes ?
                        Object.entries(analysisResult.antecedentes)
                            .filter(([_, v]: any) => v.estado === 'con_registros')
                            .map(([key, v]: any) => `${key}: ${v.detalle}`) : [],
                    culConfidence: analysisResult.confidence || 0,
                    culValidatedAt: Timestamp.now()
                };

                await dbAdmin.collection('candidates').doc(candidateId).update(updateData);
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
