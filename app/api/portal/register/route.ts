import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
    try {
        const {
            email,
            nombre,
            apellidos,
            celular,
            departamento,
            provincia,
            distrito,
            direccion,
            cvUrl,
            coordinates,
            formattedAddress,
            holdingSlug
        } = await request.json();

        // Validate required fields
        if (!email || !nombre || !apellidos || !celular) {
            return NextResponse.json({ error: 'Campos obligatorios faltantes' }, { status: 400 });
        }

        // Generate session token (24h validity)
        const sessionToken = uuidv4();
        const sessionExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

        // Split apellidos into paterno and materno
        const apellidosParts = apellidos.split(' ');
        const apellidoPaterno = apellidosParts[0] || '';
        const apellidoMaterno = apellidosParts.slice(1).join(' ') || '';

        // Generate candidate code
        const candidateCode = `PUB-${Date.now().toString(36).toUpperCase()}`;

        // Create candidate document
        const candidatesRef = collection(db, 'candidates');
        const candidateDoc = await addDoc(candidatesRef, {
            // Basic info
            email: email.toLowerCase(),
            nombre,
            apellidoPaterno,
            apellidoMaterno,
            telefono: celular,

            // Location fields
            departamento: departamento || 'Lima',
            provincia: provincia || 'Lima',
            distrito: distrito || '',
            direccion: direccion || '',

            candidateCode,

            // Geolocation (for distance-based matching)
            coordinates: coordinates || null,
            formattedAddress: formattedAddress || '',

            // Portal-specific fields
            source: 'portal_publico',
            registeredViaPortal: true,
            holdingSlug: holdingSlug || 'ngr',
            cvUrl: cvUrl || '',

            // Session management
            portalSessionToken: sessionToken,
            portalSessionExpiry: Timestamp.fromDate(sessionExpiry),

            // Status
            culStatus: 'pending',
            hasAccount: false,
            blacklisted: false,

            // Timestamps
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        });

        console.log('[Portal Register] Created candidate:', candidateDoc.id);

        return NextResponse.json({
            success: true,
            candidateId: candidateDoc.id,
            sessionToken
        });

    } catch (error) {
        console.error('Error registering candidate:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
