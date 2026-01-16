/**
 * Google Calendar OAuth Callback
 * Exchanges authorization code for tokens and stores them
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, setDoc, Timestamp } from 'firebase/firestore';

export async function GET(request: NextRequest) {
    const code = request.nextUrl.searchParams.get('code');
    const state = request.nextUrl.searchParams.get('state');
    const error = request.nextUrl.searchParams.get('error');

    if (error) {
        return NextResponse.redirect(
            `${request.nextUrl.origin}/talent?error=google_auth_denied`
        );
    }

    if (!code || !state) {
        return NextResponse.redirect(
            `${request.nextUrl.origin}/talent?error=missing_params`
        );
    }

    // Decode state to get userId and holdingId
    let userId: string, holdingId: string;
    try {
        const decoded = JSON.parse(Buffer.from(state, 'base64').toString());
        userId = decoded.userId;
        holdingId = decoded.holdingId;
    } catch (e) {
        return NextResponse.redirect(
            `${request.nextUrl.origin}/talent?error=invalid_state`
        );
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI ||
        `${request.nextUrl.origin}/api/calendar/google/callback`;

    if (!clientId || !clientSecret) {
        return NextResponse.redirect(
            `${request.nextUrl.origin}/talent?error=oauth_not_configured`
        );
    }

    try {
        // Exchange code for tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code'
            })
        });

        if (!tokenResponse.ok) {
            const errorData = await tokenResponse.text();
            console.error('Token exchange failed:', errorData);
            return NextResponse.redirect(
                `${request.nextUrl.origin}/talent?error=token_exchange_failed`
            );
        }

        const tokens = await tokenResponse.json();

        // Get user email from Google
        const userInfoResponse = await fetch(
            'https://www.googleapis.com/oauth2/v2/userinfo',
            { headers: { Authorization: `Bearer ${tokens.access_token}` } }
        );

        let googleEmail = '';
        if (userInfoResponse.ok) {
            const userInfo = await userInfoResponse.json();
            googleEmail = userInfo.email;
        }

        // Store tokens in Firestore
        await setDoc(doc(db, 'calendar_connections', userId), {
            provider: 'google',
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiresAt: Date.now() + (tokens.expires_in * 1000),
            googleEmail,
            holdingId,
            connectedAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        });

        return NextResponse.redirect(
            `${request.nextUrl.origin}/talent?success=google_calendar_connected`
        );

    } catch (error) {
        console.error('OAuth callback error:', error);
        return NextResponse.redirect(
            `${request.nextUrl.origin}/talent?error=oauth_error`
        );
    }
}
