// Analytics Export Utilities
// Export analytics data to Excel (CSV) and PDF

import { AnalyticsDashboardData } from '@/types/analytics';

/**
 * Generate CSV content from analytics data
 */
export function generateCSV(data: AnalyticsDashboardData): string {
    const sections: string[] = [];

    // Header
    sections.push('LIAH - Reporte de Analítica de Reclutamiento');
    sections.push(`Generado: ${new Date().toLocaleString('es-PE')}`);
    sections.push('');

    // Volume Metrics
    sections.push('═══════════════════════════════════════');
    sections.push('MÉTRICAS DE VOLUMEN');
    sections.push('═══════════════════════════════════════');
    sections.push(`Total RQs,${data.volume.totalRQs}`);
    sections.push(`RQs Abiertos,${data.volume.openRQs}`);
    sections.push(`RQs Cubiertos,${data.volume.filledRQs}`);
    sections.push(`RQs Cancelados,${data.volume.cancelledRQs}`);
    sections.push(`Posiciones Solicitadas,${data.volume.totalPositionsRequested}`);
    sections.push(`Posiciones Cubiertas,${data.volume.totalPositionsFilled}`);
    sections.push('');

    // Efficiency Metrics
    sections.push('═══════════════════════════════════════');
    sections.push('MÉTRICAS DE EFICIENCIA');
    sections.push('═══════════════════════════════════════');
    sections.push(`Hire Rate,${data.efficiency.hireRate.toFixed(2)}%`);
    sections.push(`Fill Rate,${data.efficiency.fillRate.toFixed(2)}%`);
    sections.push(`Tiempo Promedio para Cubrir (días),${data.efficiency.avgTimeToFill.toFixed(1)}`);
    sections.push(`Tiempo Promedio Screening (días),${data.efficiency.avgTimeToScreen.toFixed(1)}`);
    sections.push(`Tiempo Promedio Entrevista (días),${data.efficiency.avgTimeToInterview.toFixed(1)}`);
    sections.push('');

    // Funnel
    sections.push('═══════════════════════════════════════');
    sections.push('FUNNEL DE CANDIDATOS');
    sections.push('═══════════════════════════════════════');
    sections.push('Etapa,Cantidad,Porcentaje,Conversión');
    data.funnel.forEach(stage => {
        sections.push(`${stage.label},${stage.count},${stage.percentage.toFixed(1)}%,${stage.conversionFromPrevious.toFixed(1)}%`);
    });
    sections.push('');

    // Drop-offs
    if (data.dropoffs.length > 0) {
        sections.push('═══════════════════════════════════════');
        sections.push('RAZONES DE RECHAZO');
        sections.push('═══════════════════════════════════════');
        sections.push('Razón,Cantidad,Porcentaje');
        data.dropoffs.forEach(d => {
            sections.push(`${d.label},${d.count},${d.percentage.toFixed(1)}%`);
        });
        sections.push('');
    }

    // Sources
    if (data.sources.length > 0) {
        sections.push('═══════════════════════════════════════');
        sections.push('FUENTES DE RECLUTAMIENTO');
        sections.push('═══════════════════════════════════════');
        sections.push('Fuente,Candidatos,Porcentaje,Tasa Contratación');
        data.sources.forEach(s => {
            sections.push(`${s.label},${s.count},${s.percentage.toFixed(1)}%,${s.hireRate.toFixed(1)}%`);
        });
        sections.push('');
    }

    // Demographics
    sections.push('═══════════════════════════════════════');
    sections.push('DEMOGRAFÍA');
    sections.push('═══════════════════════════════════════');
    sections.push(`Edad Promedio,${data.demographics.averageAge.toFixed(1)} años`);
    sections.push(`Tasa con Experiencia,${data.demographics.experienceRate.toFixed(1)}%`);
    sections.push('');
    sections.push('Distribución por Edad:');
    sections.push('Rango,Cantidad,Porcentaje');
    data.demographics.ageDistribution.forEach(d => {
        sections.push(`${d.range},${d.count},${d.percentage.toFixed(1)}%`);
    });
    sections.push('');

    // Top Stores
    if (data.topStores.length > 0) {
        sections.push('═══════════════════════════════════════');
        sections.push('TOP TIENDAS');
        sections.push('═══════════════════════════════════════');
        sections.push('Tienda,Fill Rate,Tiempo Promedio,Total Cubiertos');
        data.topStores.forEach(s => {
            sections.push(`${s.name},${s.fillRate.toFixed(1)}%,${s.avgTimeToFill.toFixed(1)} días,${s.totalFilled}`);
        });
    }

    return sections.join('\n');
}

/**
 * Download CSV file
 */
