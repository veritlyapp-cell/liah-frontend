import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import type { RQ } from '../firestore/rqs';
import type { Application } from '../firestore/candidates';

export interface DateRange {
    startDate?: Date;
    endDate?: Date;
}

export interface FunnelMetrics {
    rqsCreated: number;
    candidatesInvited: number;
    applicationsCompleted: number;
    smApproved: number;
    culAptos: number;
    hired: number;

    // Conversion rates (%)
    invitedToApplied: number;
    approvedToApto: number;
    aptoToHired: number;
    overallConversion: number;
}

export interface TimeMetrics {
    avgRQToFirstInvite: number; // days
    avgApprovalToApto: number; // days
    avgAptoToHired: number; // days
    avgRQToHired: number; // days
}

export interface RecruitmentMetrics {
    funnel: FunnelMetrics;
    time: TimeMetrics;
    period: {
        start: Date | null;
        end: Date;
    };
}

/**
 * Calculate recruitment metrics for a specific marca
 */
export async function calculateMarcaMetrics(
    marcaId: string,
    dateRange?: DateRange
): Promise<RecruitmentMetrics> {
    const endDate = dateRange?.endDate || new Date();
    const startDate = dateRange?.startDate || null;

    // Fetch RQs for this marca
    const rqsRef = collection(db, 'rqs');
    let rqQuery = query(rqsRef, where('marcaId', '==', marcaId));

    if (startDate) {
        rqQuery = query(
            rqQuery,
            where('createdAt', '>=', Timestamp.fromDate(startDate)),
            where('createdAt', '<=', Timestamp.fromDate(endDate))
        );
    }

    const rqsSnapshot = await getDocs(rqQuery);
    const rqs = rqsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RQ));

    // Fetch all applications for this marca
    const candidatesRef = collection(db, 'candidates');
    const candidatesSnapshot = await getDocs(candidatesRef);

    const allApplications: Application[] = [];
    candidatesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.applications && Array.isArray(data.applications)) {
            data.applications.forEach((app: Application) => {
                if (app.marcaId === marcaId) {
                    allApplications.push(app);
                }
            });
        }
    });

    // Filter applications by date if provided
    const applications = startDate
        ? allApplications.filter(app => {
            const appDate = app.appliedAt?.toDate?.();
            return appDate && appDate >= startDate && appDate <= endDate;
        })
        : allApplications;

    // Calculate funnel metrics
    const funnel: FunnelMetrics = {
        rqsCreated: rqs.length,
        candidatesInvited: 0, // Would need invitations collection
        applicationsCompleted: applications.length,
        smApproved: applications.filter(app => app.status === 'approved').length,
        culAptos: applications.filter(app => app.cul_resultado === 'apto').length,
        hired: applications.filter(app => app.hiringStatus === 'hired').length,

        invitedToApplied: 0,
        approvedToApto: 0,
        aptoToHired: 0,
        overallConversion: 0
    };

    // Calculate conversion rates
    if (funnel.smApproved > 0) {
        funnel.approvedToApto = (funnel.culAptos / funnel.smApproved) * 100;
    }
    if (funnel.culAptos > 0) {
        funnel.aptoToHired = (funnel.hired / funnel.culAptos) * 100;
    }
    if (funnel.rqsCreated > 0) {
        funnel.overallConversion = (funnel.hired / funnel.rqsCreated) * 100;
    }

    // Calculate time metrics
    const time: TimeMetrics = {
        avgRQToFirstInvite: 0,
        avgApprovalToApto: 0,
        avgAptoToHired: 0,
        avgRQToHired: 0
    };

    // Calculate avgAptoToHired
    const hiredApps = applications.filter(app =>
        app.hiringStatus === 'hired' &&
        app.cul_fecha &&
        app.hiredAt
    );

    if (hiredApps.length > 0) {
        const totalDays = hiredApps.reduce((sum, app) => {
            const aptoDate = app.cul_fecha?.toDate?.();
            const hiredDate = app.hiredAt?.toDate?.();
            if (aptoDate && hiredDate) {
                const diff = (hiredDate.getTime() - aptoDate.getTime()) / (1000 * 60 * 60 * 24);
                return sum + diff;
            }
            return sum;
        }, 0);
        time.avgAptoToHired = totalDays / hiredApps.length;
    }

    // Calculate avgRQToHired
    const hiredWithRQDate = applications.filter(app =>
        app.hiringStatus === 'hired' &&
        app.hiredAt
    );

    if (hiredWithRQDate.length > 0 && rqs.length > 0) {
        // Simplified: use average RQ creation time
        const avgRQDate = rqs.reduce((sum, rq) => {
            const date = rq.createdAt?.toDate?.();
            return sum + (date?.getTime() || 0);
        }, 0) / rqs.length;

        const totalDays = hiredWithRQDate.reduce((sum, app) => {
            const hiredDate = app.hiredAt?.toDate?.();
            if (hiredDate) {
                const diff = (hiredDate.getTime() - avgRQDate) / (1000 * 60 * 60 * 24);
                return sum + Math.max(0, diff);
            }
            return sum;
        }, 0);
        time.avgRQToHired = totalDays / hiredWithRQDate.length;
    }

    return {
        funnel,
        time,
        period: {
            start: startDate,
            end: endDate
        }
    };
}

/**
 * Calculate recruitment metrics for all marcas (Admin Holding)
 */
export async function calculateHoldingMetrics(
    dateRange?: DateRange
): Promise<Record<string, RecruitmentMetrics>> {
    // Get all unique marcas
    const rqsRef = collection(db, 'rqs');
    const snapshot = await getDocs(rqsRef);

    const uniqueMarcas = new Set<string>();
    snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.marcaId) {
            uniqueMarcas.add(data.marcaId);
        }
    });

    // Calculate metrics for each marca
    const results: Record<string, RecruitmentMetrics> = {};

    for (const marcaId of Array.from(uniqueMarcas)) {
        results[marcaId] = await calculateMarcaMetrics(marcaId, dateRange);
    }

    return results;
}
