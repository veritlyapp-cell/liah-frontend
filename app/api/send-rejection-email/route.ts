import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    try {
        const {
            candidateEmail,
            candidateName,
            posicion,
            marcaNombre,
            holdingName,
            reason
        } = await request.json();

        if (!candidateEmail) {
            return NextResponse.json({ error: 'Missing email' }, { status: 400 });
        }

        const companyName = holdingName || marcaNombre || 'LIAH';

        // Check if Resend is configured
        if (!process.env.RESEND_API_KEY) {
            console.log('📧 [MOCK - Rejection Email] ---------------------------------------------------');
            console.log(`To: ${candidateName} <${candidateEmail}>`);
            console.log(`Subject: Actualización sobre tu postulación en ${companyName}`);
            console.log(`Company: ${companyName}`);
            console.log(`Reason: ${reason || 'N/A'}`);
            console.log('-------------------------------------------------------------------------');

            return NextResponse.json({
                success: true,
                message: 'Email logged (Mock)',
                mock: true
            });
        }

        // Send real email via Resend
        const { data, error } = await resend.emails.send({
            from: 'LIAH <noreply@getliah.com>',
            to: candidateEmail,
            subject: `Actualización sobre tu postulación en ${companyName}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #6b7280; margin: 0;">Gracias por tu postulación</h1>
                    </div>
                    
                    <p style="font-size: 18px; color: #333;">
                        Hola <strong>${candidateName || 'Candidato/a'}</strong>,
                    </p>
                    
                    <p style="font-size: 16px; color: #333; line-height: 1.6;">
                        Queremos agradecerte el interés que has mostrado en formar parte de nuestro equipo. 
                        Apreciamos el tiempo y el esfuerzo que has dedicado a postularte para la posición de 
                        <strong>${posicion || 'talento'}</strong> en <strong>${companyName}</strong>.
                    </p>
                    
                    <div style="background-color: #f9fafb; padding: 20px; border-radius: 12px; margin: 25px 0; border: 1px solid #e5e7eb;">
                        <p style="color: #4b5563; margin: 0; line-height: 1.6;">
                            Tras revisar cuidadosamente tu perfil, te informamos que en esta ocasión hemos decidido 
                            continuar el proceso con otros candidatos cuyos perfiles se ajustan más a los requisitos específicos de esta vacante.
                        </p>
                    </div>
                    
                    <p style="font-size: 16px; color: #333; line-height: 1.6;">
                        Te animamos a que sigas atento/a a nuestras futuras convocatorias, ya que tu perfil 
                        permanecerá en nuestra base de datos para posibles oportunidades que encajen con tu experiencia profesional.
                    </p>
                    
                    <p style="font-size: 16px; color: #333; line-height: 1.6;">
                        Te deseamos lo mejor en tu búsqueda laboral y en tus futuros proyectos.
                    </p>
                    
                    <p style="font-size: 16px; color: #333; line-height: 1.6;">
                        Atentamente,<br/>
                        <strong>Equipo de Talento de ${companyName}</strong>
                    </p>
                    
                    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;"/>
                    
                    <div style="text-align: center;">
                        <p style="color: #999; font-size: 12px; margin: 0;">
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

        console.log('✅ Rejection email sent:', data);
        return NextResponse.json({ success: true, data });

    } catch (error) {
        console.error('Error sending rejection email:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
