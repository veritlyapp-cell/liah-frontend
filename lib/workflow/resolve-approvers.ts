import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

/**
 * Tipos de aprobador en un workflow step
 */
type ApproverType = 'hiring_manager' | 'area_manager' | 'gerencia_manager' | 'specific_user' | 'jefe_reclutamiento';

interface WorkflowStep {
    orden: number;
    nombre: string;
    approverType: ApproverType;
    specificUserId?: string;
    specificUserEmail?: string;
    specificUserNombre?: string;
}

interface ResolvedApprover {
    stepOrden: number;
    stepNombre: string;
    approverType: ApproverType;
    userId: string;
    email: string;
    nombre: string;
    skipped: boolean;      // true si es duplicado de un paso anterior
    skipReason?: string;   // ej: "Mismo usuario que paso 1"
}

interface RQContext {
    holdingId: string;
    puestoId: string;
    areaId: string;
    gerenciaId: string;
    createdByEmail: string;
    createdByNombre?: string;
}

/**
 * Resuelve los aprobadores dinámicos de un workflow para un RQ específico.
 * Detecta y marca como "skipped" los pasos donde el aprobador es el mismo
 * que un paso anterior (evita aprobaciones duplicadas).
 */
export async function resolveWorkflowApprovers(
    workflowSteps: WorkflowStep[],
    rqContext: RQContext
): Promise<ResolvedApprover[]> {
    const resolvedApprovers: ResolvedApprover[] = [];
    const seenEmails = new Set<string>();

    // Load area and gerencia to get their managers
    let areaManagerEmail: string | null = null;
    let areaManagerNombre: string | null = null;
    let gerenciaManagerEmail: string | null = null;
    let gerenciaManagerNombre: string | null = null;

    // Get area manager
    if (rqContext.areaId) {
        try {
            const areaDoc = await getDoc(doc(db, 'areas', rqContext.areaId));
            if (areaDoc.exists()) {
                const areaData = areaDoc.data();
                areaManagerEmail = areaData.managerEmail || null;
                areaManagerNombre = areaData.managerNombre || null;
            }
        } catch (e) {
            console.error('Error loading area manager:', e);
        }
    }

    // Get gerencia manager
    if (rqContext.gerenciaId) {
        try {
            const gerenciaDoc = await getDoc(doc(db, 'gerencias', rqContext.gerenciaId));
            if (gerenciaDoc.exists()) {
                const gerenciaData = gerenciaDoc.data();
                gerenciaManagerEmail = gerenciaData.managerEmail || null;
                gerenciaManagerNombre = gerenciaData.managerNombre || null;
            }
        } catch (e) {
            console.error('Error loading gerencia manager:', e);
        }
    }

    // Get jefe de reclutamiento (user with rol = 'jefe_reclutamiento' in the holding)
    let jefeReclutamientoEmail: string | null = null;
    let jefeReclutamientoNombre: string | null = null;
    try {
        const usersRef = collection(db, 'talent_users');
        const jrQuery = query(
            usersRef,
            where('holdingId', '==', rqContext.holdingId),
            where('rol', '==', 'jefe_reclutamiento'),
            where('activo', '==', true)
        );
        const jrSnap = await getDocs(jrQuery);
        if (!jrSnap.empty) {
            const jrUser = jrSnap.docs[0].data();
            jefeReclutamientoEmail = jrUser.email;
            jefeReclutamientoNombre = jrUser.nombre;
        }
    } catch (e) {
        console.error('Error loading jefe reclutamiento:', e);
    }

    // Resolve each step
    for (const step of workflowSteps) {
        let email: string | null = null;
        let nombre: string | null = null;
        let userId: string | null = null;

        switch (step.approverType) {
            case 'hiring_manager':
                // The person who created the RQ
                email = rqContext.createdByEmail;
                nombre = rqContext.createdByNombre || email;
                break;

            case 'area_manager':
                email = areaManagerEmail;
                nombre = areaManagerNombre || email;
                break;

            case 'gerencia_manager':
                email = gerenciaManagerEmail;
                nombre = gerenciaManagerNombre || email;
                break;

            case 'jefe_reclutamiento':
                email = jefeReclutamientoEmail;
                nombre = jefeReclutamientoNombre || email;
                break;

            case 'specific_user':
                email = step.specificUserEmail || null;
                nombre = step.specificUserNombre || email;
                userId = step.specificUserId || null;
                break;
        }

        // Check if we have a valid approver
        if (!email) {
            // No approver configured for this dynamic type - skip step
            resolvedApprovers.push({
                stepOrden: step.orden,
                stepNombre: step.nombre,
                approverType: step.approverType,
                userId: '',
                email: '',
                nombre: `[No configurado: ${step.approverType}]`,
                skipped: true,
                skipReason: 'No hay usuario asignado para este tipo de aprobador'
            });
            continue;
        }

        // Check if this email was already seen (duplicate)
        const emailLower = email.toLowerCase();
        const skipped = seenEmails.has(emailLower);

        // Find which previous step had the same email
        let skipReason: string | undefined;
        if (skipped) {
            const previousStep = resolvedApprovers.find(
                a => a.email.toLowerCase() === emailLower && !a.skipped
            );
            if (previousStep) {
                skipReason = `Mismo usuario que paso ${previousStep.stepOrden} (${previousStep.stepNombre})`;
            }
        }

        seenEmails.add(emailLower);

        resolvedApprovers.push({
            stepOrden: step.orden,
            stepNombre: step.nombre,
            approverType: step.approverType,
            userId: userId || '',
            email,
            nombre: nombre || email,
            skipped,
            skipReason
        });
    }

    return resolvedApprovers;
}

interface ApprovalWorkflow {
    id: string;
    nombre: string;
    descripcion?: string;
    steps: WorkflowStep[];
    isDefault: boolean;
    holdingId: string;
    activo: boolean;
}

/**
 * Gets the default workflow for a holding
 */
export async function getDefaultWorkflow(holdingId: string): Promise<ApprovalWorkflow | null> {
    try {
        const wfRef = collection(db, 'approval_workflows');
        const wfQuery = query(
            wfRef,
            where('holdingId', '==', holdingId),
            where('isDefault', '==', true),
            where('activo', '==', true)
        );
        const wfSnap = await getDocs(wfQuery);

        if (!wfSnap.empty) {
            const docSnap = wfSnap.docs[0];
            return { id: docSnap.id, ...docSnap.data() } as ApprovalWorkflow;
        }

        // If no default, get the first active one
        const anyQuery = query(
            wfRef,
            where('holdingId', '==', holdingId),
            where('activo', '==', true)
        );
        const anySnap = await getDocs(anyQuery);
        if (!anySnap.empty) {
            const docSnap = anySnap.docs[0];
            return { id: docSnap.id, ...docSnap.data() } as ApprovalWorkflow;
        }

        return null;
    } catch (error) {
        console.error('Error getting default workflow:', error);
        return null;
    }
}

/**
 * Get the next pending approver for an RQ based on its current approval state
 */
export function getNextPendingApprover(
    resolvedApprovers: ResolvedApprover[],
    completedSteps: number[]
): ResolvedApprover | null {
    for (const approver of resolvedApprovers) {
        // Skip if already completed or marked as skipped
        if (completedSteps.includes(approver.stepOrden) || approver.skipped) {
            continue;
        }
        return approver;
    }
    return null; // All steps completed
}
