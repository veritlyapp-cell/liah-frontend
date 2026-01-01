// Mock Data Generator for Analytics Testing
import {
    CandidateAnalytics,
    RQAnalytics,
    AnalyticsDashboardData,
    VolumeMetrics,
    EfficiencyMetrics,
    FunnelStage,
    DropoffMetric,
    SourceMetric,
    DemographicMetrics,
    TimeSeriesData,
    PerformanceRanking,
    CandidateSource,
    RejectionCategory
} from '@/types/analytics';

// Helper functions
const randomDate = (start: Date, end: Date): Date => {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

const randomChoice = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const randomInt = (min: number, max: number): number =>
    Math.floor(Math.random() * (max - min + 1)) + min;

// Generate mock RQs
export const generateMockRQs = (count: number = 50): RQAnalytics[] => {
    const positions = ['Cajero', 'Cocinero', 'Mesero', 'Repartidor', 'Supervisor', 'Limpieza'];
    const statuses: RQAnalytics['status'][] = ['open', 'in_progress', 'filled', 'cancelled'];
    const now = new Date();
    const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    return Array.from({ length: count }, (_, i) => {
        const createdAt = randomDate(threeMonthsAgo, now);
        const status = randomChoice(statuses);
        const vacancies = randomInt(1, 5);
        const filledCount = status === 'filled' ? vacancies :
            status === 'in_progress' ? randomInt(0, vacancies - 1) : 0;
        const filledAt = status === 'filled' ?
            new Date(createdAt.getTime() + randomInt(3, 30) * 24 * 60 * 60 * 1000) : undefined;

        return {
            id: `rq-${i + 1}`,
            rqNumber: String(i + 1).padStart(3, '0'),
            brandId: `brand-${randomInt(1, 4)}`,
            storeId: `store-${randomInt(1, 20)}`,
            districtId: `district-${randomInt(1, 5)}`,
            positionId: randomChoice(positions),
            vacancies,
            filledCount,
            createdAt,
            filledAt,
            timeToFill: filledAt ? Math.ceil((filledAt.getTime() - createdAt.getTime()) / (24 * 60 * 60 * 1000)) : undefined,
            status
        };
    });
};

// Generate mock candidates
export const generateMockCandidates = (count: number = 200): CandidateAnalytics[] => {
    const sources: CandidateSource[] = ['whatsapp', 'link', 'referral', 'facebook', 'instagram', 'tiktok', 'linkedin', 'computrabajo', 'bumeran', 'indeed', 'other'];
    const rejectionCategories: RejectionCategory[] = ['salary', 'location', 'availability', 'age', 'screening', 'noshow', 'interview', 'documents'];
    const statuses: CandidateAnalytics['status'][] = ['applied', 'screening', 'interviewed', 'approved', 'hired', 'rejected'];

    const now = new Date();
    const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    return Array.from({ length: count }, (_, i) => {
        const appliedAt = randomDate(threeMonthsAgo, now);
        const status = randomChoice(statuses);
        const isRejected = status === 'rejected';
        const progressedToScreening = ['screening', 'interviewed', 'approved', 'hired'].includes(status) || (isRejected && Math.random() > 0.3);
        const progressedToInterview = ['interviewed', 'approved', 'hired'].includes(status) || (isRejected && Math.random() > 0.5);
        const progressedToApproval = ['approved', 'hired'].includes(status);
        const progressedToHire = status === 'hired';

        return {
            id: `candidate-${i + 1}`,
            rqId: `rq-${randomInt(1, 50)}`,
            brandId: `brand-${randomInt(1, 4)}`,
            storeId: `store-${randomInt(1, 20)}`,
            districtId: `district-${randomInt(1, 5)}`,
            positionId: randomChoice(['Cajero', 'Cocinero', 'Mesero', 'Repartidor']),

            appliedAt,
            screeningCompletedAt: progressedToScreening ?
                new Date(appliedAt.getTime() + randomInt(1, 24) * 60 * 60 * 1000) : undefined,
            interviewScheduledAt: progressedToInterview ?
                new Date(appliedAt.getTime() + randomInt(1, 5) * 24 * 60 * 60 * 1000) : undefined,
            interviewCompletedAt: progressedToInterview ?
                new Date(appliedAt.getTime() + randomInt(2, 7) * 24 * 60 * 60 * 1000) : undefined,
            approvedAt: progressedToApproval ?
                new Date(appliedAt.getTime() + randomInt(3, 10) * 24 * 60 * 60 * 1000) : undefined,
            startedWorkAt: progressedToHire ?
                new Date(appliedAt.getTime() + randomInt(7, 21) * 24 * 60 * 60 * 1000) : undefined,

            status,
            rejectionCategory: isRejected ? randomChoice(rejectionCategories) : undefined,
            rejectionReason: isRejected ? 'Razón de ejemplo' : undefined,

            source: randomChoice(sources),
            age: randomInt(18, 45),
            salaryExpectation: randomInt(1000, 2500),
            distanceToStore: randomInt(1, 15),
            hasExperience: Math.random() > 0.4
        };
    });
};

// Calculate Volume Metrics
export const calculateVolumeMetrics = (rqs: RQAnalytics[]): VolumeMetrics => {
    return {
        totalRQs: rqs.length,
        openRQs: rqs.filter(r => r.status === 'open').length,
        filledRQs: rqs.filter(r => r.status === 'filled').length,
        cancelledRQs: rqs.filter(r => r.status === 'cancelled').length,
        totalPositionsRequested: rqs.reduce((sum, r) => sum + r.vacancies, 0),
        totalPositionsFilled: rqs.reduce((sum, r) => sum + r.filledCount, 0)
    };
};

// Calculate Efficiency Metrics
export const calculateEfficiencyMetrics = (
    candidates: CandidateAnalytics[],
    rqs: RQAnalytics[]
): EfficiencyMetrics => {
    const approved = candidates.filter(c => ['approved', 'hired'].includes(c.status)).length;
    const hired = candidates.filter(c => c.status === 'hired').length;
    const totalPositions = rqs.reduce((sum, r) => sum + r.vacancies, 0);
    const filledRqs = rqs.filter(r => r.timeToFill !== undefined);

    return {
        aptosRate: totalPositions > 0 ? (approved / totalPositions) * 100 : 0,
        fillRate: totalPositions > 0 ? (hired / totalPositions) * 100 : 0,
        avgTimeToFill: filledRqs.length > 0 ?
            filledRqs.reduce((sum, r) => sum + (r.timeToFill || 0), 0) / filledRqs.length : 0,
        avgTimeToScreen: 4, // hours (mock)
        avgTimeToInterview: 3 // days (mock)
    };
};

// Calculate Funnel
export const calculateFunnel = (candidates: CandidateAnalytics[]): FunnelStage[] => {
    const total = candidates.length;
    const screened = candidates.filter(c => c.screeningCompletedAt).length;
    const interviewed = candidates.filter(c => c.interviewCompletedAt).length;
    const approved = candidates.filter(c => c.approvedAt).length;
    const hired = candidates.filter(c => c.startedWorkAt).length;

    return [
        { stage: 'applied', label: 'Postulados', count: total, percentage: 100, conversionFromPrevious: 100 },
        { stage: 'screened', label: 'Filtro IA', count: screened, percentage: (screened / total) * 100, conversionFromPrevious: (screened / total) * 100 },
        { stage: 'interviewed', label: 'Entrevistados', count: interviewed, percentage: (interviewed / total) * 100, conversionFromPrevious: screened > 0 ? (interviewed / screened) * 100 : 0 },
        { stage: 'approved', label: 'Aptos', count: approved, percentage: (approved / total) * 100, conversionFromPrevious: interviewed > 0 ? (approved / interviewed) * 100 : 0 },
        { stage: 'hired', label: 'Ingresados', count: hired, percentage: (hired / total) * 100, conversionFromPrevious: approved > 0 ? (hired / approved) * 100 : 0 }
    ];
};

// Calculate Dropoffs
export const calculateDropoffs = (candidates: CandidateAnalytics[]): DropoffMetric[] => {
    const rejected = candidates.filter(c => c.rejectionCategory);
    const categoryLabels: Record<RejectionCategory, string> = {
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
    rejected.forEach(c => {
        if (c.rejectionCategory) {
            counts[c.rejectionCategory] = (counts[c.rejectionCategory] || 0) + 1;
        }
    });

    return Object.entries(counts)
        .map(([category, count]) => ({
            category: category as RejectionCategory,
            label: categoryLabels[category as RejectionCategory],
            count,
            percentage: rejected.length > 0 ? (count / rejected.length) * 100 : 0
        }))
        .sort((a, b) => b.count - a.count);
};

// Calculate Sources
export const calculateSources = (candidates: CandidateAnalytics[]): SourceMetric[] => {
    const sourceLabels: Record<CandidateSource, string> = {
        whatsapp: 'WhatsApp Directo',
        link: 'Link de Postulación',
        referral: 'Referido',
        facebook: 'Facebook',
        instagram: 'Instagram',
        tiktok: 'TikTok',
        linkedin: 'LinkedIn',
        computrabajo: 'CompuTrabajo',
        bumeran: 'Bumerán',
        indeed: 'Indeed',
        volante: 'Volante/Poster',
        radio: 'Radio/Audio',
        evento: 'Evento',
        other: 'Otros'
    };

    const counts: Record<string, { total: number; hired: number }> = {};
    candidates.forEach(c => {
        if (!counts[c.source]) counts[c.source] = { total: 0, hired: 0 };
        counts[c.source].total++;
        if (c.status === 'hired') counts[c.source].hired++;
    });

    return Object.entries(counts)
        .map(([source, data]) => ({
            source: source as CandidateSource,
            label: sourceLabels[source as CandidateSource],
            count: data.total,
            percentage: candidates.length > 0 ? (data.total / candidates.length) * 100 : 0,
            hireRate: data.total > 0 ? (data.hired / data.total) * 100 : 0
        }))
        .sort((a, b) => b.count - a.count);
};

// Calculate Demographics
export const calculateDemographics = (candidates: CandidateAnalytics[]): DemographicMetrics => {
    const ages = candidates.filter(c => c.age).map(c => c.age!);
    const ranges = [
        { range: '18-24', min: 18, max: 24 },
        { range: '25-30', min: 25, max: 30 },
        { range: '31-35', min: 31, max: 35 },
        { range: '36-40', min: 36, max: 40 },
        { range: '41+', min: 41, max: 100 }
    ];

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
        experienceRate: candidates.length > 0 ?
            (candidates.filter(c => c.hasExperience).length / candidates.length) * 100 : 0
    };
};

// Generate mock time series data
export const generateMockTimeSeries = (days: number = 30): TimeSeriesData[] => {
    const now = new Date();
    const data: TimeSeriesData[] = [];

    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        // Generate with some variance and trend
        const baseApplied = 15 + Math.floor(Math.random() * 10);
        const baseHired = 3 + Math.floor(Math.random() * 4);

        data.push({
            date: date.toISOString().split('T')[0],
            rqsCreated: 2 + Math.floor(Math.random() * 3),
            rqsFilled: 1 + Math.floor(Math.random() * 2),
            candidatesApplied: baseApplied + Math.floor(i / 10), // Slight decrease over time (newer = more)
            candidatesHired: baseHired
        });
    }

    return data;
};

