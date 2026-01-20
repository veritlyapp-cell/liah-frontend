/**
 * Notification Service for LIAH Talent
 * Handles sending notifications via different channels
 */

import { db } from '@/lib/firebase';
import { addDoc, collection, Timestamp } from 'firebase/firestore';

export interface Notification {
    id?: string;
    type: 'stage_change' | 'interview_scheduled' | 'rq_approved' | 'rq_rejected' | 'new_application' | 'reminder';
    title: string;
    message: string;
    recipientEmail: string;
    recipientName?: string;
    read: boolean;
    createdAt: any;
    data?: {
        jobId?: string;
        jobTitle?: string;
        candidateId?: string;
        candidateName?: string;
        rqId?: string;
        interviewDate?: string;
        link?: string;
    };
}

/**
 * Save notification to Firestore
 */
export async function createNotification(
    holdingId: string,
    notification: Omit<Notification, 'id' | 'read' | 'createdAt'>
): Promise<string> {
    try {
        const docRef = await addDoc(collection(db, 'notifications'), {
            ...notification,
            holdingId,
            read: false,
            createdAt: Timestamp.now()
        });
        return docRef.id;
    } catch (error) {
        console.error('Error creating notification:', error);
        throw error;
    }
}

/**
 * Notify when candidate moves to a new stage
 */
export async function notifyStageChange(
    holdingId: string,
    recruiterEmail: string,
    candidateName: string,
    jobTitle: string,
    newStageName: string,
    jobId: string,
    candidateId: string
) {
    return createNotification(holdingId, {
        type: 'stage_change',
        title: `Candidato movido a ${newStageName}`,
        message: `${candidateName} ha sido movido a la etapa "${newStageName}" en ${jobTitle}`,
        recipientEmail: recruiterEmail,
        data: {
            jobId,
            jobTitle,
            candidateId,
            candidateName,
            link: `/talent?tab=pipeline&job=${jobId}`
        }
    });
}

/**
 * Notify when interview is scheduled
 */
export async function notifyInterviewScheduled(
    holdingId: string,
    candidateEmail: string,
    candidateName: string,
    jobTitle: string,
    interviewDate: Date,
    interviewer: string,
    meetingLink?: string
) {
    const formattedDate = interviewDate.toLocaleDateString('es-PE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    return createNotification(holdingId, {
        type: 'interview_scheduled',
        title: '📅 Entrevista Programada',
        message: `Tu entrevista para ${jobTitle} ha sido programada para el ${formattedDate} con ${interviewer}`,
        recipientEmail: candidateEmail,
        recipientName: candidateName,
        data: {
            jobTitle,
            interviewDate: interviewDate.toISOString(),
            link: meetingLink
        }
    });
}

/**
 * Notify when new application is received
 */
export async function notifyNewApplication(
    holdingId: string,
    recruiterEmail: string,
    candidateName: string,
    jobTitle: string,
    jobId: string,
    matchScore?: number
) {
    const scoreText = matchScore ? ` con ${matchScore}% de match` : '';

    return createNotification(holdingId, {
        type: 'new_application',
        title: '📩 Nueva Postulación',
        message: `${candidateName} se ha postulado a ${jobTitle}${scoreText}`,
        recipientEmail: recruiterEmail,
        data: {
            jobId,
            jobTitle,
            candidateName,
            link: `/talent?tab=pipeline&job=${jobId}`
        }
    });
}

/**
 * Notify when RQ is approved
 */
export async function notifyRQApproved(
    holdingId: string,
    recruiterEmail: string,
    rqNumber: string,
    puestoName: string,
    rqId: string
) {
    return createNotification(holdingId, {
        type: 'rq_approved',
        title: '✅ Requerimiento Aprobado',
        message: `El RQ #${rqNumber} para ${puestoName} ha sido aprobado. Ya puedes publicar la vacante.`,
        recipientEmail: recruiterEmail,
        data: {
            rqId,
            link: `/talent?tab=rqs`
        }
    });
}

/**
 * Notify when RQ is rejected
 */
export async function notifyRQRejected(
    holdingId: string,
    creatorEmail: string,
    rqNumber: string,
    puestoName: string,
    reason: string,
    rqId: string
) {
    return createNotification(holdingId, {
        type: 'rq_rejected',
        title: '❌ Requerimiento Rechazado',
        message: `El RQ #${rqNumber} para ${puestoName} ha sido rechazado. Motivo: ${reason}`,
        recipientEmail: creatorEmail,
        data: {
            rqId,
            link: `/talent?tab=rqs`
        }
    });
}

/**
 * Triggeer email notification via API
 */
export async function sendNotificationEmail(params: {
    type: 'rq_pending_approval' | 'rq_approved' | 'rq_assigned' | 'rq_rejected';
    recipientEmail: string;
    recipientName?: string;
    data: any;
}) {
    try {
        const response = await fetch('/api/talent/send-notification-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
        });
        return await response.json();
    } catch (error) {
        console.error('Error triggering email notification:', error);
        return { error };
    }
}
