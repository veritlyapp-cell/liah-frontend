import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * POST /api/talent/match-candidate
 * Compares a candidate's CV and killer question answers against a job profile.
 * Returns a match percentage and detailed analysis.
 */
export async function POST(req: NextRequest) {
    try {
        const { jobProfile, candidateData, killerAnswers } = await req.json();

        if (!jobProfile || !candidateData) {
            return NextResponse.json({ error: 'Job profile and candidate data required' }, { status: 400 });
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `Actúa como un reclutador experto Senior de LIAH. Tu tarea es analizar el grado de afinidad (match) entre un candidato y una vacante específica.

### PERFIL DE LA VACANTE:
${JSON.stringify(jobProfile)}

### DATOS DEL CANDIDATO:
- Nombre: ${candidateData.nombre}
- CV / Experiencia: ${candidateData.cvText || JSON.stringify(candidateData.parsedData)}
- Respuestas a Killer Questions: ${JSON.stringify(killerAnswers)}

### INSTRUCCIONES:
1. Evalúa críticamente la experiencia, habilidades y formación del candidato frente a los requisitos del puesto.
2. Considera las respuestas a las Killer Questions.
3. Calcula un porcentaje de coincidencia (0-100).
4. Si el candidato falla claramente en requisitos mandatorios (ej: no tiene licencia si es requerida), el puntaje debe ser bajo (< 30%).

Devuelve SOLO un JSON válido (sin markdown) con este formato:

{
    "matchScore": 85,
    "resumenEjecutivo": "Breve resumen de por qué este puntaje...",
    "puntosFuertes": ["Punto 1", "Punto 2"],
    "puntosDebiles": ["Punto 1", "Punto 2"],
    "recomendacion": "Entrevistar / En espera / Descartar",
    "analisisDetallado": {
        "experiencia": "Análisis de experiencia...",
        "habilidades": "Análisis de habilidades...",
        "formacion": "Análisis de formación..."
    }
}`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        let parsedResult;
        try {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            const jsonString = jsonMatch ? jsonMatch[0] : responseText;
            parsedResult = JSON.parse(jsonString);
        } catch (parseError) {
            console.error('Error parsing Match AI response:', parseError);
            return NextResponse.json({
                error: 'Could not parse Match analysis',
                raw: responseText
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            data: parsedResult
        });

    } catch (error) {
        console.error('Error matching candidate:', error);
        return NextResponse.json({
            error: 'Error processing match'
        }, { status: 500 });
    }
}
