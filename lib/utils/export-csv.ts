import type { Candidate } from '@/lib/firestore/candidates';

/**
 * Convert candidates to CSV format
 */
export function candidatesToCSV(candidates: Candidate[]): string {
    // CSV Headers
    const headers = [
        'Código',
        'Nombre Completo',
        'DNI',
        'Email',
        'Teléfono',
        'Departamento',
        'Provincia',
        'Distrito',
        'Dirección',
        'Estado CUL',
        'Tiene CUL',
        'RQ Number',
        'Posición',
        'Tienda',
        'Estado Application',
        'Fecha Aplicación',
        'Aprobado Por',
        'Rechazado Por',
        'Razón Rechazo'
    ];

    // Convert candidates to rows
    const rows = candidates.flatMap(candidate => {
        // If no applications, create one row with basic info
        if (!candidate.applications || candidate.applications.length === 0) {
            return [[
                candidate.candidateCode || '',
                `${candidate.nombre || ''} ${candidate.apellidoPaterno || ''} ${candidate.apellidoMaterno || ''}`.trim(),
                candidate.dni || '',
                candidate.email || '',
                candidate.telefono || '',
                candidate.departamento || '',
                candidate.provincia || '',
                candidate.distrito || '',
                candidate.direccion || '',
                candidate.culStatus || 'pending',
                candidate.certificadoUnicoLaboral ? 'Sí' : 'No',
                '', // RQ Number
                '', // Posición
                '', // Tienda
                '', // Estado Application
                '', // Fecha Aplicación
                '', // Aprobado Por
                '', // Rechazado Por
                ''  // Razón Rechazo
            ]];
        }

        // Create a row for each application
        return candidate.applications.map(app => [
            candidate.candidateCode || '',
            `${candidate.nombre || ''} ${candidate.apellidoPaterno || ''} ${candidate.apellidoMaterno || ''}`.trim(),
            candidate.dni || '',
            candidate.email || '',
            candidate.telefono || '',
            candidate.departamento || '',
            candidate.provincia || '',
            candidate.distrito || '',
            candidate.direccion || '',
            candidate.culStatus || 'pending',
            candidate.certificadoUnicoLaboral ? 'Sí' : 'No',
            app.rqNumber || '',
            app.posicion || '',
            app.tiendaNombre || '',
            app.status === 'approved' ? 'Aprobado' :
                app.status === 'rejected' ? 'Rechazado' :
                    app.status === 'completed' ? 'Completado' : 'Invitado',
            app.appliedAt?.toDate ? app.appliedAt.toDate().toLocaleDateString() : '',
            app.approvedBy || '',
            app.rejectedBy || '',
            app.rejectionReason || ''
        ]);
    });

    // Escape CSV fields (handle commas and quotes)
    const escapeCSVField = (field: string): string => {
        if (field.includes(',') || field.includes('"') || field.includes('\n')) {
            return `"${field.replace(/"/g, '""')}"`;
        }
        return field;
    };

    // Build CSV string
    const csvContent = [
        headers.map(escapeCSVField).join(','),
        ...rows.map(row => row.map(escapeCSVField).join(','))
    ].join('\n');

    return csvContent;
}

/**
 * Download CSV file
 */
export function downloadCSV(csvContent: string, filename: string = 'candidatos.csv'): void {
    // Add BOM for Excel UTF-8 compatibility
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}

/**
 * Export candidates to CSV file
 */
export function exportCandidates(candidates: Candidate[], filename?: string): void {
    const csv = candidatesToCSV(candidates);
    const defaultFilename = `candidatos_${new Date().toISOString().split('T')[0]}.csv`;
    downloadCSV(csv, filename || defaultFilename);
}
