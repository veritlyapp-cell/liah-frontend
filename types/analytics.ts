// Analytics Types and Interfaces for LIAH Dashboard

export interface DateRange {
    start: Date;
    end: Date;
    label: 'week' | 'month' | 'quarter' | 'year' | 'custom';
}

export interface AnalyticsFilters {
    dateRange: DateRange;
    brandIds: string[];
    positionIds: string[];
    storeIds: string[];
    districtIds: string[];
    rqStatus: ('open' | 'in_progress' | 'filled' | 'cancelled')[];
}

// Candidate source tracking
export type CandidateSource =
    | 'whatsapp'    // WhatsApp directo
    | 'link'        // Link de postulación
    | 'referral'    // Referido por empleado
    | 'facebook'    // Facebook/Meta
    | 'instagram'   // Instagram
    | 'tiktok'      // TikTok
    | 'linkedin'    // LinkedIn
    | 'computrabajo'// CompuTrabajo
    | 'bumeran'     // Bumerán
    | 'indeed'      // Indeed
    | 'volante'     // Volante/Poster físico
    | 'radio'       // Radio/Audio
    | 'evento'      // Evento de reclutamiento
    | 'other';      // Otros

// Rejection categories for drop-off analysis
export type RejectionCategory =
    | 'salary'           // Expectativa salarial alta (+20%)
    | 'location'         // Ubicación lejana (>7km)
    | 'availability'     // No disponibilidad horaria
    | 'age'              // Edad fuera de rango
    | 'screening'        // No pasó screening del bot
    | 'noshow'           // No asistió a entrevista
    | 'interview'        // Rechazado en entrevista
    | 'documents'        // Documentos incompletos
    | 'other';

export interface CandidateAnalytics {
    id: string;
    rqId: string;
    brandId: string;
    storeId: string;
    districtId: string;
    positionId: string;

    // Dates for funnel tracking
    appliedAt: Date;
    screeningCompletedAt?: Date;
    interviewScheduledAt?: Date;
    interviewCompletedAt?: Date;
    approvedAt?: Date;
    startedWorkAt?: Date;

    // Status
    status: 'applied' | 'screening' | 'interviewed' | 'approved' | 'hired' | 'rejected';

    // Drop-off tracking
    rejectionCategory?: RejectionCategory;
    rejectionReason?: string;

    // Source tracking
    source: CandidateSource;

    // Demographics
    age?: number;
    salaryExpectation?: number;
    distanceToStore?: number; // km

    // Experience
    hasExperience: boolean;
}

export interface RQAnalytics {
    id: string;
    rqNumber: string;
    brandId: string;
    storeId: string;
    districtId: string;
    positionId: string;

    vacancies: number;
    filledCount: number;

    createdAt: Date;
    filledAt?: Date;
    timeToFill?: number; // days

    status: 'open' | 'in_progress' | 'filled' | 'cancelled';
}

// KPI Metrics
export interface VolumeMetrics {
    totalRQs: number;
    openRQs: number;
    filledRQs: number;
    cancelledRQs: number;
    totalPositionsRequested: number;
    totalPositionsFilled: number;
}

export interface EfficiencyMetrics {
    aptosRate: number;          // % (Aptos / Posiciones Solicitadas)
    fillRate: number;           // % (Ingresados / Posiciones Solicitadas)
    avgTimeToFill: number;      // days
    avgTimeToScreen: number;    // hours
    avgTimeToInterview: number; // days
}

export interface FunnelStage {
    stage: 'applied' | 'screened' | 'interviewed' | 'approved' | 'hired';
    label: string;
    count: number;
    percentage: number;
    conversionFromPrevious: number;
}

export interface DropoffMetric {
    category: RejectionCategory;
    label: string;
    count: number;
    percentage: number;
}

export interface SourceMetric {
    source: CandidateSource;
    label: string;
    count: number;
    percentage: number;
    hireRate: number; // % de contratación por fuente
}

export interface DemographicMetrics {
    ageDistribution: {
        range: string;
        count: number;
        percentage: number;
    }[];
    averageAge: number;
    experienceRate: number; // % con experiencia
}

export interface TimeSeriesData {
    date: string;
    rqsCreated: number;
    rqsFilled: number;
    candidatesApplied: number;
    candidatesHired: number;
}

export interface PerformanceRanking {
    id: string;
    name: string;
    fillRate: number;
    avgTimeToFill: number;
    totalFilled: number;
}

// Complete Analytics Dashboard Data
export interface AnalyticsDashboardData {
    filters: AnalyticsFilters;
    volume: VolumeMetrics;
    efficiency: EfficiencyMetrics;
    funnel: FunnelStage[];
    dropoffs: DropoffMetric[];
    sources: SourceMetric[];
    demographics: DemographicMetrics;
    timeSeries: TimeSeriesData[];
    topStores: PerformanceRanking[];
    difficultPositions: PerformanceRanking[];
}
