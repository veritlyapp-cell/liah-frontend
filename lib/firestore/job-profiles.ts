import { db } from '@/lib/firebase';
import {
    collection,
    doc,
    addDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    Timestamp,
    onSnapshot,
    writeBatch
} from 'firebase/firestore';

export interface JobProfileRequisitos {
    edadMin: number;
    edadMax: number;
    experiencia: {
        requerida: boolean;
        meses: number;
    };
    disponibilidad: {
        horarios: string[];
        dias: string[];
    };
    distanciaMax: number; // km
    otros?: string; // requisitos adicionales
    killerQuestions?: KillerQuestion[];
}

export interface KillerQuestion {
    id: string;
    question: string;
    type: 'boolean' | 'multiple';
    options?: string[];
    correctAnswer: string; // "yes"/"no" or specific option
    isMandatory: boolean; // if false, it's just for scoring
}

export interface JobProfile {
    id: string;
    marcaId: string; // Primary marca (for backwards compatibility)
    marcaIds?: string[]; // Multiple marcas (new)
    marcaNombre: string;
    posicion: string;
    categoria: 'operativo' | 'gerencial'; // operativo = Store Manager can request, gerencial = Supervisor only
    modalidad: string; // "Part Time", "Full Time", etc.
    turno: string; // "Mañana", "Tarde", "Noche"
    requisitos: JobProfileRequisitos;
    salario: number;
    beneficios: string[];
    assignedStores: string[]; // IDs de tiendas asignadas
    descripcion?: string;
    createdAt: any;
    updatedAt: any;
}

export interface ExcelJobProfileRow {
    marca: string;
    posicion: string;
    modalidad: string;
    turno: string;
    edadMin: number;
    edadMax: number;
    experienciaRequerida: boolean;
    mesesExperiencia: number;
    salario: number;
    beneficios: string; // separado por comas
    tiendas: string; // IDs separados por comas
}

/**
 * Crear un perfil de posición individual
 */
export async function createJobProfile(data: Omit<JobProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const profilesRef = collection(db, 'job_profiles');
    const now = Timestamp.now();

    const profileData = {
        ...data,
        createdAt: now,
        updatedAt: now
    };

    const docRef = await addDoc(profilesRef, profileData);
    return docRef.id;
}

/**
 * Importar múltiples perfiles desde Excel
 */
export async function importJobProfilesFromExcel(
    rows: ExcelJobProfileRow[],
    holdingId: string
): Promise<{ success: number; errors: Array<{ row: number; error: string }> }> {
    const batch = writeBatch(db);
    const profilesRef = collection(db, 'job_profiles');
    const now = Timestamp.now();

    let success = 0;
    const errors: Array<{ row: number; error: string }> = [];

    rows.forEach((row, index) => {
        try {
            // Validar datos requeridos
            if (!row.marca || !row.posicion || !row.modalidad || !row.turno) {
                errors.push({
                    row: index + 1,
                    error: 'Faltan campos requeridos (marca, posición, modalidad, turno)'
                });
                return;
            }

            const beneficiosArray = row.beneficios
                ? row.beneficios.split(',').map(b => b.trim())
                : [];

            const tiendasArray = row.tiendas
                ? row.tiendas.split(',').map(t => t.trim())
                : [];

            const profileData: Omit<JobProfile, 'id'> = {
                marcaId: row.marca, // TODO: debería ser el ID real de la marca
                marcaNombre: row.marca,
                posicion: row.posicion,
                categoria: 'operativo', // Default to operativo, can be updated later
                modalidad: row.modalidad,
                turno: row.turno,
                requisitos: {
                    edadMin: row.edadMin || 18,
                    edadMax: row.edadMax || 65,
                    experiencia: {
                        requerida: row.experienciaRequerida || false,
                        meses: row.mesesExperiencia || 0
                    },
                    disponibilidad: {
                        horarios: [row.turno.toLowerCase()],
                        dias: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes']
                    },
                    distanciaMax: 10 // default
                },
                salario: row.salario || 0,
                beneficios: beneficiosArray,
                assignedStores: tiendasArray,
                createdAt: now,
                updatedAt: now
            };

            const newDocRef = doc(profilesRef);
            batch.set(newDocRef, profileData);
            success++;

        } catch (error: any) {
            errors.push({
                row: index + 1,
                error: error.message || 'Error desconocido'
            });
        }
    });

    // Commit batch
    if (success > 0) {
        await batch.commit();
    }

    return { success, errors };
}

