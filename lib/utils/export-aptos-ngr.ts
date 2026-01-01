import type { Candidate } from '@/lib/firestore/candidates';

/**
 * Export APTOS with NGR Holding specific format
 * Order: Marca / RQ / Tienda / Puesto / Modalidad / Apellidos y Nombres / DNI / Dirección
 */
export function aptosToCSV_NGR(candidates: Candidate[]): string {
    // Filter only APTOS
    const aptos = candidates.filter(c => c.culStatus === 'apto');

    // CSV Headers (NGR Holding format updated)
    const headers = [
        'Marca',
        'RQ',
        'Tienda',
        'Puesto',
        'Modalidad',
        'Apellidos y Nombres',
        'DNI',
        'Dirección',
        'Celular',
        'Correo'
    ];

    // Convert candidates to rows
    const rows = aptos.flatMap(candidate => {
        // If no applications, skip
        if (!candidate.applications || candidate.applications.length === 0) {
            return [];
        }

        // Create a row for each application that is APPROVED by SM and NOT HIRED yet
        return candidate.applications
            .filter(app => app.status === 'approved' && app.hiredStatus !== 'hired')
            .map(app => [
                app.marcaNombre || '',
                app.rqNumber || '',
                app.tiendaNombre || '',
                app.posicion || '',
                app.modalidad || 'Full Time',
                `${candidate.apellidoPaterno || ''} ${candidate.apellidoMaterno || ''} ${candidate.nombre || ''}`.trim(),
                candidate.dni || '',
                `${candidate.direccion || ''}, ${candidate.distrito || ''}, ${candidate.provincia || ''}, ${candidate.departamento || ''}`.trim(),
                candidate.telefono || '',
                candidate.email || ''
            ]);
    });

    // Escape CSV fields
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
function downloadCSV(csvContent: string, filename: string): void {
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
 * Export APTOS candidates with NGR Holding format
 */
export function exportAptosNGR(candidates: Candidate[], filename?: string): void {
    const csv = aptosToCSV_NGR(candidates);
    const defaultFilename = `APTOS_NGR_${new Date().toISOString().split('T')[0]}.csv`;
    downloadCSV(csv, filename || defaultFilename);
}
