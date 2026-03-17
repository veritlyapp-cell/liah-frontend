import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { getAdminAuth } from '@/lib/firebase-admin';
import { FieldValue as AdminFieldValue } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST /api/portal/manager-approve
 * Called by store manager after interview to approve a candidate for a specific RQ.
 * Sends email to candidate with pre-filled "ficha" link to complete missing data.
 */
export async function POST(request: NextRequest) {
    try {
        const {
            interviewId,
            candidateId,
            rqId,
            managerId,        // uid of the manager
            managerNotes
        } = await request.json();

        if (!candidateId || !rqId) {
            return NextResponse.json({ error: 'candidateId y rqId son requeridos' }, { status: 400 });
        }

        const db = getAdminFirestore();

        // Fetch candidate data
        const candidateDoc = await db.collection('candidates').doc(candidateId).get();
        if (!candidateDoc.exists) {
            return NextResponse.json({ error: 'Candidato no encontrado' }, { status: 404 });
        }
        const candidateData = candidateDoc.data()!;

        // Fetch RQ info
        const rqDoc = await db.collection('rqs').doc(rqId).get();
        if (!rqDoc.exists) {
            return NextResponse.json({ error: 'RQ no encontrada' }, { status: 404 });
        }
        const rqData = rqDoc.data()!;

        // Fetch holding/brand info for email branding
        let brandColor = '#4F46E5';
        let brandName = rqData.marcaNombre || 'LIAH';
        let brandLogo = '';
        const holdingSlug = candidateData.holdingSlug || rqData.tenantId || '';

        if (holdingSlug) {
            try {
                const holdingsSnap = await db.collection('holdings')
                    .where('slug', '==', holdingSlug.toLowerCase())
                    .limit(1).get();
                if (!holdingsSnap.empty) {
                    const h = holdingsSnap.docs[0].data();
                    const b = h.config?.branding || h.branding || {};
                    if (b?.primaryColor) brandColor = b.primaryColor;
                    if (h.logoUrl) brandLogo = h.logoUrl;
                    
                    // Only use holding name if brand name is generic or missing
                    if (!brandName || brandName === 'LIAH') {
                        if (h.nombre) brandName = h.nombre;
                    }
                }
            } catch (e) { console.warn('Could not load brand:', e); }
        }

        // Generate a ficha-completion token (24h)
        const fichaToken = uuidv4();
        const fichaExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

        // Build the ficha URL (candidate fills in remaining fields)
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://getliah.com';
        const fichaUrl = `${baseUrl}/portal/ficha?token=${fichaToken}&candidateId=${candidateId}&rqId=${rqId}`;

        // Update candidate status
        await db.collection('candidates').doc(candidateId).update({
            portalStatus: 'manager_approved',
            approvedByManagerId: managerId || '',
            approvedRqId: rqId,
            fichaToken,
            fichaTokenExpiry: fichaExpiry,
            fichaCompleted: false,
            managerNotes: managerNotes || '',
            managerApprovedAt: AdminFieldValue.serverTimestamp(),
            updatedAt: AdminFieldValue.serverTimestamp()
        });

        // Update interview record if provided
        if (interviewId) {
            try {
                await db.collection('interviews').doc(interviewId).update({
                    status: 'manager_approved',
                    approvedAt: AdminFieldValue.serverTimestamp(),
                    managerId: managerId || ''
                });
            } catch (e) { console.warn('Could not update interview:', e); }
        }

        // Update application in rq subcollection
        try {
            const appsSnap = await db.collection('rqs').doc(rqId)
                .collection('applications')
                .where('candidateId', '==', candidateId)
                .limit(1).get();
            if (!appsSnap.empty) {
                await appsSnap.docs[0].ref.update({
                    status: 'manager_approved',
                    managerApprovedAt: AdminFieldValue.serverTimestamp()
                });
            }
        } catch (e) { console.warn('Could not update rq application:', e); }

        // Send email to candidate with ficha link
        try {
            const { Resend } = await import('resend');
            if (!process.env.RESEND_API_KEY) {
                console.error('[Manager Approve] Error: RESEND_API_KEY is not defined');
            }
            const resend = new Resend(process.env.RESEND_API_KEY);

            // Determine which fields still need to be completed
            const needsCUL = !candidateData.culUrl && !candidateData.cul;
            const needsFechaNac = !candidateData.fechaNacimiento;
            const needsCVInput = !candidateData.cvUrl;

            const missingFields: string[] = [];
            if (needsFechaNac) missingFields.push('Fecha de nacimiento');
            if (needsCUL) missingFields.push('CUL (Carnet de Sanidad)');
            if (needsCVInput) missingFields.push('CV');

            await resend.emails.send({
                from: `${brandName} - LIAH <noreply@getliah.com>`,
                to: candidateData.email,
                subject: `🎉 ¡Felicitaciones ${candidateData.nombre}! Completa tu ficha para continuar`,
                html: `
                    <div style="font-family: 'Helvetica Neue', sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 20px; background: #f9fafb;">
                        <div style="background: white; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 30px rgba(0,0,0,0.08);">
                            
                            <!-- Header with brand color -->
                            <div style="background: ${brandColor}; padding: 40px 32px; text-align: center;">
                                ${brandLogo ? `<img src="${brandLogo}" alt="${brandName}" style="height: 60px; object-fit: contain; margin-bottom: 16px; background: rgba(255,255,255,0.1); padding: 8px 16px; border-radius: 12px;" />` : ''}
                                <h1 style="color: white; font-size: 26px; font-weight: 900; margin: 0; font-style: italic; text-transform: uppercase; letter-spacing: -1px;">
                                    ¡Felicitaciones!
                                </h1>
                                <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 15px;">
                                    Has pasado a la siguiente etapa
                                </p>
                            </div>

                            <div style="padding: 32px;">
                                <p style="color: #374151; font-size: 16px; margin: 0 0 16px;">
                                    Hola <strong>${candidateData.nombre} ${candidateData.apellidoPaterno}</strong>,
                                </p>
                                <p style="color: #374151; font-size: 15px; margin: 0 0 24px; line-height: 1.6;">
                                    Tu entrevista en <strong>${rqData.tiendaNombre || brandName}</strong> fue exitosa. 
                                    El equipo de selección necesita que completes tu ficha para continuar el proceso.
                                </p>

                                <!-- Job info card -->
                                <div style="background: linear-gradient(135deg, ${brandColor}15, ${brandColor}08); border: 1px solid ${brandColor}30; border-radius: 16px; padding: 20px; margin-bottom: 24px;">
                                    <div style="display: flex; gap: 12px; align-items: center;">
                                        <div>
                                            <p style="margin: 0; font-size: 18px; font-weight: 900; color: ${brandColor}; font-style: italic; text-transform: uppercase;">${rqData.puesto || rqData.posicion || rqData.posicionNombre || ''}</p>
                                            <p style="margin: 4px 0 0; color: #6B7280; font-size: 14px;">${rqData.tiendaNombre || ''} • ${rqData.tiendaDistrito || ''}</p>
                                        </div>
                                    </div>
                                </div>

                                <!-- What to complete -->
                                ${missingFields.length > 0 ? `
                                <div style="background: #FFF7ED; border: 1px solid #FED7AA; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
                                    <p style="color: #92400E; font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px;">Información pendiente:</p>
                                    <ul style="margin: 0; padding-left: 18px; color: #78350F;">
                                        ${missingFields.map(f => `<li style="font-size: 14px; margin-bottom: 4px;">${f}</li>`).join('')}
                                    </ul>
                                </div>
                                ` : ''}

                                <!-- Pre-filled note -->
                                <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 12px; padding: 16px; margin-bottom: 28px;">
                                    <p style="color: #166534; font-size: 14px; margin: 0;">
                                        ✅ <strong>Tu información ya está pre-llenada.</strong> Solo necesitas completar los datos que faltan y confirmar los que ya tienes.
                                    </p>
                                </div>

                                <!-- CTA Button -->
                                <div style="text-align: center; margin-bottom: 24px;">
                                    <a href="${fichaUrl}" 
                                       style="display: inline-block; background: ${brandColor}; color: white; text-decoration: none; padding: 18px 40px; border-radius: 16px; font-weight: 900; font-size: 16px; font-style: italic; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 4px 20px ${brandColor}40;">
                                        Completar mi Ficha →
                                    </a>
                                </div>

                                <p style="color: #9CA3AF; font-size: 12px; text-align: center; margin: 0;">
                                    Este enlace es válido por 48 horas. Si tienes problemas, contáctanos.
                                </p>
                            </div>

                            <!-- Footer -->
                            <div style="background: #F9FAFB; padding: 20px 32px; text-align: center; border-top: 1px solid #E5E7EB;">
                                <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
                                    Powered by <strong style="color: #4F46E5;">LIAH</strong> — Sistema de Gestión de Talento
                                </p>
                            </div>
                        </div>
                    </div>
                `
            });

            console.log('[Manager Approve] Email sent to:', candidateData.email);
        } catch (emailError: any) {
            console.error('[Manager Approve] Email error:', emailError?.message || emailError);
            // Don't fail the whole request just because email failed
        }

        return NextResponse.json({
            success: true,
            message: 'Candidato aprobado y notificado',
            fichaUrl
        });

    } catch (error: any) {
        console.error('[Manager Approve] Error:', error?.message || error);
        return NextResponse.json({ error: 'Error interno: ' + (error?.message || '') }, { status: 500 });
    }
}
