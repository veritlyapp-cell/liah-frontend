/**
 * Bulk User Creation Service
 * Creates multiple users in Firebase Auth and Firestore
 */

import { auth, db } from '@/lib/firebase';
import { collection, addDoc, Timestamp, writeBatch, doc } from 'firebase/firestore';
import type { UserImportRow } from '@/lib/utils/csv-parser';

export interface BulkCreationResult {
    totalUsers: number;
    successCount: number;
    failCount: number;
    successEmails: string[];
    failedUsers: FailedUser[];
    importBatchId: string;
}

export interface FailedUser {
    email: string;
    displayName: string;
    error: string;
}

const TEMPORARY_PASSWORD = 'NGR2024!Cambiar';

/**
 * Create multiple users in batch
 * This requires Firebase Admin SDK which should run on backend
 * For now, we'll create them in Firestore only and provide instructions
 */
export async function bulkCreateUsers(
    users: UserImportRow[],
    holdingId: string,
    createdBy: string,
    onProgress?: (current: number, total: number) => void
): Promise<BulkCreationResult> {
    const importBatchId = `import_${Date.now()}`;
    const successEmails: string[] = [];
    const failedUsers: FailedUser[] = [];

    console.log(`🚀 Starting bulk import of ${users.length} users...`);

    for (let i = 0; i < users.length; i++) {
        const user = users[i];

        try {
            // Create user in Firestore
            // Note: Firebase Auth creation needs to be done via Admin SDK on backend
            await createUserInFirestore(user, holdingId, createdBy, importBatchId);

            successEmails.push(user.email);
            console.log(`✅ Created: ${user.email}`);
        } catch (error: any) {
            failedUsers.push({
                email: user.email,
                displayName: user.displayName,
                error: error.message || 'Error desconocido'
            });
            console.error(`❌ Failed: ${user.email}`, error);
        }

        // Report progress
        if (onProgress) {
            onProgress(i + 1, users.length);
        }

        // Small delay to avoid rate limiting
        if (i < users.length - 1) {
            await sleep(100);
        }
    }

    // Save import log
    await saveImportLog({
        importBatchId,
        timestamp: Timestamp.now(),
        importedBy: createdBy,
        totalUsers: users.length,
        successCount: successEmails.length,
        failCount: failedUsers.length,
        successEmails,
        failedUsers,
        holdingId
    });

    console.log(`✅ Bulk import completed: ${successEmails.length}/${users.length} successful`);

    return {
        totalUsers: users.length,
        successCount: successEmails.length,
        failCount: failedUsers.length,
        successEmails,
        failedUsers,
        importBatchId
    };
}

/**
 * Create user document in Firestore
 */
async function createUserInFirestore(
    user: UserImportRow,
    holdingId: string,
    createdBy: string,
    importBatchId: string
): Promise<void> {
    const assignmentsRef = collection(db, 'userAssignments');

    const userData = {
        // Note: userId should be the Firebase Auth UID
        // For now we use a placeholder, needs backend integration
        userId: `pending_${user.email}`,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        holdingId,
        assignedMarca: user.marca ? {
            marcaId: user.marca.toLowerCase().replace(/\s+/g, '-'),
            marcaNombre: user.marca
        } : undefined,
        assignedTienda: user.tienda || undefined,
        active: true,
        passwordChanged: false,  // Flag for first login
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy,
        importBatchId,
        temporaryPassword: TEMPORARY_PASSWORD  // Store for reference
    };

    await addDoc(assignmentsRef, userData);
}

/**
 * Save import log to Firestore
 */
async function saveImportLog(log: any): Promise<void> {
    const logsRef = collection(db, 'importLogs');
    await addDoc(logsRef, log);
}

/**
 * Utility: Sleep function
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get Firebase Auth creation instructions
 */
export function getFirebaseAuthInstructions(users: UserImportRow[]): string {
    const emails = users.map(u => u.email).join('\n');

    return `
Para completar la creación de usuarios, necesitas crear las cuentas en Firebase Authentication:

MÉTODO 1: Firebase Console (Manual)
1. Ve a Firebase Console → Authentication
2. Para cada email:
   - Click "Add User"
   - Email: [copiar del listado]
   - Password: ${TEMPORARY_PASSWORD}

MÉTODO 2: Firebase CLI (Recomendado para muchos usuarios)
Ejecuta este script:

${users.map(u => `firebase auth:import --hash-algo=NONE --users='[{"email":"${u.email}","password":"${TEMPORARY_PASSWORD}"}]'`).join('\n')}

USUARIOS A CREAR:
${emails}

Password temporal para todos: ${TEMPORARY_PASSWORD}
`;
}
