/**
 * Distance Calculation Utilities using Haversine Formula
 * For calculating real-world distances between coordinates in kilometers
 */

export interface Coordinates {
    lat: number;
    lng: number;
}

/**
 * Calculate distance between two points using Haversine formula
 * @returns Distance in kilometers
 */
export function calculateDistanceKm(
    point1: Coordinates,
    point2: Coordinates
): number {
    const R = 6371; // Earth's radius in kilometers

    const dLat = toRadians(point2.lat - point1.lat);
    const dLng = toRadians(point2.lng - point1.lng);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(point1.lat)) *
        Math.cos(toRadians(point2.lat)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in km
}

function toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
}

/**
 * Get maximum allowed distance based on turno (shift type)
 * - Noche/Rotativo: 7-8 km (night shifts need closer proximity)
 * - Mañana/Tarde: 15 km
 */
export function getMaxDistanceForTurno(turno: string): number {
    const nightShifts = ['Noche', 'Rotativo'];
    if (nightShifts.includes(turno)) {
        return 8; // 8 km max for night/rotative shifts
    }
    return 15; // 15 km max for day shifts
}

/**
 * Check if a candidate is within acceptable distance for a vacancy
 */
export function isWithinAcceptableDistance(
    candidateCoords: Coordinates,
    storeCoords: Coordinates,
    turno: string
): { isAcceptable: boolean; distanceKm: number; maxDistanceKm: number } {
    const distanceKm = calculateDistanceKm(candidateCoords, storeCoords);
    const maxDistanceKm = getMaxDistanceForTurno(turno);

    return {
        isAcceptable: distanceKm <= maxDistanceKm,
        distanceKm: Math.round(distanceKm * 10) / 10, // Round to 1 decimal
        maxDistanceKm
    };
}

/**
 * Categorize vacancy by distance from candidate
 */
export function getDistanceCategory(
    distanceKm: number,
    turno: string
): 'perfect' | 'acceptable' | 'far' {
    const maxDistance = getMaxDistanceForTurno(turno);

    if (distanceKm <= maxDistance * 0.5) {
        return 'perfect'; // Within 50% of max = very close
    } else if (distanceKm <= maxDistance) {
        return 'acceptable'; // Within max range
    }
    return 'far'; // Beyond acceptable range
}

/**
 * Sort vacancies by distance and categorize them
 */
export function sortVacanciesByDistance<T extends {
    turno?: string;
    storeCoordinates?: Coordinates;
}>(
    vacancies: T[],
    candidateCoords: Coordinates
): { near: T[]; acceptable: T[]; far: T[] } {
    const near: T[] = [];
    const acceptable: T[] = [];
    const far: T[] = [];

    for (const vacancy of vacancies) {
        if (!vacancy.storeCoordinates) {
            // If no coordinates, put in 'far' category
            far.push(vacancy);
            continue;
        }

        const distanceKm = calculateDistanceKm(candidateCoords, vacancy.storeCoordinates);
        const category = getDistanceCategory(distanceKm, vacancy.turno || 'Mañana');

        if (category === 'perfect') {
            near.push(vacancy);
        } else if (category === 'acceptable') {
            acceptable.push(vacancy);
        } else {
            far.push(vacancy);
        }
    }

    // Sort each category by distance (closest first)
    const sortByDistance = (a: T, b: T) => {
        const distA = a.storeCoordinates
            ? calculateDistanceKm(candidateCoords, a.storeCoordinates)
            : Infinity;
        const distB = b.storeCoordinates
            ? calculateDistanceKm(candidateCoords, b.storeCoordinates)
            : Infinity;
        return distA - distB;
    };

    return {
        near: near.sort(sortByDistance),
        acceptable: acceptable.sort(sortByDistance),
        far: far.sort(sortByDistance)
    };
}

/**
 * Format distance for display
 */
export function formatDistance(distanceKm: number): string {
    if (distanceKm < 1) {
        return `${Math.round(distanceKm * 1000)} m`;
    }
    return `${Math.round(distanceKm * 10) / 10} km`;
}
