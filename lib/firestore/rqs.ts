import { db } from '@/lib/firebase';
import {
    collection,
    doc,
    addDoc,
    getDoc,
    getDocs,
    updateDoc,
    query,
    where,
    orderBy,
    Timestamp,
    onSnapshot,
    writeBatch
} from 'firebase/firestore';
import { getApprovalConfig, getNextApprovalLevel } from './approval-config';
import type { JobProfile } from './job-profiles';

// Códigos de marca para numeración de RQs
const MARCA_CODES: Record<string, string> = {
    'marca_papajohns': 'PJ',
    'papajohns': 'PJ',
    'papa_johns': 'PJ',
    'marca_kfc': 'KFC',
    'kfc': 'KFC',
    'marca_starbucks': 'SBX',
    'starbucks': 'SBX',
    'marca_popeyes': 'POP',
    'popeyes': 'POP',
    'marca_chillis': 'CHL',
    'chillis': 'CHL',
    'marca_burgerking': 'BK',
    'burgerking': 'BK'
};

// Función helper para obtener código de marca
function getMarcaCode(marcaId: string): string {
    // Intentar buscar directamente
    if (MARCA_CODES[marcaId]) {
        return MARCA_CODES[marcaId];
    }

    // Intentar sin prefijo "marca_"
    const withoutPrefix = marcaId.replace('marca_', '');
    if (MARCA_CODES[withoutPrefix]) {
        return MARCA_CODES[withoutPrefix];
    }

    // Fallback: usar las primeras 3 letras en mayúsculas
    return marcaId.substring(0, 3).toUpperCase();
}

export interface ApprovalHistoryEntry {
    level: number;
    approvedBy: string;
    approvedByEmail: string;
    approvedAt: any;
    action: 'approved' | 'rejected';
    reason?: string;
}

export interface RQ {
    id: string;
    rqNumber?: string; // Número único: RQ-PJ-202412-0001
    batchId: string; // agrupa instancias de misma solicitud
    instanceNumber: number; // 1, 2, 3... según cantidad de vacantes

    // Información del perfil
    jobProfileId: string;
    puesto: string;
    posicion: string;
    modalidad?: 'Full Time' | 'Part Time';
    turno: string;

    // Ubicación
    tiendaId?: string;
    tiendaNombre?: string;
    marcaId: string;
    marcaNombre: string;

    // Detalles del requerimiento
    vacantes: number;
    descripcion?: string;
    requisitos?: any; // Camaleónico: puede ser string[] o JobProfileRequisitos
    fechaLimite?: any;
    motivo?: 'Reemplazo' | 'Necesidad de Venta'; // Para métricas

    // Status del RQ
    status: 'active' | 'filled' | 'closed' | 'cancelled';
    filledCount?: number; // Cuántas vacantes se llenaron
    filledAt?: any; // Cuando se llenó completamente
    closedAt?: any;
    closedBy?: string;
    closureReason?: string;

    // Aprobación multi-nivel
    approvalStatus: 'pending' | 'approved' | 'rejected';
    currentApprovalLevel: number; // nivel actual de aprobación

    approvalChain: {
        level: number;
        role: 'store_manager' | 'supervisor' | 'jefe_marca';
        status: 'pending' | 'approved' | 'rejected';
        approvedBy?: string;
        approvedByName?: string;
        approvedAt?: any; // Timestamp
        rejectionReason?: string;
    }[];

    // Auto-assignment based on store
    assignedSupervisor?: string; // userId
    assignedSupervisorName?: string;
    assignedJefeMarca?: string; // userId
    assignedJefeMarcaName?: string;

    approvalHistory: ApprovalHistoryEntry[];

    // Requisitos y detalles (copiados del job profile)
    salario: number;
    beneficios: string[];

    // Reclutamiento
    recruitment_started_at?: any;
    recruitment_ended_at?: any;
    alert_unfilled: boolean; // true si +X días sin cubrir
    alert_days_threshold?: number; // Días configurados para la alerta (default 7)
    alert_unfilled_at?: any; // Cuando se marcó como unfilled

    // Eliminación
    deletion_requested: boolean;
    deletion_requested_by?: string;
    deletion_requested_at?: any;
    deletion_approved: boolean;

