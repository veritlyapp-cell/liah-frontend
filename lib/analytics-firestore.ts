// Firestore Analytics Queries
// Real data queries for the analytics dashboard

import { db } from '@/lib/firebase';
import {
    collection,
    query,
    where,
    getDocs,
    orderBy,
    Timestamp,
    DocumentData
} from 'firebase/firestore';
import {
    AnalyticsDashboardData,
    VolumeMetrics,
    EfficiencyMetrics,
    FunnelStage,
    DropoffMetric,
    SourceMetric,
    DemographicMetrics,
    PerformanceRanking,
    RejectionCategory,
    CandidateSource
} from '@/types/analytics';

interface DateRange {
    start: Date;
    end: Date;
}

interface AnalyticsFilters {
    dateRange: DateRange;
    brandIds?: string[];
    positionIds?: string[];
    storeIds?: string[];
    districtIds?: string[];
    zoneId?: string;
    holdingId?: string;
    category?: 'operativo' | 'gerencial' | 'all';
}

// Get RQs from Firestore with filters
export async function getRQsForAnalytics(filters: AnalyticsFilters) {
    try {
        console.log('🔍 FETCHING RQs with filters:', {
            holdingId: filters.holdingId,
            dateRange: filters.dateRange ? {
                start: filters.dateRange.start.toISOString(),
                end: filters.dateRange.end.toISOString()
            } : 'none',
            brandIds: filters.brandIds
        });

        const rqsRef = collection(db, 'rqs');

        // FIRST: Get ALL RQs without date filter to see what's in the DB
        const allSnapshot = await getDocs(query(rqsRef));
        console.log(`📊 TOTAL RQs in database: ${allSnapshot.size}`);

        // Show first 3 RQs for inspection
        let inspected = 0;
        allSnapshot.forEach(doc => {
            if (inspected < 3) {
                const data = doc.data();
                console.log(`📝 Sample RQ #${inspected + 1}:`, {
                    id: doc.id,
                    tenantId: data.tenantId,
                    holdingId: data.holdingId,
                    marcaId: data.marcaId,
                    createdAt: data.createdAt?.toDate?.() || data.createdAt
                });
                inspected++;
            }
        });

        // NOW apply date filter
        let q = query(rqsRef);
        if (filters.dateRange) {
            const start = Timestamp.fromDate(filters.dateRange.start);
            const end = Timestamp.fromDate(filters.dateRange.end);
            q = query(q,
                where('createdAt', '>=', start),
                where('createdAt', '<=', end)
            );
        }

        const snapshot = await getDocs(q);
        console.log(`📅 After date filter: ${snapshot.size} RQs`);

        const rqs: DocumentData[] = [];
        let tenantFiltered = 0;
        let brandFiltered = 0;

        snapshot.forEach(doc => {
            const data = doc.data();

            // SECURITY: Flexible tenant matching (handles 'ngr' vs 'ngr_holding')
            if (filters.holdingId) {
                const rqTenant = data.tenantId || data.holdingId || '';
                const filterTenant = filters.holdingId;

                // Exact match OR one contains the other
                const tenantMatch =
                    rqTenant === filterTenant ||
                    rqTenant.includes(filterTenant) ||
                    filterTenant.includes(rqTenant);

                if (!tenantMatch) {
                    tenantFiltered++;
                    return;
                }
            }

            // Apply brand filter
            if (filters.brandIds?.length && !filters.brandIds.includes(data.marcaId)) {
                brandFiltered++;
                return;
            }

            // Apply position filter
            if (filters.positionIds?.length && !filters.positionIds.includes(data.posicionId) && !filters.positionIds.includes(data.posicion)) {
                return;
            }

            // Apply store filter
            if (filters.storeIds?.length && !filters.storeIds.includes(data.tiendaId)) {
                return;
            }

            // Apply district/zone filter
            const targetDistricts = filters.districtIds?.length ? filters.districtIds : [];

            // Note: Zone-based district resolution should happen before calling this
            // or we check it here if districtIds is empty but zoneId is present
            if (targetDistricts.length && !targetDistricts.includes(data.distrito)) {
                return;
            }

            // NEW: Apply category filter
            if (filters.category && filters.category !== 'all') {
                if (filters.category === 'operativo' && data.categoria === 'gerencial') return;
                if (filters.category === 'gerencial' && data.categoria !== 'gerencial') return;
            }

            rqs.push({ id: doc.id, ...data });
        });

        console.log(`✅ FINAL: ${rqs.length} RQs | Filtered: tenant=${tenantFiltered}, brand=${brandFiltered}`);
        return rqs;
    } catch (error) {
        console.error('❌ Error fetching RQs:', error);
        return [];
    }
}

