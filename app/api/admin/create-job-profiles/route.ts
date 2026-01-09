import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { marcaId, marcaNombre } = body;

        if (!marcaId || !marcaNombre) {
            return NextResponse.json(
                { error: 'marcaId and marcaNombre are required' },
                { status: 400 }
            );
        }

        // Import Timestamp dynamically
        const { Timestamp } = await import('firebase-admin/firestore');
        const adminDb = getAdminFirestore();

        const profiles = [
            {
                posicion: 'Cocinero/a',
                descripcion: 'Preparación de alimentos según estándares de la marca',
                salario: 1200,
                modalidad: 'Full Time',
                turno: 'Mañana',
                beneficios: ['Propinas', 'Comida', 'Seguro'],
                requisitos: {
                    edadMin: 18,
                    edadMax: 45,
                    experiencia: { requerida: true, meses: 6 },
                    disponibilidad: { horarios: ['mañana'], dias: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'] },
                    distanciaMax: 10
                },
                marcaId,
                marcaNombre,
                assignedStores: [],
                isActive: true
            },
            {
                posicion: 'Cajero/a',
                descripcion: 'Atención al cliente y manejo de caja',
                salario: 1100,
                modalidad: 'Part Time',
                turno: 'Tarde',
                beneficios: ['Propinas', 'Comida', 'Seguro'],
                requisitos: {
                    edadMin: 18,
                    edadMax: 35,
                    experiencia: { requerida: false, meses: 0 },
                    disponibilidad: { horarios: ['tarde'], dias: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'] },
                    distanciaMax: 10
                },
                marcaId,
                marcaNombre,
                assignedStores: [],
                isActive: true
            },
            {
                posicion: 'Delivery',
                descripcion: 'Entrega de pedidos a domicilio',
                salario: 1000,
                modalidad: 'Part Time',
                turno: 'Noche',
                beneficios: ['Propinas', 'Comida', 'Seguro', 'Combustible'],
                requisitos: {
                    edadMin: 18,
                    edadMax: 40,
                    experiencia: { requerida: false, meses: 0 },
                    disponibilidad: { horarios: ['noche'], dias: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'] },
                    distanciaMax: 15
                },
                marcaId,
                marcaNombre,
                assignedStores: [],
                isActive: true
            },
            {
                posicion: 'Shift Leader',
                descripcion: 'Supervisión de turno y apoyo al equipo',
                salario: 1500,
                modalidad: 'Full Time',
                turno: 'Todos',
                beneficios: ['Propinas', 'Comida', 'Seguro', 'Bono por desempeño'],
                requisitos: {
                    edadMin: 21,
                    edadMax: 45,
                    experiencia: { requerida: true, meses: 12 },
                    disponibilidad: { horarios: ['mañana', 'tarde', 'noche'], dias: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'] },
                    distanciaMax: 20
                },
                marcaId,
                marcaNombre,
                assignedStores: [],
                isActive: true
            }
        ];

        const batch = adminDb.batch();
        const createdProfiles: string[] = [];
        const now = Timestamp.now();

        for (const profile of profiles) {
            const docRef = adminDb.collection('job_profiles').doc();
            batch.set(docRef, {
                ...profile,
                createdAt: now,
                updatedAt: now
            });
            createdProfiles.push(profile.posicion);
        }

        await batch.commit();

        return NextResponse.json({
            success: true,
            message: `Created ${createdProfiles.length} Job Profiles for ${marcaNombre}`,
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
