import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');

const VISION_MODELS = [
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-pro'
];

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
  "recomendacion": "aprobar" o "rechazar" o "revisar_manual",
  "observacion": "resumen detallado de lo encontrado",
  "confidence": número del 0 al 100
}
`;

async function analyzeWithVision(imageUrl: string, prompt: string): Promise<any> {
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');

    let mimeType = 'application/pdf';
    const lowerUrl = imageUrl.toLowerCase();
    if (lowerUrl.includes('.png')) mimeType = 'image/png';
    else if (lowerUrl.includes('.jpg') || lowerUrl.includes('.jpeg')) mimeType = 'image/jpeg';

    for (const modelName of VISION_MODELS) {
        try {
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
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) return JSON.parse(jsonMatch[0]);
        } catch (error) {
            continue;
        }
    }
    throw new Error('All vision models failed');
}

export async function POST(req: NextRequest) {
    try {
        const { candidateId, culUrl, candidateDni } = await req.json();

        if (!culUrl) return NextResponse.json({ error: 'culUrl is required' }, { status: 400 });

        const hoy = new Date().toLocaleDateString('es-PE');
        const dynamicPrompt = CUL_VALIDATION_PROMPT
            .replace('{candidateDni}', candidateDni || 'No provisto')
            .replace('{hoy}', hoy);

        const analysisResult = await analyzeWithVision(culUrl, dynamicPrompt);

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
            validationMessage = '⚠️ Requiere revisión manual';
        }

        if (candidateId) {
            const { getAdminFirestore } = await import('@/lib/firebase-admin');
            const dbAdmin = getAdminFirestore();
            const { Timestamp } = await import('firebase-admin/firestore');

            const updateData = {
                culUrl,
                culValidationStatus: validationStatus,
                culAiObservation: validationMessage,
                culExtractedData: analysisResult,
                culValidatedAt: Timestamp.now()
            };

            await dbAdmin.collection('talent_candidates').doc(candidateId).update(updateData);
        }

        return NextResponse.json({
            success: true,
            validationStatus,
            validationMessage,
            analysisResult
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