// Get candidates (applications) from Firestore with filters
export async function getCandidatesForAnalytics(filters: AnalyticsFilters) {
    try {
        const candidatesRef = collection(db, 'talent_applications');
        let q = query(candidatesRef);
        // Filter by date range
        if (filters.dateRange) {
            const start = Timestamp.fromDate(filters.dateRange.start);
            const end = Timestamp.fromDate(filters.dateRange.end);
            q = query(q,
                where('createdAt', '>=', start),
                where('createdAt', '<=', end)
            );
        }

        const snapshot = await getDocs(q);
        const candidates: DocumentData[] = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            // Apply brand filter
            if (filters.brandIds?.length) {
                if (!filters.brandIds.includes(data.marcaId || data.holdingId)) return;
            }

            // Apply category filter
            if (filters.category && filters.category !== 'all') {
                if (data.categoria !== filters.category) return;
            }

            // Apply position filter
            if (filters.positionIds?.length) {
                if (!filters.positionIds.includes(data.jobId) && !filters.positionIds.includes(data.posicion)) return;
            }

            // Apply store filter
            if (filters.storeIds?.length) {
                if (!filters.storeIds.includes(data.tiendaId)) return;
            }

            // Apply district filter
            if (filters.districtIds?.length) {
                if (!filters.districtIds.includes(data.distrito)) return;
            }

            candidates.push({ id: doc.id, ...data });
        });

        console.log(`Fetched ${candidates.length} applications from talent_applications for brands:`, filters.brandIds);
        return candidates;
    } catch (error) {
        console.error('Error fetching candidates for analytics:', error);
        return [];
    }
}

/**
 * Fetch real filter options from Firestore based on tenant
 */
export async function getAnalyticsFilterOptions(holdingId: string) {
    try {
        console.log('Fetching filter options for holding:', holdingId);

        // Fetch Marcas
        const marcasRef = collection(db, 'marcas');
        const marcasQ = query(marcasRef, where('holdingId', '==', holdingId));
        const marcasSnapshot = await getDocs(marcasQ);
        const brands = marcasSnapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().nombre
        }));

        // Fetch Tiendas
        const tiendasRef = collection(db, 'tiendas');
        const tiendasQ = query(tiendasRef, where('holdingId', '==', holdingId));
        const tiendasSnapshot = await getDocs(tiendasQ);
        const stores = tiendasSnapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().nombre,
            brandId: doc.data().marcaId
        }));

        // Extract Districts from stores
        const districtsSet = new Set<string>();
        tiendasSnapshot.forEach(doc => {
            const distrito = doc.data().distrito;
            if (distrito) districtsSet.add(distrito);
        });
        const districts = Array.from(districtsSet).map((name, index) => ({
            id: `dist-${index}`,
            name
        }));

        // Fetch Positions (from Job Profiles)
        const profilesRef = collection(db, 'jobProfiles');
        const profilesQ = query(profilesRef, where('holdingId', '==', holdingId));
        const profilesSnapshot = await getDocs(profilesQ);

        // Use a Set to get unique positions by name
        const uniquePositions = new Map<string, { id: string, name: string }>();
        profilesSnapshot.forEach(doc => {
            const data = doc.data();
            const name = data.posicion || data.nombre;
            if (name && !uniquePositions.has(name)) {
                uniquePositions.set(name, { id: doc.id, name });
            }
        });
        const positions = Array.from(uniquePositions.values());

        console.log('Filter options loaded:', {
            brands: brands.length,
            stores: stores.length,
            positions: positions.length
        });

        return {
            brands,
            stores,
            districts,
            positions
        };
    } catch (error) {
        console.error('Error fetching filter options:', error);
        return null;
    }
}

