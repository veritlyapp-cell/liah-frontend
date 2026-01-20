import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
    try {
        const { nombre, email, telefono, jobId, jobTitle, holdingId } = await req.json();

        if (!email || !jobId || !holdingId) {
            return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
        }

        // 1. Create invited application in Firestore
        const appRef = await addDoc(collection(db, 'talent_applications'), {
            jobId,
            nombre,
            email,
            telefono: telefono || '',
            status: 'invited',
            funnelStage: 'applied', // Initial stage
            holdingId,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            isInvitation: true
        });

        const invitationId = appRef.id;
        const invitationLink = `${new URL(req.url).origin}/careers/${jobId}?inviteId=${invitationId}`;

        // 2. Send email via Resend
        const { data, error } = await resend.emails.send({
            from: 'Liah Talent <talent@relielabs.com>',
            to: [email],
            subject: `Invitación: Proceso para ${jobTitle}`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #7c3aed; margin-bottom: 10px;">¡Hola, ${nombre}!</h1>
                        <p style="font-size: 18px; color: #666;">Has sido invitado(a) a participar en el proceso de selección para el puesto de <strong>${jobTitle}</strong>.</p>
                    </div>

                    <div style="background-color: #f3f4f6; border-radius: 12px; padding: 25px; margin-bottom: 30px; text-align: center;">
                        <p style="margin-bottom: 20px;">Para continuar con tu postulación, por favor completa tu información y sube tu CV en el siguiente enlace:</p>
                        <a href="${invitationLink}" style="display: inline-block; background-color: #7c3aed; color: white; padding: 12px 30px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 16px;">
                            Completar mi Postulación
                        </a>
                    </div>

                    <p style="font-size: 14px; color: #9ca3af; text-align: center;">
                        Este es un correo automático de Liah Talent. Si no esperabas esta invitación, puedes ignorar este mensaje.
                    </p>
                </div>
            `,
        });

        if (error) {
            console.error('Resend error:', error);
            // We still return success for Firestore part, but notify about email
            return NextResponse.json({ success: true, appId: invitationId, emailError: error });
        }

        return NextResponse.json({ success: true, appId: invitationId });
    } catch (error: any) {
        console.error('Error in send-invitation:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
