import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    try {
        const {
            candidateEmail,
            candidateName,
            invitationLink,
            posicion,
            tiendaNombre,
            marcaNombre,
            modalidad,
            turno,
            // NEW: Dynamic branding fields
            holdingName,
            holdingLogo,
            marcaLogo
        } = await request.json();

        if (!candidateEmail) {
            return NextResponse.json({ error: 'Missing email' }, { status: 400 });
        }

        const companyName = holdingName || 'la empresa';

        // Check if Resend is configured
        if (!process.env.RESEND_API_KEY) {
            console.log('📧 [MOCK - Invitation Email] ---------------------------------------------------');
            console.log(`To: ${candidateEmail}`);
            console.log(`Subject: Invitación para postular a ${posicion} en ${tiendaNombre}`);
            console.log(`Link: ${invitationLink}`);
            console.log(`Company: ${companyName}`);
            console.log('-------------------------------------------------------------------------');

            return NextResponse.json({
                success: true,
                message: 'Email logged (Mock - No API Key)',
                mock: true
            });
        }

        // Build logo header section
        const logoSection = (holdingLogo || marcaLogo) ? `
            <div style="text-align: center; margin-bottom: 20px;">
                ${holdingLogo ? `<img src="${holdingLogo}" alt="${companyName}" style="max-height: 50px; margin-right: 15px;" />` : ''}
                ${marcaLogo ? `<img src="${marcaLogo}" alt="${marcaNombre}" style="max-height: 50px;" />` : ''}
            </div>
        ` : '';

        // Send real email via Resend
        const { data, error } = await resend.emails.send({
            from: 'LIAH <noreply@notifications.getliah.com>',
            to: candidateEmail,
            subject: `Invitación para postular a ${posicion} en ${marcaNombre}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
                    ${logoSection}
                    
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #7c3aed; margin: 0;">¡Hola! 👋</h1>
                        <p style="font-size: 18px; color: #4B5563; margin-top: 10px;">
                            Te invitamos a formar parte de <strong>${marcaNombre}</strong>
                        </p>
                    </div>
                    
                    <div style="background-color: #F9FAFB; padding: 20px; border-radius: 12px; margin-bottom: 30px;">
                        <h2 style="font-size: 16px; color: #6B7280; margin-top: 0; text-transform: uppercase; letter-spacing: 0.05em;">Detalles de la Posición</h2>
                        <p style="font-size: 20px; color: #111827; font-weight: bold; margin: 10px 0;">
                            ${posicion}
                        </p>
                        <p style="font-size: 16px; color: #374151; margin: 0;">
                            📍 ${tiendaNombre}<br/>
                            🕒 ${modalidad || 'Tiempo Completo'} • ${turno || 'Horario Flexible'}
                        </p>
                    </div>
                    
                    <p style="font-size: 16px; color: #374151; line-height: 1.5; margin-bottom: 30px;">
                        Fue un gusto conocerte en la entrevista. Creemos que serías una excelente opción para nuestro equipo. Para continuar con tu proceso, por favor completa tu postulación haciendo clic en el siguiente botón:
                    </p>
                    
                    <div style="text-align: center; margin-bottom: 30px;">
                        <a href="${invitationLink}" 
                           style="background: linear-gradient(135deg, #7c3aed, #06b6d4); 
                                  color: white; 
                                  padding: 16px 32px; 
                                  text-decoration: none; 
                                  border-radius: 12px; 
                                  font-weight: bold;
                                  display: inline-block;
                                  font-size: 18px;
                                  box-shadow: 0 4px 6px -1px rgba(124, 58, 237, 0.2);">
                            Completar Mi Postulación
                        </a>
                    </div>
                    
                    <p style="color: #6B7280; font-size: 14px; text-align: center;">
                        Este link es único para ti y <strong>expira en 48 horas</strong>.
                    </p>
                    
                    <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 30px 0;"/>
                    
                    <div style="text-align: center;">
                        <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
                            Este correo fue enviado por LIAH - Asistente de Reclutamiento Inteligente<br/>
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

        return NextResponse.json({ success: true, data });

    } catch (error) {
        console.error('Error sending invitation email:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
