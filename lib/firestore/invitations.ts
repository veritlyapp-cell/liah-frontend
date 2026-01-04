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
    Timestamp
} from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

export interface Invitation {
    id: string;
    candidateEmail: string;

    // Contexto de invitación
    marcaId: string;
    marcaNombre: string;
    tiendaId: string;
    tiendaNombre: string;
    rqId?: string;  // Opcional: Si es para RQ específico
    rqNumber?: string;  // Opcional: Puede no existir en RQs antiguos
    posicion?: string;  // Nombre de la posición (ej: "Pizzero")
    modalidad?: 'Full Time' | 'Part Time';  // Modalidad de trabajo

    // Token único
    token: string;

    // Tracking
    sentBy: string;  // Recruiter/Gerencial ID
    sentByEmail: string;
    sentAt: any;
    expiresAt: any;  // 7 días desde envío

    // Estado
    status: 'sent' | 'opened' | 'completed' | 'expired';
    openedAt?: any;
    completedAt?: any;

    // Source (Para diferenciar RQ Only vs Bot)
    source: 'manual_recruiter' | 'bot_approval';  // Bot-ready!
    botConversationId?: string;  // Si vino del bot
}

/**
 * Crear invitación y generar link único
 */
export async function createInvitation(data: {
    candidateEmail: string;
    marcaId: string;
    marcaNombre: string;
    tiendaId: string;
    tiendaNombre: string;
    rqId?: string;
    rqNumber?: string;
    posicion?: string;
    modalidad?: 'Full Time' | 'Part Time';
    sentBy: string;
    sentByEmail: string;
    source?: 'manual_recruiter' | 'bot_approval';
    botConversationId?: string;
}): Promise<{ invitationId: string; token: string; link: string }> {
    const invitationsRef = collection(db, 'invitations');
    const now = Timestamp.now();

    // Generar token único
    const token = uuidv4();

    // Calcular expiración (48 horas)
    const expiresAt = Timestamp.fromDate(
        new Date(Date.now() + 48 * 60 * 60 * 1000)
    );


    const invitation: Omit<Invitation, 'id'> = {
        ...data,
        token,
        sentAt: now,
        expiresAt,
        status: 'sent',
        source: data.source || 'manual_recruiter'
    };

    // Remover campos undefined para evitar error de Firestore
    const cleanedInvitation = Object.fromEntries(
        Object.entries(invitation).filter(([_, v]) => v !== undefined)
    ) as any;

    const docRef = await addDoc(invitationsRef, cleanedInvitation);

    // Generar link (ajustar según tu dominio)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
    const link = `${baseUrl}/apply/${token}`;

    return {
        invitationId: docRef.id,
        token,
        link
    };
}

/**
 * Obtener invitación por token
 */
export async function getInvitationByToken(token: string): Promise<Invitation | null> {
    const invitationsRef = collection(db, 'invitations');
    const q = query(invitationsRef, where('token', '==', token));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        return null;
    }

    const invitation = {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data()
    } as Invitation;

    // Verificar si expiró
    if (invitation.status !== 'expired') {
        const now = new Date();
        const expiresAt = invitation.expiresAt.toDate();

        if (now > expiresAt) {
            // Marcar como expirada
            await updateDoc(snapshot.docs[0].ref, {
                status: 'expired'
            });
            invitation.status = 'expired';
        }
    }

    return invitation;
}

/**
 * Marcar invitación como abierta
 */
export async function markInvitationAsOpened(invitationId: string): Promise<void> {
    const invitationRef = doc(db, 'invitations', invitationId);
    const invitation = await getDoc(invitationRef);

    if (invitation.exists() && invitation.data().status === 'sent') {
        await updateDoc(invitationRef, {
            status: 'opened',
            openedAt: Timestamp.now()
        });
    }
}

/**
 * Marcar invitación como completada
 */
export async function markInvitationAsCompleted(invitationId: string, candidateId?: string): Promise<void> {
    const invitationRef = doc(db, 'invitations', invitationId);
    await updateDoc(invitationRef, {
        status: 'completed',
        candidateId: candidateId || null,
        completedAt: Timestamp.now()
    });
}

/**
 * Obtener invitaciones por recruiter
 */
export async function getInvitationsByRecruiter(recruiterId: string): Promise<Invitation[]> {
    const invitationsRef = collection(db, 'invitations');
    const q = query(invitationsRef, where('sentBy', '==', recruiterId));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as Invitation));
}

/**
 * Enviar invitación por email (placeholder - implementar con servicio real)
 */
export async function sendInvitationEmail(
    email: string,
    invitation: {
        link: string;
        marcaNombre: string;
        tiendaNombre: string;
        rqNumber?: string;
    }
): Promise<void> {
    // TODO: Implementar con servicio de email real (SendGrid, AWS SES, etc.)
    console.log(`
        Enviando email a: ${email}
        Link: ${invitation.link}
        Marca: ${invitation.marcaNombre}
        Tienda: ${invitation.tiendaNombre}
        ${invitation.rqNumber ? `RQ: ${invitation.rqNumber}` : ''}
    `);

    // Por ahora, solo log
    // En producción, usar servicio de email:
    /*
    await sendEmail({
        to: email,
        subject: `Invitación para postular a ${invitation.marcaNombre}`,
        html: `
            <h1>¡Hola!</h1>
            <p>Te invitamos a postular para ${invitation.tiendaNombre}</p>
            <a href="${invitation.link}">Completar Postulación</a>
        `
    });
    */
}
