import * as XLSX from 'xlsx';
import type { Candidate } from '@/lib/firestore/candidates';

/**
 * Generic function to export data to Excel
 */
export function exportToExcel(data: any[], headers: string[], filename: string) {
    const worksheet = XLSX.utils.json_to_sheet(data, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Datos');

    // Generate buffer and trigger download
    XLSX.writeFile(workbook, filename);
}

/**
 * Export SELECCIONADOS with NGR Holding specific format to Excel (.xlsx)
 * Includes Celular and Correo
 */
export function exportAptosExcel(candidates: Candidate[], filename?: string) {
    // Filter only SELECCIONADOS (Final status)
    const selected = candidates.filter(c => c.selectionStatus === 'selected');

    // Create rows
    const rows = selected.flatMap(candidate => {
        if (!candidate.applications || candidate.applications.length === 0) {
            return [];
        }

        // Only selected applications that haven't hired yet
        // If candidate is selected, we usually look for the app with status 'selected'
        return candidate.applications
            .filter(app => app.status === 'selected' && app.hiredStatus !== 'hired')
            .map(app => ({
                'RQ': app.rqNumber || '',
                'Marca': app.marcaNombre || '',
                'Tienda': app.tiendaNombre || '',
                'Puesto': app.posicion || '',
                'Modalidad': app.modalidad || 'Full Time',
                'Apellidos y Nombres': `${candidate.apellidoPaterno || ''} ${candidate.apellidoMaterno || ''} ${candidate.nombre || ''}`.trim(),
                'DNI': candidate.dni || '',
                'Fecha Nacimiento': candidate.fechaNacimiento || '',
                'Edad': candidate.edad || '',
                'Dirección': `${candidate.direccion || ''}, ${candidate.distrito || ''}, ${candidate.provincia || ''}`.trim(),
                'Celular': candidate.telefono || '',
                'Correo': candidate.email || ''
            }));
    });

    if (rows.length === 0) {
        throw new Error('No hay candidatos SELECCIONADOS pendientes para exportar');
    }

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Seleccionados para Ingreso');

    const defaultFilename = `SELECCIONADOS_PARA_INGRESO_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, filename || defaultFilename);
}

/**
 * Export ALL filtered candidates to Excel
 * Only shows the most recent application to avoid "old data" duplicates
 */
export function exportAllCandidatesExcel(candidates: Candidate[], filename?: string) {
    const rows = candidates.map(candidate => {
        // Get most recent relevant application
        const applications = candidate.applications || [];
        const latestApp = applications.length > 0
            ? applications[applications.length - 1]
            : null;

        return {
            'Código': candidate.candidateCode || '',
            'Nombre Completo': `${candidate.nombre || ''} ${candidate.apellidoPaterno || ''} ${candidate.apellidoMaterno || ''}`.trim(),
            'DNI': candidate.dni || '',
            'Fecha Nacimiento': candidate.fechaNacimiento || '',
            'Edad': candidate.edad || '',
            'Email': candidate.email || '',
            'Teléfono': candidate.telefono || '',
            'Distrito': candidate.distrito || '',
            'Estado CUL': candidate.culStatus || 'pending',
            'RQ': latestApp?.rqNumber || '',
            'Posición': latestApp?.posicion || '',
            'Tienda': latestApp?.tiendaNombre || '',
            'Estado App': latestApp ? String(latestApp.status) : 'Sin Postulación',
            'Hired Status': latestApp?.hiredStatus === 'hired' ? 'Ingresó' :
                latestApp?.hiredStatus === 'not_hired' ? 'No Ingresó' : 'Pendiente',
            'Fecha App': latestApp?.appliedAt?.toDate ? latestApp.appliedAt.toDate().toLocaleDateString() : ''
        };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Candidatos');

    const defaultFilename = `CANDIDATOS_LISTA_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, filename || defaultFilename);
}
