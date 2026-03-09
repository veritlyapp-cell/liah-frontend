import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
    try {
        const { token } = await request.json();

        if (!token) {
            return NextResponse.json({ error: 'Token requerido' }, { status: 400 });
        }

        const db = getAdminFirestore();

        // Find candidate by session token
        const snapshot = await db.collection('candidates')
            .where('portalSessionToken', '==', token)
            .limit(1)
            .get();

        if (snapshot.empty) {
            return NextResponse.json({ error: 'Sesión no válida' }, { status: 401 });
        }

        const candidateDoc = snapshot.docs[0];
        const candidateData = candidateDoc.data();

        // Check if session is expired - handle both ISO string and Firestore Timestamp
        let expiry: Date | null = null;
        if (candidateData.portalSessionExpiry) {
            if (typeof candidateData.portalSessionExpiry === 'string') {
                expiry = new Date(candidateData.portalSessionExpiry);
            } else if (candidateData.portalSessionExpiry.toDate) {
                expiry = candidateData.portalSessionExpiry.toDate();
            }
        }

        if (!expiry || new Date() > expiry) {
            return NextResponse.json({ error: 'Sesión expirada' }, { status: 401 });
        }

        return NextResponse.json({
            success: true,
            candidate: {
                id: candidateDoc.id,
                nombre: candidateData.nombre || '',
                apellidoPaterno: candidateData.apellidoPaterno || '',
                distrito: candidateData.distrito || '',
                direccion: candidateData.direccion || '',
                email: candidateData.email || '',
                telefono: candidateData.telefono || '',
                coordinates: candidateData.coordinates || null
            }
        });

    } catch (error: any) {
        console.error('[Validate Session] Error:', error?.message || error);
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}
