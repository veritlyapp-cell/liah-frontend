/**
 * Google Geocoding API Integration
 * Converts addresses to coordinates (lat/lng)
 */

import type { Coordinates } from './distance-utils';

interface GeocodeResult {
    success: boolean;
    coordinates?: Coordinates;
    formattedAddress?: string;
    error?: string;
}

/**
 * Geocode an address using Google Geocoding API
 * Call this from the server side to keep API key secure
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult> {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    console.log('[Geocoding] API Key exists:', !!apiKey);
    console.log('[Geocoding] API Key prefix:', apiKey?.substring(0, 10) + '...');

    if (!apiKey) {
        console.error('[Geocoding] Missing GOOGLE_MAPS_API_KEY');
        return { success: false, error: 'API key not configured' };
    }

    try {
        const encodedAddress = encodeURIComponent(address);
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}&region=pe`;

        console.log('[Geocoding] Fetching:', address);
        const response = await fetch(url);
        const data = await response.json();

        console.log('[Geocoding] Response status:', data.status);
        console.log('[Geocoding] Response:', JSON.stringify(data, null, 2));

        if (data.status === 'OK' && data.results?.[0]) {
            const result = data.results[0];
            const location = result.geometry.location;

            return {
                success: true,
                coordinates: {
                    lat: location.lat,
                    lng: location.lng
                },
                formattedAddress: result.formatted_address
            };
        }

        if (data.status === 'ZERO_RESULTS') {
            return { success: false, error: 'Dirección no encontrada' };
        }

        return { success: false, error: `Geocoding error: ${data.status}` };

    } catch (error) {
        console.error('[Geocoding] Error:', error);
        return { success: false, error: 'Error de conexión' };
    }
}

/**
 * Validate coordinates are within Peru
 */
export function isInPeru(coords: Coordinates): boolean {
    // Peru bounding box (approximate)
    const PERU_BOUNDS = {
        north: -0.0392,
        south: -18.3516,
        east: -68.6651,
        west: -81.3269
    };

    return (
        coords.lat >= PERU_BOUNDS.south &&
        coords.lat <= PERU_BOUNDS.north &&
        coords.lng >= PERU_BOUNDS.west &&
        coords.lng <= PERU_BOUNDS.east
    );
}

/**
 * Validate coordinates are within Lima Metropolitan area
 */
export function isInLimaMetro(coords: Coordinates): boolean {
    // Lima Metro approximate bounds
    const LIMA_BOUNDS = {
        north: -11.75,
        south: -12.55,
        east: -76.6,
        west: -77.2
    };

    return (
        coords.lat >= LIMA_BOUNDS.south &&
        coords.lat <= LIMA_BOUNDS.north &&
        coords.lng >= LIMA_BOUNDS.west &&
        coords.lng <= LIMA_BOUNDS.east
    );
}
