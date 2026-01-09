import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { userId, email } = body;

        if (!userId && !email) {
            return NextResponse.json(
                { error: 'Se requiere userId o email' },
                { status: 400 }
            );
        }

        console.log(`[DELETE USER] Deleting user: ${userId || email}`);

        const auth = getAdminAuth();
        const db = getAdminFirestore();

        let targetUserId = userId;

        // If only email provided, find the user by email
        if (!targetUserId && email) {
            try {
                const userRecord = await auth.getUserByEmail(email);
                targetUserId = userRecord.uid;
            } catch (error: any) {
                // User might not exist in Auth, but could still be in Firestore
                console.log(`[DELETE USER] User not found in Auth: ${email}`);
            }
        }

        // 1. Delete from Firebase Auth (if user exists)
        if (targetUserId) {
            try {
                await auth.deleteUser(targetUserId);
                console.log(`[DELETE USER] Auth user deleted: ${targetUserId}`);
            } catch (error: any) {
                if (error.code !== 'auth/user-not-found') {
                    throw error;
                }
                console.log(`[DELETE USER] Auth user already deleted or not found`);
            }
        }

        // 2. Find and delete userAssignment document
        const assignmentsRef = db.collection('userAssignments');
        let query;

        if (targetUserId) {
            query = assignmentsRef.where('userId', '==', targetUserId);
        } else {
            query = assignmentsRef.where('email', '==', email);
        }

        const snapshot = await query.get();

        if (!snapshot.empty) {
            for (const doc of snapshot.docs) {
                await doc.ref.delete();
                console.log(`[DELETE USER] Assignment deleted: ${doc.id}`);
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Usuario eliminado correctamente',
            deletedUserId: targetUserId,
            deletedAssignments: snapshot.size
        });

    } catch (error: any) {
        console.error('[DELETE USER] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Error al eliminar usuario' },
            { status: 500 }
        );
    }
}
