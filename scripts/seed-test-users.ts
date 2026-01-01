/**
 * Script to seed test users for role-based dashboards
 * Run with: npx ts-node scripts/seed-test-users.ts
 */

import { db } from '../lib/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

const TEST_USERS = [
    // Supervisor - manages multiple stores
    {
        userId: 'supervisor-test-001',
        email: 'supervisor@test.com',
        displayName: 'Carlos Supervisor',
        role: 'supervisor' as const,
        assignedStores: [
            { tiendaId: 'pj-001', tiendaNombre: 'Papa Johns San Isidro', marcaId: 'pizza-hut' },
            { tiendaId: 'pj-002', tiendaNombre: 'Papa Johns Miraflores', marcaId: 'pizza-hut' },
            { tiendaId: 'pj-003', tiendaNombre: 'Papa Johns Surco', marcaId: 'pizza-hut' },
            { tiendaId: 'pj-004', tiendaNombre: 'Papa Johns La Molina', marcaId: 'pizza-hut' }
        ],
        createdBy: 'admin',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        active: true
    },

    // Jefe de Marca - manages entire brand
    {
        userId: 'jefe-test-001',
        email: 'jefe@test.com',
        displayName: 'María Jefe de Marca',
        role: 'jefe_marca' as const,
        assignedMarca: {
            marcaId: 'pizza-hut',
            marcaNombre: 'Pizza Hut'
        },
        createdBy: 'admin',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        active: true
    },

    // Recruiter - evaluates candidates for marca
    {
        userId: 'recruiter-test-001',
        email: 'recruiter@test.com',
        displayName: 'Ana Recruiter',
        role: 'recruiter' as const,
        assignedMarca: {
            marcaId: 'pizza-hut',
            marcaNombre: 'Pizza Hut'
        },
        createdBy: 'admin',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        active: true
    },

    // Store Manager - manages single store
    {
        userId: 'store-manager-test-001',
        email: 'storemanager@test.com',
        displayName: 'Pedro Store Manager',
        role: 'store_manager' as const,
        assignedStore: {
            tiendaId: 'pj-001',
            tiendaNombre: 'Papa Johns San Isidro',
            marcaId: 'pizza-hut'
        },
        createdBy: 'admin',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        active: true
    }
];

async function seedTestUsers() {
    console.log('🌱 Seeding test users...');

    const assignmentsRef = collection(db, 'userAssignments');

    for (const user of TEST_USERS) {
        try {
            const docRef = await addDoc(assignmentsRef, user);
            console.log(`✅ Created ${user.role}: ${user.displayName} (${docRef.id})`);
        } catch (error) {
            console.error(`❌ Failed to create ${user.displayName}:`, error);
        }
    }

    console.log('\n✨ Seeding complete!');
    console.log('\n📝 Next steps:');
    console.log('1. Create Firebase Auth users with these emails');
    console.log('2. Copy the UIDs and update the userId fields in Firestore');
    console.log('3. Access dashboards at:');
    console.log('   - http://localhost:3000/supervisor');
    console.log('   - http://localhost:3000/jefe-marca');
    console.log('   - http://localhost:3000/recruiter');
    console.log('   - http://localhost:3000/store-manager');
}

// Uncomment to run
// seedTestUsers().catch(console.error);

export { TEST_USERS };
