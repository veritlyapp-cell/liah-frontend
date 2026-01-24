import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';

// Get Admin Firestore instance
const adminDb = getAdminFirestore();

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { applicationId, candidateName, candidateEmail, jobTitle, holdingId } = body;

        if (!candidateEmail || !candidateName || !jobTitle) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Get holding info for branding using Admin SDK
        let holdingName = 'LIAH';
        let holdingLogo = null;

        console.log('[Email] Received holdingId:', holdingId);

        if (holdingId) {
            try {
                const holdingDoc = await adminDb.collection('holdings').doc(holdingId).get();
                console.log('[Email] Holding doc exists:', holdingDoc.exists);
                if (holdingDoc.exists) {
                    const data = holdingDoc.data();
                    console.log('[Email] Holding data:', { nombre: data?.nombre, logoUrl: !!data?.logoUrl });
                    holdingName = data?.nombre || holdingName;
                    holdingLogo = data?.logoUrl || null;
                } else {
                    console.warn('[Email] Holding not found for ID:', holdingId);
                    // Maybe the holdingId IS the name - use it directly as fallback
                    holdingName = holdingId.charAt(0).toUpperCase() + holdingId.slice(1);
                    console.log('[Email] Using holdingId as name:', holdingName);
                }
            } catch (err) {
                console.error('[Email] Error fetching holding:', err);
                // Use holdingId as fallback name
                holdingName = holdingId.charAt(0).toUpperCase() + holdingId.slice(1);
            }
        } else {
            console.warn('[Email] No holdingId provided, using fallback LIAH');
        }

        console.log('[Email] Using holdingName:', holdingName);

        // Try to send email via Resend (if configured)
        const resendApiKey = process.env.RESEND_API_KEY;

        if (resendApiKey) {
            try {
                const emailHtml = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="utf-8">
                        <style>
                            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                            .header { background: linear-gradient(135deg, #7c3aed, #6366f1); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
                            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
                            .button { display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 20px; }
                            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="header">
                                ${holdingLogo ? `<img src="${holdingLogo}" alt="${holdingName}" style="max-height: 60px; margin-bottom: 15px;">` : ''}
                                <h1 style="margin: 0;">¡Gracias por postular!</h1>
                            </div>
                            <div class="content">
                                <p>Hola <strong>${candidateName}</strong>,</p>
                                <p>Hemos recibido tu postulación para el puesto de <strong>${jobTitle}</strong> en ${holdingName}.</p>
                                <p>Nuestro equipo de Talento Humano revisará tu perfil y te contactaremos pronto con novedades sobre el proceso.</p>
                                <p>Mientras tanto, te invitamos a seguirnos en nuestras redes sociales para conocer más sobre nuestra cultura y oportunidades.</p>
                                <div class="footer">
                                    <p>Este es un correo automático, por favor no responder.</p>
                                    <p>© ${new Date().getFullYear()} ${holdingName} - Todos los derechos reservados</p>
                                </div>
                            </div>
                        </div>
                    </body>
                    </html>
                `;

                const response = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${resendApiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        from: `${holdingName} <noreply@resend.dev>`,
                        to: candidateEmail,
                        subject: `Recibimos tu postulación - ${jobTitle}`,
                        html: emailHtml
                    })
                });

                if (!response.ok) {
                    console.error('Resend error:', await response.text());
                } else {
                    console.log('✅ Confirmation email sent to:', candidateEmail);
                }
            } catch (emailErr) {
                console.error('Error sending email:', emailErr);
            }
        } else {
            console.log('📧 Resend not configured - skipping email');
        }

        return NextResponse.json({
            success: true,
            message: 'Application confirmation processed'
        });

    } catch (error) {
        console.error('Error in send-application-email:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
