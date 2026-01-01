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
    Timestamp,
    onSnapshot
} from 'firebase/firestore';

export interface ApprovalLevel {
    level: number; // 1-5
    name: string; // "Supervisor de Tienda", "Jefe de Marca", etc.
    approvers: string[]; // roles permitidos: ["supervisor_tienda", "jefe_marca"]
    isMultipleChoice: boolean; // true = cualquiera puede aprobar, false = único
}

export interface ApprovalConfig {
    id: string;
    holdingId: string;
    marcaId?: string; // opcional, si es específico de marca
    levels: ApprovalLevel[];
    createdAt: any;
    updatedAt: any;
}

/**
 * Crear configuración de aprobación
 */
export async function createApprovalConfig(
    holdingId: string,
    levels: ApprovalLevel[],
    marcaId?: string
): Promise<string> {
    const configRef = collection(db, 'approval_config');
    const now = Timestamp.now();

    const configData = {
        holdingId,
        marcaId: marcaId || null,
        levels: levels.sort((a, b) => a.level - b.level), // ordenar por nivel
        createdAt: now,
        updatedAt: now
    };

    const docRef = await addDoc(configRef, configData);
    return docRef.id;
}

/**
 * Obtener configuración de aprobación activa
 * Busca primero por marca específica, si no encuentra usa la del holding
 */
export async function getApprovalConfig(
    holdingId: string,
    marcaId?: string
): Promise<ApprovalConfig | null> {
    const configRef = collection(db, 'approval_config');

    // Primero intentar obtener config específica de marca
    if (marcaId) {
        const marcaQuery = query(
            configRef,
            where('holdingId', '==', holdingId),
            where('marcaId', '==', marcaId)
        );
        const marcaSnapshot = await getDocs(marcaQuery);

        if (!marcaSnapshot.empty) {
            const doc = marcaSnapshot.docs[0];
            return { id: doc.id, ...doc.data() } as ApprovalConfig;
        }
    }

    // Si no hay config de marca, obtener config general del holding
    const holdingQuery = query(
        configRef,
        where('holdingId', '==', holdingId),
        where('marcaId', '==', null)
    );
    const holdingSnapshot = await getDocs(holdingQuery);

    if (!holdingSnapshot.empty) {
        const doc = holdingSnapshot.docs[0];
        return { id: doc.id, ...doc.data() } as ApprovalConfig;
    }

    return null;
}

/**
 * Actualizar un nivel específico de aprobación
 */
export async function updateApprovalLevel(
    configId: string,
    level: number,
    updates: Partial<ApprovalLevel>
): Promise<void> {
    const configRef = doc(db, 'approval_config', configId);
    const configSnap = await getDoc(configRef);

    if (!configSnap.exists()) {
        throw new Error('Configuración de aprobación no encontrada');
    }

    const config = configSnap.data() as ApprovalConfig;
    const levelIndex = config.levels.findIndex(l => l.level === level);

    if (levelIndex === -1) {
        throw new Error(`Nivel ${level} no encontrado en la configuración`);
    }

    // Actualizar el nivel
    config.levels[levelIndex] = {
        ...config.levels[levelIndex],
        ...updates
    };

    await updateDoc(configRef, {
        levels: config.levels,
        updatedAt: Timestamp.now()
    });
}

/**
 * Validar si un usuario puede aprobar en un nivel específico
 */
export async function validateApprover(
    holdingId: string,
    level: number,
    userRole: string,
    marcaId?: string
): Promise<boolean> {
    const config = await getApprovalConfig(holdingId, marcaId);

    if (!config) {
        return false;
    }

    const approvalLevel = config.levels.find(l => l.level === level);

    if (!approvalLevel) {
        return false;
    }

    return approvalLevel.approvers.includes(userRole);
}

/**
 * Obtener el siguiente nivel de aprobación
 */
export async function getNextApprovalLevel(
    holdingId: string,
    currentLevel: number,
    marcaId?: string
): Promise<number | null> {
    const config = await getApprovalConfig(holdingId, marcaId);

    if (!config) {
        return null;
    }

    const nextLevel = config.levels.find(l => l.level > currentLevel);
    return nextLevel ? nextLevel.level : null;
}

/**
 * Suscribirse a cambios en la configuración de aprobación
 */
export function subscribeToApprovalConfig(
    holdingId: string,
    callback: (config: ApprovalConfig | null) => void,
    marcaId?: string
): () => void {
    const configRef = collection(db, 'approval_config');

    const q = marcaId
        ? query(configRef, where('holdingId', '==', holdingId), where('marcaId', '==', marcaId))
        : query(configRef, where('holdingId', '==', holdingId), where('marcaId', '==', null));

    return onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
            callback(null);
        } else {
            const doc = snapshot.docs[0];
            callback({ id: doc.id, ...doc.data() } as ApprovalConfig);
        }
    });
}
