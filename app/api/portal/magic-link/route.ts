import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, Timestamp, limit } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: 'Email requerido' }, { status: 400 });
        }

        // Find candidate by email
        const candidatesRef = collection(db, 'candidates');
        const q = query(candidatesRef, where('email', '==', email.toLowerCase()), limit(1));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
        }

        const candidateDoc = snapshot.docs[0];

        // Generate magic link token
        const magicToken = uuidv4();
        const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Update candidate with magic token
        await updateDoc(doc(db, 'candidates', candidateDoc.id), {
            magicLinkToken: magicToken,
            magicLinkExpiry: Timestamp.fromDate(tokenExpiry),
            updatedAt: Timestamp.now()
        });

        // Send email with magic link
        const magicLinkUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://getliah.com'}/portal/auth/${magicToken}`;

        try {
            // Initialize Resend inside handler (to avoid build errors)
            const { Resend } = await import('resend');
            const resend = new Resend(process.env.RESEND_API_KEY);

            await resend.emails.send({
                from: 'LIAH Portal <noreply@getliah.com>',
                to: email,
                subject: '🔗 Tu enlace de acceso al Portal de Empleos',
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="color: #7c3aed; margin: 0;">Portal de Empleos</h1>
                            <p style="color: #666;">Powered by LIAH</p>
                        </div>
                        
                        <p style="font-size: 16px; color: #333;">
                            Hola, haz clic en el siguiente enlace para acceder a tu cuenta:
                        </p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${magicLinkUrl}" 
                               style="display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #7c3aed, #06b6d4); color: white; text-decoration: none; border-radius: 10px; font-weight: bold;">
                                Acceder al Portal →
                            </a>
                        </div>
                        
                        <p style="font-size: 14px; color: #999; text-align: center;">
                            Este enlace expira en 24 horas.
                        </p>
                        
                        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                        
                        <p style="font-size: 12px; color: #999; text-align: center;">
                            Si no solicitaste este acceso, puedes ignorar este correo.
                        </p>
                    </div>
                `
            });

            console.log('[Magic Link] Email sent to:', email);
        } catch (emailError) {
            console.error('[Magic Link] Error sending email:', emailError);
            // Continue even if email fails - user can try again
        }

        return NextResponse.json({
            success: true,
            message: 'Magic link enviado'
        });

    } catch (error) {
        console.error('Error generating magic link:', error);
        return NextResponse.json({ error: 'Error al generar enlace' }, { status: 500 });
    }
}
