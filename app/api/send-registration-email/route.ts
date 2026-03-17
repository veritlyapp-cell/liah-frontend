import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    try {
        const {
            candidateEmail,
            candidateName,
            applicationLink,
            // NEW: Dynamic branding fields
            holdingName,
            holdingLogo,
            marcaLogo,
            marcaNombre,
            primaryColor
        } = await request.json();

        if (!candidateEmail) {
            return NextResponse.json({ error: 'Missing email' }, { status: 400 });
        }

        const companyName = marcaNombre || holdingName || 'LIAH';

        // Check if Resend is configured
        if (!process.env.RESEND_API_KEY) {
            console.log('📧 [MOCK - Registration Email] ---------------------------------------------------');
            console.log(`To: ${candidateName} <${candidateEmail}>`);
            console.log(`Subject: ¡Registro Exitoso en ${companyName}!`);
            console.log(`Link: ${applicationLink || 'N/A'}`);
            console.log('-------------------------------------------------------------------------');

            return NextResponse.json({
                success: true,
                message: 'Email logged (Mock)',
                mock: true
            });
        }

        // Build logo header section
        const logoSection = (holdingLogo || marcaLogo) ? `
            <div style="text-align: center; margin-bottom: 20px;">
                ${holdingLogo ? `<img src="${holdingLogo}" alt="${companyName}" style="max-height: 50px; margin-right: 15px;" />` : ''}
                ${marcaLogo ? `<img src="${marcaLogo}" alt="${marcaNombre || ''}" style="max-height: 50px;" />` : ''}
            </div>
        ` : '';

        const accentColor = primaryColor || '#7c3aed';

        // Send real email via Resend
        const { data, error } = await resend.emails.send({
            from: `${companyName} - Registro <noreply@notifications.getliah.com>`,
            to: candidateEmail,
            subject: `¡Registro Exitoso en ${companyName}!`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    ${logoSection}
                    
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: ${accentColor}; margin: 0;">¡Bienvenido/a, ${candidateName || 'Candidato'}! 🎉</h1>
                    </div>
                    
                    <p style="font-size: 16px; color: #333;">
                        Tu postulación ha sido registrada exitosamente. Hemos recibido tu información y estamos procesándola.
                    </p>
                    
                    <div style="background: linear-gradient(135deg, #f5f3ff, #ecfeff); padding: 20px; border-radius: 12px; margin: 20px 0;">
                        <h3 style="color: ${accentColor}; margin-top: 0;">📋 ¿Qué sigue?</h3>
                        <ol style="color: #333; line-height: 1.8;">
                            <li>Revisaremos tu perfil y documentos</li>
                            <li>Te notificaremos si has sido seleccionado/a para la posición</li>
                            <li>Recibirás un mensaje de WhatsApp o correo con los detalles</li>
                        </ol>
                    </div>
                    
                    ${applicationLink ? `
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${applicationLink}" 
                           style="background: linear-gradient(135deg, ${accentColor}, #06b6d4); 
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
                            © ${new Date().getFullYear()} ${companyName}
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
