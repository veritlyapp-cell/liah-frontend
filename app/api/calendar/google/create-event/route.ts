/**
 * Create Google Calendar Event
 * Creates an interview event on the user's Google Calendar
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';

interface CalendarEventRequest {
    userId: string;
    title: string;
    description: string;
    startTime: string; // ISO string
    endTime: string;   // ISO string
    attendees?: { email: string; name?: string }[];
    location?: string;
}

async function refreshAccessToken(userId: string, refreshToken: string): Promise<string | null> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) return null;

    try {
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                refresh_token: refreshToken,
                grant_type: 'refresh_token'
            })
        });

        if (!response.ok) return null;

        const tokens = await response.json();

        // Update stored tokens
        await updateDoc(doc(db, 'calendar_connections', userId), {
            accessToken: tokens.access_token,
            expiresAt: Date.now() + (tokens.expires_in * 1000),
            updatedAt: Timestamp.now()
        });

        return tokens.access_token;
    } catch (error) {
        console.error('Token refresh failed:', error);
        return null;
    }
}

export async function POST(request: NextRequest) {
    try {
        const body: CalendarEventRequest = await request.json();
        const { userId, title, description, startTime, endTime, attendees, location } = body;

        if (!userId || !title || !startTime || !endTime) {
            return NextResponse.json(
                { error: 'Missing required fields: userId, title, startTime, endTime' },
                { status: 400 }
            );
        }

        // Get stored tokens
        const connectionDoc = await getDoc(doc(db, 'calendar_connections', userId));

        if (!connectionDoc.exists()) {
            return NextResponse.json(
                { error: 'Calendar not connected', needsAuth: true },
                { status: 401 }
            );
        }

        const connection = connectionDoc.data();
        let accessToken = connection.accessToken;

        // Check if token needs refresh
        if (connection.expiresAt < Date.now()) {
            accessToken = await refreshAccessToken(userId, connection.refreshToken);
            if (!accessToken) {
                return NextResponse.json(
                    { error: 'Token refresh failed, please reconnect', needsAuth: true },
                    { status: 401 }
                );
            }
        }

        // Build Google Calendar event
        const calendarEvent = {
            summary: title,
            description,
            location,
            start: {
                dateTime: startTime,
                timeZone: 'America/Lima'
            },
            end: {
                dateTime: endTime,
                timeZone: 'America/Lima'
            },
            attendees: attendees?.map(a => ({
                email: a.email,
                displayName: a.name
            })),
            reminders: {
                useDefault: false,
                overrides: [
                    { method: 'email', minutes: 60 },
                    { method: 'popup', minutes: 30 }
                ]
            },
            conferenceData: {
                createRequest: {
                    requestId: `interview-${Date.now()}`,
                    conferenceSolutionKey: { type: 'hangoutsMeet' }
                }
            }
        };

        // Create event on Google Calendar
        const response = await fetch(
            'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all',
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
            const errorData = await response.text();
            console.error('Google Calendar API error:', errorData);
            return NextResponse.json(
                { error: 'Failed to create calendar event' },
                { status: 500 }
            );
        }

        const createdEvent = await response.json();

        return NextResponse.json({
            success: true,
            eventId: createdEvent.id,
            htmlLink: createdEvent.htmlLink,
            meetLink: createdEvent.hangoutLink || createdEvent.conferenceData?.entryPoints?.[0]?.uri
        });

    } catch (error) {
        console.error('Create event error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
