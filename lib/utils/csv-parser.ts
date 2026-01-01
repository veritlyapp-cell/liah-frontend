/**
 * CSV Parser Utility for Bulk User Import
 * Validates and parses CSV files for user creation
 */

export interface UserImportRow {
    email: string;
    displayName: string;
    marca: string;
    tienda?: string;
    role: 'store_manager' | 'recruiter' | 'supervisor' | 'jefe_marca';
}

export interface ParseResult {
    success: boolean;
    data: UserImportRow[];
    errors: ParseError[];
    warnings: ParseWarning[];
}

export interface ParseError {
    row: number;
    field: string;
    message: string;
    value?: string;
}

export interface ParseWarning {
    row: number;
    field: string;
    message: string;
    value?: string;
}

const VALID_ROLES = ['store_manager', 'recruiter', 'supervisor', 'jefe_marca'];

/**
 * Parse CSV content to user import rows
 */
export function parseCSV(csvContent: string): ParseResult {
    const errors: ParseError[] = [];
    const warnings: ParseWarning[] = [];
    const data: UserImportRow[] = [];

    // Split into lines and filter empty
    const lines = csvContent.split('\n').filter(line => line.trim());

    if (lines.length === 0) {
        errors.push({
            row: 0,
            field: 'file',
            message: 'El archivo está vacío'
        });
        return { success: false, data: [], errors, warnings };
    }

    // Parse header
    const header = lines[0].split(',').map(h => h.trim());
    const requiredFields = ['email', 'displayName', 'marca', 'role'];

    // Validate header
    for (const field of requiredFields) {
        if (!header.includes(field)) {
            errors.push({
                row: 0,
                field: 'header',
                message: `Falta columna requerida: ${field}`
            });
        }
    }

    if (errors.length > 0) {
        return { success: false, data: [], errors, warnings };
    }

    // Parse data rows
    const emails = new Set<string>();

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = line.split(',').map(v => v.trim());
        const row: any = {};

        header.forEach((field, index) => {
            row[field] = values[index] || '';
        });

        const rowNum = i + 1;

        // Validate email
        if (!row.email) {
            errors.push({
                row: rowNum,
                field: 'email',
                message: 'Email es requerido'
            });
        } else if (!isValidEmail(row.email)) {
            errors.push({
                row: rowNum,
                field: 'email',
                message: 'Email inválido',
                value: row.email
            });
        } else if (emails.has(row.email.toLowerCase())) {
            errors.push({
                row: rowNum,
                field: 'email',
                message: 'Email duplicado en CSV',
                value: row.email
            });
        } else {
            emails.add(row.email.toLowerCase());
        }

        // Validate displayName
        if (!row.displayName) {
            errors.push({
                row: rowNum,
                field: 'displayName',
                message: 'Nombre es requerido'
            });
        }

        // Validate marca
        if (!row.marca) {
            errors.push({
                row: rowNum,
                field: 'marca',
                message: 'Marca es requerida'
            });
        }

        // Validate role
        if (!row.role) {
            errors.push({
                row: rowNum,
                field: 'role',
                message: 'Role es requerido'
            });
        } else if (!VALID_ROLES.includes(row.role)) {
            errors.push({
                row: rowNum,
                field: 'role',
                message: `Role inválido. Debe ser: ${VALID_ROLES.join(', ')}`,
                value: row.role
            });
        }

        // Add warnings
        if (row.role === 'store_manager' && !row.tienda) {
            warnings.push({
                row: rowNum,
                field: 'tienda',
                message: 'Store Manager sin tienda asignada'
            });
        }

        // Add to data if no critical errors for this row
        const rowErrors = errors.filter(e => e.row === rowNum);
        if (rowErrors.length === 0) {
            data.push({
                email: row.email,
                displayName: row.displayName,
                marca: row.marca,
                tienda: row.tienda || undefined,
                role: row.role
            });
        }
    }

    return {
        success: errors.length === 0,
        data,
        errors,
        warnings
    };
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Convert File to text content
 */
export async function fileToText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsText(file);
    });
}

/**
 * Download template CSV
 */
export function downloadTemplate() {
    const template = `email,displayName,marca,tienda,role
manager.miraflores@papajohns.pe,Juan Pérez,Papa Johns,Miraflores,store_manager
manager.sanisidro@papajohns.pe,María García,Papa Johns,San Isidro,store_manager
manager.surco@pizzahut.pe,Carlos López,Pizza Hut,Surco,store_manager
recruiter.papajohns@ngr.pe,Ana Martínez,Papa Johns,,recruiter
supervisor.lima@ngr.pe,Roberto Silva,Papa Johns,,supervisor`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'usuarios_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
