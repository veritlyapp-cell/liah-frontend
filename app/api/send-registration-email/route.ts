import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
    try {
        const { candidateEmail, candidateName, holdingName, applicationLink } = await request.json();

        if (!candidateEmail) {
            return NextResponse.json({ error: 'Missing email' }, { status: 400 });
        }

        // Check if Resend is configured
        if (!process.env.RESEND_API_KEY) {
            console.log('📧 [MOCK - Registration Email] ---------------------------------------------------');
            console.log(`To: ${candidateName} <${candidateEmail}>`);
            console.log(`Subject: ¡Registro Exitoso en ${holdingName || 'LIAH'}!`);
            console.log(`Link: ${applicationLink || 'N/A'}`);
            console.log('-------------------------------------------------------------------------');

            return NextResponse.json({
                success: true,
                message: 'Email logged (Mock)',
                mock: true
            });
        }

        // Send real email via Resend
        const { data, error } = await resend.emails.send({
            from: 'LIAH <noreply@notifications.getliah.com>',
            to: candidateEmail,
            subject: `¡Registro Exitoso en ${holdingName || 'NGR'}!`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #7c3aed; margin: 0;">¡Bienvenido/a, ${candidateName || 'Candidato'}! 🎉</h1>
                    </div>
                    
                    <p style="font-size: 16px; color: #333;">
                        Tu postulación ha sido registrada exitosamente. Hemos recibido tu información y estamos procesándola.
                    </p>
                    
                    <div style="background: linear-gradient(135deg, #f5f3ff, #ecfeff); padding: 20px; border-radius: 12px; margin: 20px 0;">
                        <h3 style="color: #7c3aed; margin-top: 0;">📋 ¿Qué sigue?</h3>
                        <ol style="color: #333; line-height: 1.8;">
                            <li>Revisaremos tu perfil y documentos</li>
                            <li>Te notificaremos si has sido seleccionado/a para la posición</li>
                            <li>Recibirás un mensaje de WhatsApp o correo con los detalles</li>
                        </ol>
                    </div>
                    
                    ${applicationLink ? `
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${applicationLink}" 
                           style="background: linear-gradient(135deg, #7c3aed, #06b6d4); 
                                  color: white; 
                                  padding: 15px 30px; 
                                  text-decoration: none; 
                                  border-radius: 10px; 
                                  font-weight: bold;
                                  display: inline-block;">
                            Ver Mi Postulación
                        </a>
                    </div>
                    ` : ''}
                    
                    <p style="color: #666; font-size: 14px; margin-top: 30px;">
                        Si tienes alguna pregunta, puedes escribirnos a WhatsApp o responder este correo.
                    </p>
                    
                    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;"/>
                    
                    <div style="text-align: center;">
                        <p style="color: #999; font-size: 12px; margin: 0;">
                            Este correo fue enviado por LIAH - Asistente de Reclutamiento<br/>
                            ${holdingName || 'NGR'} • Parte de Grupo Intercorp
                        </p>
                    </div>
                </div>
            `
        });

        if (error) {
            console.error('Resend error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        console.log('✅ Registration email sent:', data);
        return NextResponse.json({ success: true, data });

    } catch (error) {
        console.error('Error sending registration email:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
