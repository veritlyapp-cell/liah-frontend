// Datos geográficos del Perú para el formulario de candidatos
// Lima y Callao con distritos completos, resto solo principales

export const DEPARTAMENTOS = [
    { id: '01', nombre: 'Amazonas' },
    { id: '02', nombre: 'Áncash' },
    { id: '03', nombre: 'Apurímac' },
    { id: '04', nombre: 'Arequipa' },
    { id: '05', nombre: 'Ayacucho' },
    { id: '06', nombre: 'Cajamarca' },
    { id: '07', nombre: 'Callao' },
    { id: '08', nombre: 'Cusco' },
    { id: '09', nombre: 'Huancavelica' },
    { id: '10', nombre: 'Huánuco' },
    { id: '11', nombre: 'Ica' },
    { id: '12', nombre: 'Junín' },
    { id: '13', nombre: 'La Libertad' },
    { id: '14', nombre: 'Lambayeque' },
    { id: '15', nombre: 'Lima' },
    { id: '16', nombre: 'Loreto' },
    { id: '17', nombre: 'Madre de Dios' },
    { id: '18', nombre: 'Moquegua' },
    { id: '19', nombre: 'Pasco' },
    { id: '20', nombre: 'Piura' },
    { id: '21', nombre: 'Puno' },
    { id: '22', nombre: 'San Martín' },
    { id: '23', nombre: 'Tacna' },
    { id: '24', nombre: 'Tumbes' },
    { id: '25', nombre: 'Ucayali' }
];

export const PROVINCIAS: Record<string, Array<{ id: string; nombre: string }>> = {
    '07': [ // Callao
        { id: '0701', nombre: 'Callao' }
    ],
    '15': [ // Lima
        { id: '1501', nombre: 'Lima' },
        { id: '1502', nombre: 'Barranca' },
        { id: '1503', nombre: 'Cajatambo' },
        { id: '1504', nombre: 'Canta' },
        { id: '1505', nombre: 'Cañete' },
        { id: '1506', nombre: 'Huaral' },
        { id: '1507', nombre: 'Huarochirí' },
        { id: '1508', nombre: 'Huaura' },
        { id: '1509', nombre: 'Oyón' },
        { id: '1510', nombre: 'Yauyos' }
    ],
    '13': [ // La Libertad
        { id: '1301', nombre: 'Trujillo' },
        { id: '1302', nombre: 'Ascope' },
        { id: '1303', nombre: 'Chepén' }
    ],
    '04': [ // Arequipa
        { id: '0401', nombre: 'Arequipa' },
        { id: '0402', nombre: 'Camaná' },
        { id: '0403', nombre: 'Caravelí' }
    ],
    '08': [ // Cusco
        { id: '0801', nombre: 'Cusco' },
        { id: '0802', nombre: 'Urubamba' }
    ],
    '20': [ // Piura
        { id: '2001', nombre: 'Piura' },
        { id: '2002', nombre: 'Sullana' }
    ]
};

