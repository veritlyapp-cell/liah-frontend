import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';

interface AggregatedVacancy {
    posicion: string;
    turno: string;
    modalidad: string;
    marcaNombre: string;
    marcaId: string;
    tiendaNombre: string;
    tiendaDistrito: string;
    tiendaId: string;
    tiendaProvincia?: string;
    tiendaDepartamento?: string;
    rqIds: string[];
    totalVacantes: number;
    storeCoordinates?: { lat: number; lng: number };
}

export async function GET(request: NextRequest) {
    try {
        const db = getAdminFirestore();
        const { searchParams } = new URL(request.url);
        const holdingFilter = searchParams.get('holding');

        // Get all active RQs
        const activeStatuses = ['recruiting', 'approved', 'active', 'published', 'activo', 'aprobado'];
        const rqQuery = db.collection('rqs').where('status', 'in', activeStatuses);

        // If holding filter provided, look up its IDs first
        let holdingIds: string[] = [];
        if (holdingFilter) {
            const holdingsSnap = await db.collection('holdings').where('slug', '==', holdingFilter.toLowerCase()).limit(1).get();
            if (!holdingsSnap.empty) {
                holdingIds = [holdingsSnap.docs[0].id, holdingFilter];
            } else {
                holdingIds = [holdingFilter];
            }
        }

        const snapshot = await rqQuery.limit(200).get();

        // Filter in memory by holding if needed
        const filteredDocs = holdingIds.length > 0
            ? snapshot.docs.filter((d: any) => {
                const data = d.data();
                return holdingIds.includes(data.tenantId) || holdingIds.includes(data.holdingId);
            })
            : snapshot.docs;

        // Cache for store coordinates
        const storeCoordinatesCache: Record<string, { lat: number; lng: number } | null> = {};

        // Aggregate by unique key: posicion + turno + modalidad + tiendaId
        const aggregated: Record<string, AggregatedVacancy> = {};

        for (const rqDoc of filteredDocs) {
            const data = rqDoc.data();
            const keyPosicion = data.puesto || data.posicion || data.posicionNombre || data.title || '';
            const key = `${keyPosicion}-${data.turno || 'Sin turno'}-${data.modalidad || 'Full Time'}-${data.tiendaId || rqDoc.id}`;

            if (!aggregated[key]) {
                // Get store coordinates if not cached
                let storeCoords = storeCoordinatesCache[data.tiendaId];
                if (storeCoords === undefined && data.tiendaId) {
                    try {
                        const storeDoc = await db.collection('stores').doc(data.tiendaId).get();
                        if (storeDoc.exists) {
                            const storeData = storeDoc.data()!;
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
                    posicion: keyPosicion,
                    turno: data.turno || 'Sin turno',
                    modalidad: data.modalidad || 'Full Time',
                    marcaNombre: data.marcaNombre || '',
                    marcaId: data.marcaId || '',
                    tiendaNombre: data.tiendaNombre || 'Sede Central',
                    tiendaDistrito: data.tiendaDistrito || data.distrito || '',
                    tiendaProvincia: data.provincia || '',
                    tiendaDepartamento: data.departamento || '',
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

        console.log('[Portal Vacancies Aggregated] Found:', vacancies.length, 'unique positions from', snapshot.size, 'RQs, holding filter:', holdingFilter || 'none');

        return NextResponse.json({
            success: true,
            vacancies,
            count: vacancies.length
        });

    } catch (error: any) {
        console.error('[Portal Vacancies Aggregated] Error:', error?.message || error);
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}