    // Metadata
    tenantId: string;
    creadoPor: string;
    creadorEmail: string;
    createdByRole?: 'store_manager' | 'supervisor'; // Who created the RQ
    approvalFlow?: 'standard' | 'short'; // standard = SM->Sup->JM, short = Sup->JM (when Supervisor creates)
    categoria?: 'operativo' | 'gerencial'; // NEW: for filtering and analytics
    createdAt: any;
    updatedAt: any;
}

/**
 * Generar número único de RQ
 * Formato: RQ-[MARCA]-[NNNNN]
 */
async function generateRQNumber(marcaId: string): Promise<string> {
    const marcaCode = getMarcaCode(marcaId);
    const prefix = `RQ-${marcaCode}-`;

    // Obtener todos los RQs de esta marca y filtrar en cliente
    const rqsRef = collection(db, 'rqs');
    const q = query(
        rqsRef,
        where('marcaId', '==', marcaId)
        // Sin orderBy ni range queries para evitar índice compuesto
    );

    const snapshot = await getDocs(q);

    // Encontrar el número más alto filtrando en cliente
    let maxNumber = 0;
    snapshot.forEach(doc => {
        const rqNumber = doc.data().rqNumber as string;
        if (rqNumber && rqNumber.startsWith(prefix)) {
            const numberPart = parseInt(rqNumber.split('-')[2] || '0');
            if (numberPart > maxNumber) {
                maxNumber = numberPart;
            }
        }
    });

    const nextNumber = (maxNumber + 1).toString().padStart(5, '0');
    return `${prefix}${nextNumber}`;
}

/**
 * Crear múltiples instancias de RQ según número de vacantes
 */
export async function createRQInstances(
    jobProfile: JobProfile,
    tiendaId: string,
    tiendaNombre: string,
    numVacantes: number,
    tenantId: string,
    marcaId: string,
    marcaNombre: string,
    creadoPor: string,
    creadorEmail: string,
    creatorRole: 'store_manager' | 'supervisor' = 'store_manager'
): Promise<string[]> {
    const batch = writeBatch(db);
    const rqsRef = collection(db, 'rqs');
    const now = Timestamp.now();

    // Generar un batchId único para agrupar las instancias
    const batchId = `batch_${now.toMillis()}_${Math.random().toString(36).substr(2, 9)}`;
    const rqIds: string[] = [];

    // Obtener el número inicial para el primer RQ
    const firstRQNumber = await generateRQNumber(marcaId);
    const prefixParts = firstRQNumber.split('-');
    const prefix = `${prefixParts[0]}-${prefixParts[1]}-`;
    let currentNumberValue = parseInt(prefixParts[2]);

    for (let i = 1; i <= numVacantes; i++) {
        const rqNumber = `${prefix}${currentNumberValue.toString().padStart(5, '0')}`;
        currentNumberValue++;

        const rqData: Omit<RQ, 'id'> = {
            rqNumber,
            batchId,
            instanceNumber: i,

            jobProfileId: jobProfile.id,
            puesto: jobProfile.posicion,
            posicion: jobProfile.posicion,
            modalidad: jobProfile.modalidad as any,
            turno: jobProfile.turno,

            tiendaId,
            tiendaNombre,
            marcaId,
            marcaNombre,

            vacantes: 1, // Each instance is for 1 vacante
            descripcion: jobProfile.descripcion,
            requisitos: jobProfile.requisitos || null,
            motivo: (jobProfile as any).motivo, // Motivo del RQ para métricas

            status: 'active', // Default status for new RQs
            filledCount: 0,

            approvalStatus: 'pending',
            currentApprovalLevel: 1, // Will be updated to 2 after auto-assignment
            approvalChain: [], // Will be initialized by assignRQToApprovers
            approvalHistory: [],

            salario: jobProfile.salario,
            beneficios: jobProfile.beneficios || [],

            alert_unfilled: false,
            deletion_requested: false,
            deletion_approved: false,

            tenantId,
            creadoPor,
            creadorEmail,
            createdByRole: creatorRole,
            approvalFlow: creatorRole === 'supervisor' ? 'short' : 'standard',
            categoria: jobProfile.categoria as any || 'operativo',
            createdAt: now,
            updatedAt: now
        };

        const newDocRef = doc(rqsRef);
        // Clean undefined fields before set
        const cleanedData = Object.fromEntries(
            Object.entries(rqData).filter(([_, v]) => v !== undefined)
        );
        batch.set(newDocRef, cleanedData);
        rqIds.push(newDocRef.id);
    }

    await batch.commit();

    // After creating RQs, auto-assign to supervisors and jefes
    // Import assignRQToApprovers dynamically to avoid circular dependency
    const { assignRQToApprovers } = await import('./rq-assignment');

    for (const rqId of rqIds) {
        try {
            await assignRQToApprovers(
                rqId,
                tiendaId,
                marcaId,
                creadoPor,
                creadorEmail,
                creatorRole
            );
        } catch (error) {
            console.error(`Failed to assign RQ ${rqId}:`, error);
        }
    }

    return rqIds;
}

