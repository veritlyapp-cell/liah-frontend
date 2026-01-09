import { getCollections } from './collections';
import Logger from './logger';
import GeolocationService from './geolocation-service';

class StoreMatcher {
    /**
     * Find stores with active vacancies matching candidate criteria
     */
    static async findMatchingStores(candidateData: any): Promise<any[]> {
        try {
            const { distrito, disponibilidad, tenant_id, lat, lng } = candidateData;
            Logger.info('🔍 Finding matching stores', { distrito, disponibilidad, tenant_id, lat, lng });

            if (!tenant_id) {
                Logger.error('❌ Tenant ID is required for finding matching stores');
                return [];
            }

            // 1. Determine Candidate Location (GPS or District Center)
            let candidateLocation = null;
            if (lat && lng) {
                candidateLocation = { lat, lng };
            } else if (distrito) {
                candidateLocation = GeolocationService.getDistrictCoordinates(distrito);
            }

            if (!candidateLocation) {
                Logger.warn(`⚠️ Could not determine location for district '${distrito}'`);
                return [];
            }

            const matches: any[] = [];
            const collections = await getCollections();

            // 2. Get all stores for the tenant
            const tiendasSnapshot = await collections.tiendas(tenant_id).get();

            // 3. Search through stores
            for (const tiendaDoc of tiendasSnapshot.docs) {
                const tiendaData = tiendaDoc.data() as any;
                const tienda = { id: tiendaDoc.id, ...tiendaData };

                // 4. Determine Store Location
                let storeLocation = null;
                if (tiendaData.lat && tiendaData.lng) {
                    storeLocation = { lat: parseFloat(tiendaData.lat), lng: parseFloat(tiendaData.lng) };
                } else if (tienda.coordinates) {
                    storeLocation = tienda.coordinates;
                } else if (tienda.distrito) {
                    storeLocation = GeolocationService.getDistrictCoordinates(tienda.distrito);
                }

                if (storeLocation) {
                    // 5. Calculate Distance
                    const distanceKm = GeolocationService.calculateDistance(
                        candidateLocation.lat, candidateLocation.lng,
                        storeLocation.lat, storeLocation.lng
                    );

                    // Filter by max distance (7km)
                    const MAX_DISTANCE_KM = 7;

                    if (distanceKm <= MAX_DISTANCE_KM) {
                        // Get active vacancies for this store
                        const vacantesSnapshot = await collections.vacantes(tenant_id, tienda.id)
                            .where('estado', '==', 'activo')
                            .where('cuposDisponibles', '>', 0)
                            .get();

                        // Filter vacancies by shift compatibility
                        const compatibleVacancies: any[] = [];
                        vacantesSnapshot.docs.forEach((vacanteDoc: any) => {
                            const vacanteData = vacanteDoc.data() as any;
                            const vacante = { id: vacanteDoc.id, ...vacanteData };
                            const isShiftCompatible =
                                vacanteData.tipoTurno === 'mixto' ||
                                disponibilidad === 'mixto' ||
                                vacanteData.tipoTurno === disponibilidad;

                            if (isShiftCompatible) {
                                compatibleVacancies.push(vacante);
                            }
                        });

                        if (compatibleVacancies.length > 0) {
                            matches.push({
                                tienda: {
                                    id: tienda.id,
                                    codigo: tienda.codigo,
                                    nombre: tienda.nombre,
                                    direccion: tienda.direccion,
                                    distrito: tienda.distrito,
                                    zona: tienda.zona,
                                    marca: tienda.marca || 'NGR',
                                    marcaId: tienda.marcaId,
                                    distanceKm: distanceKm
                                },
                                vacantes: compatibleVacancies,
                                totalCupos: compatibleVacancies.reduce((sum, v) => sum + (v.cuposDisponibles || 0), 0),
                                distancePriority: distanceKm
                            });
                        }
                    }
                }
            }

            // Sort by distance (asc) then total vacancies (desc)
            matches.sort((a, b) => {
                if (Math.abs(a.distancePriority - b.distancePriority) > 0.5) {
                    return a.distancePriority - b.distancePriority;
                }
                return b.totalCupos - a.totalCupos;
            });

            const topMatches = matches.slice(0, 3);
            Logger.success(`✅ Found ${topMatches.length} matching stores within 7km for tenant ${tenant_id}`);
            return topMatches;

        } catch (error) {
            Logger.error('❌ Error finding matching stores:', error);
            throw error;
        }
    }
}

export default StoreMatcher;
