import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            email, password, displayName, role, holdingId,
            approvalLevel, marcaId, marcaNombre, tiendaId, tiendaNombre,
            assignedStores, assignedMarcas
        } = body;

        // Validaciones
        if (!email || !displayName || !role || !holdingId) {
            return NextResponse.json(
                { error: 'Campos requeridos: email, displayName, role, holdingId' },
                { status: 400 }
            );
        }

        // Password por defecto si no se proporciona
        const userPassword = password || 'Liah2026!';

        console.log(`[CREATE USER] Creating user: ${email} with role: ${role}`);

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

        // 3. Construir el objeto userAssignment según el rol
        const db = await getAdminFirestore();
        const userAssignment: any = {
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

        // Agregar objetos de asignación complejos para el frontend
        if (role === 'store_manager' && tiendaId) {
            userAssignment.assignedStore = {
                tiendaId: tiendaId,
                tiendaNombre: tiendaNombre || 'Tienda sin nombre',
                marcaId: marcaId || ''
            };
        } else if (role === 'supervisor' && assignedStores) {
            userAssignment.assignedStores = assignedStores;
        } else if (role === 'jefe_marca' && marcaId) {
            userAssignment.assignedMarca = {
                marcaId: marcaId,
                marcaNombre: marcaNombre || 'Marca sin nombre'
            };
        } else if (role === 'recruiter' && assignedMarcas) {
            userAssignment.assignedMarcas = assignedMarcas;
        }

        await db.collection('userAssignments').doc(userRecord.uid).set(userAssignment);

        console.log(`[CREATE USER] UserAssignment created for: ${userRecord.uid}`);

        // 4. Enviar email de bienvenida con credenciales
        try {
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
            await fetch(`${baseUrl}/api/send-welcome-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userEmail: email,
                    userName: displayName,
                    temporaryPassword: userPassword,
                    role: role,
                    holdingName: marcaNombre || 'LIAH'
                })
            });
            console.log(`[CREATE USER] Welcome email sent to: ${email}`);
        } catch (emailError) {
            console.warn('[CREATE USER] Failed to send welcome email (non-blocking):', emailError);
        }

        return NextResponse.json({
            success: true,
            userId: userRecord.uid,
            email,
            message: `Usuario creado exitosamente. Se envió email de bienvenida a ${email}`
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
