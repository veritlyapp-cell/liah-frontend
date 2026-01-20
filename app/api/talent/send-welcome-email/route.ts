import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
    try {
        const { candidateName, candidateEmail, jobTitle, companyName, startDate, holdingId } = await req.json();

        if (!candidateEmail) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const { data, error } = await resend.emails.send({
            from: 'Liah Talent <talent@relielabs.com>',
            to: [candidateEmail],
            subject: `¡Bienvenido(a) a ${companyName}!`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #7c3aed; margin-bottom: 10px;">¡Felicidades, ${candidateName}!</h1>
                        <p style="font-size: 18px; color: #666;">Nos alegra mucho informarte que has sido seleccionado(a) para el puesto de <strong>${jobTitle}</strong> en <strong>${companyName}</strong>.</p>
                    </div>

                    <div style="background-color: #f3f4f6; border-radius: 12px; padding: 25px; margin-bottom: 30px;">
                        <h2 style="font-size: 16px; margin-top: 0; color: #4b5563;">Próximos Pasos</h2>
                        <ul style="padding-left: 20px; line-height: 1.6;">
                            <li>El equipo de Recursos Humanos se pondrá en contacto contigo pronto para completar el proceso de contratación.</li>
                            <li>Ten a la mano tus documentos de identidad originales.</li>
                            ${startDate ? `<li>Tu fecha tentativa de ingreso es: <strong>${new Date(startDate).toLocaleDateString()}</strong></li>` : ''}
                        </ul>
                    </div>

                    <p style="font-size: 14px; color: #9ca3af; text-align: center;">
                        Este es un correo automático de Liah Talent en nombre de ${companyName}.
                    </p>
                </div>
            `,
        });

        if (error) {
            return NextResponse.json({ error }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        console.error('Error sending welcome email:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
