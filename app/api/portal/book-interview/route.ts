import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, Timestamp, limit } from 'firebase/firestore';

export async function POST(request: NextRequest) {
    try {
        const {
            sessionToken,
            rqId,
            applicationId,
            slotId,
            slotDate,
            slotTime
        } = await request.json();

        if (!sessionToken || !rqId || !applicationId) {
            return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
        }

        // Validate session and get candidate
        const candidatesRef = collection(db, 'candidates');
        const q = query(candidatesRef, where('portalSessionToken', '==', sessionToken), limit(1));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });
        }

        const candidateDoc = snapshot.docs[0];
        const candidateData = candidateDoc.data();

        // Find and update the application
        const applications = candidateData.applications || [];
        const appIndex = applications.findIndex((app: any) => app.id === applicationId);

        if (appIndex === -1) {
            return NextResponse.json({ error: 'Aplicación no encontrada' }, { status: 404 });
        }

        // Update application with interview details
        applications[appIndex] = {
            ...applications[appIndex],
            status: 'interview_scheduled',
            interviewSlotId: slotId,
            interviewDate: slotDate,
            interviewTime: slotTime,
            interviewScheduledAt: Timestamp.now()
        };

        // Save to candidate
        await updateDoc(doc(db, 'candidates', candidateDoc.id), {
            applications,
            updatedAt: Timestamp.now()
        });

        // Send confirmation email
        try {
            const { Resend } = await import('resend');
            const resend = new Resend(process.env.RESEND_API_KEY);

            await resend.emails.send({
                from: 'LIAH Portal <noreply@getliah.com>',
                to: candidateData.email,
                subject: '✅ Entrevista Confirmada',
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h1 style="color: #7c3aed;">¡Entrevista Confirmada!</h1>
                        <p>Hola ${candidateData.nombre},</p>
                        <p>Tu entrevista ha sido agendada con éxito.</p>
                        
                        <div style="background: #f3f4f6; padding: 20px; border-radius: 10px; margin: 20px 0;">
                            <p><strong>📋 Posición:</strong> ${applications[appIndex].posicion}</p>
                            <p><strong>🏪 Tienda:</strong> ${applications[appIndex].tiendaNombre}</p>
                            <p><strong>📆 Fecha:</strong> ${slotDate}</p>
                            <p><strong>🕐 Hora:</strong> ${slotTime}</p>
                        </div>
                        
                        <p>Por favor llega 10 minutos antes. No olvides traer tu DNI.</p>
                        <p>¡Éxitos!</p>
                    </div>
                `
            });
        } catch (emailError) {
            console.error('Error sending confirmation email:', emailError);
        }

        console.log('[Book Interview]', {
            candidateId: candidateDoc.id,
            applicationId,
            slotDate,
            slotTime
        });

        return NextResponse.json({
            success: true,
            message: 'Entrevista agendada'
        });

    } catch (error) {
        console.error('Error booking interview:', error);
        return NextResponse.json({ error: 'Error al agendar' }, { status: 500 });
    }
}
