import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

// Initialize Resend - will use RESEND_API_KEY env variable
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
    try {
        const { candidateEmail, candidateName, applicationLink, subject, body } = await request.json();

        if (!candidateEmail) {
            return NextResponse.json({ error: 'Missing email' }, { status: 400 });
        }

        // Check if Resend is configured
        if (!process.env.RESEND_API_KEY) {
            console.log('📧 [MOCK EMAIL - No RESEND_API_KEY] ---------------------------------------------------');
            console.log(`To: ${candidateName} <${candidateEmail}>`);
            console.log(`Subject: ${subject || '¡Continúa tu proceso!'}`);
            console.log(`Body: ${body || 'Link de postulación: ' + applicationLink}`);
            console.log('-------------------------------------------------------------------------');

            return NextResponse.json({
                success: true,
                message: 'Email logged (Mock - No API Key)',
                mock: true
            });
        }

        // Send real email via Resend
        const { data, error } = await resend.emails.send({
            from: 'LIAH <noreply@getliah.com>',
            to: candidateEmail,
            subject: subject || '¡Felicitaciones! Continúa tu proceso en NGR',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #7c3aed;">¡Hola ${candidateName || 'Candidato'}! 👋</h2>
                    <p>Has sido seleccionado como <strong>APTO</strong> para continuar con el proceso de selección.</p>
                    
                    <p>Por favor, completa tu postulación haciendo clic en el siguiente enlace:</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${applicationLink}" 
                           style="background: linear-gradient(135deg, #7c3aed, #06b6d4); 
                                  color: white; 
                                  padding: 15px 30px; 
                                  text-decoration: none; 
                                  border-radius: 10px; 
                                  font-weight: bold;">
                            Completar Postulación
                        </a>
                    </div>
                    
                    <p style="color: #666; font-size: 14px;">
                        Si no puedes hacer clic, copia y pega este enlace en tu navegador:<br/>
                        <a href="${applicationLink}">${applicationLink}</a>
                    </p>
                    
                    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;"/>
                    
                    <p style="color: #999; font-size: 12px;">
                        Este correo fue enviado por LIAH, el asistente de reclutamiento de NGR.<br/>
                        Si no solicitaste esto, puedes ignorar este mensaje.
                    </p>
                </div>
            `
        });

        if (error) {
            console.error('Resend error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        console.log('✅ Email sent via Resend:', data);
        return NextResponse.json({ success: true, data });

    } catch (error) {
        console.error('Error sending email:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
