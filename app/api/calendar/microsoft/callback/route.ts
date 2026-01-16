/**
 * Microsoft/Office 365 OAuth Callback
 * Exchanges authorization code for tokens
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
            `${request.nextUrl.origin}/talent?error=microsoft_auth_denied`
        );
    }

    if (!code || !state) {
        return NextResponse.redirect(
            `${request.nextUrl.origin}/talent?error=missing_params`
        );
    }

    // Decode state
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

    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
    const redirectUri = process.env.MICROSOFT_REDIRECT_URI ||
        `${request.nextUrl.origin}/api/calendar/microsoft/callback`;

    if (!clientId || !clientSecret) {
        return NextResponse.redirect(
            `${request.nextUrl.origin}/talent?error=oauth_not_configured`
        );
    }

    try {
        // Exchange code for tokens
        const tokenResponse = await fetch(
            'https://login.microsoftonline.com/common/oauth2/v2.0/token',
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    code,
                    client_id: clientId,
                    client_secret: clientSecret,
                    redirect_uri: redirectUri,
                    grant_type: 'authorization_code'
                })
            }
        );

        if (!tokenResponse.ok) {
            console.error('Microsoft token exchange failed:', await tokenResponse.text());
            return NextResponse.redirect(
                `${request.nextUrl.origin}/talent?error=token_exchange_failed`
            );
        }

        const tokens = await tokenResponse.json();

        // Get user info from Microsoft Graph
        const userInfoResponse = await fetch(
            'https://graph.microsoft.com/v1.0/me',
            { headers: { Authorization: `Bearer ${tokens.access_token}` } }
        );

        let microsoftEmail = '';
        if (userInfoResponse.ok) {
            const userInfo = await userInfoResponse.json();
            microsoftEmail = userInfo.mail || userInfo.userPrincipalName;
        }

        // Store tokens
        await setDoc(doc(db, 'calendar_connections', userId), {
            provider: 'microsoft',
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiresAt: Date.now() + (tokens.expires_in * 1000),
            microsoftEmail,
            holdingId,
            connectedAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        });

        return NextResponse.redirect(
            `${request.nextUrl.origin}/talent?success=microsoft_calendar_connected`
        );

    } catch (error) {
        console.error('Microsoft OAuth callback error:', error);
        return NextResponse.redirect(
            `${request.nextUrl.origin}/talent?error=oauth_error`
        );
    }
}
