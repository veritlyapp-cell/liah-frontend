import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

export async function POST(request: NextRequest) {
    try {
        const { token } = await request.json();

        if (!token) {
            return NextResponse.json({ error: 'Token requerido' }, { status: 400 });
        }

        // Find candidate by session token
        const candidatesRef = collection(db, 'candidates');
        const q = query(candidatesRef, where('portalSessionToken', '==', token), limit(1));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return NextResponse.json({ error: 'Sesión no válida' }, { status: 401 });
        }

        const candidateDoc = snapshot.docs[0];
        const candidateData = candidateDoc.data();

        // Check if session is expired
        const expiry = candidateData.portalSessionExpiry?.toDate();
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
                // Include coordinates for distance calculation
                coordinates: candidateData.coordinates || null
            }
        });

    } catch (error) {
        console.error('Error validating session:', error);
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}
