/**
 * Script to create Job Profiles for Bembos brand
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize with default credentials (from gcloud)
if (!admin.apps.length) {
    admin.initializeApp({
        projectId: 'ngr-recruitment-dev'
    });
}

const db = admin.firestore();

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

async function createJobProfiles() {
    console.log('Creating Job Profiles for Bembos...\n');

    const batch = db.batch();
    const jobProfilesRef = db.collection('jobProfiles');

    for (const profile of BEMBOS_PROFILES) {
        const docRef = jobProfilesRef.doc();
        batch.set(docRef, {
            ...profile,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`✅ ${profile.posicion} - S/${profile.salario}`);
    }

    await batch.commit();
    console.log(`\n✅ Created ${BEMBOS_PROFILES.length} Job Profiles for Bembos`);
}

createJobProfiles()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });
