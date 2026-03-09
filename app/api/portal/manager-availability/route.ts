import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const storeId = searchParams.get('storeId');

        if (!storeId) {
            return NextResponse.json({ error: 'storeId is required' }, { status: 400 });
        }

        const db = getAdminFirestore();

        // Find the store manager assignment for this store
        const snapshot = await db.collection('userAssignments')
            .where('assignedStore.tiendaId', '==', storeId)
            .where('role', '==', 'store_manager')
            .where('active', '==', true)
            .limit(1)
            .get();

        if (snapshot.empty) {
            return NextResponse.json({
                success: true,
                availability: null,
                message: 'No custom manager availability found for this store'
            });
        }

        const managerData = snapshot.docs[0].data();

        // Also fetch already booked interviews for this store to block slots
        const bookedSnap = await db.collection('interviews')
            .where('storeId', '==', storeId)
            .where('status', 'not-in', ['cancelled', 'discarded'])
            .get();

        const bookedSlots = bookedSnap.docs.map(doc => doc.data().slotId).filter(Boolean);

        return NextResponse.json({
            success: true,
            availability: managerData.availability || null,
            bookedSlots
        });

    } catch (error: any) {
        console.error('[Manager Availability] Error:', error?.message || error);
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}
