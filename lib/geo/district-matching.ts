/**
 * Geographic Matching Engine for Peru Districts
 * Provides connectivity mapping between districts for job matching
 */

// Lima Metropolitan Districts with connectivity zones
export const DISTRICT_ZONES: Record<string, {
    zone: string;
    connectedDistricts: string[];
    coordinates?: { lat: number; lng: number };
}> = {
    // ZONA NORTE
    'Carabayllo': { zone: 'norte', connectedDistricts: ['Comas', 'Puente Piedra', 'Los Olivos', 'Independencia'] },
    'Comas': { zone: 'norte', connectedDistricts: ['Carabayllo', 'Los Olivos', 'Independencia', 'San Martín de Porres'] },
    'Puente Piedra': { zone: 'norte', connectedDistricts: ['Carabayllo', 'Comas', 'Los Olivos', 'Santa Rosa'] },
    'Los Olivos': { zone: 'norte', connectedDistricts: ['Comas', 'Independencia', 'San Martín de Porres', 'Rímac'] },
    'Independencia': { zone: 'norte', connectedDistricts: ['Comas', 'Los Olivos', 'San Martín de Porres', 'Rímac'] },
    'San Martín de Porres': { zone: 'norte', connectedDistricts: ['Los Olivos', 'Independencia', 'Rímac', 'Lima', 'Callao'] },
    'Santa Rosa': { zone: 'norte', connectedDistricts: ['Puente Piedra', 'Ancón'] },

    // ZONA ESTE
    'San Juan de Lurigancho': { zone: 'este', connectedDistricts: ['Rímac', 'El Agustino', 'Lurigancho', 'Independencia', 'Comas'] },
    'Lurigancho': { zone: 'este', connectedDistricts: ['San Juan de Lurigancho', 'Ate', 'Chaclacayo', 'Santa Anita'] },
    'El Agustino': { zone: 'este', connectedDistricts: ['San Juan de Lurigancho', 'Santa Anita', 'La Victoria', 'San Luis'] },
    'Santa Anita': { zone: 'este', connectedDistricts: ['El Agustino', 'Ate', 'La Molina', 'San Luis'] },
    'Ate': { zone: 'este', connectedDistricts: ['Santa Anita', 'La Molina', 'Lurigancho', 'Chaclacayo', 'Cieneguilla'] },
    'Chaclacayo': { zone: 'este', connectedDistricts: ['Ate', 'Lurigancho', 'Cieneguilla'] },
    'Cieneguilla': { zone: 'este', connectedDistricts: ['Ate', 'Chaclacayo', 'Pachacámac'] },

    // ZONA CENTRO
    'Lima': { zone: 'centro', connectedDistricts: ['Rímac', 'San Martín de Porres', 'La Victoria', 'Breña', 'Lince', 'Jesús María'] },
    'Rímac': { zone: 'centro', connectedDistricts: ['Lima', 'San Martín de Porres', 'Independencia', 'San Juan de Lurigancho'] },
    'Breña': { zone: 'centro', connectedDistricts: ['Lima', 'Pueblo Libre', 'Jesús María', 'Lince'] },
    'Lince': { zone: 'centro', connectedDistricts: ['Lima', 'Breña', 'Jesús María', 'San Isidro', 'Miraflores', 'La Victoria'] },
    'Jesús María': { zone: 'centro', connectedDistricts: ['Lima', 'Breña', 'Lince', 'Pueblo Libre', 'San Isidro', 'Magdalena del Mar'] },
    'La Victoria': { zone: 'centro', connectedDistricts: ['Lima', 'Lince', 'San Luis', 'El Agustino', 'San Borja'] },
    'San Luis': { zone: 'centro', connectedDistricts: ['La Victoria', 'El Agustino', 'Santa Anita', 'San Borja', 'Surquillo'] },
    'Pueblo Libre': { zone: 'centro', connectedDistricts: ['Breña', 'Jesús María', 'Magdalena del Mar', 'San Miguel'] },
    'Magdalena del Mar': { zone: 'centro', connectedDistricts: ['Jesús María', 'Pueblo Libre', 'San Isidro', 'San Miguel'] },
    'San Miguel': { zone: 'centro', connectedDistricts: ['Pueblo Libre', 'Magdalena del Mar', 'Callao'] },

    // ZONA MODERNA
    'San Isidro': { zone: 'moderna', connectedDistricts: ['Jesús María', 'Lince', 'Miraflores', 'San Borja', 'Surquillo', 'Magdalena del Mar'] },
    'Miraflores': { zone: 'moderna', connectedDistricts: ['San Isidro', 'Surquillo', 'San Borja', 'Barranco', 'Santiago de Surco'] },
    'San Borja': { zone: 'moderna', connectedDistricts: ['San Isidro', 'Miraflores', 'Surquillo', 'La Victoria', 'Santiago de Surco', 'La Molina'] },
    'Surquillo': { zone: 'moderna', connectedDistricts: ['San Isidro', 'Miraflores', 'San Borja', 'Santiago de Surco'] },
    'Barranco': { zone: 'moderna', connectedDistricts: ['Miraflores', 'Chorrillos', 'Santiago de Surco'] },
    'Santiago de Surco': { zone: 'moderna', connectedDistricts: ['Miraflores', 'San Borja', 'Surquillo', 'Barranco', 'Chorrillos', 'La Molina', 'San Juan de Miraflores'] },
    'La Molina': { zone: 'moderna', connectedDistricts: ['San Borja', 'Santiago de Surco', 'Ate', 'Santa Anita', 'Pachacámac'] },

    // ZONA SUR
    'Chorrillos': { zone: 'sur', connectedDistricts: ['Barranco', 'Santiago de Surco', 'San Juan de Miraflores', 'Villa El Salvador'] },
    'San Juan de Miraflores': { zone: 'sur', connectedDistricts: ['Santiago de Surco', 'Chorrillos', 'Villa María del Triunfo', 'Villa El Salvador'] },
    'Villa María del Triunfo': { zone: 'sur', connectedDistricts: ['San Juan de Miraflores', 'Villa El Salvador', 'Pachacámac', 'La Molina'] },
    'Villa El Salvador': { zone: 'sur', connectedDistricts: ['San Juan de Miraflores', 'Villa María del Triunfo', 'Chorrillos', 'Lurín'] },
    'Lurín': { zone: 'sur', connectedDistricts: ['Villa El Salvador', 'Pachacámac', 'Punta Hermosa', 'Pucusana'] },
    'Pachacámac': { zone: 'sur', connectedDistricts: ['Lurín', 'Villa María del Triunfo', 'Cieneguilla', 'La Molina'] },
    'Punta Hermosa': { zone: 'sur', connectedDistricts: ['Lurín', 'Punta Negra', 'San Bartolo'] },
    'Punta Negra': { zone: 'sur', connectedDistricts: ['Punta Hermosa', 'San Bartolo'] },
    'San Bartolo': { zone: 'sur', connectedDistricts: ['Punta Negra', 'Santa María del Mar', 'Pucusana'] },
    'Santa María del Mar': { zone: 'sur', connectedDistricts: ['San Bartolo', 'Pucusana'] },
    'Pucusana': { zone: 'sur', connectedDistricts: ['Lurín', 'Santa María del Mar', 'San Bartolo'] }
};