/**
 * Aprobar un RQ y avanzar al siguiente nivel
 */
export async function approveRQ(
    rqId: string,
    approvedBy: string,
    approvedByEmail: string,
    holdingId: string
): Promise<void> {
    const rqRef = doc(db, 'rqs', rqId);
    const rqSnap = await getDoc(rqRef);

    if (!rqSnap.exists()) {
        throw new Error('RQ no encontrado');
    }

    const rq = rqSnap.data() as RQ;
    const currentLevel = rq.currentApprovalLevel || 1;

    // Agregar al historial
    const historyEntry: ApprovalHistoryEntry = {
        level: currentLevel,
        approvedBy,
        approvedByEmail,
        approvedAt: Timestamp.now(),
        action: 'approved'
    };

    const updatedHistory = [...rq.approvalHistory, historyEntry];

    // Actualizar la entrada específica en la cadena de aprobación
    const updatedApprovalChain = (rq.approvalChain || []).map(entry => {
        if (entry.level === currentLevel) {
            return {
                ...entry,
                status: 'approved' as const,
                approvedBy,
                approvedByName: approvedByEmail,
                approvedAt: Timestamp.now()
            };
        }
        return entry;
    });

    // Obtener siguiente nivel
    const nextLevel = await getNextApprovalLevel(holdingId, currentLevel, rq.marcaId);

    if (nextLevel) {
        // Hay más niveles, avanzar
        await updateDoc(rqRef, {
            currentApprovalLevel: nextLevel,
            approvalStatus: 'pending',
            status: 'active', // Sigue activo pero en aprobación
            estado: `pendiente_nivel_${nextLevel}`, // Backward compatibility
            approvalHistory: updatedHistory,
            approvalChain: updatedApprovalChain,
            updatedAt: Timestamp.now()
        });
    } else {
        // Último nivel, marcar como aprobado
        await updateDoc(rqRef, {
            approvalStatus: 'approved',
            status: 'active', // Listo para que el Store Manager invite
            estado: 'aprobado', // Backward compatibility
            approvalHistory: updatedHistory,
            approvalChain: updatedApprovalChain,
            updatedAt: Timestamp.now()
        });
    }
}

/**
 * Rechazar un RQ
 */
export async function rejectRQ(
    rqId: string,
    rejectedBy: string,
    rejectedByEmail: string,
    reason: string
): Promise<void> {
    const rqRef = doc(db, 'rqs', rqId);
    const rqSnap = await getDoc(rqRef);

    if (!rqSnap.exists()) {
        throw new Error('RQ no encontrado');
    }

    const rq = rqSnap.data() as RQ;

    const historyEntry: ApprovalHistoryEntry = {
        level: rq.currentApprovalLevel || 1,
        approvedBy: rejectedBy,
        approvedByEmail: rejectedByEmail,
        approvedAt: Timestamp.now(),
        action: 'rejected',
        reason
    };

    // Actualizar la entrada específica en la cadena de aprobación
    const updatedApprovalChain = (rq.approvalChain || []).map(entry => {
        if (entry.level === (rq.currentApprovalLevel || 1)) {
            return {
                ...entry,
                status: 'rejected' as const,
                approvedBy: rejectedBy,
                approvedByName: rejectedByEmail,
                approvedAt: Timestamp.now(),
                rejectionReason: reason
            };
        }
        return entry;
    });

    await updateDoc(rqRef, {
        approvalStatus: 'rejected',
        status: 'cancelled', // Al ser rechazado, se cancela el proceso
        estado: 'rechazado', // Backward compatibility
        approvalHistory: [...rq.approvalHistory, historyEntry],
        approvalChain: updatedApprovalChain,
        updatedAt: Timestamp.now()
    });
}

/**
 * Solicitar eliminación (Store Manager)
 */
