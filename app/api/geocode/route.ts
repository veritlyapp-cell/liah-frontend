import { NextRequest, NextResponse } from 'next/server';
import { geocodeAddress, isInLimaMetro } from '@/lib/geo/geocoding';

export async function POST(request: NextRequest) {
    try {
        const { address } = await request.json();

        if (!address || typeof address !== 'string') {
            return NextResponse.json({ error: 'Dirección requerida' }, { status: 400 });
        }

        // Add ", Lima, Perú" if not already included for better results
        let fullAddress = address.trim();
        if (!fullAddress.toLowerCase().includes('peru') && !fullAddress.toLowerCase().includes('perú')) {
            fullAddress += ', Lima, Perú';
        }

        const result = await geocodeAddress(fullAddress);

        if (!result.success) {
            return NextResponse.json({
                success: false,
                error: result.error
            }, { status: 400 });
        }

        // Validate coordinates are in Lima Metro
        const inLima = isInLimaMetro(result.coordinates!);

        return NextResponse.json({
            success: true,
            coordinates: result.coordinates,
            formattedAddress: result.formattedAddress,
            inLimaMetro: inLima,
            warning: !inLima ? 'La dirección parece estar fuera de Lima Metropolitana' : undefined
        });

    } catch (error) {
        console.error('[Geocode API] Error:', error);
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}
