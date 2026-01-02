export const CONVERSATION_STATES = {
    INICIO: 'inicio',
    TERMS: 'terms_acceptance',
    DATOS_BASICOS: 'datos_basicos',
    HARD_FILTERS: 'hard_filters',
    SALARY_EXPECTATION: 'salary_expectation',
    VALIDACION: 'validacion',
    LOCATION_INPUT: 'location_input',
    TIENDAS: 'tiendas_sugeridas',
    SELECCION_VACANTE: 'seleccion_vacante',
    SCREENING: 'screening',
    ENTREVISTA: 'programacion_entrevista',
    CONFIRMACION_PENDIENTE: 'confirmacion_pendiente',
    CONFIRMADO: 'confirmado',
    COMPLETADO: 'completado',
    RECHAZADO: 'rechazado',
    ERROR: 'error'
} as const;

export type ConversationState = typeof CONVERSATION_STATES[keyof typeof CONVERSATION_STATES];

export interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export interface CandidateData {
    nombre?: string;
    edad?: number;
    dni?: string;
    email?: string;
    fechaNacimiento?: string;
    termsAccepted?: boolean;
    turnosRotativos?: boolean;
    cierresDisponible?: boolean;
    salaryExpectation?: number;
    distrito?: string;
    storeSelection?: number;
    vacancySelection?: number;
    selectedVacancy?: any;
    positionMaxSalary?: number;
}

export interface Conversation {
    id: string;
    phone: string;
    tenant_id: string;
    origin_id: string;
    estado: ConversationState;
    mensajes: Message[];
    candidateData: CandidateData;
    createdAt: Date;
    updatedAt: Date;
    activo: boolean;
}
