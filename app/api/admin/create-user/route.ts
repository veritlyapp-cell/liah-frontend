import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { email, password, displayName, role, holdingId, approvalLevel, marcaId, tiendaId } = body;

        // Validaciones
        if (!email || !displayName || !role || !holdingId) {
            return NextResponse.json(
                { error: 'Campos requeridos: email, displayName, role, holdingId' },
                { status: 400 }
            );
        }

        // Password por defecto si no se proporciona
        const userPassword = password || 'Liah2026!';

        console.log(`[CREATE USER] Creating user: ${email}`);

        // 1. Crear usuario en Firebase Auth
        const auth = await getAdminAuth();
        const userRecord = await auth.createUser({
            email,
            password: userPassword,
            displayName,
            emailVerified: false,
        });

        console.log(`[CREATE USER] Auth user created: ${userRecord.uid}`);

        // 2. Establecer custom claims
        await auth.setCustomUserClaims(userRecord.uid, {
            role,
            holdingId,
            marcaId: marcaId || null,
            tiendaId: tiendaId || null,
            approvalLevel: approvalLevel || null,
        });

        console.log(`[CREATE USER] Custom claims set for: ${userRecord.uid}`);

        // 3. Crear documento en userAssignments
        const db = await getAdminFirestore();
        const userAssignment = {
            userId: userRecord.uid,
            email,
            displayName,
            role,
            holdingId,
            marcaId: marcaId || null,
            tiendaId: tiendaId || null,
            approvalLevel: approvalLevel || null,
            active: true,
            createdBy: 'super_admin',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        };

        await db.collection('userAssignments').doc(userRecord.uid).set(userAssignment);

        console.log(`[CREATE USER] UserAssignment created for: ${userRecord.uid}`);

        return NextResponse.json({
            success: true,
            userId: userRecord.uid,
            email,
            message: `Usuario creado exitosamente. Contraseña temporal: ${userPassword}`
        });

    } catch (error: any) {
        console.error('[CREATE USER] Error:', error);

        // Manejar errores específicos de Firebase
        if (error.code === 'auth/email-already-exists') {
            return NextResponse.json(
                { error: 'Ya existe un usuario con este email' },
                { status: 400 }
            );
        }

        if (error.code === 'auth/invalid-email') {
            return NextResponse.json(
                { error: 'Email inválido' },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: error.message || 'Error creando usuario' },
            { status: 500 }
        );
    }
}
