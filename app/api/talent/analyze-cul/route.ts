import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getAdminFirestore } from '@/lib/firebase-admin';

// Get Admin Firestore instance
const adminDb = getAdminFirestore();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface CulAnalysisResult {
    nombreCompleto: string;
    dni: string;
    fechaNacimiento: string | null;
    estadoLaboral: string;
    empleadorActual: string | null;
    ultimoEmpleador: string | null;
    experienciaLaboral: {
        empresa: string;
        puesto: string;
        periodo: string;
    }[];
    antecedentes: boolean;
    documentoValido: boolean;
    fechaEmision: string | null;
    observaciones: string | null;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { applicationId, culBase64, mimeType } = body;

        if (!culBase64) {
            return NextResponse.json({ error: 'No CUL document provided' }, { status: 400 });
        }

        // Analyze CUL with Gemini Vision
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const prompt = `Analiza el siguiente Certificado Único Laboral (CUL) del Perú y extrae la información en formato JSON.

El CUL es un documento oficial del Ministerio de Trabajo del Perú que contiene:
- Datos personales del trabajador (nombre, DNI)
- Historial laboral
- Estado laboral actual
- Antecedentes

Extrae la información y devuelve SOLO un JSON válido con esta estructura (sin markdown, sin texto adicional):
{
    "nombreCompleto": "string - nombre completo del titular",
    "dni": "string - número de DNI",
    "fechaNacimiento": "string o null - fecha de nacimiento si aparece",
    "estadoLaboral": "string - 'empleado', 'desempleado' o 'independiente'",
    "empleadorActual": "string o null - nombre del empleador actual si está empleado",
    "ultimoEmpleador": "string o null - último empleador si está desempleado",
    "experienciaLaboral": [
        {
            "empresa": "string - nombre de la empresa",
            "puesto": "string - cargo ocupado",
            "periodo": "string - periodo laborado (ej: '2020-2022')"
        }
    ],
    "antecedentes": boolean - true si tiene antecedentes laborales negativos,
    "documentoValido": boolean - true si el documento parece auténtico,
    "fechaEmision": "string o null - fecha de emisión del documento",
    "observaciones": "string o null - cualquier observación importante"
}

Analiza cuidadosamente la imagen del documento.`;

        const result = await model.generateContent([
            { text: prompt },
            {
                inlineData: {
                    mimeType: mimeType || 'image/jpeg',
                    data: culBase64
                }
            }
        ]);

        const response = await result.response;
        let analysisText = response.text();

        // Clean up the response (remove markdown if present)
        analysisText = analysisText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        let analysisData: CulAnalysisResult;
        try {
            analysisData = JSON.parse(analysisText);
        } catch (parseErr) {
            console.error('Error parsing CUL analysis:', parseErr);
            analysisData = {
                nombreCompleto: '',
                dni: '',
                fechaNacimiento: null,
                estadoLaboral: 'desconocido',
                empleadorActual: null,
                ultimoEmpleador: null,
                experienciaLaboral: [],
                antecedentes: false,
                documentoValido: false,
                fechaEmision: null,
                observaciones: 'Error al procesar el documento. Por favor verifique manualmente.'
            };
        }

        // Update application with analysis results if applicationId provided
        if (applicationId) {
            try {
                await adminDb.collection('talent_applications').doc(applicationId).update({
                    culAnalysis: analysisData,
                    culStatus: analysisData.documentoValido ? 'verified' : 'review_needed',
                    culVerifiedAt: new Date(),
                    // Also update candidate profile with extracted info
                    culDni: analysisData.dni,
                    culNombreCompleto: analysisData.nombreCompleto,
                    culEstadoLaboral: analysisData.estadoLaboral,
                    culExperiencia: analysisData.experienciaLaboral,
                    updatedAt: new Date()
                });
            } catch (updateErr) {
                console.error('Error updating application with CUL analysis:', updateErr);
            }
        }

        console.log('✅ CUL analyzed successfully:', analysisData.nombreCompleto);

        return NextResponse.json({
            success: true,
            data: analysisData
        });

    } catch (error) {
        console.error('Error analyzing CUL:', error);
        return NextResponse.json({
            error: 'Error analyzing document',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
