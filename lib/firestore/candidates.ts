import { db } from '@/lib/firebase';
import {
    collection,
    doc,
    setDoc,
    addDoc,
    getDoc,
    getDocs,
    updateDoc,
    query,
    where,
    orderBy,
    Timestamp,
    onSnapshot
} from 'firebase/firestore';

export interface Application {
    id: string;
    marcaId: string;
    marcaNombre: string;
    tiendaId: string;
    tiendaNombre: string;
    rqId?: string;
    rqNumber?: string;
    posicion?: string;  // Nombre de la posición (ej: "Pizzero")
    modalidad?: 'Full Time' | 'Part Time';  // Modalidad de trabajo
    turno?: string;  // Turno de trabajo (ej: "Mañana", "Tarde", "Noche")
    appliedAt: any;
    status: 'invited' | 'completed' | 'approved' | 'rejected' | 'interview_scheduled';
    invitedBy?: string;
    invitationId?: string;
    origenConvocatoria?: string; // [NEW] Origen de la postulación
    // Approval tracking
    approvedBy?: string;
    approvedAt?: any;
    priority?: 'principal' | 'backup';  // Prioridad del candidato para el puesto
    rejectedBy?: string;
    rejectedAt?: any;
    rejectionReason?: string;
    // Hiring tracking (MVP)
    hiredStatus?: 'hired' | 'not_hired' | 'withdrawn';
    hiredAt?: any;
    hiredBy?: string;
    notHiredReason?: string;
    startDate?: any;  // Fecha efectiva de ingreso
}

export interface Employment {
    id: string;
    marcaId: string;
    marcaNombre: string;
    tiendaId: string;
    tiendaNombre: string;
    startDate: any;
    endDate?: any;
    exitReason?: string;  // 'desertion', 'fired', 'voluntary'
    wouldRehire: boolean;  // Para lista negra
}

export interface CandidateAssignment {
    rqId: string;
    rqNumber: string;
    marcaId: string;
    marcaNombre: string;
    tiendaId: string;
    tiendaNombre: string;
    assignedAt: any;
    assignedBy: string;
    status: 'assigned' | 'confirmed' | 'no_show' | 'released';
}

export interface Candidate {
    id: string;
    candidateCode: string;  // "CAND-00001"

    // Datos personales
    dni: string;
    nombre: string;
    apellidoPaterno: string;
    apellidoMaterno: string;
    email: string;
    telefono: string;
    fechaNacimiento?: string;  // DD/MM/YYYY format
    edad?: number;             // Calculated from fechaNacimiento

    // Ubicación geográfica
    departamento: string;
    provincia: string;
    distrito: string;
    direccion: string;

    // Documentos
    dniImage?: string;  // URL Firebase Storage
    certificadoUnicoLaboral?: string;  // URL PDF
    documents?: Record<string, string>; // Otros documentos configurables por holding

    // Validación CUL (con vencimiento)
    culStatus: 'pending' | 'apto' | 'no_apto' | 'expired' | 'manual_review';
    culUploadedAt?: any;
    culExpiresAt?: any;  // +6 meses desde upload
    culCheckedBy?: string;
    culNotes?: string;

    // Origen general del candidato (si aplica)
    origenConvocatoria?: string;

    // Sistema de login (opcional para candidatos recurrentes)
    hasAccount: boolean;
    passwordHash?: string;
    lastLogin?: any;

    // Lista negra
    blacklisted: boolean;
    blacklistReason?: string;
    blacklistedAt?: any;
    blacklistedBy?: string;

    // Entrevista (Bot)
    entrevista?: {
        tiendaId: string;
        vacanteId: string;
        fechaHora: any;
        direccion: string;
        estado: string;
        confirmada: boolean;
        calendarLink?: string;
    };

    // Source tracking (para diferenciar RQ Only vs Bot)
    source: 'manual_form' | 'bot_whatsapp' | 'email_invitation';
    botConversationId?: string;

    // Tracking completo
    assignments: CandidateAssignment[];  // Asignaciones a RQs
    applications: Application[];  // Historial de postulaciones
    employmentHistory: Employment[];  // Historial laboral

    // Metadata
    createdAt: any;
    updatedAt: any;
}

/**
 * Generar código único de candidato
 * Formato: CAND-[NNNNN]
 */
async function generateCandidateCode(): Promise<string> {
    const candidatesRef = collection(db, 'candidates');
    const prefix = 'CAND-';

    // Obtener todos los candidatos y encontrar el número más alto
    const q = query(candidatesRef);
    const snapshot = await getDocs(q);

    let maxNumber = 0;
    snapshot.forEach(doc => {
        const code = doc.data().candidateCode as string;
        if (code && code.startsWith(prefix)) {
            const numberPart = parseInt(code.split('-')[1] || '0');
            if (numberPart > maxNumber) {
                maxNumber = numberPart;
            }
        }
    });

    const nextNumber = (maxNumber + 1).toString().padStart(5, '0');
    return `${prefix}${nextNumber} `;
}

/**
 * Validar DNI y detectar duplicados
 */