export async function requestDeletion(
    rqId: string,
    requestedBy: string,
    reason: string
): Promise<void> {
    const rqRef = doc(db, 'rqs', rqId);

    await updateDoc(rqRef, {
        deletion_requested: true,
        deletion_requested_by: requestedBy,
        deletion_requested_at: Timestamp.now(),
        updatedAt: Timestamp.now()
    });

    // TODO: Generar alerta al nivel superior
}

/**
 * Eliminar RQ (Jefe Marca / Supervisor)
 */
export async function deleteRQ(
    rqId: string,
    deletedBy: string,
    reason: string
): Promise<void> {
    const rqRef = doc(db, 'rqs', rqId);

    await updateDoc(rqRef, {
        status: 'cancelled',
        approvalStatus: 'rejected',
        deletion_approved: true,
        deletion_requested_by: deletedBy,
        deletion_requested_at: Timestamp.now(),
        updatedAt: Timestamp.now()
    });

    // TODO: Generar alerta al equipo de reclutamiento
}

/**
 * Iniciar reclutamiento
 */
export async function startRecruitment(rqId: string): Promise<void> {
    const rqRef = doc(db, 'rqs', rqId);

    await updateDoc(rqRef, {
        status: 'active',
        recruitment_started_at: Timestamp.now(),
        updatedAt: Timestamp.now()
    });
}

/**
 * Finalizar RQ
 */
export async function closeRQ(rqId: string): Promise<void> {
    const rqRef = doc(db, 'rqs', rqId);

    await updateDoc(rqRef, {
        status: 'closed',
        recruitment_ended_at: Timestamp.now(),
        alert_unfilled: false,
        updatedAt: Timestamp.now()
    });
}

/**
 * Obtener RQs por marca
 */
export async function getRQsByMarca(marcaId: string): Promise<RQ[]> {
    const rqsRef = collection(db, 'rqs');
    const q = query(
        rqsRef,
        where('marcaId', '==', marcaId)
        // orderBy('createdAt', 'desc') // Commented to avoid index requirement
    );

    const snapshot = await getDocs(q);
    const rqs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as RQ));

    // Sort manually by createdAt desc
    return rqs.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
    });
}

/**
 * Obtener RQs por tienda
 */
export async function getRQsByStore(tiendaId: string): Promise<RQ[]> {
    const rqsRef = collection(db, 'rqs');
    const q = query(
        rqsRef,
        where('tiendaId', '==', tiendaId),
        orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as RQ));
}

/**
 * Obtener RQs pendientes de aprobación para un usuario
 */
export async function getRQsPendingForUser(
    marcaId: string,
    userLevel: number,
    approvalStatus: 'pending' | 'approved' | 'rejected'
): Promise<RQ[]> {
    const rqsRef = collection(db, 'rqs');
    const q = query(
        rqsRef,
        where('marcaId', '==', marcaId),
        where('approvalStatus', '==', approvalStatus),
        where('currentApprovalLevel', '==', userLevel),
        orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as RQ));
}

/**
 * Suscribirse a RQs en tiempo real por marca
 */
export function subscribeToRQsByMarca(
    marcaId: string,
    callback: (rqs: RQ[]) => void
): () => void {
    const rqsRef = collection(db, 'rqs');
    const q = query(
        rqsRef,
        where('marcaId', '==', marcaId),
        orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
        const rqs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as RQ));
        callback(rqs);
    });
}

/**
 * Suscribirse a RQs de una tienda
 */
export function subscribeToRQsByStore(
    tiendaId: string,
    callback: (rqs: RQ[]) => void
): () => void {
    const rqsRef = collection(db, 'rqs');

    // TEMPORAL: Sin orderBy para evitar requerir índice
    const q = query(
        rqsRef,
        where('tiendaId', '==', tiendaId)
        // orderBy('createdAt', 'desc') // Comentado temporalmente
    );

    return onSnapshot(q, (snapshot) => {
        const rqs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as RQ));

        // Ordenar manualmente en el cliente
        rqs.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());

        callback(rqs);
    });
}

/**
 * Suscribirse a todos los RQs (Admin Holding)
 */
export function subscribeToAllRQs(
    tenantId: string,
    callback: (rqs: RQ[]) => void
): () => void {
    const rqsRef = collection(db, 'rqs');
    const q = query(
        rqsRef,
        where('tenantId', '==', tenantId),
        orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
        const rqs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as RQ));
        callback(rqs);
    });
}
