import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';

interface AggregatedVacancy {
    posicion: string;
    turno: string;
    modalidad: string;
    marcaNombre: string;
    marcaId: string;
    tiendaNombre: string;
    tiendaDistrito: string;
    tiendaId: string;
    rqIds: string[];
    totalVacantes: number;
    storeCoordinates?: { lat: number; lng: number };
}

export async function GET() {
    try {
        // Get all RQs that are currently in recruiting status
        const rqsRef = collection(db, 'rqs');
        const q = query(rqsRef, where('status', '==', 'recruiting'));
        const snapshot = await getDocs(q);

        // Cache for store coordinates
        const storeCoordinatesCache: Record<string, { lat: number; lng: number } | null> = {};

        // Aggregate by unique key: posicion + turno + modalidad + tiendaId
        const aggregated: Record<string, AggregatedVacancy> = {};

        for (const rqDoc of snapshot.docs) {
            const data = rqDoc.data();
            const key = `${data.posicion}-${data.turno || 'Sin turno'}-${data.modalidad || 'Full Time'}-${data.tiendaId}`;

            if (!aggregated[key]) {
                // Get store coordinates if not cached
                let storeCoords = storeCoordinatesCache[data.tiendaId];
                if (storeCoords === undefined && data.tiendaId) {
                    try {
                        const storeDoc = await getDoc(doc(db, 'stores', data.tiendaId));
                        if (storeDoc.exists()) {
                            const storeData = storeDoc.data();
                            storeCoords = storeData.coordinates || null;
                        } else {
                            storeCoords = null;
                        }
                        storeCoordinatesCache[data.tiendaId] = storeCoords;
                    } catch (e) {
                        storeCoords = null;
                        storeCoordinatesCache[data.tiendaId] = null;
                    }
                }

                aggregated[key] = {
                    posicion: data.posicion || '',
                    turno: data.turno || 'Sin turno',
                    modalidad: data.modalidad || 'Full Time',
                    marcaNombre: data.marcaNombre || '',
                    marcaId: data.marcaId || '',
                    tiendaNombre: data.tiendaNombre || '',
                    tiendaDistrito: data.tiendaDistrito || data.distrito || '',
                    tiendaId: data.tiendaId || '',
                    rqIds: [],
                    totalVacantes: 0,
                    storeCoordinates: storeCoords || undefined
                };
            }

            aggregated[key].rqIds.push(rqDoc.id);
            aggregated[key].totalVacantes += data.vacantes || 1;
        }

        const vacancies = Object.values(aggregated);

        console.log('[Portal Vacancies Aggregated] Found:', vacancies.length, 'unique positions');

        return NextResponse.json({
            success: true,
            vacancies,
            count: vacancies.length
        });

    } catch (error) {
        console.error('Error fetching aggregated vacancies:', error);
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}
