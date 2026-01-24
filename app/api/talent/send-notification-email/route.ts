import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
    try {
        const {
            type,
            recipientEmail,
            recipientName,
            data
        } = await request.json();

        if (!recipientEmail || !type) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        let subject = '';
        let htmlContent = '';
        const companyName = data?.holdingName || 'LIAH';
        const dashboardUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://getliah.com';

        switch (type) {
            case 'rq_pending_approval':
                subject = `📋 Requerimiento Pendiente de Aprobación - ${data?.puestoNombre || 'Nuevo RQ'}`;
                htmlContent = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
                        <h2 style="color: #7c3aed;">Hola ${recipientName || 'Approver'},</h2>
                        <p>Tienes un nuevo requerimiento de personal que requiere tu revisión y aprobación.</p>
                        <div style="background: #f5f3ff; padding: 20px; border-radius: 12px; margin: 20px 0;">
                            <p style="margin: 5px 0;"><strong>RQ:</strong> ${data?.rqCodigo || 'N/A'}</p>
                            <p style="margin: 5px 0;"><strong>Puesto:</strong> ${data?.puestoNombre}</p>
                            <p style="margin: 5px 0;"><strong>Solicitado por:</strong> ${data?.creatorName || data?.creatorEmail}</p>
                            <p style="margin: 5px 0;"><strong>Ubicación:</strong> ${data?.gerenciaNombre} - ${data?.areaNombre}</p>
                            <p style="margin: 5px 0;"><strong>Cantidad:</strong> ${data?.cantidad}</p>
                        </div>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${dashboardUrl}/talent?tab=requerimientos&rq=${data?.rqId}" 
                               style="background: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                                Revisar en Dashboard
                            </a>
                        </div>
                    </div>
                `;
                break;

            case 'rq_approved':
                subject = `✅ Requerimiento Aprobado - ${data?.puestoNombre}`;
                htmlContent = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
                        <h2 style="color: #10b981;">¡Buenas noticias!</h2>
                        <p>El requerimiento <strong>${data?.rqCodigo}</strong> para el puesto de <strong>${data?.puestoNombre}</strong> ha sido aprobado completamente.</p>
                        <div style="background: #f0fdf4; padding: 20px; border-radius: 12px; margin: 20px 0;">
                            <p style="margin: 5px 0;"><strong>Estado:</strong> Aprobado</p>
                            <p style="margin: 5px 0;"><strong>Recruiter Asignado:</strong> ${data?.assignedRecruiterName || 'Pendiente'}</p>
                        </div>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${dashboardUrl}/talent?tab=requerimientos" 
                               style="background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                                Ver en Dashboard
                            </a>
                        </div>
                    </div>
                `;
                break;

            case 'rq_assigned':
                subject = `👤 Nuevo Requerimiento Asignado - ${data?.puestoNombre}`;
                htmlContent = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
                        <h2 style="color: #7c3aed;">Hola ${recipientName},</h2>
                        <p>Se te ha asignado un nuevo requerimiento para gestionar el proceso de reclutamiento.</p>
                        <div style="background: #f5f3ff; padding: 20px; border-radius: 12px; margin: 20px 0;">
                            <p style="margin: 5px 0;"><strong>RQ:</strong> ${data?.rqCodigo}</p>
                            <p style="margin: 5px 0;"><strong>Puesto:</strong> ${data?.puestoNombre}</p>
                            <p style="margin: 5px 0;"><strong>Solicitante:</strong> ${data?.creatorName}</p>
                        </div>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${dashboardUrl}/talent?tab=pipeline" 
                               style="background: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                                Ver Pipeline
                            </a>
                        </div>
                    </div>
                `;
                break;

            case 'rq_rejected':
                subject = `❌ Requerimiento Rechazado - ${data?.puestoNombre}`;
                htmlContent = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
                        <h2 style="color: #ef4444;">Actualización de Requerimiento</h2>
                        <p>Tu requerimiento <strong>${data?.rqCodigo}</strong> ha sido rechazado.</p>
                        <div style="background: #fef2f2; padding: 20px; border-radius: 12px; margin: 20px 0;">
                            <p style="margin: 5px 0;"><strong>Motivo:</strong> ${data?.reason || 'No especificado'}</p>
                            <p style="margin: 5px 0;"><strong>Rechazado por:</strong> ${data?.rejectedByName || data?.rejectedByEmail}</p>
                        </div>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${dashboardUrl}/talent?tab=requerimientos" 
                               style="background: #ef4444; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                                Ver Detalles
                            </a>
                        </div>
                    </div>
                `;
                break;

            case 'new_application':
                subject = `📩 Nueva Postulación: ${data?.candidateName} - ${data?.jobTitle}`;
                htmlContent = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
                        <h2 style="color: #7c3aed;">¡Nueva Postulación Recibida!</h2>
                        <p>Se ha recibido una nueva postulación para la vacante de <strong>${data?.jobTitle}</strong>.</p>
                        <div style="background: #f5f3ff; padding: 20px; border-radius: 12px; margin: 20px 0;">
                            <p style="margin: 5px 0;"><strong>Candidato:</strong> ${data?.candidateName}</p>
                            <p style="margin: 5px 0;"><strong>Puesto:</strong> ${data?.jobTitle}</p>
                            ${data?.matchScore ? `<p style="margin: 5px 0;"><strong>Match Score:</strong> ${data?.matchScore}%</p>` : ''}
                        </div>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${dashboardUrl}/talent?tab=pipeline&job=${data?.jobId}" 
                               style="background: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                                Ver Candidato en Pipeline
                            </a>
                        </div>
                        <p style="font-size: 12px; color: #666; margin-top: 20px;">
                            Este registro también se encuentra disponible en tu bandeja de notificaciones dentro de la plataforma.
                        </p>
                    </div>
                `;
                break;

            default:
                return NextResponse.json({ error: 'Invalid notification type' }, { status: 400 });
        }

        // Send email via Resend
        const { data: resData, error } = await resend.emails.send({
            from: 'LIAH Talent <noreply@notifications.getliah.com>',
            to: recipientEmail,
            subject: subject,
            html: htmlContent,
        });

        if (error) {
            console.error('Resend error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data: resData });

    } catch (error) {
        console.error('Error sending notification email:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