/**
 * Get matching score between candidate district and vacancy district
 * Higher score = better match
 */
export function getMatchScore(candidateDistrict: string, vacancyDistrict: string): number {
    // Exact match
    if (candidateDistrict === vacancyDistrict) {
        return 100;
    }

    const candidateInfo = DISTRICT_ZONES[candidateDistrict];
    const vacancyInfo = DISTRICT_ZONES[vacancyDistrict];

    if (!candidateInfo || !vacancyInfo) {
        return 0; // Unknown district
    }

    // Direct connection (neighboring districts)
    if (candidateInfo.connectedDistricts.includes(vacancyDistrict)) {
        return 80;
    }

    // Same zone
    if (candidateInfo.zone === vacancyInfo.zone) {
        return 60;
    }

    // Second-degree connection (neighbor of a neighbor)
    for (const neighborDistrict of candidateInfo.connectedDistricts) {
        const neighborInfo = DISTRICT_ZONES[neighborDistrict];
        if (neighborInfo?.connectedDistricts.includes(vacancyDistrict)) {
            return 40;
        }
    }

    // Any other connection
    return 20;
}

/**
 * Get vacancy relevance category
 */
export function getRelevanceCategory(score: number): 'match' | 'nearby' | 'other' {
    if (score >= 60) return 'match';
    if (score >= 30) return 'nearby';
    return 'other';
}

/**
 * Sort vacancies by geographic relevance to candidate
 */
export function sortVacanciesByRelevance<T extends { tiendaDistrito?: string; distrito?: string }>(
    vacancies: T[],
    candidateDistrict: string
): { matches: T[]; nearby: T[]; other: T[] } {
    const matches: T[] = [];
    const nearby: T[] = [];
    const other: T[] = [];

    for (const vacancy of vacancies) {
        const vacancyDistrict = vacancy.tiendaDistrito || vacancy.distrito || '';
        const score = getMatchScore(candidateDistrict, vacancyDistrict);
        const category = getRelevanceCategory(score);

        if (category === 'match') {
            matches.push(vacancy);
        } else if (category === 'nearby') {
            nearby.push(vacancy);
        } else {
            other.push(vacancy);
        }
    }

    // Sort each group by score (descending)
    const sortByScore = (a: T, b: T) => {
        const scoreA = getMatchScore(candidateDistrict, a.tiendaDistrito || a.distrito || '');
        const scoreB = getMatchScore(candidateDistrict, b.tiendaDistrito || b.distrito || '');
        return scoreB - scoreA;
    };

    return {
        matches: matches.sort(sortByScore),
        nearby: nearby.sort(sortByScore),
        other: other.sort(sortByScore)
    };
}

/**
 * Get all districts in the same zone
 */
export function getDistrictsInZone(district: string): string[] {
    const districtInfo = DISTRICT_ZONES[district];
    if (!districtInfo) return [];

    return Object.entries(DISTRICT_ZONES)
        .filter(([, info]) => info.zone === districtInfo.zone)
        .map(([name]) => name);
}

/**
 * Get zone name for a district
 */
export function getZoneName(district: string): string {
    const zoneNames: Record<string, string> = {
        'norte': 'Lima Norte',
        'este': 'Lima Este',
        'centro': 'Lima Centro',
        'moderna': 'Lima Moderna',
        'sur': 'Lima Sur'
    };

    const districtInfo = DISTRICT_ZONES[district];
    return districtInfo ? zoneNames[districtInfo.zone] || 'Lima' : 'Lima';
}
