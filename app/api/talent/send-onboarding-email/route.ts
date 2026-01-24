import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';

// Get Admin Firestore instance
const adminDb = getAdminFirestore();

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { applicationId, candidateName, candidateEmail, jobTitle, holdingId, joiningDate } = body;

        if (!candidateEmail || !candidateName || !jobTitle || !joiningDate) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Get holding info for branding using Admin SDK
        let holdingName = 'LIAH';
        let holdingLogo = null;

        if (holdingId) {
            try {
                const holdingDoc = await adminDb.collection('holdings').doc(holdingId).get();
                if (holdingDoc.exists) {
                    const data = holdingDoc.data();
                    holdingName = data?.nombre || holdingName;
                    holdingLogo = data?.logoUrl || null;
                } else {
                    holdingName = holdingId.charAt(0).toUpperCase() + holdingId.slice(1);
                }
            } catch (err) {
                console.error('[Onboarding] Error fetching holding:', err);
                holdingName = holdingId.charAt(0).toUpperCase() + holdingId.slice(1);
            }
        }

        console.log(`[Onboarding] Sending email for ${holdingName} to ${candidateEmail}`);

        // Format date
        const formattedDate = new Date(joiningDate).toLocaleDateString('es-PE', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'UTC' // Prevent timezone shift since input is YYYY-MM-DD
        });

        // Generate a secure token for the onboarding form
        const onboardingToken = crypto.randomUUID();

        // Save token to application
        try {
            await adminDb.collection('talent_applications').doc(applicationId).update({
                onboardingToken,
                onboardingTokenCreatedAt: new Date(),
                onboardingStatus: 'pending', // pending, completed
                joiningDate: new Date(joiningDate)
            });
        } catch (dbError) {
            console.error('[Onboarding] Error saving token:', dbError);
            // Continue sending email, but maybe warn? 
            // Actually if we can't save the token, the link won't work. We should probably fail or retry.
            return NextResponse.json({ error: 'Failed to initialize onboarding session' }, { status: 500 });
        }

        // Try to send email via Resend
        const resendApiKey = process.env.RESEND_API_KEY;
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const onboardingLink = `${appUrl}/onboarding/${onboardingToken}`;

        if (resendApiKey) {
            try {
                const emailHtml = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="utf-8">
                        <style>
                            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f9; margin: 0; padding: 0; }
                            .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                            .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 40px 30px; text-align: center; }
                            .content { padding: 40px 30px; }
                            .welcome-text { font-size: 24px; font-weight: bold; color: #059669; margin-bottom: 20px; text-align: center; }
                            .highlight-box { background: #ecfdf5; border-left: 5px solid #10b981; padding: 20px; margin: 25px 0; border-radius: 4px; }
                            .button { display: block; width: fit-content; margin: 30px auto; background: #10b981; color: white !important; padding: 16px 32px; border-radius: 50px; text-decoration: none; font-weight: bold; font-size: 16px; text-align: center; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3); }
                            .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="header">
                                ${holdingLogo ? `<img src="${holdingLogo}" alt="${holdingName}" style="max-height: 60px; margin-bottom: 20px; background: white; padding: 10px; border-radius: 8px;">` : ''}
                                <h1 style="margin: 0; font-size: 28px;">¡Bienvenido(a) al equipo!</h1>
                            </div>
                            <div class="content">
                                <p class="welcome-text">Hola ${candidateName},</p>
                                
                                <p>Es un placer confirmarte que has sido seleccionado(a) para formar parte de la familia <strong>${holdingName}</strong> en el puesto de <strong>${jobTitle}</strong>.</p>
                                
                                <div class="highlight-box">
                                    <h3 style="margin-top: 0; color: #065f46;">🚀 Tu Primer Día</h3>
                                    <p style="margin-bottom: 0;">Tu fecha de ingreso es el: <strong>${formattedDate}</strong></p>
                                </div>
                                
                                <p>Para formalizar tu ingreso y preparar todo para tu llegada, necesitamos que completes el siguiente formulario de onboarding con tus datos adicionales.</p>
                                
                                <a href="${onboardingLink}" class="button">📝 Completar Formulario de Ingreso</a>
                                
                                <p style="text-align: center; color: #666; font-size: 14px;">Por favor completa este formulario lo antes posible para no retrasar tu alta en nuestros sistemas.</p>
                            </div>
                            <div class="footer">
                                <p>© ${new Date().getFullYear()} ${holdingName}. Todos los derechos reservados.</p>
                                <p>Si tienes alguna pregunta antes de tu ingreso, no dudes en responder a este correo.</p>
                            </div>
                        </div>
                    </body>
                    </html>
                `;

                await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${resendApiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        from: `${holdingName} <noreply@resend.dev>`,
                        to: candidateEmail,
                        subject: `🎉 ¡Bienvenido(a) a ${holdingName} - Confirmación de Ingreso!`,
                        html: emailHtml
                    })
                });

                console.log('[Onboarding] Email sent successfully');
                return NextResponse.json({ success: true });
            } catch (emailErr) {
                console.error('[Onboarding] Error sending email:', emailErr);
                return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
            }
        } else {
            console.warn('[Onboarding] RESEND_API_KEY not configured');
            return NextResponse.json({ success: true, message: 'Email skipped (no API key)' });
        }

    } catch (error) {
        console.error('[Onboarding] Internal error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
