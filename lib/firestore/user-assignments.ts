import { db } from '@/lib/firebase';
import { collection, doc, getDoc, query, where, getDocs, Timestamp } from 'firebase/firestore';

export type UserRole =
    | 'super_admin'
    | 'client_admin'
    | 'supervisor'
    | 'jefe_marca'
    | 'recruiter'
    | 'store_manager';

export interface UserAssignment {
    id: string;
    userId: string;
    email: string;
    displayName: string;
    role: UserRole;
    holdingId: string;
    active: boolean;
    createdBy: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    assignedStores?: { tiendaId: string; tiendaNombre: string; marcaId: string }[];
    assignedMarca?: { marcaId: string; marcaNombre: string };
    assignedMarcas?: { marcaId: string; marcaNombre: string }[]; // For recruiters with multiple brands
    assignedStore?: { tiendaId: string; tiendaNombre: string; marcaId: string };
    tiendaId?: string;
    marcaId?: string;
    vacationMode?: boolean;
    backupUserId?: string;
    backupDisplayName?: string;
}

/**
 * Get user assignment by userId
 * Supports both 'active' and 'isActive' field names for backward compatibility
 */
export async function getUserAssignment(userId: string): Promise<UserAssignment | null> {
    const assignmentsRef = collection(db, 'userAssignments');
    // Search by userId only, then check active status in code
    const q = query(assignmentsRef, where('userId', '==', userId));

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        console.log('⚠️ No userAssignment found for userId:', userId);
        return null;
    }

    const docSnap = snapshot.docs[0];
    const data = docSnap.data();

    // Check if user is active (support both field names)
    const isUserActive = data.isActive === true || data.active === true;
    if (!isUserActive) {
        console.log('⚠️ User found but not active:', userId);
        return null;
    }

    return { id: docSnap.id, ...data } as UserAssignment;
}

/**
 * Get all active user assignments
 * Supports both 'active' and 'isActive' field names for backward compatibility
 */
export async function getAllUserAssignments(): Promise<UserAssignment[]> {
    const assignmentsRef = collection(db, 'userAssignments');
    const snapshot = await getDocs(assignmentsRef);

    // Filter in code to support both field names
    return snapshot.docs
        .filter(doc => {
            const data = doc.data();
            return data.isActive === true || data.active === true;
        })
        .map(doc => ({
            id: doc.id,
            ...doc.data()
        } as UserAssignment));
}

// TODO: Implement remaining CRUD functions
// - createUserAssignment
// - updateUserAssignment
// - assignStoresToSupervisor
// - deactivateUser
