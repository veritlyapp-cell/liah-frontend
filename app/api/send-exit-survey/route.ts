import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    const resend = new Resend(process.env.RESEND_API_KEY);

    try {
        const {
            email,
            phone,
            name,
            holdingName,
            reason
        } = await request.json();

        if (!email && !phone) {
            return NextResponse.json({ error: 'Missing email or phone' }, { status: 400 });
        }

        const companyName = holdingName || 'tu anterior empresa';
        const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_BASE_URL || 'https://getliah.com';
        const surveyUrl = `${origin}/survey/exit?name=${encodeURIComponent(name || '')}&company=${encodeURIComponent(companyName)}`;

        const results = {
            emailSent: false,
            smsSent: false,
            errors: [] as string[]
        };

        // 1. SEND EMAIL (RESEND)
        if (email) {
            if (!process.env.RESEND_API_KEY) {
                console.log('📧 [MOCK EMAIL] Detailed Exit Survey for:', name, 'to:', email);
                results.emailSent = true;
            } else {
                const { error } = await resend.emails.send({
                    from: 'LIAH HR <noreply@notifications.getliah.com>',
                    to: email,
                    subject: `Mensaje confidencial de Liah sobre tu experiencia en ${companyName}`,
                    html: `
                        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; color: #334155; line-height: 1.6;">
                            <div style="padding: 20px; text-align: center; background-color: #f8fafc; border-radius: 12px 12px 0 0;">
                                <h1 style="color: #7c3aed; margin: 0; font-size: 24px;">Liah Flow</h1>
                            </div>
                            
                            <div style="padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
                                <p style="font-size: 16px;">Hola, <strong>${name || 'colaborador'}</strong>:</p>
                                
                                <p>En Liah, nos dedicamos a mejorar los entornos de trabajo a través de la tecnología. Como parte de nuestro proceso de mejora continua para <strong>${companyName}</strong>, queremos conocer tu opinión honesta sobre tu tiempo en la compañía.</p>
                                
                                <p>Esta encuesta es gestionada de forma externa por nuestra plataforma. Los resultados se entregan a la empresa de forma agregada y anónima; nadie en ${companyName} podrá identificar quién dio cada respuesta.</p>
                                
                                <div style="margin: 30px 0; text-align: center;">
                                    <a href="${surveyUrl}" style="background-color: #7c3aed; color: white; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: bold; display: inline-block;">
                                        Iniciar Encuesta Confidencial
                                    </a>
                                </div>
                                
                                <p style="font-size: 14px; color: #64748b;">Tu sinceridad ayudará a construir mejores lugares para trabajar.</p>
                                
                                <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8;">
                                    <h4 style="margin: 0 0 10px 0; color: #64748b; font-size: 12px;">Compromiso de Confidencialidad Liah</h4>
                                    <ul style="padding-left: 20px; margin: 0;">
                                        <li><strong>Gestión Externa:</strong> Esta encuesta es administrada de forma independiente por Liah, una marca de Relié Labs S.A.C., para asegurar la transparencia del proceso.</li>
                                        <li><strong>Anonimato Garantizado:</strong> Sus respuestas individuales son estrictamente confidenciales y se procesan de forma agregada para fines estadísticos.</li>
                                        <li><strong>Uso de la Información:</strong> Ningún mando directo de su anterior empleador tendrá acceso a su identidad vinculada a sus respuestas o comentarios específicos.</li>
                                        <li><strong>Protección de Datos:</strong> La información recolectada se rige bajo la Ley N° 29733 (Ley de Protección de Datos Personales en Perú).</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    `
                });

                if (error) {
                    console.error('Resend error:', error);
                    results.errors.push(`Email error: ${error.message}`);
                } else {
                    results.emailSent = true;
                }
            }
        }

        // 2. SEND SMS (INTEGRATION PLACEHOLDER)
        if (phone) {
            // TODO: Integrar con App de SMS (ej: Infobip o Twilio)
            const smsMessage = `Liah: ${name}, tu experiencia en ${companyName} es valiosa para mejorar el trabajo de otros. Tu respuesta es 100% confidencial y anónima. Responde aquí: ${surveyUrl}`;

            console.log('📱 [MOCK SMS] Exit Survey for:', name, 'to:', phone);
            console.log('Content:', smsMessage);

            // Ejemplo de estructura de integración:
            /*
            await fetch('https://api.sms-provider.com/v1/send', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${process.env.SMS_API_KEY}` },
                body: JSON.stringify({ to: phone, message: smsMessage })
            });
            */

            results.smsSent = true;
        }

        return NextResponse.json({
            success: results.emailSent || results.smsSent,
            results
        });

    } catch (error) {
        console.error('Error in unified exit survey API:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
