import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
import type { UserAssignment } from './user-assignments';

/**
 * Auto-assign RQ to supervisor and jefe de marca based on store
 */
export async function assignRQToApprovers(
    rqId: string,
    tiendaId: string,
    marcaId: string,
    creatorId: string,
    creatorName: string
): Promise<void> {
    // Find supervisor for this store
    const supervisor = await findSupervisorForStore(tiendaId);

    // Find jefe de marca for this marca
    const jefeMarca = await findJefeForMarca(marcaId);

    // Initialize approval chain
    const approvalChain = [
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

    // Update RQ with assignments
    const rqRef = doc(db, 'rqs', rqId);
    await updateDoc(rqRef, {
        approvalChain,
        currentApprovalLevel: 2, // Pending supervisor approval
        assignedSupervisor: supervisor?.userId || null,
        assignedSupervisorName: supervisor?.displayName || null,
        assignedJefeMarca: jefeMarca?.userId || null,
        assignedJefeMarcaName: jefeMarca?.displayName || null
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

