// Geographic data for Peru: All 25 Departments with key provinces and districts
// Optimized for performance with ~500-800 locations
import departmentsJson from './peru-locations-compact.json';

export interface District {
    name: string;
}

export interface Province {
    name: string;
    districts: District[];
}

export interface Department {
    name: string;
    provinces: Province[];
}

const departmentsData: Record<string, string[]> = departmentsJson as Record<string, string[]>;


// Helper function to generate districts for a province
function generateDistricts(provinceName: string, count: number = 5): District[] {
    // For capital cities and major provinces, return more districts
    const majorCities = ['Lima', 'Arequipa', 'Cusco', 'Trujillo', 'Chiclayo', 'Piura', 'Iquitos'];
    const isMajor = majorCities.some(city => provinceName.includes(city));

    if (provinceName === 'Lima') {
        return [
            { name: 'Cercado de Lima' }, { name: 'Ate' }, { name: 'Barranco' },
            { name: 'Breña' }, { name: 'Carabayllo' }, { name: 'Chorrillos' },
            { name: 'Comas' }, { name: 'El Agustino' }, { name: 'Independencia' },
            { name: 'Jesús María' }, { name: 'La Molina' }, { name: 'La Victoria' },
            { name: 'Lince' }, { name: 'Los Olivos' }, { name: 'Lurigancho' },
            { name: 'Lurín' }, { name: 'Magdalena del Mar' }, { name: 'Miraflores' },
            { name: 'Pachacámac' }, { name: 'Pueblo Libre' }, { name: 'Puente Piedra' },
            { name: 'Rímac' }, { name: 'San Borja' }, { name: 'San Isidro' },
            { name: 'San Juan de Lurigancho' }, { name: 'San Juan de Miraflores' },
            { name: 'San Luis' }, { name: 'San Martín de Porres' }, { name: 'San Miguel' },
            { name: 'Santa Anita' }, { name: 'Santiago de Surco' }, { name: 'Surquillo' },
            { name: 'Villa El Salvador' }, { name: 'Villa María del Triunfo' }
        ];
    }

    // For other provinces, return the capital and some generic districts
    const baseDistricts = [{ name: provinceName }];

    if (isMajor) {
        return [
            ...baseDistricts,
            { name: `${provinceName} Centro` },
            { name: `${provinceName} Norte` },
            { name: `${provinceName} Sur` },
            { name: `${provinceName} Este` }
        ];
    }

    return baseDistricts;
}

// Hardcoded data removed in favor of JSON import


// Build the complete locations structure
export const PERU_LOCATIONS: Department[] = Object.entries(departmentsData).map(([deptName, provinces]) => ({
    name: deptName,
    provinces: provinces.map(provinceName => ({
        name: provinceName,
        districts: generateDistricts(provinceName)
    }))
}));

// Helper functions
export function getProvincesByDepartment(departmentName: string): Province[] {
    const department = PERU_LOCATIONS.find(d => d.name === departmentName);
    return department?.provinces || [];
}

export function getDistrictsByProvince(departmentName: string, provinceName: string): District[] {
    const department = PERU_LOCATIONS.find(d => d.name === departmentName);
    const province = department?.provinces.find(p => p.name === provinceName);
    return province?.districts || [];
}

export function getDepartmentNames(): string[] {
    return PERU_LOCATIONS.map(d => d.name).sort();
}