/**
 * Obtener perfiles disponibles para una tienda
 */
export async function getJobProfilesByStore(storeId: string, marcaId: string): Promise<JobProfile[]> {
    const profilesRef = collection(db, 'job_profiles');
    const q = query(
        profilesRef,
        where('marcaId', '==', marcaId),
        where('assignedStores', 'array-contains', storeId),
        orderBy('posicion', 'asc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as JobProfile));
}

/**
 * Obtener todos los perfiles de una marca
 */
export async function getJobProfilesByMarca(marcaId: string): Promise<JobProfile[]> {
    const profilesRef = collection(db, 'job_profiles');
    const q = query(
        profilesRef,
        where('marcaId', '==', marcaId),
        orderBy('posicion', 'asc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as JobProfile));
}

/**
 * Actualizar un perfil de posición
 */
export async function updateJobProfile(
    profileId: string,
    updates: Partial<Omit<JobProfile, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
    const profileRef = doc(db, 'job_profiles', profileId);

    await updateDoc(profileRef, {
        ...updates,
        updatedAt: Timestamp.now()
    });
}

/**
 * Eliminar un perfil de posición
 */
export async function deleteJobProfile(profileId: string): Promise<void> {
    const profileRef = doc(db, 'job_profiles', profileId);
    await deleteDoc(profileRef);
}

/**
 * Suscribirse a perfiles en tiempo real
 * Busca tanto en marcaId (legacy) como en marcaIds (array para multi-marca)
 */
export function subscribeToJobProfiles(
    marcaId: string,
    callback: (profiles: JobProfile[]) => void,
    storeId?: string
): () => void {
    const profilesRef = collection(db, 'job_profiles');

    // Query 1: Match by exact marcaId (legacy single-brand)
    const q1 = query(
        profilesRef,
        where('marcaId', '==', marcaId)
    );

    // Query 2: Match by marcaIds array (multi-brand profiles)
    const q2 = query(
        profilesRef,
        where('marcaIds', 'array-contains', marcaId)
    );

    let profiles1: JobProfile[] = [];
    let profiles2: JobProfile[] = [];

    // Track active subscriptions
    const unsubscribes: (() => void)[] = [];

    const combineAndCallback = () => {
        // Combine and deduplicate by id
        const allProfiles = [...profiles1, ...profiles2];
        const uniqueProfiles = allProfiles.filter((profile, index, self) =>
            index === self.findIndex(p => p.id === profile.id)
        );

        // Filter by storeId if provided
        let filtered = uniqueProfiles;
        if (storeId) {
            filtered = uniqueProfiles.filter(p =>
                !p.assignedStores || p.assignedStores.length === 0 || p.assignedStores.includes(storeId)
            );
        }

        // Sort by position
        filtered.sort((a, b) => a.posicion.localeCompare(b.posicion));

        callback(filtered);
    };

    // Subscribe to query 1 (marcaId)
    unsubscribes.push(onSnapshot(q1, (snapshot) => {
        profiles1 = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as JobProfile));
        combineAndCallback();
    }));

    // Subscribe to query 2 (marcaIds array)
    unsubscribes.push(onSnapshot(q2, (snapshot) => {
        profiles2 = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as JobProfile));
        combineAndCallback();
    }));

    // Return unsubscribe function for all queries
    return () => {
        unsubscribes.forEach(unsub => unsub());
    };
}
