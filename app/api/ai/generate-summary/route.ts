import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/middleware/rate-limit';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
    try {
        // Rate limiting
        const rateLimit = checkRateLimit(getClientIP(req), { ...RATE_LIMITS.ai, keyPrefix: 'summary_gen' });
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: 'Demasiadas solicitudes. Intenta de nuevo en unos momentos.' },
                { status: 429 }
            );
        }

        const body = await req.json();
        const { client, stores, hires, meetingNotes } = body;

        if (!client) {
            return NextResponse.json({ error: 'El nombre del cliente es obligatorio.' }, { status: 400 });
        }

        // Prompt design
        const systemPrompt = `Eres el asistente de ventas experto de LIAH (getliah.com), un ecosistema de inteligencia artificial diseñado para automatizar y optimizar el reclutamiento masivo.
Escribe una propuesta persuasiva de "Resumen de la Solución" (Resumen Ejecutivo) para el cliente "${client}".
Usa los siguientes datos de la reunión/dolores detectados:
"${meetingNotes || 'Automatización del reclutamiento masivo, reducción de sobrecarga operativa y control en contratación.'}"

El cliente opera ${stores} tiendas/locales y gestiona alrededor de ${hires} ingresos mensuales (lo que significa un volumen muy alto de rotación y reclutamiento masivo anual).

Puntos clave a considerar:
1. Liah optimiza todo el embudo de selección, desde la captación hasta el ingreso (incluyendo agendamiento automatizado, approvals multi-nivel y CUL).
2. Enfócate en liberar del trabajo manual e ineficiente a los reclutadores y gerentes de tienda.
3. Resuelve el dolor principal del cliente si se proporciona en las notas.
4. Tono: Formal, corporativo, consultivo pero directo e inspirador.
5. Idioma: Español.
6. Longitud: Máximo 3 o 4 oraciones (un solo párrafo conciso). No uses viñetas ni formateo markdown complejo. Debe fluir como la introducción de un contrato o propuesta comercial formal.`;

        let summaryText = '';
        try {
            const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
            const result = await model.generateContent(systemPrompt);
            summaryText = result.response.text().trim();
        } catch (aiError: any) {
            console.error('[AI SUMMARY] Error calling Gemini:', aiError);
            // Fallback paragraph in case AI fails
            summaryText = `Implementación de Liah, asistente de inteligencia artificial para la automatización del reclutamiento masivo en las ${stores} sedes de ${client}. La solución optimiza todo el embudo de selección, desde la captación hasta el ingreso de candidatos, gestionando un flujo proyectado de más de ${hires * 12} ingresos anuales, aliviando la carga operativa de los equipos y mejorando la tasa de retención.`;
        }

        return NextResponse.json({ success: true, summary: summaryText });
    } catch (error: any) {
        console.error('[AI SUMMARY] API Error:', error);
        return NextResponse.json({ error: error.message || 'Error interno del servidor.' }, { status: 500 });
    }
}
