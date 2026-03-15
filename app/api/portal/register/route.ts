import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { notifyRoleAction } from '@/lib/notifications/send-push';
import { getAdminFirestore, getFieldValue } from '@/lib/firebase-admin';

const AdminFieldValue = getFieldValue();

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            email,
            nombre,
            apellidos,
            celular,
            fechaNacimiento,
            departamento,
            provincia,
            distrito,
            direccion,
            cvUrl,
            coordinates,
            formattedAddress,
            holdingSlug,
            existingCandidateId
        } = body;

        // Validate required fields
        if (!email || !nombre || !apellidos || !celular) {
            return NextResponse.json({ error: 'Campos obligatorios faltantes' }, { status: 400 });
        }

        const db = getAdminFirestore();

        // Generate session token (24h validity)
        const sessionToken = uuidv4();
        const sessionExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

        // Split apellidos into paterno and materno
        const apellidosParts = (apellidos || '').trim().split(/\s+/);
        const apellidoPaterno = apellidosParts[0] || '';
        const apellidoMaterno = apellidosParts.slice(1).join(' ') || '';

        const updateData: any = {
            email: email.toLowerCase().trim(),
            nombre: nombre.trim(),
            apellidoPaterno,
            apellidoMaterno,
            telefono: celular,
            departamento: departamento || 'Lima',
            provincia: provincia || 'Lima',
            distrito: distrito || '',
            direccion: direccion || '',
            fechaNacimiento: fechaNacimiento || '',
            holdingSlug: holdingSlug || 'public',
            portalSessionToken: sessionToken,
            portalSessionExpiry: sessionExpiry.toISOString(),
            updatedAt: AdminFieldValue.serverTimestamp(),
        };

        if (cvUrl) updateData.cvUrl = cvUrl;
        if (coordinates) updateData.coordinates = coordinates;
        if (formattedAddress) updateData.formattedAddress = formattedAddress;

        let finalCandidateId = existingCandidateId;

        if (existingCandidateId) {
            await db.collection('candidates').doc(existingCandidateId).update(updateData);
        } else {
            // New candidate
            const candidateCode = `PUB-${Date.now().toString(36).toUpperCase()}`;
            const newData = {
                ...updateData,
                candidateCode,
                source: 'portal_publico',
                registeredViaPortal: true,
                culStatus: 'pending',
                hasAccount: false,
                blacklisted: false,
                createdAt: AdminFieldValue.serverTimestamp(),
            };
            const docRef = await db.collection('candidates').add(newData);
            finalCandidateId = docRef.id;
        }

        console.log('[Portal Register] Success for:', finalCandidateId, email);

        // Notify recruiters of new registration
        try {
            await notifyRoleAction({
                role: 'recruiter',
                payload: {
                    title: '👥 Nuevo Candidato Registrado',
                    body: `${nombre} ${apellidos} se ha registrado en el portal.`,
                    url: '/recruiter'
                }
            });
        } catch (err) {
            console.error('[Portal Register] Push Error:', err);
        }

        return NextResponse.json({
            success: true,
            candidateId: finalCandidateId,
            sessionToken
        });

    } catch (error: any) {
        console.error('[Portal Register] Error:', error?.message || error);
        return NextResponse.json(
            { error: 'Error interno del servidor: ' + (error?.message || 'desconocido') },
            { status: 500 }
        );
    }
}
