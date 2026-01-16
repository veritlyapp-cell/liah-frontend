/**
 * Microsoft/Office 365 OAuth Authentication
 * Initiates OAuth flow for Outlook Calendar access
 */

import { NextRequest, NextResponse } from 'next/server';

// Scopes needed for Outlook calendar access
const SCOPES = [
    'openid',
    'profile',
    'email',
    'Calendars.ReadWrite',
    'OnlineMeetings.ReadWrite'
];

export async function GET(request: NextRequest) {
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const redirectUri = process.env.MICROSOFT_REDIRECT_URI ||
        `${request.nextUrl.origin}/api/calendar/microsoft/callback`;

    if (!clientId) {
        return NextResponse.json(
            { error: 'Microsoft OAuth not configured. Set MICROSOFT_CLIENT_ID in environment.' },
            { status: 500 }
        );
    }

    // Get userId from query params
    const userId = request.nextUrl.searchParams.get('userId');
    const holdingId = request.nextUrl.searchParams.get('holdingId');

    if (!userId || !holdingId) {
        return NextResponse.json(
            { error: 'userId and holdingId are required' },
            { status: 400 }
        );
    }

    // Create state parameter
    const state = Buffer.from(JSON.stringify({ userId, holdingId })).toString('base64');

    // Build Microsoft OAuth URL
    const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', SCOPES.join(' '));
    authUrl.searchParams.set('response_mode', 'query');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('prompt', 'consent');

    return NextResponse.redirect(authUrl.toString());
}
