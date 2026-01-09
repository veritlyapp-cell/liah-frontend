import { NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        // Firebase Auth sends the password reset email automatically
        const auth = getAdminAuth();
        // We use the client-side SDK for this, but provide a server endpoint for flexibility

        // Note: Password reset emails are sent via Firebase's built-in email service
        // You can customize the template in Firebase Console > Authentication > Templates

        console.log(`📧 Password reset requested for: ${email}`);

        // Return success - the actual reset email is triggered from client-side
        // using sendPasswordResetEmail from firebase/auth
        return NextResponse.json({
            success: true,
            message: 'Si el correo existe, recibirás un enlace para restablecer tu contraseña.'
        });

    } catch (error: any) {
        console.error('Password reset error:', error);

        // Don't reveal if email exists or not for security
        return NextResponse.json({
            success: true,
            message: 'Si el correo existe, recibirás un enlace para restablecer tu contraseña.'
        });
    }
}
