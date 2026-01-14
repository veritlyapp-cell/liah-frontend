/**
 * PERÚ - Departamentos, Provincias y Distritos
 * Lista completa para selección de ubicación
 */

export interface Location {
    departamento: string;
    provincias: {
        nombre: string;
        distritos: string[];
    }[];
}

export const PERU_LOCATIONS: Location[] = [
    {
        departamento: 'Lima',
        provincias: [
            {
                nombre: 'Lima',
                distritos: [
                    'Ate', 'Barranco', 'Breña', 'Carabayllo', 'Chaclacayo', 'Chorrillos',
                    'Cieneguilla', 'Comas', 'El Agustino', 'Independencia', 'Jesús María',
                    'La Molina', 'La Victoria', 'Lima', 'Lince', 'Los Olivos', 'Lurigancho',
                    'Lurín', 'Magdalena del Mar', 'Miraflores', 'Pachacámac', 'Pucusana',
                    'Pueblo Libre', 'Puente Piedra', 'Punta Hermosa', 'Punta Negra', 'Rímac',
                    'San Bartolo', 'San Borja', 'San Isidro', 'San Juan de Lurigancho',
                    'San Juan de Miraflores', 'San Luis', 'San Martín de Porres', 'San Miguel',
                    'Santa Anita', 'Santa María del Mar', 'Santa Rosa', 'Santiago de Surco',
                    'Surquillo', 'Villa El Salvador', 'Villa María del Triunfo'
                ]
            },
            {
                nombre: 'Cañete',
                distritos: ['San Vicente de Cañete', 'Asia', 'Cerro Azul', 'Mala', 'Imperial']
            },
            {
                nombre: 'Huaral',
                distritos: ['Huaral', 'Chancay', 'Aucallama']
            },
            {
                nombre: 'Huarochirí',
                distritos: ['Matucana', 'Chosica', 'Ricardo Palma']
            }
        ]
    },
    {
        departamento: 'Callao',
        provincias: [
            {
                nombre: 'Callao',
                distritos: [
                    'Callao', 'Bellavista', 'Carmen de la Legua Reynoso', 'La Perla',
                    'La Punta', 'Ventanilla', 'Mi Perú'
                ]
            }
        ]
    },
    {
        departamento: 'Arequipa',
        provincias: [
            {
                nombre: 'Arequipa',
                distritos: [
                    'Arequipa', 'Alto Selva Alegre', 'Cayma', 'Cerro Colorado', 'Characato',
                    'Jacobo Hunter', 'José Luis Bustamante y Rivero', 'Mariano Melgar',
                    'Miraflores', 'Paucarpata', 'Sachaca', 'Socabaya', 'Yanahuara'
                ]
            },
            {
                nombre: 'Camaná',
                distritos: ['Camaná', 'José María Quimper', 'Ocoña']
            },
            {
                nombre: 'Mollendo',
                distritos: ['Mollendo', 'Mejía', 'Islay']
            }
        ]
    },
    {
        departamento: 'La Libertad',
        provincias: [
            {
                nombre: 'Trujillo',
                distritos: [
                    'Trujillo', 'El Porvenir', 'Florencia de Mora', 'Huanchaco', 'La Esperanza',
                    'Laredo', 'Moche', 'Salaverry', 'Víctor Larco Herrera'
                ]
            },
            {
                nombre: 'Pacasmayo',
                distritos: ['San Pedro de Lloc', 'Guadalupe', 'Jequetepeque']
            },
            {
                nombre: 'Chepén',
                distritos: ['Chepén', 'Pacanga', 'Pueblo Nuevo']
            }
        ]
    },
    {
        departamento: 'Piura',
        provincias: [
            {
                nombre: 'Piura',
                distritos: ['Piura', 'Castilla', 'Catacaos', 'La Arena', 'La Unión', 'Tambo Grande']
            },
            {
                nombre: 'Sullana',
                distritos: ['Sullana', 'Bellavista', 'Miguel Checa', 'Querecotillo']
            },
            {
                nombre: 'Talara',
                distritos: ['Talara', 'El Alto', 'La Brea', 'Los Órganos', 'Máncora']
            },
            {
                nombre: 'Paita',
                distritos: ['Paita', 'Colán', 'La Huaca']
            }
        ]
    },
    {
        departamento: 'Lambayeque',
        provincias: [
            {
                nombre: 'Chiclayo',
                distritos: [
                    'Chiclayo', 'José Leonardo Ortiz', 'La Victoria', 'Pimentel',
                    'Monsefú', 'Santa Rosa', 'Pomalca', 'Reque'
                ]
            },
            {
                nombre: 'Lambayeque',
                distritos: ['Lambayeque', 'Mochumí', 'Túcume', 'Íllimo']
            },
            {
                nombre: 'Ferreñafe',
                distritos: ['Ferreñafe', 'Pueblo Nuevo', 'Mesones Muro']
            }
        ]
    },
    {
        departamento: 'Cusco',
        provincias: [
            {
                nombre: 'Cusco',
                distritos: [
                    'Cusco', 'San Jerónimo', 'San Sebastián', 'Santiago', 'Wanchaq',
                    'Ccorca', 'Poroy', 'Saylla'
                ]
            },
            {
                nombre: 'La Convención',
                distritos: ['Santa Ana', 'Quillabamba', 'Echarati']
            },
            {
                nombre: 'Urubamba',
                distritos: ['Urubamba', 'Ollantaytambo', 'Chinchero', 'Maras']
            }
        ]
    },
    {
        departamento: 'Junín',
        provincias: [
            {
                nombre: 'Huancayo',
                distritos: [
                    'Huancayo', 'El Tambo', 'Chilca', 'Pilcomayo', 'San Agustín',
                    'Sapallanga', 'Sicaya', 'Hualhuas'
                ]
            },
            {
                nombre: 'Satipo',
                distritos: ['Satipo', 'Mazamari', 'Pangoa', 'Río Negro']
            },
            {
                nombre: 'Tarma',
                distritos: ['Tarma', 'Acobamba', 'La Unión', 'Palca']
            }
        ]
    },
    {
        departamento: 'Áncash',
        provincias: [
            {
                nombre: 'Huaraz',
                distritos: ['Huaraz', 'Independencia', 'Jangas', 'Tarica']
            },
            {
                nombre: 'Santa',
                distritos: ['Chimbote', 'Nuevo Chimbote', 'Coishco', 'Santa']
            },
            {
                nombre: 'Huari',
                distritos: ['Huari', 'Chavín de Huántar', 'San Marcos']
            }
        ]
    },
    {
        departamento: 'Ica',
        provincias: [
            {
                nombre: 'Ica',
                distritos: ['Ica', 'La Tinguiña', 'Los Aquijes', 'Parcona', 'Subtanjalla']
            },
            {
                nombre: 'Chincha',
                distritos: ['Chincha Alta', 'Pueblo Nuevo', 'Sunampe', 'Alto Larán']
            },
            {
                nombre: 'Pisco',
                distritos: ['Pisco', 'Paracas', 'San Andrés', 'San Clemente']
            },
            {
                nombre: 'Nazca',
                distritos: ['Nazca', 'Vista Alegre', 'Marcona']
            }
        ]
    },
    {
        departamento: 'Loreto',
        provincias: [
            {
                nombre: 'Maynas',
                distritos: ['Iquitos', 'Belén', 'Punchana', 'San Juan Bautista']
            },
            {
                nombre: 'Alto Amazonas',
                distritos: ['Yurimaguas', 'Lagunas', 'Santa Cruz']
            }
        ]
    },
    {
        departamento: 'San Martín',
        provincias: [
            {
                nombre: 'San Martín',
                distritos: ['Tarapoto', 'Morales', 'La Banda de Shilcayo']
            },
            {
                nombre: 'Moyobamba',
                distritos: ['Moyobamba', 'Calzada', 'Habana', 'Jepelacio']
            },
            {
                nombre: 'Rioja',
                distritos: ['Rioja', 'Nueva Cajamarca', 'Elías Soplín Vargas']
            }
        ]
    },
    {
        departamento: 'Cajamarca',
        provincias: [
            {
                nombre: 'Cajamarca',
                distritos: ['Cajamarca', 'Baños del Inca', 'Llacanora', 'Jesús']
            },
            {
                nombre: 'Jaén',
                distritos: ['Jaén', 'Bellavista', 'Colasay', 'Huabal']
            },
            {
                nombre: 'Chota',
                distritos: ['Chota', 'Lajas', 'Cochabamba']
            }
        ]
    },
    {
        departamento: 'Puno',
        provincias: [
            {
                nombre: 'Puno',
                distritos: ['Puno', 'Acora', 'Atuncolla', 'Chucuito', 'Mañazo']
            },
            {
                nombre: 'San Román',
                distritos: ['Juliaca', 'Cabana', 'Cabanillas', 'Caracoto']
            }
        ]
    },
    {
        departamento: 'Tacna',
        provincias: [
            {
                nombre: 'Tacna',
                distritos: ['Tacna', 'Alto de la Alianza', 'Ciudad Nueva', 'Gregorio Albarracín', 'Pocollay']
            }
        ]
    },
    {
        departamento: 'Moquegua',
        provincias: [
            {
                nombre: 'Mariscal Nieto',
                distritos: ['Moquegua', 'Samegua', 'San Cristóbal', 'Carumas']
            },
            {
                nombre: 'Ilo',
                distritos: ['Ilo', 'El Algarrobal', 'Pacocha']
            }
        ]
    },
    {
        departamento: 'Madre de Dios',
        provincias: [
            {
                nombre: 'Tambopata',
                distritos: ['Puerto Maldonado', 'Inambari', 'Las Piedras', 'Laberinto']
            }
        ]
    },
    {
        departamento: 'Ucayali',
        provincias: [
            {
                nombre: 'Coronel Portillo',
                distritos: ['Callería', 'Yarinacocha', 'Manantay', 'Campo Verde']
            },
            {
                nombre: 'Padre Abad',
                distritos: ['Padre Abad', 'Irazola', 'Curimaná']
            }
        ]
    },
    {
        departamento: 'Tumbes',
        provincias: [
            {
                nombre: 'Tumbes',
                distritos: ['Tumbes', 'Corrales', 'La Cruz', 'San Jacinto']
            },
            {
                nombre: 'Zarumilla',
                distritos: ['Zarumilla', 'Aguas Verdes', 'Papayal']
            }
        ]
    },
    {
        departamento: 'Amazonas',
        provincias: [
            {
                nombre: 'Chachapoyas',
                distritos: ['Chachapoyas', 'Huancas', 'La Jalca Grande']
            },
            {
                nombre: 'Bagua',
                distritos: ['Bagua', 'Aramango', 'Copallín', 'El Parco']
            }
        ]
    },
    {
        departamento: 'Huánuco',
        provincias: [
            {
                nombre: 'Huánuco',
                distritos: ['Huánuco', 'Amarilis', 'Pillco Marca', 'Santa María del Valle']
            },
            {
                nombre: 'Leoncio Prado',
                distritos: ['Rupa-Rupa', 'José Crespo y Castillo', 'Luyando']
            }
        ]
    },
    {
        departamento: 'Pasco',
        provincias: [
            {
                nombre: 'Pasco',
                distritos: ['Chaupimarca', 'Yanacancha', 'Simon Bolivar']
            },
            {
                nombre: 'Oxapampa',
                distritos: ['Oxapampa', 'Villa Rica', 'Chontabamba']
            }
        ]
    },
    {
        departamento: 'Ayacucho',
        provincias: [
            {
                nombre: 'Huamanga',
                distritos: ['Ayacucho', 'Carmen Alto', 'San Juan Bautista', 'Jesús Nazareno']
            },
            {
                nombre: 'Huanta',
                distritos: ['Huanta', 'Luricocha', 'Iguaín']
            }
        ]
    },
    {
        departamento: 'Apurímac',
        provincias: [
            {
                nombre: 'Abancay',
                distritos: ['Abancay', 'Tamburco', 'Curahuasi', 'Lambrama']
            },
            {
                nombre: 'Andahuaylas',
                distritos: ['Andahuaylas', 'San Jerónimo', 'Talavera', 'Santa María de Chicmo']
            }
        ]
    },
    {
        departamento: 'Huancavelica',
        provincias: [
            {
                nombre: 'Huancavelica',
                distritos: ['Huancavelica', 'Ascensión', 'Acoria', 'Yauli']
            }
        ]
    }
];

// Helper functions
export function getDepartamentos(): string[] {
    return PERU_LOCATIONS.map(l => l.departamento);
}

export function getProvincias(departamento: string): string[] {
    const dep = PERU_LOCATIONS.find(l => l.departamento === departamento);
    return dep ? dep.provincias.map(p => p.nombre) : [];
}

export function getDistritos(departamento: string, provincia: string): string[] {
    const dep = PERU_LOCATIONS.find(l => l.departamento === departamento);
    if (!dep) return [];
    const prov = dep.provincias.find(p => p.nombre === provincia);
    return prov ? prov.distritos : [];
}

// Get all Lima and Callao distritos (for quick access)
export function getLimaCallaoDistritos(): string[] {
    const lima = PERU_LOCATIONS.find(l => l.departamento === 'Lima');
    const callao = PERU_LOCATIONS.find(l => l.departamento === 'Callao');

    const limaDistritos = lima?.provincias.find(p => p.nombre === 'Lima')?.distritos || [];
    const callaoDistritos = callao?.provincias.find(p => p.nombre === 'Callao')?.distritos || [];

    return [...limaDistritos, ...callaoDistritos].sort();
}