// Calculate Volume Metrics from real data
export function calculateVolumeMetrics(rqs: DocumentData[]): VolumeMetrics {
    // Debug: Show what status values we actually have
    const statusCounts: Record<string, number> = {};
    const estadoCounts: Record<string, number> = {};

    rqs.forEach(rq => {
        const status = rq.status || 'undefined';
        const estado = rq.estado || 'undefined';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
        estadoCounts[estado] = (estadoCounts[estado] || 0) + 1;
    });

    console.log('📋 RQ Status Values:', statusCounts);
    console.log('📋 RQ Estado Values:', estadoCounts);


    // RQ Counting Rules:
    // - Only 'active' and 'filled' count toward totals
    // - 'cancelled' are excluded from all calculations (tracked separately)
    const activeRQs = rqs.filter(r => r.status === 'active').length;
    const filledRQs = rqs.filter(r => r.status === 'filled').length;
    const cancelledRQs = rqs.filter(r => r.status === 'cancelled').length;

    const totalRQs = activeRQs + filledRQs; // Exclude cancelled
    const openRQs = activeRQs; // Only active RQs are "open"

    console.log(`📊 RQ Counts: Total=${totalRQs} (Active=${activeRQs} + Filled=${filledRQs}), Cancelled=${cancelledRQs} (excluded)`);

    return {
        totalRQs,
        openRQs,
        filledRQs,
        cancelledRQs,
        totalPositionsRequested: rqs.filter(r => r.status !== 'cancelled').reduce((sum, r) => sum + (r.vacantes || 1), 0),
        totalPositionsFilled: rqs.filter(r => r.status === 'filled').reduce((sum, r) => sum + (r.filledCount || 0), 0)
    };
}

// Calculate Efficiency Metrics from real data
export function calculateEfficiencyMetrics(
    candidates: DocumentData[],
    rqs: DocumentData[]
): EfficiencyMetrics {
    // Adapted for talent_applications structure
    const approved = candidates.filter(c =>
        c.culStatus === 'apto' ||
        c.status === 'approved' ||
        c.funnelStage === 'approved'
    ).length;

    const hired = candidates.filter(c =>
        c.hiredStatus === 'hired' ||
        c.status === 'hired' ||
        c.funnelStage === 'hired'
    ).length;

    // Only count positions from active and filled RQs (exclude cancelled)
    const totalPositions = rqs
        .filter(r => r.status !== 'cancelled')
        .reduce((sum, r) => sum + (r.vacantes || 1), 0);

    console.log(`📊 Efficiency Metrics: approved=${approved}, hired=${hired}, totalPositions=${totalPositions} (cancelled excluded)`);

    // Calculate average time to fill
    const filledRqs = rqs.filter(r => r.filledAt && r.createdAt);
    let avgTimeToFill = 0;
    if (filledRqs.length > 0) {
        const totalDays = filledRqs.reduce((sum, r) => {
            const created = r.createdAt?.toDate?.() || new Date(r.createdAt);
            const filled = r.filledAt?.toDate?.() || new Date(r.filledAt);
            return sum + Math.ceil((filled.getTime() - created.getTime()) / (24 * 60 * 60 * 1000));
        }, 0);
        avgTimeToFill = totalDays / filledRqs.length;
    }

    return {
        tasaAptos: totalPositions > 0 ? (approved / totalPositions) * 100 : 0,
        tasaIngresos: totalPositions > 0 ? (hired / totalPositions) * 100 : 0,
        avgTimeToFill,
        avgTimeToScreen: 4, // Could be calculated from conversation timestamps
        avgTimeToInterview: 3
    };
}

// Calculate Funnel from real candidates
export function calculateFunnel(candidates: DocumentData[]): FunnelStage[] {
    const total = candidates.length;

    // Screened = passed bot screening (has completed conversation or applications)
    const screened = candidates.filter(c =>
        c.screeningCompleted ||
        c.culStatus ||
        c.botStatus === 'completed'
    ).length;

    // Interviewed = had interview scheduled/completed
    const interviewed = candidates.filter(c =>
        c.interviewDate ||
        c.status === 'interviewed' ||
        c.funnelStage === 'interviewed' ||
        ['approved', 'selected', 'hired'].includes(c.funnelStage)
    ).length;

    // Approved = marked as apt (Pre-selection by Recruiter)
    const approved = candidates.filter(c =>
        c.culStatus === 'apto' ||
        c.status === 'approved' ||
        c.funnelStage === 'approved' ||
        ['selected', 'hired'].includes(c.funnelStage)
    ).length;

    // Selected = Final selection for the position
    const selected = candidates.filter(c =>
        c.selectionStatus === 'selected' ||
        c.status === 'selected' ||
        c.funnelStage === 'selected' ||
        ['hired'].includes(c.funnelStage)
    ).length;

    // Hired = started working
    const hired = candidates.filter(c =>
        c.hiredStatus === 'hired' ||
        c.status === 'hired' ||
        c.funnelStage === 'hired'
    ).length;

    return [
        { stage: 'applied', label: 'Postulados', count: total, percentage: 100, conversionFromPrevious: 100 },
        { stage: 'screened', label: 'Filtro IA', count: screened, percentage: total > 0 ? (screened / total) * 100 : 0, conversionFromPrevious: total > 0 ? (screened / total) * 100 : 0 },
        { stage: 'interviewed', label: 'Entrevistados', count: interviewed, percentage: total > 0 ? (interviewed / total) * 100 : 0, conversionFromPrevious: screened > 0 ? (interviewed / screened) * 100 : 0 },
        { stage: 'approved', label: 'Aptos', count: approved, percentage: total > 0 ? (approved / total) * 100 : 0, conversionFromPrevious: interviewed > 0 ? (approved / interviewed) * 100 : 0 },
        { stage: 'selected', label: 'Seleccionados', count: selected, percentage: total > 0 ? (selected / total) * 100 : 0, conversionFromPrevious: approved > 0 ? (selected / approved) * 100 : 0 },
        { stage: 'hired', label: 'Ingresados', count: hired, percentage: total > 0 ? (hired / total) * 100 : 0, conversionFromPrevious: selected > 0 ? (hired / selected) * 100 : 0 }
    ];
}

