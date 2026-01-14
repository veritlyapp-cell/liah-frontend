import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ rqId: string }> }
) {
    try {
        const { rqId } = await params;

        if (!rqId) {
            return NextResponse.json({ error: 'RQ ID requerido' }, { status: 400 });
        }

        // Get RQ document
        const rqDoc = await getDoc(doc(db, 'rqs', rqId));

        if (!rqDoc.exists()) {
            return NextResponse.json({ error: 'Vacante no encontrada' }, { status: 404 });
        }

        const data = rqDoc.data();

        // Check if still recruiting
        if (data.status !== 'recruiting') {
            return NextResponse.json({ error: 'Esta vacante ya no está disponible' }, { status: 410 });
        }

        return NextResponse.json({
            success: true,
            vacancy: {
                id: rqDoc.id,
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
                description: data.description || '',
                requirements: data.requirements || []
            }
        });

    } catch (error) {
        console.error('Error fetching vacancy:', error);
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}
