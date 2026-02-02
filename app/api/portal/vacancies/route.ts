import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

export async function GET() {
    try {
        // Get all RQs that are currently in recruiting status
        const rqsRef = collection(db, 'rqs');
        const q = query(rqsRef, where('status', '==', 'recruiting'));
        const snapshot = await getDocs(q);

        const vacancies = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                rqNumber: data.rqNumber || '',
                posicion: data.posicion || '',
                modalidad: data.modalidad || 'Full Time',
                tiendaNombre: data.tiendaNombre || '',
                tiendaDistrito: data.tiendaDistrito || data.distrito || '',
                tiendaId: data.tiendaId || '',
                marcaNombre: data.marcaNombre || '',
                marcaId: data.marcaId || '',
                vacantes: data.vacantes || 1,
                categoria: data.categoria || 'operativo',
                storeCoordinates: data.storeCoordinates || null,
                tiendaSlug: data.tiendaSlug || '',
                marcaSlug: data.marcaSlug || '',
                createdAt: data.createdAt?.toDate?.() || new Date()
            };
        });

        // Sort by most recent first
        vacancies.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        console.log('[Portal Vacancies] Found:', vacancies.length, 'active vacancies');

        return NextResponse.json({
            success: true,
            vacancies,
            count: vacancies.length
        });

    } catch (error) {
        console.error('Error fetching vacancies:', error);
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}
