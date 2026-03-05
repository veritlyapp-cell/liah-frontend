import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';
import { verifyAuth, isAdmin } from '@/lib/middleware/auth-verify';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const authResult = await verifyAuth(req);
        if (!authResult.authenticated || !authResult.user || !isAdmin(authResult.user)) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 403 }
            );
        }

        const body = await req.json();
        const { userId, claims } = body;

        if (!userId || !claims) {
            return NextResponse.json(
                { error: 'userId and claims are required' },
                { status: 400 }
            );
        }

        const auth = getAdminAuth();
        await auth.setCustomUserClaims(userId, claims);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[SYNC CLAIMS] Error:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}
