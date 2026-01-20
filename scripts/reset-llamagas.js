/**
 * Script para resetear y recrear datos de Llamagas
 * Ejecutar con: npx -y dotenv-cli -e .env.local -- node scripts/reset-llamagas.js
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, writeBatch } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const HOLDING_ID = 'llamagas';

// =====================
// DATOS A CREAR
// =====================

const GERENCIAS = [
    { id: 'gerencia_comercial', nombre: 'Gerencia Comercial', holdingId: HOLDING_ID },
    { id: 'gerencia_operaciones', nombre: 'Gerencia de Operaciones', holdingId: HOLDING_ID },
    { id: 'gerencia_rrhh', nombre: 'Gerencia de Recursos Humanos', holdingId: HOLDING_ID }
];

const AREAS = [
    { id: 'area_ventas', nombre: 'Ventas', gerenciaId: 'gerencia_comercial', holdingId: HOLDING_ID },
    { id: 'area_marketing', nombre: 'Marketing', gerenciaId: 'gerencia_comercial', holdingId: HOLDING_ID },
    { id: 'area_logistica', nombre: 'Logística', gerenciaId: 'gerencia_operaciones', holdingId: HOLDING_ID },
    { id: 'area_distribucion', nombre: 'Distribución', gerenciaId: 'gerencia_operaciones', holdingId: HOLDING_ID },
    { id: 'area_reclutamiento', nombre: 'Reclutamiento', gerenciaId: 'gerencia_rrhh', holdingId: HOLDING_ID }
];

const PUESTOS = [
    { id: 'puesto_vendedor', nombre: 'Vendedor', areaId: 'area_ventas', gerenciaId: 'gerencia_comercial', holdingId: HOLDING_ID },
    { id: 'puesto_supervisor_ventas', nombre: 'Supervisor de Ventas', areaId: 'area_ventas', gerenciaId: 'gerencia_comercial', holdingId: HOLDING_ID },
    { id: 'puesto_chofer', nombre: 'Chofer Repartidor', areaId: 'area_distribucion', gerenciaId: 'gerencia_operaciones', holdingId: HOLDING_ID },
    { id: 'puesto_almacenero', nombre: 'Almacenero', areaId: 'area_logistica', gerenciaId: 'gerencia_operaciones', holdingId: HOLDING_ID }
];

const USERS = [
    {
        id: 'admin_llamagas',
        email: 'admin@llamagas.pe',
        nombre: 'Administrador Llamagas',
        rol: 'admin',
        capacidades: ['admin', 'lider_reclutamiento', 'recruiter', 'hiring_manager'],
        activo: true,
        holdingId: HOLDING_ID
    },
    {
        id: 'yoseph_lider',
        email: 'yoseph@llamagas.pe',
        nombre: 'Yoseph (Líder Reclutamiento)',
        rol: 'lider_reclutamiento',
        capacidades: ['lider_reclutamiento', 'recruiter'],
        activo: true,
        holdingId: HOLDING_ID,
        gerenciaId: 'gerencia_rrhh',
        areaId: 'area_reclutamiento'
    },
    {
        id: 'recruiter_llamagas',
        email: 'recruiter@llamagas.pe',
        nombre: 'Reclutador Llamagas',
        rol: 'recruiter',
        capacidades: ['recruiter'],
        activo: true,
        holdingId: HOLDING_ID,
        gerenciaId: 'gerencia_rrhh',
        areaId: 'area_reclutamiento'
    },
    {
        id: 'miguel_supervisor',
        email: 'miguel@llamagas.pe',
        nombre: 'Miguel Torres (Supervisor)',
        rol: 'hiring_manager',
        capacidades: ['hiring_manager'],
        activo: true,
        holdingId: HOLDING_ID,
        gerenciaId: 'gerencia_comercial',
        areaId: 'area_ventas'
    },
    {
        id: 'juan_solicitante',
        email: 'juan@llamagas.pe',
        nombre: 'Juan Pérez (Solicitante)',
        rol: 'hiring_manager',
        capacidades: ['hiring_manager'],
        activo: true,
        holdingId: HOLDING_ID,
        gerenciaId: 'gerencia_comercial',
        areaId: 'area_ventas'
    },
    {
        id: 'susana_jefa',
        email: 'susana@llamagas.pe',
        nombre: 'Susana Olivares (Jefa de Área)',
        rol: 'area_manager',
        capacidades: ['hiring_manager', 'area_manager'],
        activo: true,
        holdingId: HOLDING_ID,
        gerenciaId: 'gerencia_comercial',
        areaId: 'area_ventas'
    }
];

// Workflow de aprobación
const WORKFLOW = {
    id: 'workflow_default',
    nombre: 'Flujo Estándar Llamagas',
    descripcion: 'Superior Directo → Líder de Reclutamiento',
    holdingId: HOLDING_ID,
    isDefault: true,
    activo: true,
    steps: [
        { orden: 1, nombre: 'Aprobación Superior Directo', approverType: 'specific_user' },
        { orden: 2, nombre: 'Aprobación Líder Reclutamiento', approverType: 'lider_reclutamiento' }
    ]
};

async function deleteCollection(collectionName) {
    const snap = await getDocs(collection(db, collectionName));
    const batch = writeBatch(db);
    let count = 0;

    for (const docSnap of snap.docs) {
        batch.delete(docSnap.ref);
        count++;
    }

    if (count > 0) {
        await batch.commit();
    }
    return count;
}

async function resetData() {
    console.log('🗑️  BORRANDO DATOS EXISTENTES...\n');

    // Borrar colecciones
    const deleted = {
        talent_users: await deleteCollection('talent_users'),
        gerencias: await deleteCollection('gerencias'),
        areas: await deleteCollection('areas'),
        puestos: await deleteCollection('puestos'),
        approval_workflows: await deleteCollection('approval_workflows'),
        talent_rqs: await deleteCollection('talent_rqs'),
        talent_jobs: await deleteCollection('talent_jobs')
    };

    console.log('📊 Documentos borrados:');
    Object.entries(deleted).forEach(([col, count]) => {
        console.log(`   - ${col}: ${count}`);
    });

    console.log('\n🔨 CREANDO DATOS NUEVOS...\n');

    // Crear Gerencias
    console.log('🏢 Creando gerencias...');
    for (const g of GERENCIAS) {
        await setDoc(doc(db, 'gerencias', g.id), { ...g, createdAt: new Date() });
        console.log(`   ✅ ${g.nombre}`);
    }

    // Crear Áreas
    console.log('\n📂 Creando áreas...');
    for (const a of AREAS) {
        await setDoc(doc(db, 'areas', a.id), { ...a, createdAt: new Date() });
        console.log(`   ✅ ${a.nombre}`);
    }

    // Crear Puestos
    console.log('\n💼 Creando puestos...');
    for (const p of PUESTOS) {
        await setDoc(doc(db, 'puestos', p.id), { ...p, createdAt: new Date() });
        console.log(`   ✅ ${p.nombre}`);
    }

    // Crear Usuarios
    console.log('\n👤 Creando usuarios...');
    for (const u of USERS) {
        const { id, ...userData } = u;
        await setDoc(doc(db, 'talent_users', id), { ...userData, createdAt: new Date() });
        console.log(`   ✅ ${u.nombre} (${u.email})`);
    }

    // Crear Workflow
    console.log('\n⚙️ Creando workflow de aprobación...');
    await setDoc(doc(db, 'approval_workflows', WORKFLOW.id), { ...WORKFLOW, createdAt: new Date() });
    console.log(`   ✅ ${WORKFLOW.nombre}`);

    console.log('\n\n✅ ¡RESET COMPLETADO!');
    console.log('\n📌 Resumen:');
    console.log(`   - Holding: ${HOLDING_ID}`);
    console.log(`   - ${GERENCIAS.length} gerencias`);
    console.log(`   - ${AREAS.length} áreas`);
    console.log(`   - ${PUESTOS.length} puestos`);
    console.log(`   - ${USERS.length} usuarios`);
    console.log(`   - 1 workflow de aprobación`);
    console.log('\n🔑 Usuarios creados:');
    USERS.forEach(u => console.log(`   - ${u.email} (${u.rol})`));

    process.exit(0);
}

resetData().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
});