// Calculate Drop-off reasons from real data
export function calculateDropoffs(candidates: DocumentData[]): DropoffMetric[] {
    const categoryLabels: Record<string, string> = {
        salary: 'Expectativa salarial alta',
        location: 'Ubicación lejana',
        availability: 'No disponibilidad horaria',
        age: 'Edad fuera de rango',
        screening: 'No pasó screening',
        noshow: 'No asistió a entrevista',
        interview: 'Rechazado en entrevista',
        documents: 'Documentos incompletos',
        other: 'Otros'
    };

    const counts: Record<string, number> = {};

    candidates.forEach(c => {
        // Check for rejection category in candidate data
        if (c.rejectionCategory) {
            counts[c.rejectionCategory] = (counts[c.rejectionCategory] || 0) + 1;
        }
        // Check for CUL no apto
        else if (c.culStatus === 'no_apto') {
            counts['screening'] = (counts['screening'] || 0) + 1;
        }
        else if (c.funnelStage === 'rejected') {
            const reason = c.rejectionReason || 'other';
            // Try to map reason if possible, otherwise 'other'
            counts['other'] = (counts['other'] || 0) + 1;
        }
    });

    const totalRejected = Object.values(counts).reduce((a, b) => a + b, 0);

    return Object.entries(counts)
        .map(([category, count]) => ({
            category: category as RejectionCategory,
            label: categoryLabels[category] || category,
            count,
            percentage: totalRejected > 0 ? (count / totalRejected) * 100 : 0
        }))
        .sort((a, b) => b.count - a.count);
}

// Calculate sources from real data with stage-aware metrics
export function calculateSources(candidates: DocumentData[]): SourceMetric[] {
    const sourceLabels: Record<string, string> = {
        'whatsapp': 'WhatsApp Bot',
        'Bolsa de Trabajo': 'Bolsa de Trabajo',
        'Referido': 'Referido',
        'Anuncio en Tienda': 'Anuncio en Tienda',
        'Redes Sociales': 'Redes Sociales',
        'Otros': 'Otros',
        'email_invitation': 'Invitación Directa',
        'Reasignado por Recruiter': 'Reasignado'
    };

    // metrics: { sourceName: { applied: 0, approved: 0, selected: 0, hired: 0 } }
    const metrics: Record<string, { applied: number; approved: number; selected: number; hired: number }> = {};

    candidates.forEach(c => {
        const source = c.source || c.origenConvocatoria || 'Otros';

        if (!metrics[source]) metrics[source] = { applied: 0, approved: 0, selected: 0, hired: 0 };
        metrics[source].applied++;

        if (c.status === 'approved' || c.funnelStage === 'approved' || ['selected', 'hired'].includes(c.funnelStage)) metrics[source].approved++;
        if (c.status === 'selected' || c.funnelStage === 'selected' || ['hired'].includes(c.funnelStage)) metrics[source].selected++;
        if (c.hiredStatus === 'hired' || c.status === 'hired') metrics[source].hired++;
    });

    const totalApplied = Object.values(metrics).reduce((sum, m) => sum + m.applied, 0);

    return Object.entries(metrics)
        .map(([source, m]) => ({
            source: source as any,
            label: sourceLabels[source] || source,
            count: m.applied, // Total applied for this source
            percentage: totalApplied > 0 ? (m.applied / totalApplied) * 100 : 0,

            // NEW: Stage-specific counts
            approvedCount: m.approved,
            selectedCount: m.selected,
            hiredCount: m.hired,

            // Conversion rate based on hired/applied
            hireRate: m.applied > 0 ? (m.hired / m.applied) * 100 : 0
        }))
        .sort((a, b) => b.count - a.count);
}

