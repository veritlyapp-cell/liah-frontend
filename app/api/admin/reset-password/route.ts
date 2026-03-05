import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';
import { verifyAuth, isAdmin } from '@/lib/middleware/auth-verify';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        // Auth verification - Admin only
        const authResult = await verifyAuth(req);
        if (!authResult.authenticated || !authResult.user || !isAdmin(authResult.user)) {
            return NextResponse.json(
                { error: 'Unauthorized: Admin access required' },
                { status: 403 }
            );
        }

        const body = await req.json();
        const { userId, email, newPassword } = body;

        if (!userId) {
            return NextResponse.json(
                { error: 'userId es requerido' },
                { status: 400 }
            );
        }

        const passwordToSet = newPassword || 'Liah2026!';

        console.log(`[RESET PASSWORD] Resetting password for: ${email || userId}`);

        const auth = getAdminAuth();
        await auth.updateUser(userId, {
            password: passwordToSet
        });

        return NextResponse.json({
            success: true,
            message: `Contraseña restablecida correctamente para ${email || userId}. La nueva contraseña es: ${passwordToSet}`
        });

    } catch (error: any) {
        console.error('[RESET PASSWORD] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Error restableciendo contraseña' },
            { status: 500 }
        );
    }
}
