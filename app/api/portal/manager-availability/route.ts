import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit, doc, getDoc } from 'firebase/firestore';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const storeId = searchParams.get('storeId');

        if (!storeId) {
            return NextResponse.json({ error: 'storeId is required' }, { status: 400 });
        }

        // 1. Find the UserAssignment for this store that is a 'store_manager'
        const assignmentsRef = collection(db, 'userAssignments');
        const q = query(
            assignmentsRef,
            where('assignedStore.tiendaId', '==', storeId),
            where('role', '==', 'store_manager'),
            where('active', '==', true),
            limit(1)
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            // No custom availability, the frontend will use defaults
            return NextResponse.json({
                success: true,
                availability: null,
                message: 'No custom manager availability found for this store'
            });
        }

        const managerData = snapshot.docs[0].data();

        return NextResponse.json({
            success: true,
            availability: managerData.availability || null
        });

    } catch (error) {
        console.error('Error fetching manager availability:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
