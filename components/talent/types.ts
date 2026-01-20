export interface Job {
    id: string;
    titulo: string;
    departamento?: string;
    gerenciaId?: string;
    gerenciaNombre?: string;
    status: string;
    vacantes?: number;
    createdAt: any;
    killerQuestions?: any[];
    applicantCount?: number;
    salarioMin?: number;
    salarioMax?: number;
    holdingId?: string;
    rqId?: string;
    rqCodigo?: string;
    assignedRecruiterEmail?: string;
    assignedRecruiterNombre?: string;
}
