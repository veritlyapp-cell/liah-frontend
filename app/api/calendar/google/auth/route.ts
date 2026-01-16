/**
 * Google Calendar OAuth Authentication
 * Initiates OAuth flow for Google Calendar access
 */

import { NextRequest, NextResponse } from 'next/server';

// Scopes needed for calendar access
const SCOPES = [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar.readonly'
];

export async function GET(request: NextRequest) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${request.nextUrl.origin}/api/calendar/google/callback`;

    if (!clientId) {
        return NextResponse.json(
            { error: 'Google OAuth not configured. Set GOOGLE_CLIENT_ID in environment.' },
            { status: 500 }
        );
    }

    // Get userId from query params to store in state
    const userId = request.nextUrl.searchParams.get('userId');
    const holdingId = request.nextUrl.searchParams.get('holdingId');

    if (!userId || !holdingId) {
        return NextResponse.json(
            { error: 'userId and holdingId are required' },
            { status: 400 }
        );
    }

    // Create state parameter to pass through OAuth flow
    const state = Buffer.from(JSON.stringify({ userId, holdingId })).toString('base64');

    // Build Google OAuth URL
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', SCOPES.join(' '));
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    authUrl.searchParams.set('state', state);

    return NextResponse.redirect(authUrl.toString());
}
