/**
 * Job Profile KQ (Killer Questions) Configuration
 * Manages configurable filtering questions per job profile
 */

import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';

export interface KillerQuestion {
    id: string;
    question: string;
    type: 'boolean' | 'select' | 'text';
    options?: string[];
    requiredAnswer?: string; // For boolean: 'yes' or 'no'. For select: the exact option
    isRequired: boolean;
}

export interface JobProfileKQ {
    profileId: string;
    questions: KillerQuestion[];
    updatedAt: Date;
    updatedBy: string;
}

// Default KQ suggestions for different position categories
export const DEFAULT_KQ_SUGGESTIONS: Record<string, KillerQuestion[]> = {
    operativo: [
        {
            id: 'carnet_sanidad',
            question: '¿Cuentas con carnet de sanidad vigente?',
            type: 'boolean',
            requiredAnswer: 'yes',
            isRequired: true
        },
        {
            id: 'disponibilidad_fds',
            question: '¿Tienes disponibilidad para trabajar fines de semana?',
            type: 'boolean',
            requiredAnswer: 'yes',
            isRequired: true
        },
        {
            id: 'experiencia',
            question: '¿Tienes experiencia en atención al cliente?',
            type: 'boolean',
            isRequired: false
        }
    ],
    gerencial: [
        {
            id: 'experiencia_liderazgo',
            question: '¿Tienes experiencia liderando equipos de trabajo?',
            type: 'boolean',
            requiredAnswer: 'yes',
            isRequired: true
        },
        {
            id: 'estudios',
            question: '¿Tienes estudios superiores en administración, negocios o afines?',
            type: 'boolean',
            isRequired: true
        },
        {
            id: 'disponibilidad_viajes',
            question: '¿Tienes disponibilidad para visitar múltiples tiendas?',
            type: 'boolean',
            requiredAnswer: 'yes',
            isRequired: true
        }
    ]
};

/**
 * Get KQ configuration for a job profile
 */
export async function getProfileKQs(profileId: string): Promise<KillerQuestion[]> {
    try {
        const profileDoc = await getDoc(doc(db, 'job_profiles', profileId));

        if (!profileDoc.exists()) {
            return [];
        }

        const data = profileDoc.data();
        return data.killerQuestions || [];

    } catch (error) {
        console.error('Error getting profile KQs:', error);
        return [];
    }
}

/**
 * Update KQ configuration for a job profile
 */
export async function updateProfileKQs(
    profileId: string,
    questions: KillerQuestion[],
    updatedBy: string
): Promise<boolean> {
    try {
        await updateDoc(doc(db, 'job_profiles', profileId), {
            killerQuestions: questions,
            kqUpdatedAt: Timestamp.now(),
            kqUpdatedBy: updatedBy
        });

        return true;

    } catch (error) {
        console.error('Error updating profile KQs:', error);
        return false;
    }
}

/**
 * Get suggested KQs based on position category
 */
export function getSuggestedKQs(categoria: 'operativo' | 'gerencial'): KillerQuestion[] {
    return DEFAULT_KQ_SUGGESTIONS[categoria] || DEFAULT_KQ_SUGGESTIONS.operativo;
}

/**
 * Validate KQ answers against requirements
 */
export function validateKQAnswers(
    questions: KillerQuestion[],
    answers: Record<string, string>
): { passed: boolean; failedQuestions: string[] } {
    const failedQuestions: string[] = [];

    for (const kq of questions) {
        const answer = answers[kq.id];

        // Check if required question was answered
        if (kq.isRequired && !answer) {
            failedQuestions.push(kq.id);
            continue;
        }

        // Check if answer matches required answer
        if (kq.requiredAnswer && answer !== kq.requiredAnswer) {
            failedQuestions.push(kq.id);
        }
    }

    return {
        passed: failedQuestions.length === 0,
        failedQuestions
    };
}