export async function validateDNI(dni: string, marcaId?: string): Promise<{
    valid: boolean;
    warning: string | null;
    existingCandidate?: Candidate;
}> {
    // Buscar candidato con mismo DNI
    const candidatesRef = collection(db, 'candidates');
    const q = query(candidatesRef, where('dni', '==', dni));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        return { valid: true, warning: null };
    }

    const existing = {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data()
    } as Candidate;

    // Verificar si tiene asignación activa
    const activeAssignment = existing.assignments?.find(
        a => a.status === 'assigned' || a.status === 'confirmed'
    );

    if (activeAssignment) {
        if (marcaId && activeAssignment.marcaId === marcaId) {
            return {
                valid: false,
                warning: `BLOQUEADO: Este candidato ya está asignado a ${activeAssignment.rqNumber} en ${activeAssignment.tiendaNombre} `,
                existingCandidate: existing
            };
        } else {
            return {
                valid: true,
                warning: `⚠️ AVISO: Este candidato aparece en ${activeAssignment.marcaNombre}. ¿Continuar ? `,
                existingCandidate: existing
            };
        }
    }

    // Tiene historial pero sin asignación activa
    if (existing.assignments && existing.assignments.length > 0) {
        const lastAssignment = existing.assignments[existing.assignments.length - 1];
        return {
            valid: true,
            warning: `ℹ️ INFO: Candidato previamente registrado en ${lastAssignment.marcaNombre} `,
            existingCandidate: existing
        };
    }

    return {
        valid: true,
        warning: 'ℹ️ INFO: Candidato ya registrado anteriormente',
        existingCandidate: existing
    };
}

/**
 * Crear nuevo candidato
 */
export async function createCandidate(data: {
    dni: string;
    nombre: string;
    apellidoPaterno: string;
    apellidoMaterno: string;
    email: string;
    telefono: string;
    departamento: string;
    provincia: string;
    distrito: string;
    direccion: string;
    certificadoUnicoLaboral?: string;
    documents?: Record<string, string>;
}): Promise<string> {
    const candidatesRef = collection(db, 'candidates');
    const now = Timestamp.now();

    // Generar código único
    const candidateCode = await generateCandidateCode();

    const {
        dni,
        nombre,
        apellidoPaterno,
        apellidoMaterno,
        email,
        telefono,
        departamento,
        provincia,
        distrito,
        direccion,
        certificadoUnicoLaboral,
        documents
    } = data;

    const candidateData: Partial<Candidate> = {
        nombre,
        apellidoPaterno,
        apellidoMaterno,
        dni,
        email,
        telefono,
        departamento,
        provincia,
        distrito,
        direccion,
        candidateCode,
        documents,
        source: 'email_invitation', // Nuevo flujo con invitaciones
        culStatus: 'pending', // Requiere revisión manual
        hasAccount: false, // Sin login inicialmente
        blacklisted: false, // No está en lista negra
        assignments: [],
        applications: [],
        employmentHistory: [],
        createdAt: now,
        updatedAt: now
    };

    // Solo agregar campos CUL si el certificado existe
    if (certificadoUnicoLaboral) {
        candidateData.certificadoUnicoLaboral = certificadoUnicoLaboral;
        candidateData.culUploadedAt = now;
        candidateData.culExpiresAt = Timestamp.fromDate(
            new Date(now.toMillis() + 3 * 30 * 24 * 60 * 60 * 1000)
        ); // +3 meses
    }

    // Limpiar campos undefined antes de guardar
    const cleanedData = Object.fromEntries(
        Object.entries(candidateData).filter(([_, v]) => v !== undefined)
    );

    const docRef = doc(candidatesRef); // Create a new document reference with an auto-generated ID
    await setDoc(docRef, cleanedData); // Use setDoc with the new reference
    return docRef.id;
}

/**
 * Obtener candidato por ID
 */
export async function getCandidate(candidateId: string): Promise<Candidate | null> {
    const candidateRef = doc(db, 'candidates', candidateId);
    const snapshot = await getDoc(candidateRef);

    if (!snapshot.exists()) {
        return null;
    }

    return {
        id: snapshot.id,
        ...snapshot.data()
    } as Candidate;
}

/**
 * Obtener candidato por DNI
 */
export async function getCandidateByDNI(dni: string): Promise<Candidate | null> {
    const candidatesRef = collection(db, 'candidates');
    const q = query(candidatesRef, where('dni', '==', dni));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        return null;
    }

    return {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data()
    } as Candidate;
}

/**
 * Obtener candidato por Email
 */
export async function getCandidateByEmail(email: string): Promise<Candidate | null> {
    const candidatesRef = collection(db, 'candidates');
    const q = query(candidatesRef, where('email', '==', email));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        return null;
    }

    return {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data()
    } as Candidate;
}

/**
 * Buscar candidatos (para recruiter)
 */
export async function searchCandidates(searchTerm: string): Promise<Candidate[]> {
    const candidatesRef = collection(db, 'candidates');

    // Por simplicidad, obtener todos y filtrar en cliente
    // En producción, usar Algolia o similar para búsqueda
    const snapshot = await getDocs(candidatesRef);

    const candidates = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as Candidate));

    if (!searchTerm) {
        return candidates;
    }

    const term = searchTerm.toLowerCase();
    return candidates.filter(c =>
        c.candidateCode.toLowerCase().includes(term) ||
        c.dni.includes(term) ||
        c.nombre.toLowerCase().includes(term) ||
        c.apellidoPaterno.toLowerCase().includes(term) ||
        c.apellidoMaterno.toLowerCase().includes(term) ||
        c.email.toLowerCase().includes(term)
    );
}

/**
 * Actualizar asignación de candidato
 */
export async function updateCandidateAssignment(
    candidateId: string,
    rqId: string,
    updates: Partial<CandidateAssignment>
): Promise<void> {
    const candidate = await getCandidate(candidateId);
    if (!candidate) {
        throw new Error('Candidato no encontrado');
    }

    const updatedAssignments = candidate.assignments.map(a =>
        a.rqId === rqId ? { ...a, ...updates } : a
    );

    const candidateRef = doc(db, 'candidates', candidateId);
    await updateDoc(candidateRef, {
        assignments: updatedAssignments,
        updatedAt: Timestamp.now()
    });
}
