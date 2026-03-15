import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    try {
        const {
            userEmail,
            userName,
            temporaryPassword,
            role,
            holdingName,
            primaryColor
        } = await request.json();

        if (!userEmail || !temporaryPassword) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const companyName = holdingName || 'LIAH';
        const loginUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://liah.app';

        // Role display names
        const roleNames: Record<string, string> = {
            'admin_holding': 'Administrador de Holding',
            'jefe_marca': 'Jefe de Marca',
            'supervisor': 'Supervisor',
            'store_manager': 'Gerente de Tienda',
            'recruiter': 'Recruiter',
            'hiring_manager': 'Hiring Manager',
            'approver': 'Aprobador',
            'super_admin': 'Super Administrador'
        };

        const roleDisplay = roleNames[role] || role;

        // Check if Resend is configured
        if (!process.env.RESEND_API_KEY) {
            console.log('📧 [MOCK - Welcome Email] ---------------------------------------------------');
            console.log(`To: ${userName || 'Usuario'} <${userEmail}>`);
            console.log(`Subject: ¡Bienvenido/a a ${companyName}!`);
            console.log(`Role: ${roleDisplay}`);
            console.log(`Temp Password: ${temporaryPassword}`);
            console.log(`Login URL: ${loginUrl}`);
            console.log('-------------------------------------------------------------------------');

            return NextResponse.json({
                success: true,
                message: 'Email logged (Mock)',
                mock: true
            });
        }

        const accentColor = primaryColor || '#7c3aed';

        // Send real email via Resend
        const { data, error } = await resend.emails.send({
            from: `${companyName} - Administración <noreply@notifications.getliah.com>`,
            to: userEmail,
            subject: `¡Bienvenido/a a ${companyName}! - Tus credenciales de acceso`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: ${accentColor}; margin: 0;">¡Bienvenido/a a ${companyName}! 🎉</h1>
                    </div>
                    
                    <p style="font-size: 16px; color: #333;">
                        Hola <strong>${userName || 'Usuario'}</strong>,
                    </p>
                    
                    <p style="font-size: 16px; color: #333;">
                        Se ha creado tu cuenta en la plataforma de reclutamiento LIAH con el rol de <strong>${roleDisplay}</strong>.
                    </p>
                    
                    <div style="background: linear-gradient(135deg, #f5f3ff, #ecfeff); padding: 25px; border-radius: 12px; margin: 25px 0;">
                        <h3 style="color: ${accentColor}; margin-top: 0;">🔐 Tus Credenciales de Acceso</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 10px 0; color: #666; width: 120px;">Usuario:</td>
                                <td style="padding: 10px 0; color: #333; font-weight: bold;">${userEmail}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; color: #666;">Contraseña:</td>
                                <td style="padding: 10px 0;">
                                    <code style="background: #e5e7eb; padding: 8px 15px; border-radius: 6px; font-size: 16px; font-weight: bold; color: ${accentColor};">
                                        ${temporaryPassword}
                                    </code>
                                </td>
                            </tr>
                        </table>
                    </div>
                    
                    <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
                        <p style="margin: 0; color: #92400e; font-size: 14px;">
                            ⚠️ <strong>Importante:</strong> Por seguridad, te recomendamos cambiar tu contraseña después de iniciar sesión por primera vez.
                        </p>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${loginUrl}/login" 
                           style="background: linear-gradient(135deg, ${accentColor}, #06b6d4); 
                                  color: white; 
                                  padding: 15px 40px; 
                                  text-decoration: none; 
                                  border-radius: 10px; 
                                  font-weight: bold;
                                  display: inline-block;
                                  font-size: 16px;">
                            Iniciar Sesión
                        </a>
                    </div>
                    
                    <p style="color: #666; font-size: 14px; margin-top: 30px;">
                        Si tienes alguna pregunta sobre tu acceso, contacta al administrador de tu organización.
                    </p>
                    
                    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;"/>
                    
                    <div style="text-align: center;">
                        <p style="color: #999; font-size: 12px; margin: 0;">
                            Este correo fue enviado por LIAH - Asistente de Reclutamiento Inteligente<br/>
                            © ${new Date().getFullYear()} ${companyName}
                        </p>
                    </div>
                </div>
            `
        });

        if (error) {
            console.error('Resend error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        console.log('✅ Welcome email sent:', data);
        return NextResponse.json({ success: true, data });

    } catch (error) {
        console.error('Error sending welcome email:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
