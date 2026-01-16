/**
 * Email Service for LIAH Talent
 * Uses Resend API to send transactional emails
 */

import { NextRequest, NextResponse } from 'next/server';

interface RejectionEmailRequest {
    candidateName: string;
    candidateEmail: string;
    jobTitle: string;
    companyName: string;
}

export async function POST(request: NextRequest) {
    try {
        const body: RejectionEmailRequest = await request.json();
        const { candidateName, candidateEmail, jobTitle, companyName } = body;

        if (!candidateEmail || !candidateName || !jobTitle) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const resendApiKey = process.env.RESEND_API_KEY;
        if (!resendApiKey) {
            console.error('RESEND_API_KEY not configured');
            return NextResponse.json({ error: 'Email service not configured' }, { status: 500 });
        }

        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #7c3aed, #4f46e5); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        h1 { margin: 0; font-size: 24px; }
        .highlight { color: #7c3aed; font-weight: 600; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Gracias por tu interés</h1>
        </div>
        <div class="content">
            <p>Estimado/a <strong>${candidateName}</strong>,</p>
            
            <p>Queremos agradecerte sinceramente por tu interés en la posición de <span class="highlight">${jobTitle}</span> en <strong>${companyName}</strong> y por el tiempo que dedicaste durante el proceso de selección.</p>
            
            <p>Después de una cuidadosa evaluación de todos los candidatos, hemos decidido continuar con otros perfiles que se ajustan más específicamente a los requisitos actuales de la posición.</p>
            
            <p>Esta decisión no refleja de ninguna manera tus capacidades profesionales. Te animamos a seguir postulándote a futuras oportunidades que se alineen con tu perfil y experiencia.</p>
            
            <p>Te deseamos mucho éxito en tu búsqueda laboral y en tu desarrollo profesional.</p>
            
            <p>Atentamente,<br>
            <strong>Equipo de Talento Humano</strong><br>
            ${companyName}</p>
        </div>
        <div class="footer">
            <p>Este es un correo automático. Si tienes preguntas, responde a este mensaje.</p>
            <p>Powered by LIAH</p>
        </div>
    </div>
</body>
</html>
        `;

        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${resendApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: `${companyName} <noreply@getliah.com>`,
                to: candidateEmail,
                subject: `Actualización sobre tu postulación - ${jobTitle}`,
                html: emailHtml
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Resend API error:', errorData);
            return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
        }

        const result = await response.json();
        return NextResponse.json({ success: true, emailId: result.id });

    } catch (error) {
        console.error('Email send error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
