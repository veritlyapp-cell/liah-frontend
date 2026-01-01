import type { Candidate } from '@/lib/firestore/candidates';

/**
 * Verificar si el CUL del candidato necesita actualización (>3 meses)
 */
export function needsCULUpdate(candidate: Candidate): boolean {
    if (!candidate.certificadoUnicoLaboral || !candidate.culUploadedAt) {
        return true;  // No tiene CUL
    }

    const uploadDate = candidate.culUploadedAt.toDate();
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    return uploadDate < threeMonthsAgo;
}

/**
 * Verificar si candidato está en lista negra
 */
export function isBlacklisted(candidate: Candidate): boolean {
    return candidate.blacklisted === true;
}

/**
 * Obtener resumen del historial del candidato
 */
export function getCandidateHistorySummary(candidate: Candidate) {
    const totalApplications = candidate.applications?.length || 0;
    const activeApplications = candidate.applications?.filter(
        a => a.status === 'invited' || a.status === 'completed'
    ).length || 0;

    const totalEmployments = candidate.employmentHistory?.length || 0;
    const currentEmployments = candidate.employmentHistory?.filter(
        e => !e.endDate
    ).length || 0;

    return {
        totalApplications,
        activeApplications,
        totalEmployments,
        currentEmployments,
        hasHistory: totalApplications > 0 || totalEmployments > 0
    };
}
