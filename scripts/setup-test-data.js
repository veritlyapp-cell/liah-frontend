// Script para ejecutar desde el navegador (DevTools Console)
// Copia y pega este código completo en la consola del navegador

async function setupTestData() {
    console.log('🚀 Iniciando creación de datos de prueba...\n');

    try {
        // Importar Firestore desde el código de la app
        const { collection, addDoc, Timestamp } = await import('firebase/firestore');
        const { db } = await import('./lib/firebase');

        // 1. Crear configuración de aprobación
        console.log('📝 Creando approval_config...');
        const approvalConfig = {
            holdingId: 'ngr_holding',
            marcaId: null,
            levels: [
                {
                    level: 1,
                    name: 'Supervisor de Tienda',
                    approvers: ['store_manager'],
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
                    isMultipleChoice: true
                },
                {
                    level: 4,
                    name: 'Recruiter',
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

        const configRef = await addDoc(collection(db, 'approval_config'), approvalConfig);
        console.log('✅ approval_config creado:', configRef.id);

        // 2. Crear perfiles de trabajo
        console.log('\n📝 Creando job_profiles...');

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

        for (const profile of profiles) {
            const profileRef = await addDoc(collection(db, 'job_profiles'), profile);
            console.log(`✅ Perfil creado: ${profile.posicion} (${profileRef.id})`);
        }

        console.log('\n✨ ¡Datos de prueba creados exitosamente!');
        console.log('\n📋 Resumen:');
        console.log('- 1 configuración de aprobación (5 niveles)');
        console.log('- 3 perfiles de trabajo');
        console.log('\n🎯 Ahora puedes:');
        console.log('1. Ir a /store-manager');
        console.log('2. Click en "📋 Crear RQ"');
        console.log('3. Seleccionar un perfil');
        console.log('4. ¡Crear tu primer RQ!');

    } catch (error) {
        console.error('❌ Error al crear datos:', error);
        console.error('\nDetalles del error:', error.message);
    }
}

// Ejecutar automáticamente
setupTestData();
