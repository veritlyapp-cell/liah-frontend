import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
    try {
        const {
            candidateEmail,
            candidateName,
            posicion,
            marcaNombre,
            holdingName
        } = await request.json();

        if (!candidateEmail) {
            return NextResponse.json({ error: 'Missing email' }, { status: 400 });
        }

        const companyName = holdingName || marcaNombre || 'la empresa';

        // Check if Resend is configured
        if (!process.env.RESEND_API_KEY) {
            console.log('📧 [MOCK - Selection Email] ---------------------------------------------------');
            console.log(`To: ${candidateName} <${candidateEmail}>`);
            console.log(`Subject: ¡Continúas en el proceso de selección!`);
            console.log(`Company: ${companyName}`);
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
            subject: `¡Continúas en el proceso de selección de ${companyName}!`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #7c3aed; margin: 0;">¡Buenas noticias! 🎉</h1>
                    </div>
                    
                    <p style="font-size: 18px; color: #333;">
                        Hola <strong>${candidateName || 'Candidato/a'}</strong>,
                    </p>
                    
                    <p style="font-size: 16px; color: #333; line-height: 1.6;">
                        Nos complace informarte que tu perfil ha sido <strong>seleccionado</strong> 
                        para continuar en el proceso de selección${posicion ? ` para la posición de <strong>${posicion}</strong>` : ''}.
                    </p>
                    
                    <div style="background: linear-gradient(135deg, #f5f3ff, #ecfeff); padding: 20px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #7c3aed;">
                        <h3 style="color: #7c3aed; margin-top: 0;">📞 ¿Qué sigue?</h3>
                        <p style="color: #333; margin-bottom: 0; line-height: 1.6;">
                            En los próximos días, alguien del equipo de <strong>Atracción del Talento</strong> 
                            o de la marca <strong>${marcaNombre || 'contratante'}</strong> se pondrá en contacto 
                            contigo para solicitarte mayor información o indicarte los siguientes pasos del proceso.
                        </p>
                    </div>
                    
                    <p style="font-size: 16px; color: #333; line-height: 1.6;">
                        Te recomendamos estar atento/a a tu teléfono y correo electrónico.
                    </p>
                    
                    <p style="font-size: 16px; color: #333; line-height: 1.6;">
                        ¡Mucho éxito! 🙌
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

        console.log('✅ Selection email sent:', data);
        return NextResponse.json({ success: true, data });

    } catch (error) {
        console.error('Error sending selection email:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
