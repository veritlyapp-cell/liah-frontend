import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
    try {
        const { candidateId, applicationId, rqId, posicion } = await request.json();

        if (!candidateId || !applicationId) {
            return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
        }

        // Get candidate
        const candidateDoc = await getDoc(doc(db, 'candidates', candidateId));
        if (!candidateDoc.exists()) {
            return NextResponse.json({ error: 'Candidato no encontrado' }, { status: 404 });
        }

        const candidateData = candidateDoc.data();

        // Update application to allow scheduling
        const applications = candidateData.applications || [];
        const appIndex = applications.findIndex((app: any) => app.id === applicationId);

        if (appIndex !== -1) {
            applications[appIndex] = {
                ...applications[appIndex],
                status: 'pending_schedule',
                flow: 'A', // Upgraded to FLUJO A
                rescuedAt: Timestamp.now(),
                inRescueInbox: false
            };

            await updateDoc(doc(db, 'candidates', candidateId), {
                applications,
                updatedAt: Timestamp.now()
            });
        }

        // Generate new session token for scheduling link
        const sessionToken = uuidv4();
        const sessionExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await updateDoc(doc(db, 'candidates', candidateId), {
            portalSessionToken: sessionToken,
            portalSessionExpiry: Timestamp.fromDate(sessionExpiry)
        });

        // Send notification email
        const scheduleLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://getliah.com'}/portal/agendar/${rqId}?token=${sessionToken}&appId=${applicationId}`;

        try {
            const { Resend } = await import('resend');
            const resend = new Resend(process.env.RESEND_API_KEY);

            await resend.emails.send({
                from: 'LIAH Portal <noreply@getliah.com>',
                to: candidateData.email,
                subject: '🎉 ¡Tu perfil ha sido seleccionado!',
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h1 style="color: #7c3aed;">¡Buenas noticias!</h1>
                        <p>Hola ${candidateData.nombre},</p>
                        <p>El Gerente de Tienda ha revisado tu perfil y te ha seleccionado para una entrevista.</p>
                        
                        <div style="background: #f3f4f6; padding: 20px; border-radius: 10px; margin: 20px 0;">
                            <p><strong>📋 Posición:</strong> ${posicion}</p>
                        </div>
                        
                        <p>Ahora puedes agendar tu entrevista:</p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${scheduleLink}" 
                               style="display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #7c3aed, #06b6d4); color: white; text-decoration: none; border-radius: 10px; font-weight: bold;">
                                Agendar Entrevista →
                            </a>
                        </div>
                        
                        <p style="font-size: 14px; color: #999;">
                            Este enlace expira en 24 horas.
                        </p>
                    </div>
                `
            });

            console.log('[Rescue Notify] Email sent to:', candidateData.email);
        } catch (emailError) {
            console.error('[Rescue Notify] Error sending email:', emailError);
        }

        return NextResponse.json({
            success: true,
            message: 'Notificación enviada'
        });

    } catch (error) {
        console.error('Error notifying rescue:', error);
        return NextResponse.json({ error: 'Error al notificar' }, { status: 500 });
    }
}
