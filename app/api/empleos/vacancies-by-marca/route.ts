import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';

// Placeholder logo/photo data for marcas (will be moved to Firestore later)
const MARCA_ASSETS: Record<string, { logo: string; photo: string }> = {
    'marca_kfc': {
        logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/b/bf/KFC_logo.svg/1200px-KFC_logo.svg.png',
        photo: 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=400'
    },
    'marca_papajohns': {
        logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Papa_Johns_Logo.svg/1200px-Papa_Johns_Logo.svg.png',
        photo: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400'
    },
    'marca_starbucks': {
        logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/d/d3/Starbucks_Corporation_Logo_2011.svg/1200px-Starbucks_Corporation_Logo_2011.svg.png',
        photo: 'https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=400'
    },
    'marca_popeyes': {
        logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Popeyes_logo.svg/1200px-Popeyes_logo.svg.png',
        photo: 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=400'
    },
    'marca_burgerking': {
        logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Burger_King_logo_%281999%29.svg/1200px-Burger_King_logo_%281999%29.svg.png',
        photo: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400'
    },
    'marca_chillis': {
        logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/0/04/Chilis_Logo.svg/1200px-Chilis_Logo.svg.png',
        photo: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400'
    }
};

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const holdingSlug = searchParams.get('holding') || 'ngr';

        // Get all RQs in recruiting status
        const rqsRef = collection(db, 'rqs');
        const q = query(rqsRef, where('status', '==', 'recruiting'));
        const snapshot = await getDocs(q);

        // Count vacancies by marca
        const vacanciesByMarca: Record<string, {
            marcaId: string;
            marcaNombre: string;
            vacantesCount: number;
        }> = {};

        let totalVacantes = 0;

        snapshot.docs.forEach(doc => {
            const data = doc.data();
            const marcaId = data.marcaId || 'unknown';
            const marcaNombre = data.marcaNombre || 'Sin marca';
            const vacantes = data.vacantes || 1;

            if (!vacanciesByMarca[marcaId]) {
                vacanciesByMarca[marcaId] = {
                    marcaId,
                    marcaNombre,
                    vacantesCount: 0
                };
            }

            vacanciesByMarca[marcaId].vacantesCount += vacantes;
            totalVacantes += vacantes;
        });

        // Add logo and photo to each marca
        const marcas = Object.values(vacanciesByMarca).map(marca => ({
            ...marca,
            logo: MARCA_ASSETS[marca.marcaId]?.logo || '',
            photo: MARCA_ASSETS[marca.marcaId]?.photo || ''
        }));

        // Sort by vacancy count (descending)
        marcas.sort((a, b) => b.vacantesCount - a.vacantesCount);

        console.log('[Empleos API] Found', marcas.length, 'marcas with', totalVacantes, 'total vacantes');

        return NextResponse.json({
            success: true,
            holding: holdingSlug,
            marcas,
            totalVacantes
        });

    } catch (error) {
        console.error('Error fetching vacancies by marca:', error);
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}
