import { db } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, query, where, Timestamp } from 'firebase/firestore';
import type { UserAssignment } from './user-assignments';

/**
 * Create a new user assignment
 */
export async function createUserAssignment(
    data: Omit<UserAssignment, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
    const assignmentsRef = collection(db, 'userAssignments');

    const assignmentData = {
        ...data,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        active: true
    };

    const docRef = await addDoc(assignmentsRef, assignmentData);
    return docRef.id;
}

/**
 * Update an existing user assignment
 */
export async function updateUserAssignment(
    id: string,
    data: Partial<UserAssignment>
): Promise<void> {
    const docRef = doc(db, 'userAssignments', id);

    await updateDoc(docRef, {
        ...data,
        updatedAt: Timestamp.now()
    });
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

    if (snapshot.empty) return null;

    // Find first active user (supports both field names)
    for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        if (data.isActive === true || data.active === true) {
            return { id: docSnap.id, ...data } as UserAssignment;
        }
    }

    return null;
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

/**
 * Assign stores to a supervisor
 */
export async function assignStoresToSupervisor(
    userId: string,
    stores: { tiendaId: string; tiendaNombre: string; marcaId: string }[]
): Promise<void> {
    const assignment = await getUserAssignment(userId);

    if (!assignment) {
        throw new Error('User assignment not found');
    }

    await updateDoc(doc(db, 'userAssignments', assignment.id), {
        assignedStores: stores,
        updatedAt: Timestamp.now()
    });
}

/**
 * Deactivate a user assignment
 * Sets both 'active' and 'isActive' to false for compatibility
 */
export async function deactivateUser(userId: string): Promise<void> {
    const assignment = await getUserAssignment(userId);

    if (!assignment) {
        throw new Error('User assignment not found');
    }

    // Set both fields to ensure compatibility
    await updateDoc(doc(db, 'userAssignments', assignment.id), {
        active: false,
        isActive: false,
        updatedAt: Timestamp.now()
    });
}

/**
 * Get assignments by role
 */
export async function getAssignmentsByRole(role: UserAssignment['role']): Promise<UserAssignment[]> {
    const assignmentsRef = collection(db, 'userAssignments');
    const q = query(
        assignmentsRef,
        where('role', '==', role),
        where('active', '==', true)
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as UserAssignment));
}
