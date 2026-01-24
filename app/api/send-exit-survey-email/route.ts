import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    try {
        const {
            email,
            name,
            holdingName,
            reason
        } = await request.json();

        if (!email) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const companyName = holdingName || 'LIAH';
        const surveyUrl = `https://getliah.com/survey/exit?name=${encodeURIComponent(name || '')}&company=${encodeURIComponent(companyName)}`;

        // Check if Resend is configured
        if (!process.env.RESEND_API_KEY) {
            console.log('📧 [MOCK - Exit Survey Email] -----------------------------------------------');
            console.log(`To: ${name || 'Ex-colaborador'} <${email}>`);
            console.log(`Subject: Tu opinión es importante para ${companyName}`);
            console.log(`Reason: ${reason}`);
            console.log(`Survey URL: ${surveyUrl}`);
            console.log('-------------------------------------------------------------------------');

            return NextResponse.json({
                success: true,
                message: 'Email logged (Mock)',
                mock: true
            });
        }

        // Send real email via Resend
        const { data, error } = await resend.emails.send({
            from: 'LIAH HR <noreply@notifications.getliah.com>',
            to: email,
            subject: `Tu opinión es muy importante para ${companyName}`,
            html: `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; color: #1e293b; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px;">
                    <div style="text-align: center; margin-bottom: 40px;">
                        <span style="font-size: 48px;">👋</span>
                        <h1 style="color: #7c3aed; margin-top: 20px; font-size: 24px;">¡Hola ${name || 'colaborador'}!</h1>
                    </div>
                    
                    <p style="font-size: 16px; line-height: 1.6; color: #475569;">
                        Sabemos que recientemente has dejado de formar parte del equipo de <strong>${companyName}</strong>. Queremos agradecerte por todo el tiempo y esfuerzo dedicado durante tu permanencia.
                    </p>
                    
                    <div style="background-color: #f8fafc; padding: 25px; border-radius: 12px; margin: 30px 0; border-left: 4px solid #7c3aed;">
                        <p style="margin: 0; font-size: 15px; color: #334155; line-height: 1.6;">
                            En LIAH, buscamos mejorar constantemente la experiencia de los colaboradores. Nos encantaría que nos dedicaras <strong>2 minutos</strong> de tu tiempo para completar una breve encuesta de salida. Tus respuestas son totalmente confidenciales.
                        </p>
                    </div>
                    
                    <div style="text-align: center; margin: 40px 0;">
                        <a href="${surveyUrl}" 
                           style="background: #7c3aed; 
                                  color: white; 
                                  padding: 16px 32px; 
                                  text-decoration: none; 
                                  border-radius: 12px; 
                                  font-weight: bold;
                                  display: inline-block;
                                  font-size: 16px;
                                  box-shadow: 0 4px 6px -1px rgba(124, 58, 237, 0.4);">
                            Empezar Encuesta de Salida
                        </a>
                    </div>
                    
                    <p style="color: #64748b; font-size: 14px; text-align: center; margin-top: 40px;">
                        Tu feedback nos ayudará a que ${companyName} sea un mejor lugar para trabajar. 
                    </p>
                    
                    <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 30px 0;"/>
                    
                    <div style="text-align: center;">
                        <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                            Atentamente,<br/>
                            <strong>Equipo de LIAH & ${companyName}</strong><br/>
                            © ${new Date().getFullYear()}
                        </p>
                    </div>
                </div>
            `
        });

        if (error) {
            console.error('Resend error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });

    } catch (error) {
        console.error('Error sending exit survey email:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
