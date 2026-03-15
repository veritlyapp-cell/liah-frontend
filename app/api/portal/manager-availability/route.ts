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

        // 1. Get store info to know holding and zone
        const storeDoc = await db.collection('tiendas').doc(storeId).get();
        if (!storeDoc.exists) {
            return NextResponse.json({ error: 'Store not found' }, { status: 404 });
        }
        const storeData = storeDoc.data()!;
        const holdingId = storeData.holdingId;
        const zoneId = storeData.zonaId;

        // 2. Get holding config
        const holdingDoc = await db.collection('holdings').doc(holdingId).get();
        const holdingData = holdingDoc.exists ? holdingDoc.data() : null;
        const responsible = holdingData?.interviewResponsible || 'store_manager';

        let availability = null;
        let responsibleId = null;

        if (responsible === 'recruiter') {
            // Find a recruiter/zonal/hrbp assigned to this zone
            const recruiterSnap = await db.collection('userAssignments')
                .where('assignedZones', 'array-contains', { zoneId, zoneNombre: storeData.zoneNombre || '' }) // Try matching the object
                // Note: assignedZones is an array of objects {zoneId, zoneNombre}
                .where('active', '==', true)
                .get();

            let recruiterDoc = recruiterSnap.docs.find(doc => {
                const data = doc.data();
                return data.assignedZones?.some((z: any) => z.zoneId === zoneId) &&
                    (data.role === 'recruiter' || data.role === 'jefe_zonal' || data.role === 'hrbp');
            });

            if (!recruiterDoc) {
                // Try simple array match if objects fail
                const fallbackSnap = await db.collection('userAssignments')
                    .where('role', 'in', ['recruiter', 'jefe_zonal', 'hrbp'])
                    .where('assignedZones', 'array-contains', zoneId)
                    .where('active', '==', true)
                    .limit(1)
                    .get();
                if (!fallbackSnap.empty) recruiterDoc = fallbackSnap.docs[0];
            }

            if (recruiterDoc) {
                const data = recruiterDoc.data();
                availability = data.availability || null;
                responsibleId = data.userId;
            }
        } else {
            // Default: Store Manager
            const managerSnap = await db.collection('userAssignments')
                .where('assignedStore.tiendaId', '==', storeId)
                .where('role', '==', 'store_manager')
                .where('active', '==', true)
                .limit(1)
                .get();

            if (!managerSnap.empty) {
                const data = managerSnap.docs[0].data();
                availability = data.availability || null;
                responsibleId = data.userId;
            }
        }

        // 3. Fetch booked slots
        // If it's a recruiter, we should block slots they are booked for in ANY store
        // If it's a store manager, we block slots for THIS store
        let bookedSnap;
        if (responsible === 'recruiter' && responsibleId) {
            // This is harder because currently interviews are tied to storeId/posicion mostly.
            // But we can check for interviews where the responsible party is the same.
            // For now, let's keep it simple: any interview in the same zone or specifically for this recruiter if we had that mapping.
            // Actually, we don't have a direct 'interviewerId' in the interview doc yet.
            // Let's fallback to blocking only for this store for now, or all stores in the same zone.
            bookedSnap = await db.collection('interviews')
                .where('storeId', '==', storeId)
                .where('status', 'not-in', ['cancelled', 'discarded'])
                .get();
        } else {
            bookedSnap = await db.collection('interviews')
                .where('storeId', '==', storeId)
                .where('status', 'not-in', ['cancelled', 'discarded'])
                .get();
        }

        const bookedSlots = bookedSnap.docs.map(doc => doc.data().slotId).filter(Boolean);

        return NextResponse.json({
            success: true,
            availability: availability,
            bookedSlots,
            responsibleType: responsible
        });

    } catch (error: any) {
        console.error('[Manager Availability] Error:', error?.message || error);
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}