// Calculate demographics from real data
export function calculateDemographics(candidates: DocumentData[]): DemographicMetrics {
    const ages = candidates.filter(c => c.edad).map(c => c.edad);

    const ranges = [
        { range: '18-24', min: 18, max: 24 },
        { range: '25-30', min: 25, max: 30 },
        { range: '31-35', min: 31, max: 35 },
        { range: '36-40', min: 36, max: 40 },
        { range: '41+', min: 41, max: 100 }
    ];

    const hasExperience = candidates.filter(c =>
        c.experiencia === true ||
        c.hasExperience === true
    ).length;

    return {
        ageDistribution: ranges.map(r => {
            const count = ages.filter(a => a >= r.min && a <= r.max).length;
            return {
                range: r.range,
                count,
                percentage: ages.length > 0 ? (count / ages.length) * 100 : 0
            };
        }),
        averageAge: ages.length > 0 ? ages.reduce((a, b) => a + b, 0) / ages.length : 0,
        experienceRate: candidates.length > 0 ? (hasExperience / candidates.length) * 100 : 0
    };
}

// Get top performing stores
export async function getTopStores(rqs: DocumentData[], limit: number = 5): Promise<PerformanceRanking[]> {
    const storeStats: Record<string, {
        name: string;
        filled: number;
        total: number;
        totalDays: number;
        filledCount: number
    }> = {};

    rqs.forEach(rq => {
        const storeId = rq.tiendaId;
        const storeName = rq.tiendaNombre || storeId;

        if (!storeStats[storeId]) {
            storeStats[storeId] = { name: storeName, filled: 0, total: 0, totalDays: 0, filledCount: 0 };
        }

        storeStats[storeId].total += rq.vacantes || 1;
        storeStats[storeId].filled += rq.filledCount || 0;

        if (rq.filledAt && rq.createdAt) {
            const created = rq.createdAt?.toDate?.() || new Date(rq.createdAt);
            const filled = rq.filledAt?.toDate?.() || new Date(rq.filledAt);
            const days = Math.ceil((filled.getTime() - created.getTime()) / (24 * 60 * 60 * 1000));
            storeStats[storeId].totalDays += days;
            storeStats[storeId].filledCount++;
        }
    });

    return Object.entries(storeStats)
        .map(([id, stats]) => ({
            id,
            name: stats.name,
            fillRate: stats.total > 0 ? (stats.filled / stats.total) * 100 : 0,
            avgTimeToFill: stats.filledCount > 0 ? stats.totalDays / stats.filledCount : 0,
            totalFilled: stats.filled
        }))
        .sort((a, b) => b.fillRate - a.fillRate)
        .slice(0, limit);
}

// Main function to load all analytics data
export async function loadAnalyticsData(filters: AnalyticsFilters): Promise<AnalyticsDashboardData> {
    // Resolve zone to districts if zoneId is present
    let effectiveFilters = { ...filters };
    if (filters.zoneId && (!filters.districtIds || filters.districtIds.length === 0)) {
        try {
            const { doc, getDoc } = await import('firebase/firestore');
            const zoneDoc = await getDoc(doc(db, 'zones', filters.zoneId));
            if (zoneDoc.exists()) {
                effectiveFilters.districtIds = zoneDoc.data().distritos || [];
                console.log(`📍 Resolved Zone ${filters.zoneId} to districts:`, effectiveFilters.districtIds);
            }
        } catch (e) {
            console.error('Error resolving zone:', e);
        }
    }

    const [rqs, candidates] = await Promise.all([
        getRQsForAnalytics(effectiveFilters),
        getCandidatesForAnalytics(effectiveFilters)
    ]);

    const topStores = await getTopStores(rqs);

    return {
        filters: {
            dateRange: effectiveFilters.dateRange ? { ...effectiveFilters.dateRange, label: 'custom' } : { start: new Date(), end: new Date(), label: 'custom' },
            brandIds: effectiveFilters.brandIds || [],
            positionIds: effectiveFilters.positionIds || [],
            storeIds: effectiveFilters.storeIds || [],
            districtIds: effectiveFilters.districtIds || [],
            rqStatus: []
        },
        volume: calculateVolumeMetrics(rqs),
        efficiency: calculateEfficiencyMetrics(candidates, rqs),
        funnel: calculateFunnel(candidates),
        dropoffs: calculateDropoffs(candidates),
        sources: calculateSources(candidates),
        demographics: calculateDemographics(candidates),
        timeSeries: [],
        topStores,
        difficultPositions: []
    };
}
