import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, Timestamp, getDoc } from 'firebase/firestore';
import type { UserAssignment } from './user-assignments';

/**
 * Auto-assign RQ to supervisor and jefe de marca based on store
 */
export async function assignRQToApprovers(
    rqId: string,
    tiendaId: string,
    marcaId: string,
    creatorId: string,
    creatorName: string,
    creatorRole: 'store_manager' | 'supervisor' = 'store_manager'
): Promise<void> {
    // Find supervisor for this store
    const supervisor = await findSupervisorForStore(tiendaId);

    // Find jefe de marca for this marca
    const jefeMarca = await findJefeForMarca(marcaId);

    // Initialize approval chain
    let approvalChain;
    let currentLevel;

    if (creatorRole === 'supervisor') {
        // SHORT FLOW: Supervisor creates -> Jefe de Marca approves
        approvalChain = [
            {
                level: 1,
                role: 'supervisor' as const,
                status: 'approved' as const, // Already approved by creator
                approvedBy: creatorId,
                approvedByName: creatorName,
                approvedAt: Timestamp.now()
            },
            {
                level: 2,
                role: 'jefe_marca' as const,
                status: 'pending' as const
            }
        ];
        currentLevel = 2; // Pending jefe_marca
    } else {
        // STANDARD FLOW: Store Manager creates -> Supervisor approves -> Jefe de Marca approves
        approvalChain = [
            {
                level: 1,
                role: 'store_manager' as const,
                status: 'approved' as const,
                approvedBy: creatorId,
                approvedByName: creatorName,
                approvedAt: Timestamp.now()
            },
            {
                level: 2,
                role: 'supervisor' as const,
                status: 'pending' as const
            },
            {
                level: 3,
                role: 'jefe_marca' as const,
                status: 'pending' as const
            }
        ];
        currentLevel = 2; // Pending supervisor
    }

    // VACATION MODE: Check if titulars are on vacation and delegate to backup
    let finalSupervisor = supervisor;
    let finalJefeMarca = jefeMarca;

    if (supervisor?.vacationMode && supervisor.backupUserId) {
        console.log(`🏖️ Supervisor ${supervisor.displayName} is on vacation. Delegating to ${supervisor.backupDisplayName}...`);
        const backup = await findActiveUserById(supervisor.backupUserId);
        if (backup) finalSupervisor = backup;
    }

    if (jefeMarca?.vacationMode && jefeMarca.backupUserId) {
        console.log(`🏖️ Jefe de Marca ${jefeMarca.displayName} is on vacation. Delegating to ${jefeMarca.backupDisplayName}...`);
        const backup = await findActiveUserById(jefeMarca.backupUserId);
        if (backup) finalJefeMarca = backup;
    }

    // Update RQ with assignments
    const rqRef = doc(db, 'rqs', rqId);
    await updateDoc(rqRef, {
        approvalChain,
        currentApprovalLevel: currentLevel,
        assignedSupervisor: finalSupervisor?.userId || null,
        assignedSupervisorName: finalSupervisor?.displayName || null,
        assignedJefeMarca: finalJefeMarca?.userId || null,
        assignedJefeMarcaName: finalJefeMarca?.displayName || null
    });
}

/**
 * Find supervisor assigned to a specific store
 * Supports both 'active' and 'isActive' field names
 */
async function findSupervisorForStore(tiendaId: string): Promise<UserAssignment | null> {
    const assignmentsRef = collection(db, 'userAssignments');
    // Query only by role, then filter in code for active status and store assignment
    const q = query(
        assignmentsRef,
        where('role', '==', 'supervisor')
    );

    const snapshot = await getDocs(q);

    // Find supervisor that has this store in their assignedStores array
    for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const assignment = { id: docSnap.id, ...data } as UserAssignment;

        // Check if user is active (support both field names)
        const isActive = data.isActive === true || data.active === true;
        if (!isActive) continue;

        // Check if this supervisor has the store assigned
        const hasStore = assignment.assignedStores?.some(store => store.tiendaId === tiendaId);
        if (hasStore) {
            console.log(`✅ Found supervisor ${assignment.displayName} for store ${tiendaId}`);
            return assignment;
        }
    }

    console.log(`⚠️ No supervisor found for store ${tiendaId}`);
    return null;
}

/**
 * Find jefe de marca for a specific marca
 * Supports both 'active' and 'isActive' field names
 */
async function findJefeForMarca(marcaId: string): Promise<UserAssignment | null> {
    const assignmentsRef = collection(db, 'userAssignments');
    // Query only by role, then filter in code for active status and marca assignment
    const q = query(
        assignmentsRef,
        where('role', '==', 'jefe_marca')
    );

    const snapshot = await getDocs(q);

    for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const assignment = { id: docSnap.id, ...data } as UserAssignment;

        // Check if user is active (support both field names)
        const isActive = data.isActive === true || data.active === true;
        if (!isActive) continue;

        // Check if this jefe has the marca assigned
        if (assignment.assignedMarca?.marcaId === marcaId) {
            console.log(`✅ Found jefe de marca ${assignment.displayName} for marca ${marcaId}`);
            return assignment;
        }
    }

    console.log(`⚠️ No jefe de marca found for marca ${marcaId}`);
    return null;
}

/**
 * Find active user as backup
 */
async function findActiveUserById(userId: string): Promise<UserAssignment | null> {
    const docRef = doc(db, 'userAssignments', userId);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
        const data = snap.data();
        const isActive = data.isActive === true || data.active === true;
        if (isActive) {
            return { id: snap.id, ...data } as UserAssignment;
        }
    }
    return null;
}