// Generate complete mock dashboard data
export const generateMockDashboardData = (): AnalyticsDashboardData => {
    const rqs = generateMockRQs(50);
    const candidates = generateMockCandidates(200);

    return {
        filters: {
            dateRange: {
                start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                end: new Date(),
                label: 'month'
            },
            brandIds: [],
            positionIds: [],
            storeIds: [],
            districtIds: [],
            rqStatus: []
        },
        volume: calculateVolumeMetrics(rqs),
        efficiency: calculateEfficiencyMetrics(candidates, rqs),
        funnel: calculateFunnel(candidates),
        dropoffs: calculateDropoffs(candidates),
        sources: calculateSources(candidates),
        demographics: calculateDemographics(candidates),
        timeSeries: generateMockTimeSeries(30),
        topStores: [
            { id: 'store-1', name: 'Miraflores Centro', fillRate: 95, avgTimeToFill: 5, totalFilled: 12 },
            { id: 'store-2', name: 'San Isidro', fillRate: 88, avgTimeToFill: 7, totalFilled: 10 },
            { id: 'store-3', name: 'Surco Plaza', fillRate: 82, avgTimeToFill: 8, totalFilled: 8 }
        ],
        difficultPositions: [
            { id: 'pos-1', name: 'Supervisor', fillRate: 45, avgTimeToFill: 21, totalFilled: 3 },
            { id: 'pos-2', name: 'Cocinero', fillRate: 62, avgTimeToFill: 14, totalFilled: 15 },
            { id: 'pos-3', name: 'Repartidor', fillRate: 70, avgTimeToFill: 10, totalFilled: 20 }
        ]
    };
};
