import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Instanciar cliente de Gemini usando la variable de entorno
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No se incluyó ningún archivo en la petición.' }, { status: 400 });
        }

        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({ error: 'Formato de archivo no soportado. Sube PDF o imagen.' }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Data = buffer.toString('base64');

        // Utilizamos gemini-2.5-flash por su potencia y visión
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `Analiza este Certificado Único Laboral (CUL) del Perú.
Reporta ESPECÍFICAMENTE:
1. PENALES: ¿Tiene antecedentes? (Encontrado / No Encontrado)
2. JUDICIALES: ¿Tiene procesos? (Encontrado / No Encontrado)
3. POLICIALES: ¿Tiene registros? (Encontrado / No Encontrado)
4. FORMACIÓN: Resumen estudios.
5. EXPERIENCIA: Resumen última experiencia.
6. DNI: Número de documento.
7. NOMBRE: Nombres y apellidos completos.

Responde ÚNICAMENTE con JSON válido:
{
  "isValid": true,
  "dni": "string",
  "nombres": "string",
  "antecedentesPenales": "Encontrado" | "No Encontrado",
  "antecedentesJudiciales": "Encontrado" | "No Encontrado",
  "antecedentesPoliciales": "Encontrado" | "No Encontrado",
  "estudios": "Resumen",
  "experiencia": "Resumen",
  "recomendacion": "aprobar" | "rechazar" | "revisar_manual"
}`;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: base64Data,
                    mimeType: file.type
                }
            }
        ]);

        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
            const data = JSON.parse(jsonMatch[0]);
            return NextResponse.json(data);
        } else {
            console.warn('[Validate CUL] No valid JSON returned by Gemini:', text);
            return NextResponse.json({ 
                isValid: false, 
                dni: '', 
                nombres: '', 
                error: 'El documento no parece ser un CUL válido o está ilegible.' 
            });
        }
    } catch (error: any) {
        console.error('Error in Validate CUL API:', error);
        return NextResponse.json({ error: 'Ocurrió un error interno validando el documento.', details: error.message }, { status: 500 });
    }
}