export function downloadCSV(data: AnalyticsDashboardData, filename?: string) {
    const csv = generateCSV(data);
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `LIAH_Analytics_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Download as Excel-compatible format (using HTML table)
 */
export function downloadExcel(data: AnalyticsDashboardData, filename?: string) {
    const html = generateExcelHTML(data);
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `LIAH_Analytics_${new Date().toISOString().split('T')[0]}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Generate HTML table for Excel export
 */
function generateExcelHTML(data: AnalyticsDashboardData): string {
    return `
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                table { border-collapse: collapse; font-family: Arial, sans-serif; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #7c3aed; color: white; }
                .section-header { background-color: #f3f4f6; font-weight: bold; font-size: 14px; }
                .metric { background-color: #fafafa; }
            </style>
        </head>
        <body>
            <h2>LIAH - Reporte de Analítica de Reclutamiento</h2>
            <p>Generado: ${new Date().toLocaleString('es-PE')}</p>
            
            <h3>📊 Métricas de Volumen</h3>
            <table>
                <tr><th>Métrica</th><th>Valor</th></tr>
                <tr><td>Total RQs</td><td>${data.volume.totalRQs}</td></tr>
                <tr><td>RQs Abiertos</td><td>${data.volume.openRQs}</td></tr>
                <tr><td>RQs Cubiertos</td><td>${data.volume.filledRQs}</td></tr>
                <tr><td>RQs Cancelados</td><td>${data.volume.cancelledRQs}</td></tr>
                <tr><td>Posiciones Solicitadas</td><td>${data.volume.totalPositionsRequested}</td></tr>
                <tr><td>Posiciones Cubiertas</td><td>${data.volume.totalPositionsFilled}</td></tr>
            </table>
            
            <h3>⚡ Métricas de Eficiencia</h3>
            <table>
                <tr><th>Métrica</th><th>Valor</th></tr>
                <tr><td>Hire Rate</td><td>${data.efficiency.hireRate.toFixed(2)}%</td></tr>
                <tr><td>Fill Rate</td><td>${data.efficiency.fillRate.toFixed(2)}%</td></tr>
                <tr><td>Tiempo Promedio para Cubrir</td><td>${data.efficiency.avgTimeToFill.toFixed(1)} días</td></tr>
                <tr><td>Tiempo Promedio Screening</td><td>${data.efficiency.avgTimeToScreen.toFixed(1)} días</td></tr>
                <tr><td>Tiempo Promedio Entrevista</td><td>${data.efficiency.avgTimeToInterview.toFixed(1)} días</td></tr>
            </table>
            
            <h3>📈 Funnel de Candidatos</h3>
            <table>
                <tr><th>Etapa</th><th>Cantidad</th><th>Porcentaje</th><th>Conversión</th></tr>
                ${data.funnel.map(s => `
                    <tr>
                        <td>${s.label}</td>
                        <td>${s.count}</td>
                        <td>${s.percentage.toFixed(1)}%</td>
                        <td>${s.conversionFromPrevious.toFixed(1)}%</td>
                    </tr>
                `).join('')}
            </table>
            
            <h3>❌ Razones de Rechazo</h3>
            <table>
                <tr><th>Razón</th><th>Cantidad</th><th>Porcentaje</th></tr>
                ${data.dropoffs.map(d => `
                    <tr>
                        <td>${d.label}</td>
                        <td>${d.count}</td>
                        <td>${d.percentage.toFixed(1)}%</td>
                    </tr>
                `).join('')}
            </table>
            
            <h3>📱 Fuentes de Reclutamiento</h3>
            <table>
                <tr><th>Fuente</th><th>Candidatos</th><th>% del Total</th><th>Tasa Contratación</th></tr>
                ${data.sources.map(s => `
                    <tr>
                        <td>${s.label}</td>
                        <td>${s.count}</td>
                        <td>${s.percentage.toFixed(1)}%</td>
                        <td>${s.hireRate.toFixed(1)}%</td>
                    </tr>
                `).join('')}
            </table>
            
            <h3>👥 Demografía</h3>
            <table>
                <tr><th>Métrica</th><th>Valor</th></tr>
                <tr><td>Edad Promedio</td><td>${data.demographics.averageAge.toFixed(1)} años</td></tr>
                <tr><td>Con Experiencia</td><td>${data.demographics.experienceRate.toFixed(1)}%</td></tr>
            </table>
            <br/>
            <table>
                <tr><th>Rango de Edad</th><th>Cantidad</th><th>Porcentaje</th></tr>
                ${data.demographics.ageDistribution.map(d => `
                    <tr>
                        <td>${d.range}</td>
                        <td>${d.count}</td>
                        <td>${d.percentage.toFixed(1)}%</td>
                    </tr>
                `).join('')}
            </table>
            
            <h3>🏆 Top Tiendas</h3>
            <table>
                <tr><th>Tienda</th><th>Fill Rate</th><th>Tiempo Promedio</th><th>Total Cubiertos</th></tr>
                ${data.topStores.map(s => `
                    <tr>
                        <td>${s.name}</td>
                        <td>${s.fillRate.toFixed(1)}%</td>
                        <td>${s.avgTimeToFill.toFixed(1)} días</td>
                        <td>${s.totalFilled}</td>
                    </tr>
                `).join('')}
            </table>
        </body>
        </html>
    `;
}

/**
 * Print/PDF export (opens print dialog)
 */
export function exportToPDF() {
    window.print();
}
