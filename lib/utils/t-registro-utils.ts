/**
 * T-Registro (SUNAT Perú) Export Utilities
 * 
 * Formatos comunes:
 * .alt - Estructura de DATOS PERSONALES
 * .trab - Estructura de TRABAJADOR
 * .est - Estructura de ESTABLECIMIENTO
 */

// Helper to pad strings for fixed-width if needed, but SUNAT now mostly uses pipe (|)
const formatCode = (val: string | undefined, length: number) => {
    if (!val) return "".padEnd(length, " ");
    return val.substring(0, length).padEnd(length, " ");
};

/**
 * Genera el contenido para el archivo de Altas (T-Registro)
 * Enfocado en Datos Personales (Estructura 01)
 */
export function generateTRegistroAltas(colaboradores: any[]): string {
    // Formato: Tipo Doc | Num Doc | Pais Emisor | Fecha Nac | Apellido Pat | Apellido Mat | Nombres | Sexo | Nacionalidad | Telefono
    // Nota: Simplificado para MVP
    return colaboradores.map(c => {
        const names = c.nombres?.split(' ') || [''];
        const pLastName = c.apellidos?.split(' ')[0] || '';
        const mLastName = c.apellidos?.split(' ')[1] || '';
        const firstName = names[0] || '';
        const secondName = names.slice(1).join(' ') || '';

        const tipoDoc = c.tipoDocumento === 'DNI' ? '1' : '4'; // 1=DNI, 4=Carnet Extranjeria
        const numDoc = c.numeroDocumento || '';
        const paisDoc = '604'; // Perú
        const fechaNac = c.fechaNacimiento?.replace(/-/g, '') || ''; // YYYYMMDD o DDMMYYYY depende de la estructura

        const line = [
            tipoDoc,
            numDoc,
            paisDoc,
            fechaNac,
            pLastName.toUpperCase(),
            mLastName.toUpperCase(),
            firstName.toUpperCase(),
            '', // Sexo (no recolectado aun, dejar vacio)
            '9504', // Nacionalidad PE
            c.telefono || ''
        ].join('|');

        return line + '|';
    }).join('\n');
}

/**
 * Genera el contenido para el archivo de Bajas (T-Registro)
 * Estructura de Periodos Laborales
 */
export function generateTRegistroBajas(bajas: any[]): string {
    // Formato: Tipo Doc | Num Doc | Pais | Categoria | Motivo Baja | Fecha Inicio | Fecha Cese
    return bajas.map(b => {
        const tipoDoc = b.tipoDocumento === 'DNI' ? '1' : '4';
        const numDoc = b.numeroDocumento || '';
        const motivo = b.motivoBaja || '01'; // 01 = Renuncia
        const fechaInicio = b.fechaIngreso?.replace(/-/g, '') || '';
        const fechaCese = b.fechaCese?.replace(/-/g, '') || '';

        const line = [
            tipoDoc,
            numDoc,
            '604',
            '01', // Trabajador
            motivo,
            fechaInicio,
            fechaCese
        ].join('|');

        return line + '|';
    }).join('\n');
}
