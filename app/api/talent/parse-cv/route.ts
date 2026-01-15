import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * POST /api/talent/parse-cv
 * Parses CV text and extracts structured data for auto-filling application form
 */
export async function POST(req: NextRequest) {
    try {
        const { cvText, cvBase64, mimeType } = await req.json();

        if (!cvText && !cvBase64) {
            return NextResponse.json({ error: 'CV content required' }, { status: 400 });
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `Analiza el siguiente CV/currículum y extrae la información estructurada.
Devuelve SOLO un JSON válido (sin markdown, sin \`\`\`) con este formato exacto:

{
    "nombre": "Nombre completo del candidato",
    "email": "email@ejemplo.com",
    "telefono": "+51999999999",
    "direccion": "Ciudad, País",
    "resumen": "Breve resumen profesional (2-3 líneas)",
    "experiencia": [
        {
            "empresa": "Nombre de la empresa",
            "cargo": "Título del puesto",
            "desde": "2020",
            "hasta": "2023",
            "descripcion": "Breve descripción de responsabilidades"
        }
    ],
    "educacion": [
        {
            "institucion": "Universidad/Instituto",
            "titulo": "Grado/Carrera",
            "desde": "2016",
            "hasta": "2020"
        }
    ],
    "habilidades": ["Habilidad 1", "Habilidad 2", "Habilidad 3"],
    "idiomas": ["Español (Nativo)", "Inglés (Avanzado)"],
    "certificaciones": ["Certificación 1", "Certificación 2"]
}

Si algún campo no está disponible, usa null o array vacío [].

CV a analizar:
${cvText || '[Contenido del PDF adjunto]'}`;

        let result;

        if (cvBase64 && mimeType) {
            // Parse from PDF/image
            result = await model.generateContent([
                prompt,
                {
                    inlineData: {
                        mimeType: mimeType,
                        data: cvBase64
                    }
                }
            ]);
        } else {
            // Parse from text
            result = await model.generateContent(prompt);
        }

        const responseText = result.response.text();

        // Try to extract JSON from the response
        let parsedData;
        try {
            // Remove potential markdown code blocks
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                parsedData = JSON.parse(jsonMatch[0]);
            } else {
                parsedData = JSON.parse(responseText);
            }
        } catch (parseError) {
            console.error('Error parsing AI response:', parseError);
            return NextResponse.json({
                error: 'Could not parse CV data',
                raw: responseText
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            data: parsedData
        });

    } catch (error) {
        console.error('Error parsing CV:', error);
        return NextResponse.json({
            error: 'Error processing CV'
        }, { status: 500 });
    }
}
