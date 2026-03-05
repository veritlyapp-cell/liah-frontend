import { db } from '@/lib/firebase';
import {
    collection,
    doc,
    setDoc,
    addDoc,
    Timestamp,
    writeBatch
} from 'firebase/firestore';

/**
 * Seeds a new holding with demo data for a 7-day trial.
 * Includes: 1 Brand, 5 Stores, Approval Workflow, Job Profiles, Demo Candidates, and Demo Users.
 */
export async function seedDemoData(holdingId: string, holdingName: string, idToken?: string) {
    console.log(`🚀 Seeding demo data for holding: ${holdingName} (${holdingId})`);

    const batch = writeBatch(db);
    const now = Timestamp.now();
    const expiresAt = new Timestamp(now.seconds + 7 * 24 * 60 * 60, 0); // 7 days from now

    // 1. Create Holding
    const holdingRef = doc(db, 'holdings', holdingId);
    batch.set(holdingRef, {
        id: holdingId,
        nombre: holdingName,
        plan: 'full_stack',
        isTrial: true,
        trialExpiresAt: expiresAt,
        activo: true,
        demoSeeded: true,
        createdAt: now,
        updatedAt: now,
        config: {
            maxUsuarios: 20,
            maxMarcas: 5,
            maxTiendas: 50,
            precioMensual: 499,
            hasLiahFlow: true,
            hasLiahTalent: false
        }
    }, { merge: true });

    // 2. Create Brand
    const marcaId = `${holdingId}_demo_brand`;
    const marcaRef = doc(db, 'marcas', marcaId);
    batch.set(marcaRef, {
        id: marcaId,
        holdingId,
        nombre: `${holdingName} Demo Brand`,
        slug: 'demo-brand',
        activo: true,
        createdAt: now,
        updatedAt: now
    });

    // 3. Create 5 Stores
    const stores = ['Centro', 'Norte', 'Sur', 'Este', 'Oeste'];
    const tiendaIds: string[] = [];

    for (const storeName of stores) {
        const tiendaId = `${marcaId}_tienda_${storeName.toLowerCase()}`;
        tiendaIds.push(tiendaId);
        const tiendaRef = doc(db, 'tiendas', tiendaId);
        batch.set(tiendaRef, {
            id: tiendaId,
            holdingId,
            marcaId,
            nombre: `Tienda ${storeName} (Demo)`,
            slug: `tienda-${storeName.toLowerCase()}`,
            activo: true,
            location: { lat: -12.046374, lng: -77.042793 }, // Lima default
            createdAt: now,
            updatedAt: now
        });
    }

    // 4. Create Approval Config (SM -> Supervisor -> Jefe -> Recruiter)
    const configRef = doc(collection(db, 'approval_config'));
    batch.set(configRef, {
        holdingId,
        marcaId: null, // Global for the holding trial
        levels: [
            {
                level: 1,
                name: 'Gerente de Tienda',
                approvers: ['store_manager'],
                isMultipleChoice: false
            },
            {
                level: 2,
                name: 'Supervisor de Zona',
                approvers: ['supervisor'],
                isMultipleChoice: false
            },
            {
                level: 3,
                name: 'Jefe de Marca',
                approvers: ['jefe_marca'],
                isMultipleChoice: false
            },
            {
                level: 4,
                name: 'Recruiter',
                approvers: ['brand_recruiter'],
                isMultipleChoice: false
            }
        ],
        createdAt: now,
        updatedAt: now
    });

    // 5. Create Job Profiles
    const positions = [
        { title: 'Atención al Cliente', salary: 1025 },
        { title: 'Ayudante de Cocina', salary: 1100 },
        { title: 'Motorizado / Delivery', salary: 1200 }
    ];

    for (const pos of positions) {
        const profileRef = doc(collection(db, 'job_profiles'));
        batch.set(profileRef, {
            marcaId,
            marcaNombre: `${holdingName} Demo Brand`,
            posicion: pos.title,
            modalidad: 'Full Time',
            turno: 'Rotativo',
            salario: pos.salary,
            beneficios: ['Ingreso a planilla', 'Seguro de salud', 'Capacitaciones'],
            requisitos: {
                edadMin: 18,
                edadMax: 45,
                experiencia: { requerida: false, meses: 0 },
                disponibilidad: { horarios: ['mañana', 'tarde', 'noche'], dias: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'] },
                distanciaMax: 15
            },
            descripcion: `Buscamos ${pos.title} para nuestra red de tiendas demo.`,
            assignedStores: tiendaIds,
            createdAt: now,
            updatedAt: now
        });
    }

    // 6. Create Demo Candidates
    const demoCandidates = [
        { nombre: 'Juan Perez', dni: '12345678', score: 92 },
        { nombre: 'Maria Garcia', dni: '87654321', score: 85 },
        { nombre: 'Carlos Rodriguez', dni: '11223344', score: 78 }
    ];

    for (const cand of demoCandidates) {
        const candRef = doc(collection(db, 'candidates'));
        batch.set(candRef, {
            nombres: cand.nombre,
            dni: cand.dni,
            email: `${cand.dni}@example.com`,
            celular: '999888777',
            status: 'completado', // Initial status
            score: cand.score,
            validations: {
                docs_validated: true,
                dni_valid: true,
                cuil_valid: true
            },
            holdingId,
            tenantId: holdingId,
            createdAt: now,
            updatedAt: now
        });
    }

    await batch.commit();

    // 7. Create Demo Users via API (only if idToken is provided)
    if (idToken) {
        const demoUsers = [
            { email: `admin@${holdingId}.com`, role: 'client_admin', name: `Admin Demo` },
            { email: `sm@${holdingId}.com`, role: 'store_manager', name: `Manager Demo`, storeId: tiendaIds[0] },
            { email: `supervisor@${holdingId}.com`, role: 'supervisor', name: `Supervisor Demo`, storeIds: [tiendaIds[0], tiendaIds[1]] },
            { email: `jefe@${holdingId}.com`, role: 'jefe_marca', name: `Jefe de Marca Demo`, marcaId: marcaId },
            { email: `recruiter@${holdingId}.com`, role: 'brand_recruiter', name: `Recruiter Demo` }
        ];

        console.log(`👤 Provisioning ${demoUsers.length} demo users...`);

        for (const user of demoUsers) {
            try {
                const payload: any = {
                    email: user.email,
                    displayName: user.name,
                    role: user.role,
                    holdingId,
                    password: 'DemoLiah2026!'
                };

                // Add role-specific assignments
                if (user.role === 'store_manager' && user.storeId) {
                    payload.tiendaId = user.storeId;
                    payload.assignedStore = {
                        tiendaId: user.storeId,
                        tiendaNombre: 'Tienda Centro (Demo)',
                        marcaId: marcaId,
                        marcaNombre: `${holdingName} Demo Brand`
                    };
                } else if (user.role === 'supervisor' && user.storeIds) {
                    // Supervisors usually have an array of storeIds or a brand assignment
                    payload.assignedStoresIds = user.storeIds;
                } else if (user.role === 'jefe_marca' && user.marcaId) {
                    // Jefe de Marca sees everything in the brand
                    payload.marcaId = user.marcaId;
                }

                await fetch('/api/admin/create-user', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${idToken}`
                    },
                    body: JSON.stringify(payload)
                });
            } catch (err) {
                console.warn(`⚠️ Failed to create demo user ${user.email}:`, err);
            }
        }
    }

    console.log('✅ Demo data and users seeded successfully.');
}
