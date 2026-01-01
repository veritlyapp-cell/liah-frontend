// File parser utility for CSV and Excel files
// @ts-ignore
import * as XLSX from 'xlsx';

export interface ParsedRow {
    [key: string]: string | number;
}

export interface ParseResult {
    success: boolean;
    data: ParsedRow[];
    errors: string[];
    fileName: string;
}

/**
 * Parse a file (CSV or Excel)
 */
export async function parseFile(file: File): Promise<ParseResult> {
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (extension === 'csv') {
        return parseCSV(file);
    } else if (extension === 'xlsx' || extension === 'xls') {
        return parseExcel(file);
    } else {
        return {
            success: false,
            data: [],
            errors: ['Formato de archivo no soportado. Use CSV o Excel.'],
            fileName: file.name
        };
    }
}

/**
 * Parse CSV file
 */
async function parseCSV(file: File): Promise<ParseResult> {
    return new Promise((resolve) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;
                const lines = text.split(/\r?\n/);

                if (lines.length === 0) {
                    resolve({
                        success: false,
                        data: [],
                        errors: ['El archivo está vacío'],
                        fileName: file.name
                    });
                    return;
                }

                // Get headers
                const headers = lines[0].split(',').map(h => h.trim());
                const data: ParsedRow[] = [];
                const errors: string[] = [];

                // Parse rows
                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (!line) continue;

                    const values = line.split(',').map(v => v.trim());
                    const row: ParsedRow = {};

                    headers.forEach((header, index) => {
                        row[header] = values[index] || '';
                    });

                    data.push(row);
                }

                resolve({
                    success: true,
                    data,
                    errors: [],
                    fileName: file.name
                });
            } catch (error) {
                resolve({
                    success: false,
                    data: [],
                    errors: [`Error al parsear CSV: ${error instanceof Error ? error.message : 'Error desconocido'}`],
                    fileName: file.name
                });
            }
        };

        reader.onerror = () => {
            resolve({
                success: false,
                data: [],
                errors: ['Error al leer el archivo'],
                fileName: file.name
            });
        };

        reader.readAsText(file);
    });
}

/**
 * Parse Excel file (.xlsx, .xls)
 */
async function parseExcel(file: File): Promise<ParseResult> {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet) as ParsedRow[];
                resolve({ success: true, data: jsonData, errors: [], fileName: file.name });
            } catch (error) {
                resolve({ success: false, data: [], errors: [`Error al procesar Excel: ${error instanceof Error ? error.message : 'Error desconocido'}`], fileName: file.name });
            }
        };
        reader.readAsArrayBuffer(file);
    });
}

/**
 * Validate required columns exist in parsed data
 */
export function validateColumns(data: ParsedRow[], requiredColumns: string[]): string[] {
    if (data.length === 0) {
        return ['No hay datos en el archivo'];
    }

    const errors: string[] = [];
    const firstRow = data[0];
    const availableColumns = Object.keys(firstRow);

    for (const required of requiredColumns) {
        if (!availableColumns.includes(required)) {
            errors.push(`Columna requerida faltante: "${required}"`);
        }
    }

    return errors;
}

/**
 * Download sample CSV template
 */
export function downloadSampleCSV(filename: string, headers: string[], sampleData?: string[][]) {
    const csvContent = [
        headers.join(','),
        ...(sampleData || []).map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
