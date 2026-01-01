import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';

const BEMBOS_PROFILES = [
    {
        posicion: 'Cocinero/a',
        descripcion: 'Preparación de alimentos según estándares de la marca',
        salario: 1200,
        modalidad: 'Full Time',
        turno: 'Mañana',
        beneficios: ['Propinas', 'Comida', 'Seguro'],
        requisitos: [
            'Experiencia en cocina mínimo 6 meses',
            'Disponibilidad para trabajar fines de semana',
            'Trabajo en equipo'
        ],
        marcaId: 'marca-bembos',
        holdingId: 'holding-ngr',
        isActive: true
    },
    {
        posicion: 'Cajero/a',
        descripcion: 'Atención al cliente y manejo de caja',
        salario: 1100,
        modalidad: 'Part Time',
        turno: 'Tarde',
        beneficios: ['Propinas', 'Comida', 'Seguro'],
        requisitos: [
            'Experiencia en atención al cliente',
            'Manejo de dinero',
            'Buena actitud'
        ],
        marcaId: 'marca-bembos',
        holdingId: 'holding-ngr',
        isActive: true
    },
    {
        posicion: 'Delivery',
        descripcion: 'Entrega de pedidos a domicilio',
        salario: 1000,
        modalidad: 'Part Time',
        turno: 'Noche',
        beneficios: ['Propinas', 'Comida', 'Seguro', 'Combustible'],
        requisitos: [
            'Licencia de conducir vigente',
            'Moto propia (deseable)',
            'Conocimiento de la zona'
        ],
        marcaId: 'marca-bembos',
        holdingId: 'holding-ngr',
        isActive: true
    },
    {
        posicion: 'Shift Leader',
        descripcion: 'Supervisión de turno y apoyo al equipo',
        salario: 1500,
        modalidad: 'Full Time',
        turno: 'Todos',
        beneficios: ['Propinas', 'Comida', 'Seguro', 'Bono por desempeño'],
        requisitos: [
            'Experiencia mínima 1 año en fast food',
            'Liderazgo comprobado',
            'Disponibilidad horaria completa'
        ],
        marcaId: 'marca-bembos',
        holdingId: 'holding-ngr',
        isActive: true
    }
];

export async function POST(request: NextRequest) {
    try {
        const adminDb = await getAdminFirestore();
        const batch = adminDb.batch();
        const jobProfilesRef = adminDb.collection('jobProfiles');
        const createdProfiles: string[] = [];

        for (const profile of BEMBOS_PROFILES) {
            const docRef = jobProfilesRef.doc();
            batch.set(docRef, {
                ...profile,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            createdProfiles.push(profile.posicion);
        }

        await batch.commit();

        return NextResponse.json({
            success: true,
            message: `Created ${createdProfiles.length} Job Profiles for Bembos`,
            profiles: createdProfiles
        });
    } catch (error: any) {
        console.error('Error creating job profiles:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}
