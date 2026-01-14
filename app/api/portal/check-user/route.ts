import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    console.log('[check-user] Starting...');

    try {
        const { email } = await request.json();
        console.log('[check-user] Email:', email);

        if (!email) {
            return NextResponse.json({ error: 'Email requerido' }, { status: 400 });
        }

        // TEMPORARY: Skip Firebase and always return "new user"
        // This is to test if the API route works at all
        console.log('[check-user] TEMP: Returning new user (Firebase bypassed)');

        return NextResponse.json({
            exists: false,
            candidateId: null
        });

    } catch (error) {
        console.error('[check-user] Error:', error);
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}
