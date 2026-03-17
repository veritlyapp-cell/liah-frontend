import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { FieldValue as AdminFieldValue } from 'firebase-admin/firestore';

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

        if (!sessionToken || !rqId) {
            return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
        }

        const db = getAdminFirestore();

        // Validate session and get candidate
        const snapshot = await db.collection('candidates')
            .where('portalSessionToken', '==', sessionToken)
            .limit(1)
            .get();

        if (snapshot.empty) {
            return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });
        }

        const candidateDoc = snapshot.docs[0];
        const candidateData = candidateDoc.data();
        const candidateId = candidateDoc.id;

        // Find and update the application in the candidate's applications array
        const applications = candidateData.applications || [];
        const appIndex = applications.findIndex((app: any) =>
            app.id === applicationId || app.rqId === rqId
        );

        if (appIndex !== -1) {
            applications[appIndex] = {
                ...applications[appIndex],
                status: 'interview_scheduled',
                interviewSlotId: slotId,
                interviewDate: slotDate,
                interviewTime: slotTime,
                interviewScheduledAt: new Date().toISOString()
            };

            await db.collection('candidates').doc(candidateId).update({
                applications,
                updatedAt: AdminFieldValue.serverTimestamp()
            });
        }

        // Also update in rq's application subcollection if applicationId provided
        if (applicationId) {
            try {
                await db.collection('rqs').doc(rqId)
                    .collection('applications').doc(applicationId).update({
                        status: 'interview_scheduled',
                        interviewSlotId: slotId,
                        interviewDate: slotDate,
                        interviewTime: slotTime,
                        interviewScheduledAt: AdminFieldValue.serverTimestamp()
                    });
            } catch (e) {
                console.warn('[Book Interview] Could not update rq application subcollection:', e);
            }
        }

        // Fetch RQ info for store address and branding
        const rqDoc = await db.collection('rqs').doc(rqId).get();
        const rqData = rqDoc.data() || {};

        const storeId = rqData.tiendaId || '';
        const holdingId = rqData.holdingId || rqData.tenantId || '';
        const storeName = rqData.tiendaNombre || '';
        let storeAddress = rqData.storeAddress || rqData.tiendaDireccion || '';
        const position = rqData.posicion || rqData.puesto || 'Puesto Requerido';

        // Fetch store address if missing (fall back to stores collection)
        if (!storeAddress && storeId) {
            try {
                const tiendaDoc = await db.collection('tiendas').doc(storeId).get();
                if (tiendaDoc.exists) {
                    const t = tiendaDoc.data()!;
                    storeAddress = t.direccion || t.address || '';
                }
            } catch (e) {
                console.warn('[Book Interview] Could not fetch store address:', e);
            }
        }

        // Fetch brand color
        let brandColor = '#4F46E5';
        let brandName = rqData.marcaNombre || 'LIAH';
        const holdingSlug = candidateData.holdingSlug || rqData.tenantId || '';
        if (holdingSlug) {
            try {
                const hSnap = await db.collection('holdings').where('slug', '==', holdingSlug.toLowerCase()).limit(1).get();
                if (!hSnap.empty) {
                    const h = hSnap.docs[0].data();
                    const b = h.config?.branding || h.branding || {};
                    if (b?.primaryColor) brandColor = b.primaryColor;
                    
                    // Only use holding name if brand name is generic or missing
                    if (!brandName || brandName === 'LIAH') {
                        if (h.nombre) brandName = h.nombre;
                    }
                }
            } catch (e) { /* ignore */ }
        }

        // Check for existing interview for this application/candidate to avoid duplicates
        const existingInterviews = await db.collection('interviews')
            .where('candidateId', '==', candidateId)
            .where('applicationId', '==', applicationId || '')
            .where('status', '==', 'scheduled')
            .get();

        if (!existingInterviews.empty) {
            // Update the existing one instead of adding a new one
            await db.collection('interviews').doc(existingInterviews.docs[0].id).update({
                slotId,
                slotDate,
                slotTime,
                position,
                storeId,
                holdingId,
                storeAddress,
                updatedAt: AdminFieldValue.serverTimestamp()
            });
        } else {
            // Create interview record
            await db.collection('interviews').add({
                candidateId,
                candidateName: `${candidateData.nombre} ${candidateData.apellidoPaterno}`,
                candidateEmail: candidateData.email,
                candidatePhone: candidateData.telefono || candidateData.celular || '',
                applicationId: applicationId || '',
                rqId,
                slotId,
                slotDate,
                slotTime,
                status: 'scheduled',
                holdingId,
                holdingSlug: holdingSlug || '',
                storeId,
                storeName,
                storeAddress,
                position,
                createdAt: AdminFieldValue.serverTimestamp()
            });
        }

        // Send confirmation email via Resend
        try {
            const { Resend } = await import('resend');
            const resend = new Resend(process.env.RESEND_API_KEY);

            // Correct color management
            const finalBrandColor = brandColor || '#a51890'; // Tambo purple fallback

            // Calendar link
            const calendarTitle = encodeURIComponent(`Entrevista - ${position}`);
            const calendarLoc = encodeURIComponent(`${storeName} - ${storeAddress}`);
            const calLink = `https://www.google.com/calendar/render?action=TEMPLATE&text=${calendarTitle}&location=${calendarLoc}`;

            await resend.emails.send({
                from: `${brandName} - Selección <noreply@notifications.getliah.com>`,
                to: candidateData.email,
                subject: '✅ Entrevista Confirmada',
                html: `
                    <div style="font-family: 'Helvetica Neue', sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 20px; background: #f9fafb;">
                        <div style="background: white; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 30px rgba(0,0,0,0.08);">
                            <div style="background: ${finalBrandColor}; padding: 40px 32px; text-align: center;">
                                <h1 style="color: white; font-size: 24px; font-weight: 900; margin: 0; font-style: italic; text-transform: uppercase; letter-spacing: -1px;">¡Entrevista Confirmada!</h1>
                                <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 15px;">Todo listo, ${candidateData.nombre}</p>
                            </div>
                            <div style="padding: 32px;">
                                <p style="color: #374151; font-size: 16px; margin: 0 0 24px;">
                                    Tu cita de entrevista para el puesto de <strong>${position}</strong> en <strong>${storeName}</strong> ha sido agendada.
                                </p>
                                <div style="background: #F3F4F6; border-radius: 16px; padding: 24px; margin-bottom: 24px;">
                                    <div style="display: flex; gap: 16px; margin-bottom: 12px;">
                                        <div style="flex: 1;">
                                            <p style="color: #9CA3AF; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 4px;">📆 Fecha</p>
                                            <p style="color: #111827; font-weight: 700; margin: 0; text-transform: capitalize;">${slotDate}</p>
                                        </div>
                                        <div style="flex: 1;">
                                            <p style="color: #9CA3AF; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 4px;">🕐 Hora</p>
                                            <p style="color: #111827; font-weight: 700; margin: 0;">${slotTime}</p>
                                        </div>
                                    </div>
                                    <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #E5E7EB;">
                                        <p style="color: #9CA3AF; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 4px;">📍 Dirección</p>
                                        <p style="color: #111827; font-weight: 700; margin: 0;">${storeName}</p>
                                        <p style="color: #6B7280; font-size: 13px; margin: 4px 0 0;">${storeAddress}</p>
                                    </div>
                                </div>
                                <div style="text-align: center; margin-bottom: 24px;">
                                    <a href="${calLink}" style="display: inline-block; padding: 12px 24px; background: white; border: 2px solid #E5E7EB; border-radius: 12px; color: #374151; text-decoration: none; font-weight: 700; font-size: 14px;">
                                        📅 Agregar a mi Calendario
                                    </a>
                                </div>
                                <div style="background: #FFF7ED; border-left: 4px solid #F97316; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                                    <p style="color: #9A3412; font-weight: 600; margin: 0; font-size: 14px;">
                                        💡 Por favor llega 10 minutos antes con tu DNI físico.
                                    </p>
                                </div>
                                <p style="color: #6B7280; font-size: 14px; margin: 0; text-align: center;">¡Muchos éxitos! El equipo de selección de ${brandName} te espera.</p>
                            </div>
                        </div>
                    </div>
                `
            });

        } catch (emailError) {
            console.error('[Book Interview] Error sending confirmation email:', emailError);
        }

        console.log('[Book Interview] Scheduled:', { candidateId, rqId, applicationId, slotDate, slotTime });

        return NextResponse.json({ success: true, message: 'Entrevista agendada' });

    } catch (error: any) {
        console.error('[Book Interview] Error:', error?.message || error);
        return NextResponse.json({ error: 'Error interno: ' + (error?.message || '') }, { status: 500 });
    }
}