export const DISTRITOS: Record<string, Array<{ id: string; nombre: string }>> = {
    // CALLAO - COMPLETO (7 distritos)
    '0701': [
        { id: '070101', nombre: 'Callao' },
        { id: '070102', nombre: 'Bellavista' },
        { id: '070103', nombre: 'Carmen de La Legua Reynoso' },
        { id: '070104', nombre: 'La Perla' },
        { id: '070105', nombre: 'La Punta' },
        { id: '070106', nombre: 'Ventanilla' },
        { id: '070107', nombre: 'Mi Perú' }
    ],

    // LIMA - COMPLETO (43 distritos)
    '1501': [
        { id: '150101', nombre: 'Cercado de Lima' },
        { id: '150102', nombre: 'Ancón' },
        { id: '150103', nombre: 'Ate' },
        { id: '150104', nombre: 'Barranco' },
        { id: '150105', nombre: 'Breña' },
        { id: '150106', nombre: 'Carabayllo' },
        { id: '150107', nombre: 'Chaclacayo' },
        { id: '150108', nombre: 'Chorrillos' },
        { id: '150109', nombre: 'Cieneguilla' },
        { id: '150110', nombre: 'Comas' },
        { id: '150111', nombre: 'El Agustino' },
        { id: '150112', nombre: 'Independencia' },
        { id: '150113', nombre: 'Jesús María' },
        { id: '150114', nombre: 'La Molina' },
        { id: '150115', nombre: 'La Victoria' },
        { id: '150116', nombre: 'Lince' },
        { id: '150117', nombre: 'Los Olivos' },
        { id: '150118', nombre: 'Lurigancho' },
        { id: '150119', nombre: 'Lurín' },
        { id: '150120', nombre: 'Magdalena del Mar' },
        { id: '150121', nombre: 'Miraflores' },
        { id: '150122', nombre: 'Pachacámac' },
        { id: '150123', nombre: 'Pucusana' },
        { id: '150124', nombre: 'Pueblo Libre' },
        { id: '150125', nombre: 'Puente Piedra' },
        { id: '150126', nombre: 'Punta Hermosa' },
        { id: '150127', nombre: 'Punta Negra' },
        { id: '150128', nombre: 'Rímac' },
        { id: '150129', nombre: 'San Bartolo' },
        { id: '150130', nombre: 'San Borja' },
        { id: '150131', nombre: 'San Isidro' },
        { id: '150132', nombre: 'San Juan de Lurigancho' },
        { id: '150133', nombre: 'San Juan de Miraflores' },
        { id: '150134', nombre: 'San Luis' },
        { id: '150135', nombre: 'San Martín de Porres' },
        { id: '150136', nombre: 'San Miguel' },
        { id: '150137', nombre: 'Santa Anita' },
        { id: '150138', nombre: 'Santa María del Mar' },
        { id: '150139', nombre: 'Santa Rosa' },
        { id: '150140', nombre: 'Santiago de Surco' },
        { id: '150141', nombre: 'Surquillo' },
        { id: '150142', nombre: 'Villa El Salvador' },
        { id: '150143', nombre: 'Villa María del Triunfo' }
    ],

    // Arequipa - Principales
    '0401': [
        { id: '040101', nombre: 'Arequipa' },
        { id: '040102', nombre: 'Cayma' },
        { id: '040103', nombre: 'Cerro Colorado' },
        { id: '040104', nombre: 'Characato' },
        { id: '040105', nombre: 'Jacobo Hunter' },
        { id: '040106', nombre: 'José Luis Bustamante y Rivero' },
        { id: '040107', nombre: 'Mariano Melgar' },
        { id: '040108', nombre: 'Miraflores' },
        { id: '040109', nombre: 'Paucarpata' },
        { id: '040110', nombre: 'Sachaca' },
        { id: '040111', nombre: 'Socabaya' },
        { id: '040112', nombre: 'Yanahuara' }
    ],

    // Cusco - Principales
    '0801': [
        { id: '080101', nombre: 'Cusco' },
        { id: '080102', nombre: 'Santiago' },
        { id: '080103', nombre: 'San Jerónimo' },
        { id: '080104', nombre: 'San Sebastián' },
        { id: '080105', nombre: 'Wanchaq' }
    ],

    // Trujillo - Principales
    '1301': [
        { id: '130101', nombre: 'Trujillo' },
        { id: '130102', nombre: 'El Porvenir' },
        { id: '130103', nombre: 'Florencia de Mora' },
        { id: '130104', nombre: 'Huanchaco' },
        { id: '130105', nombre: 'La Esperanza' },
        { id: '130106', nombre: 'Laredo' },
        { id: '130107', nombre: 'Moche' },
        { id: '130108', nombre: 'Salaverry' },
        { id: '130109', nombre: 'Víctor Larco Herrera' }
    ],

    // Piura - Principales
    '2001': [
        { id: '200101', nombre: 'Piura' },
        { id: '200102', nombre: 'Castilla' },
        { id: '200103', nombre: 'Catacaos' },
        { id: '200104', nombre: 'Cura Mori' },
        { id: '200105', nombre: 'El Tallán' },
        { id: '200106', nombre: 'La Arena' },
        { id: '200107', nombre: 'La Unión' },
        { id: '200108', nombre: 'Las Lomas' },
        { id: '200109', nombre: 'Tambo Grande' }
    ]
};

// Helper function para obtener provincias de un departamento
export function getProvincias(departamentoId: string) {
    return PROVINCIAS[departamentoId] || [];
}

// Helper function para obtener distritos de una provincia
export function getDistritos(provinciaId: string) {
    return DISTRITOS[provinciaId] || [];
}
