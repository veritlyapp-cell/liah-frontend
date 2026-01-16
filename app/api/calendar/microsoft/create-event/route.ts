/**
 * Create Microsoft/Outlook Calendar Event
 * Creates an interview event with Teams meeting link
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';

interface CalendarEventRequest {
    userId: string;
    title: string;
    description: string;
    startTime: string;
    endTime: string;
    attendees?: { email: string; name?: string }[];
    location?: string;
}

async function refreshAccessToken(userId: string, refreshToken: string): Promise<string | null> {
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;

    if (!clientId || !clientSecret) return null;

    try {
        const response = await fetch(
            'https://login.microsoftonline.com/common/oauth2/v2.0/token',
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: clientId,
                    client_secret: clientSecret,
                    refresh_token: refreshToken,
                    grant_type: 'refresh_token'
                })
            }
        );

        if (!response.ok) return null;

        const tokens = await response.json();

        await updateDoc(doc(db, 'calendar_connections', userId), {
            accessToken: tokens.access_token,
            expiresAt: Date.now() + (tokens.expires_in * 1000),
            updatedAt: Timestamp.now()
        });

        return tokens.access_token;
    } catch (error) {
        console.error('Microsoft token refresh failed:', error);
        return null;
    }
}

export async function POST(request: NextRequest) {
    try {
        const body: CalendarEventRequest = await request.json();
        const { userId, title, description, startTime, endTime, attendees, location } = body;

        if (!userId || !title || !startTime || !endTime) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Get stored tokens
        const connectionDoc = await getDoc(doc(db, 'calendar_connections', userId));

        if (!connectionDoc.exists() || connectionDoc.data().provider !== 'microsoft') {
            return NextResponse.json(
                { error: 'Microsoft Calendar not connected', needsAuth: true },
                { status: 401 }
            );
        }

        const connection = connectionDoc.data();
        let accessToken = connection.accessToken;

        // Check token expiry
        if (connection.expiresAt < Date.now()) {
            accessToken = await refreshAccessToken(userId, connection.refreshToken);
            if (!accessToken) {
                return NextResponse.json(
                    { error: 'Token refresh failed', needsAuth: true },
                    { status: 401 }
                );
            }
        }

        // Build Microsoft Graph event
        const calendarEvent = {
            subject: title,
            body: {
                contentType: 'HTML',
                content: description.replace(/\n/g, '<br>')
            },
            start: {
                dateTime: startTime,
                timeZone: 'SA Pacific Standard Time'
            },
            end: {
                dateTime: endTime,
                timeZone: 'SA Pacific Standard Time'
            },
            location: location ? { displayName: location } : undefined,
            attendees: attendees?.map(a => ({
                emailAddress: { address: a.email, name: a.name },
                type: 'required'
            })),
            isOnlineMeeting: true,
            onlineMeetingProvider: 'teamsForBusiness'
        };

        // Create event via Microsoft Graph
        const response = await fetch(
            'https://graph.microsoft.com/v1.0/me/events',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(calendarEvent)
            }
        );

        if (!response.ok) {
            console.error('Microsoft Graph error:', await response.text());
            return NextResponse.json(
                { error: 'Failed to create calendar event' },
                { status: 500 }
            );
        }

        const createdEvent = await response.json();

        return NextResponse.json({
            success: true,
            eventId: createdEvent.id,
            htmlLink: createdEvent.webLink,
            meetLink: createdEvent.onlineMeeting?.joinUrl
        });

    } catch (error) {
        console.error('Create MS event error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
