import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';

/**
 * Ultra-fast Redirection Controller for LIAH Activation Engine
 * Path: getliah.com/t/[hash]
 * Performance: High (Node.js runtime)
 */

export async function GET(
    request: NextRequest,
    { params }: { params: { hash: string } }
) {
    const hash = params.hash;

    if (!hash) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
        const db = getAdminFirestore();

        // Fast lookup by Document ID (which is the hash)
        const trackingRef = db.collection('activation_tracking').doc(hash);
        const trackingDoc = await trackingRef.get();

        if (!trackingDoc.exists) {
            console.error(`[REDIRECT] Hash not found: ${hash}`);
            return NextResponse.redirect(new URL('/login', request.url));
        }

        const data = trackingDoc.data();
        const targetUrl = data?.targetUrl || '/';

        // Fire-and-forget: Track the click event without blocking redirection
        // In Vercel, use waitUntil to ensure the background task completes
        const trackClick = async () => {
            // Only update if not already clicked or handle multiple opens
            await trackingRef.update({
                status: 'clicked',
                clickedAt: new Date(),
                'metadata.last_ua': request.headers.get('user-agent'),
                'metadata.last_ip': request.headers.get('x-forwarded-for') || 'unknown'
            });
        };

        // We execute the update but don't 'await' it to minimize redirect latency
        // Note: In some serverless environments, we might need to ensure it finishes
        // but for <100ms we want to redirect ASAP.
        trackClick().catch(err => console.error('[REDIRECT] Tracking error:', err));

        // Redirect to the internal job/store page
        // If targetUrl is relative, prepend base URL
        const redirectUrl = targetUrl.startsWith('http')
            ? targetUrl
            : new URL(targetUrl, request.url).toString();

        return NextResponse.redirect(redirectUrl, 307);

    } catch (error) {
        console.error('[REDIRECT] Fatal error:', error);
        return NextResponse.redirect(new URL('/login', request.url));
    }
}
