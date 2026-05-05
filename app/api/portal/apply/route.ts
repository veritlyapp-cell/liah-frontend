import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { FieldValue as AdminFieldValue } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';
import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/middleware/rate-limit';

const ACTIVE_STATUSES = ['recruiting', 'approved', 'active', 'published', 'activo', 'aprobado'];

export async function POST(request: NextRequest) {
    try {
        // Rate limiting: max 5 applications per minute per IP
        const rateLimit = checkRateLimit(getClientIP(request), { ...RATE_LIMITS.email, keyPrefix: 'apply' });
        if (!rateLimit.allowed) {
            return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta nuevamente en un momento.' }, { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } });
        }

        const body = await request.json();
        const {
            candidateId,
            rqId,
            kqAnswers,
            kqResults,
            kqPassed,
            flow,
            sessionToken,
            holdingSlug
        } = body;

        if (!candidateId || !rqId) {
            return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
        }

        const db = getAdminFirestore();

        // Validate candidate and session
        const candidateDoc = await db.collection('candidates').doc(candidateId).get();
        if (!candidateDoc.exists) {
            return NextResponse.json({ error: 'Candidato no encontrado' }, { status: 404 });
        }

        const candidateData = candidateDoc.data()!;
        if (candidateData.portalSessionToken !== sessionToken) {
            return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });
        }

        // Duplicate Check: Same RQ within last 30 days
        const existingApps = candidateData.applications || [];
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const existingApp = existingApps.find((app: any) => {
            if (app.rqId !== rqId) return false;
            const appDate = app.appliedAt ? new Date(app.appliedAt._seconds * 1000) : new Date(0);
            return appDate > thirtyDaysAgo;
        });

        if (existingApp) {
            return NextResponse.json({
                error: 'Ya tienes una postulación activa para esta posición.',
                alreadyApplied: true
            }, { status: 400 });
        }

        // Get RQ data
        const rqDoc = await db.collection('rqs').doc(rqId).get();
        if (!rqDoc.exists) {
            return NextResponse.json({ error: 'Vacante no encontrada' }, { status: 404 });
        }

        const rqData = rqDoc.data()!;

        // Check RQ still active
        if (!ACTIVE_STATUSES.includes(rqData.status) && !ACTIVE_STATUSES.includes(rqData.estado)) {
            return NextResponse.json({ error: 'Esta vacante ya no está disponible' }, { status: 410 });
        }

        // Create application record
        const applicationId = uuidv4();
        const now = new Date().toISOString();

        const application = {
            id: applicationId,
            rqId,
            rqNumber: rqData.rqNumber || rqData.codigo || '',
            posicion: rqData.puesto || rqData.posicion || rqData.posicionNombre || '',
            modalidad: rqData.modalidad || 'Full Time',
            turno: rqData.turno || '',
            marcaId: rqData.marcaId || '',
            marcaNombre: rqData.marcaNombre || '',
            tiendaId: rqData.tiendaId || '',
            tiendaNombre: rqData.tiendaNombre || '',
            holdingSlug: holdingSlug || rqData.tenantId || '',
            appliedAt: now,
            source: 'portal_publico',
            kqAnswers: kqAnswers || {},
            kqResults: kqResults || {},
            kqPassed: !!kqPassed,
            flow: flow || 'B',
            status: kqPassed ? 'pending_schedule' : 'in_review',
            inRescueInbox: !kqPassed
        };

        // Update candidate with application
        await db.collection('candidates').doc(candidateId).update({
            applications: AdminFieldValue.arrayUnion(application),
            updatedAt: AdminFieldValue.serverTimestamp()
        });

        // Also create an Entry in  rq_applications subcollection for easy recruiter access
        await db.collection('rqs').doc(rqId).collection('applications').doc(applicationId).set({
            ...application,
            candidateId,
            candidateNombre: `${candidateData.nombre} ${candidateData.apellidoPaterno}`,
            candidateEmail: candidateData.email,
            candidatePhone: candidateData.telefono || candidateData.celular || '',
            candidateDistrito: candidateData.distrito || '',
            createdAt: AdminFieldValue.serverTimestamp()
        });

        // If flow B, add to rescue_inbox
        if (!kqPassed) {
            await db.collection('rescue_inbox').add({
                candidateId,
                applicationId,
                rqId,
                posicion: application.posicion,
                marcaNombre: application.marcaNombre,
                tiendaNombre: application.tiendaNombre,
                holdingSlug: application.holdingSlug,
                candidateName: `${candidateData.nombre} ${candidateData.apellidoPaterno}`,
                candidateEmail: candidateData.email,
                candidatePhone: candidateData.telefono || '',
                candidateDistrito: candidateData.distrito || '',
                kqPassed: false,
                status: 'pending_review',
                createdAt: AdminFieldValue.serverTimestamp()
            });
        }

        // Send confirmation email via Resend
        try {
            const { Resend } = await import('resend');
            const resend = new Resend(process.env.RESEND_API_KEY);

            const brandName = application.marcaNombre || 'LIAH';
            const accentColor = rqData.config?.branding?.primaryColor || '#a51890';
            const holdingId = rqData.tenantId;

            // Load holding config for custom templates
            let subject = `🚀 Postulación recibida: ${application.posicion}`;
            let bodyText = `Hemos recibido tu postulación para el puesto de ${application.posicion} en ${brandName}. Nuestro equipo de selección revisará tu perfil y te contactaremos pronto.`;
            
            if (holdingId) {
                const templateSnap = await db.collection('holdings').doc(holdingId).collection('config').doc('email_templates').get();
                if (templateSnap.exists) {
                    const templates = templateSnap.data();
                    const thankYou = templates?.thank_you;
                    if (thankYou?.enabled && thankYou.body) {
                        subject = thankYou.subject || subject;
                        bodyText = thankYou.body;
                    }
                }
            }

            // Replace variables
            const vars: Record<string, string> = {
                '{{CANDIDATE_NAME}}': candidateData.nombre,
                '{{JOB_TITLE}}': application.posicion,
                '{{HOLDING_NAME}}': brandName,
                '{{STORE_NAME}}': application.tiendaNombre,
                '{{DATE}}': new Date().toLocaleDateString('es-PE')
            };

            Object.entries(vars).forEach(([key, val]) => {
                subject = subject.replace(new RegExp(key, 'g'), val);
                bodyText = bodyText.replace(new RegExp(key, 'g'), val);
            });

            await resend.emails.send({
                from: `${brandName} - LIAH <noreply@notifications.getliah.com>`,
                to: candidateData.email,
                subject: subject,
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f4f7f6;">
                        <div style="background: white; border-radius: 12px; padding: 30px; border: 1px solid #e1e8e5; white-space: pre-wrap;">
                            ${bodyText.split('\n').map(line => `<p style="margin: 0 0 10px 0;">${line}</p>`).join('')}
                            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                            <p style="font-size: 12px; color: #999; text-align: center;">Powered by LIAH</p>
                        </div>
                    </div>
                `
            });
            console.log('[Portal Apply] Confirmation email sent to:', candidateData.email, 'using template logic');
        } catch (emailError) {
            console.error('[Portal Apply] Error sending confirmation email:', emailError);
        }

        console.log('[Portal Apply] Success:', { candidateId, rqId, flow: application.flow, applicationId });

        return NextResponse.json({
            success: true,
            applicationId,
            flow: application.flow
        });

    } catch (error: any) {
        console.error('[Portal Apply] Error:', error?.message || error);
        return NextResponse.json({ error: 'Error interno: ' + (error?.message || 'desconocido') }, { status: 500 });
    }
}
