import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, Timestamp, limit } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
    try {
        const { token } = await request.json();

        if (!token) {
            return NextResponse.json({ error: 'Token requerido' }, { status: 400 });
        }

        // Find candidate by magic link token
        const candidatesRef = collection(db, 'candidates');
        const q = query(candidatesRef, where('magicLinkToken', '==', token), limit(1));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return NextResponse.json({ error: 'Token no encontrado' }, { status: 404 });
        }

        const candidateDoc = snapshot.docs[0];
        const candidateData = candidateDoc.data();

        // Check if token is expired
        const expiry = candidateData.magicLinkExpiry?.toDate();
        if (!expiry || new Date() > expiry) {
            return NextResponse.json({ expired: true, error: 'Token expirado' }, { status: 401 });
        }

        // Generate new session token
        const sessionToken = uuidv4();
        const sessionExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

        // Update candidate with new session and clear magic link
        await updateDoc(doc(db, 'candidates', candidateDoc.id), {
            magicLinkToken: null,
            magicLinkExpiry: null,
            portalSessionToken: sessionToken,
            portalSessionExpiry: Timestamp.fromDate(sessionExpiry),
            lastLoginAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        });

        console.log('[Verify Magic Link] Success for:', candidateData.email);

        return NextResponse.json({
            success: true,
            sessionToken,
            candidateId: candidateDoc.id
        });

    } catch (error) {
        console.error('Error verifying magic link:', error);
        return NextResponse.json({ error: 'Error al verificar' }, { status: 500 });
    }
}
