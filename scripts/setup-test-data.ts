// Script para crear datos de prueba en Firestore
// Ejecutar desde Node.js o desde el navegador console

import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from './lib/firebase';

// 1. Crear configuración de aprobación de prueba
async function createTestApprovalConfig() {
    const approvalConfig = {
        holdingId: 'ngr_holding',
        marcaId: null, // Config general del holding
        levels: [
            {
                level: 1,
                name: 'Supervisor de Tienda',
                approvers: ['store_manager'], // para pruebas
                isMultipleChoice: false
            },
            {
                level: 2,
                name: 'Jefe de Zona',
                approvers: ['supervisor'],
                isMultipleChoice: false
            },
            {
                level: 3,
                name: 'Jefe de Marca o Admin',
                approvers: ['jefe_marca', 'client_admin'],
                isMultipleChoice: true // cualquiera puede aprobar
            },
            {
                level: 4,
                name: 'Recruiter de Marca',
                approvers: ['brand_recruiter'],
                isMultipleChoice: false
            },
            {
                level: 5,
                name: 'Director Regional',
                approvers: ['director_regional'],
                isMultipleChoice: false
            }
        ],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
    };

    const docRef = await addDoc(collection(db, 'approval_config'), approvalConfig);
    console.log('✅ Approval config created:', docRef.id);
    return docRef.id;
}

// 2. Crear perfiles de trabajo de prueba
async function createTestJobProfiles() {
    const profiles = [
        {
            marcaId: 'marca_papajohns',
            marcaNombre: 'Papa Johns',
            posicion: 'Delivery Driver',
            modalidad: 'Part Time',
            turno: 'Mañana',
            requisitos: {
                edadMin: 18,
                edadMax: 45,
                experiencia: {
                    requerida: true,
                    meses: 6
                },
                disponibilidad: {
                    horarios: ['mañana'],
                    dias: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
                },
                distanciaMax: 10
            },
            salario: 1200,
            beneficios: ['Propinas', 'Comida', 'Movilidad'],
            assignedStores: ['store_1', 'store_2', 'store_3'],
            descripcion: 'Delivery driver para repartos en moto',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        },
        {
            marcaId: 'marca_papajohns',
            marcaNombre: 'Papa Johns',
            posicion: 'Cajero/a',
            modalidad: 'Full Time',
            turno: 'Tarde',
            requisitos: {
                edadMin: 18,
                edadMax: 35,
                experiencia: {
                    requerida: false,
                    meses: 0
                },
                disponibilidad: {
                    horarios: ['tarde'],
                    dias: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']
                },
                distanciaMax: 15
            },
            salario: 1025,
            beneficios: ['Comida', 'Capacitación'],
            assignedStores: ['store_1'],
            descripcion: 'Atención al cliente y manejo de caja',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        },
        {
            marcaId: 'marca_papajohns',
            marcaNombre: 'Papa Johns',
            posicion: 'Cocinero/a',
            modalidad: 'Part Time',
            turno: 'Noche',
            requisitos: {
                edadMin: 20,
                edadMax: 50,
                experiencia: {
                    requerida: true,
                    meses: 12
                },
                disponibilidad: {
                    horarios: ['noche'],
                    dias: ['viernes', 'sabado', 'domingo']
                },
                distanciaMax: 10
            },
            salario: 1500,
            beneficios: ['Propinas', 'Comida', 'Seguro'],
            assignedStores: ['store_1', 'store_2'],
            descripcion: 'Preparación de pizzas y alimentos',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        }
    ];

    const profileIds = [];
    for (const profile of profiles) {
        const docRef = await addDoc(collection(db, 'job_profiles'), profile);
        console.log(`✅ Job profile created: ${profile.posicion} (${docRef.id})`);
        profileIds.push(docRef.id);
    }

    return profileIds;
}

// Ejecutar todo
async function setupTestData() {
    console.log('🚀 Creando datos de prueba...\n');

    try {
        await createTestApprovalConfig();
        console.log('\n');
        await createTestJobProfiles();
        console.log('\n✅ Datos de prueba creados exitosamente!');
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// Para ejecutar desde el navegador:
// 1. Abrir la app en el navegador
// 2. Abrir DevTools Console
// 3. Copiar y pegar este código
// 4. Ejecutar: setupTestData()

export { setupTestData, createTestApprovalConfig, createTestJobProfiles };
