import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { v4 as uuidv4 } from 'uuid';

// Get Admin Firestore instance
const adminDb = getAdminFirestore();

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { applicationIds, holdingId } = body;

        if (!applicationIds || !Array.isArray(applicationIds) || applicationIds.length === 0) {
            return NextResponse.json({ error: 'No candidates selected' }, { status: 400 });
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
                    // Use holdingId as fallback name
                    holdingName = holdingId.charAt(0).toUpperCase() + holdingId.slice(1);
                }
            } catch (err) {
                console.error('Error fetching holding:', err);
                holdingName = holdingId.charAt(0).toUpperCase() + holdingId.slice(1);
            }
        }

        const results: { email: string; token: string; success: boolean }[] = [];
        const resendApiKey = process.env.RESEND_API_KEY;
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

        for (const appId of applicationIds) {
            try {
                // Get application data using Admin SDK
                const appDoc = await adminDb.collection('talent_applications').doc(appId).get();
                if (!appDoc.exists) continue;

                const appData = appDoc.data() as any;
                const candidateEmail = appData.email;
                const candidateName = appData.nombre;

                // Generate unique token for CUL upload
                const culToken = uuidv4();
                const expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + 7); // 7 days to upload

                // Update application with CUL request info
                await adminDb.collection('talent_applications').doc(appId).update({
                    culRequestedAt: new Date(),
                    culToken,
                    culTokenExpiresAt: expiresAt,
                    culStatus: 'pending', // pending, uploaded, verified, rejected
                    updatedAt: new Date()
                });

                // Send email if Resend is configured
                if (resendApiKey && candidateEmail) {
                    const uploadUrl = `${baseUrl}/verify-cul/${culToken}`;

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
                                .button { display: inline-block; background: #7c3aed; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; margin-top: 20px; font-weight: bold; }
                                .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
                                .info-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; }
                            </style>
                        </head>
                        <body>
                            <div class="container">
                                <div class="header">
                                    ${holdingLogo ? `<img src="${holdingLogo}" alt="${holdingName}" style="max-height: 60px; margin-bottom: 15px;">` : ''}
                                    <h1 style="margin: 0;">📋 Solicitud de CUL</h1>
                                </div>
                                <div class="content">
                                    <p>Hola <strong>${candidateName}</strong>,</p>
                                    <p>Como parte del proceso de selección en ${holdingName}, necesitamos que nos envíes tu <strong>Certificado Único Laboral (CUL)</strong>.</p>
                                    
                                    <div class="info-box">
                                        <strong>¿Qué es el CUL?</strong><br>
                                        El Certificado Único Laboral es un documento gratuito que puedes obtener en la página del Ministerio de Trabajo: 
                                        <a href="https://www.gob.pe/47089-obtener-tu-certificado-unico-laboral-cul">Obtener CUL aquí</a>
                                    </div>
                                    
                                    <p>Por favor haz clic en el siguiente botón para subir tu CUL:</p>
                                    
                                    <div style="text-align: center;">
                                        <a href="${uploadUrl}" class="button">📤 Subir mi CUL</a>
                                    </div>
                                    
                                    <p style="margin-top: 20px;">Este enlace es válido por <strong>7 días</strong>.</p>
                                    
                                    <div class="footer">
                                        <p>Si tienes alguna duda, puedes responder a este correo.</p>
                                        <p>© ${new Date().getFullYear()} ${holdingName}</p>
                                    </div>
                                </div>
                            </div>
                        </body>
                        </html>
                    `;

                    try {
                        await fetch('https://api.resend.com/emails', {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${resendApiKey}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                from: `${holdingName} <noreply@resend.dev>`,
                                to: candidateEmail,
                                subject: `📋 Solicitud de CUL - ${holdingName}`,
                                html: emailHtml
                            })
                        });
                        results.push({ email: candidateEmail, token: culToken, success: true });
                    } catch (emailErr) {
                        console.error('Error sending CUL email:', emailErr);
                        results.push({ email: candidateEmail, token: culToken, success: false });
                    }
                } else {
                    results.push({ email: candidateEmail, token: culToken, success: true });
                }

            } catch (appErr) {
                console.error(`Error processing application ${appId}:`, appErr);
            }
        }

        return NextResponse.json({
            success: true,
            message: `CUL requested from ${results.length} candidates`,
            results
        });

    } catch (error) {
        console.error('Error in request-cul:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
