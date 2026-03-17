import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/middleware/rate-limit';
import { verifyAuth } from '@/lib/middleware/auth-verify';

export const dynamic = 'force-dynamic';

// Initialize Gemini with fallback models
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');

const VISION_MODELS = [
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-3-pro',
    'gemini-2.5-flash-lite'
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
- Si el DNI o Carnet de Extranjería NO coincide con el del candidato ({candidateDni}) → RECHAZAR (Indicar "DNI mismatch: el documento pertenece a otra persona")
- Si el DNI coincide pero los nombres/apellidos son COMPLETAMENTE diferentes → RECHAZAR (Indicar "Nombre no coincide")
- IMPORTANTE: Si el DNI coincide ({candidateDni}) y al menos un nombre y un apellido coinciden con ({candidateNombre}), marca como APROBAR aunque falte un segundo nombre o apellido en la declaración. El DNI manda.
- Si el documento tiene más de 6 meses desde su emisión (Hoy es: {hoy}) → REVISIÓN MANUAL (Indicar "Vencido")
- Si TODOS los antecedentes dicen "No registra antecedentes" → APROBAR
- Si CUALQUIER antecedente tiene contenido diferente → RECHAZAR (Listar los antecedentes)
- Solo usa REVISIÓN MANUAL si la imagen es ilegible o realmente ambigua en los antecedentes. Si el DNI y antecedentes están claros, decide entre APROBAR o RECHAZAR.

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
        // Rate limiting check
        const clientIP = getClientIP(req);
        const rateLimit = checkRateLimit(clientIP, RATE_LIMITS.ai);

        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: 'Too many requests. Please wait and try again.' },
                {
                    status: 429,
                    headers: { 'Retry-After': String(rateLimit.retryAfter) }
                }
            );
        }

        // Auth verification (optional - log user if available)
        const authResult = await verifyAuth(req);
        const userId = authResult.authenticated ? authResult.user?.uid : 'anonymous';

        const body = await req.json();
        const { candidateId, culUrl, candidateDni: bodyDni, candidateNombre: bodyNombre } = body;

        console.log(`[AUTO-VALIDATE] Processing CUL for candidate ${candidateId}. Body DNI: ${bodyDni}, Name: ${bodyNombre}`);

        if (!culUrl) {
            return NextResponse.json(
                { error: 'culUrl is required' },
                { status: 400 }
            );
        }

        const { getAdminFirestore } = await import('@/lib/firebase-admin');
        const dbAdmin = getAdminFirestore();

        // 1. Fetch candidate info to get DNI and names for comparison (use body values as primary, DB as fallback)
        let candidateDni = bodyDni || 'No provisto';
        let candidateNombre = bodyNombre || 'No provisto';
        
        if (candidateId && (candidateDni === 'No provisto' || candidateNombre === 'No provisto')) {
            const candDoc = await dbAdmin.collection('candidates').doc(candidateId).get();
            if (candDoc.exists) {
                const data = candDoc.data();
                if (candidateDni === 'No provisto') candidateDni = data?.dni || 'No provisto';
                if (candidateNombre === 'No provisto') {
                    candidateNombre = `${data?.nombre || ''} ${data?.apellidoPaterno || ''} ${data?.apellidoMaterno || ''}`.trim() || 'No provisto';
                }
            }
        }

        // 2. Prepare dynamic prompt
        const hoy = new Date().toLocaleDateString('es-PE');
        const dynamicPrompt = CUL_VALIDATION_PROMPT
            .replace('{candidateDni}', candidateDni)
            .replace('{candidateNombre}', candidateNombre)
            .replace('{hoy}', hoy);

        // 3. Analyze with AI
        const analysisResult = await analyzeWithVision(culUrl, dynamicPrompt);

        console.log(`[AUTO-VALIDATE] Analysis complete:`, JSON.stringify(analysisResult, null, 2));

        // Refuerzo de detección de mismatch de DNI o Nombre
        const cleanExtractedDni = analysisResult.datosPersonales?.numeroDocumento?.replace(/\D/g, '');
        const cleanCandidateDni = candidateDni.replace(/\D/g, '');
        const isDniMismatch = analysisResult.esDocumentoValido && cleanExtractedDni && cleanCandidateDni && cleanExtractedDni !== cleanCandidateDni;
        const obsLower = (analysisResult.observacion || '').toLowerCase();
        const isNameMismatch = analysisResult.recomendacion === 'rechazar' && (obsLower.includes('nombre no coincide') || obsLower.includes('dni mismatch'));
        
        // Determine validation status
        let validationStatus = 'pending_review';
        let validationMessage = '';

        if (!analysisResult.esDocumentoValido || isDniMismatch || isNameMismatch) {
            validationStatus = 'rejected_invalid_doc';
            validationMessage = analysisResult.observacion || (isDniMismatch ? 'El DNI del documento no coincide con el tuyo' : 'Documento no válido o no coincide');
        } else if (analysisResult.recomendacion === 'aprobar' && analysisResult.confidence >= 80) {
            validationStatus = 'approved_ai';
            validationMessage = '✅ Datos Validados por LIAH (DNI, Nombre Completo y Sin Antecedentes)';
        } else if (analysisResult.recomendacion === 'rechazar') {
            validationStatus = 'rejected_ai';
            validationMessage = analysisResult.observacion || 'Antecedentes encontrados';
        } else {
            validationStatus = 'pending_review';
            validationMessage = '⚠️ Requiere revisión manual - La IA no pudo determinar con certeza';
        }

        // Refuerzo de lógica: Si el DNI coincide exactamente y la confianza es > 95%, forzamos aprobación
        if (validationStatus === 'pending_review' && 
            analysisResult.confidence >= 95 && 
            cleanExtractedDni === cleanCandidateDni &&
            analysisResult.antecedentes?.policiales?.estado === 'limpio') {
                validationStatus = 'approved_ai';
                validationMessage = '✅ Datos Validados por LIAH (DNI coincide al 100% y Sin Antecedentes)';
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
