'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import Link from 'next/link';

interface Job {
    id: string;
    titulo: string;
    descripcion: string;
    tipoContrato: string;
    modalidad: string;
    ubicacion?: string;
    distrito?: string;
    area?: string;
    tipoSede?: 'tienda' | 'administrativo';
    marcaId?: string;
    marcaNombre?: string;
    salarioMin?: number;
    salarioMax?: number;
    mostrarSalario?: boolean;
    createdAt?: any;
    holdingId: string;
}

const HOLDING_CONFIGS: Record<string, {
    name: string;
    logo: string;
    colors: { primary: string; accent: string; light: string }
}> = {
    'llamagas': {
        name: 'Llamagas',
        logo: '/logos/llamagas-full-logo.png',
        colors: { primary: '#572483', accent: '#FFB800', light: '#E0CFF2' }
    },
    'ngr': {
        name: 'NGR',
        logo: '/logos/ngr-logo.png',
        colors: { primary: '#1A1A1A', accent: '#FF6B35', light: '#F5F5F5' }
    }
};

const tipoContratoLabels: Record<string, string> = {
    'tiempo_completo': 'Tiempo Completo',
    'medio_tiempo': 'Medio Tiempo',
    'temporal': 'Temporal',
    'practicas': 'Prácticas'
};

const modalidadLabels: Record<string, string> = {
    'presencial': 'Presencial',
    'remoto': 'Remoto',
    'hibrido': 'Híbrido'
};

export default function VacantesPage() {
    const params = useParams();
    const holdingSlug = (params?.holdingSlug as string)?.toLowerCase() || 'llamagas';
    const config = HOLDING_CONFIGS[holdingSlug] || HOLDING_CONFIGS['llamagas'];

    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDistrito, setFilterDistrito] = useState<string>('');
    const [filterTipo, setFilterTipo] = useState<string>('');
    const [filterMarca, setFilterMarca] = useState<string>('');
    const [filterArea, setFilterArea] = useState<string>('');

    // Set page title on mount
    useEffect(() => {
        document.title = `Vacantes en ${config.name} - Oportunidades Laborales`;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Load jobs
    useEffect(() => {
        async function loadJobs() {
            setLoading(true);
            try {
                const jobsRef = collection(db, 'talent_jobs');

                // Try to find jobs with various holdingId formats
                const possibleHoldingIds = [
                    holdingSlug,
                    holdingSlug.charAt(0).toUpperCase() + holdingSlug.slice(1),
                    holdingSlug.toUpperCase()
                ];

                let loadedJobs: Job[] = [];

                for (const hId of possibleHoldingIds) {
                    const q = query(
                        jobsRef,
                        where('holdingId', '==', hId),
                        where('status', '==', 'published')
                    );

                    const snapshot = await getDocs(q);
                    const jobsList = snapshot.docs.map(d => ({
                        id: d.id,
                        ...d.data()
                    })) as Job[];

                    if (jobsList.length > 0) {
                        loadedJobs = jobsList;
                        break;
                    }
                }

                loadedJobs.sort((a, b) => {
                    const dateA = a.createdAt?.toDate?.() || new Date(0);
                    const dateB = b.createdAt?.toDate?.() || new Date(0);
                    return dateB.getTime() - dateA.getTime();
                });

                setJobs(loadedJobs);
            } catch (error) {
                console.error('Error loading jobs:', error);
            }
            setLoading(false);
        }
        loadJobs();
    }, [holdingSlug]);

    // Extract unique filter options
    const filterOptions = useMemo(() => {
        const distritos = new Set<string>();
        const marcas = new Set<string>();
        const areas = new Set<string>();

        jobs.forEach(job => {
            if (job.distrito) distritos.add(job.distrito);
            if (job.marcaNombre) marcas.add(job.marcaNombre);
            if (job.area) areas.add(job.area);
        });

        return {
            distritos: Array.from(distritos).sort(),
            marcas: Array.from(marcas).sort(),
            areas: Array.from(areas).sort()
        };
    }, [jobs]);

    // Filter jobs
    const filteredJobs = useMemo(() => {
        return jobs.filter(job => {
            if (searchTerm && !job.titulo.toLowerCase().includes(searchTerm.toLowerCase())) {
                return false;
            }
            if (filterDistrito && job.distrito !== filterDistrito) {
                return false;
            }
            if (filterTipo && job.tipoSede !== filterTipo) {
                return false;
            }
            if (filterMarca && job.marcaNombre !== filterMarca) {
                return false;
            }
            if (filterArea && job.area !== filterArea) {
                return false;
            }
            return true;
        });
    }, [jobs, searchTerm, filterDistrito, filterTipo, filterMarca, filterArea]);

    const hasActiveFilters = searchTerm || filterDistrito || filterTipo || filterMarca || filterArea;

    function clearFilters() {
        setSearchTerm('');
        setFilterDistrito('');
        setFilterTipo('');
        setFilterMarca('');
        setFilterArea('');
    }

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
            {/* Header */}
            <header style={{ backgroundColor: config.colors.primary, padding: '24px 0', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
                <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
                    <Link
                        href={`/empleos/${holdingSlug}`}
                        style={{ display: 'flex', alignItems: 'center', gap: 16, textDecoration: 'none' }}
                    >
                        <img src={config.logo} alt={config.name} style={{ height: 50, objectFit: 'contain' }} />
                        <div>
                            <span style={{ fontSize: 24, fontWeight: 700, color: config.colors.accent }}>{config.name}</span>
                            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 2 }}>Oportunidades Laborales</p>
                        </div>
                    </Link>
                </div>
            </header>

            <main style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
                {/* Title and Count */}
                <div style={{ marginBottom: 24 }}>
                    <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827' }}>
                        Todas las Vacantes
                    </h1>
                    <p style={{ color: '#6b7280', marginTop: 4 }}>
                        {loading ? 'Cargando...' : `${filteredJobs.length} vacantes disponibles`}
                    </p>
                </div>

                {/* Filters */}
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: 16,
                    padding: 20,
                    marginBottom: 24,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                        {/* Search */}
                        <div>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 6 }}>
                                🔍 Buscar
                            </label>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Título del puesto..."
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: 8,
                                    fontSize: 14
                                }}
                            />
                        </div>

                        {/* Distrito */}
                        {filterOptions.distritos.length > 0 && (
                            <div>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 6 }}>
                                    📍 Distrito
                                </label>
                                <select
                                    value={filterDistrito}
                                    onChange={(e) => setFilterDistrito(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: 8,
                                        fontSize: 14,
                                        backgroundColor: 'white'
                                    }}
                                >
                                    <option value="">Todos</option>
                                    {filterOptions.distritos.map(d => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Tipo de Sede */}
                        <div>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 6 }}>
                                🏢 Tipo
                            </label>
                            <select
                                value={filterTipo}
                                onChange={(e) => setFilterTipo(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: 8,
                                    fontSize: 14,
                                    backgroundColor: 'white'
                                }}
                            >
                                <option value="">Todos</option>
                                <option value="tienda">Tienda</option>
                                <option value="administrativo">Administrativo</option>
                            </select>
                        </div>

                        {/* Marca (for Liah Flow with multiple brands) */}
                        {filterOptions.marcas.length > 1 && (
                            <div>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 6 }}>
                                    🏪 Marca
                                </label>
                                <select
                                    value={filterMarca}
                                    onChange={(e) => setFilterMarca(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: 8,
                                        fontSize: 14,
                                        backgroundColor: 'white'
                                    }}
                                >
                                    <option value="">Todas</option>
                                    {filterOptions.marcas.map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Area */}
                        {filterOptions.areas.length > 0 && (
                            <div>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 6 }}>
                                    💼 Área
                                </label>
                                <select
                                    value={filterArea}
                                    onChange={(e) => setFilterArea(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: 8,
                                        fontSize: 14,
                                        backgroundColor: 'white'
                                    }}
                                >
                                    <option value="">Todas</option>
                                    {filterOptions.areas.map(a => (
                                        <option key={a} value={a}>{a}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            style={{
                                marginTop: 16,
                                padding: '8px 16px',
                                backgroundColor: '#f3f4f6',
                                border: 'none',
                                borderRadius: 8,
                                fontSize: 14,
                                color: '#374151',
                                cursor: 'pointer'
                            }}
                        >
                            ✕ Limpiar filtros
                        </button>
                    )}
                </div>

                {/* Job Cards */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: 48 }}>
                        <div style={{
                            width: 48,
                            height: 48,
                            border: '4px solid #e5e7eb',
                            borderTopColor: config.colors.primary,
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite',
                            margin: '0 auto'
                        }} />
                        <p style={{ color: '#6b7280', marginTop: 16 }}>Cargando vacantes...</p>
                    </div>
                ) : filteredJobs.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: 48,
                        backgroundColor: 'white',
                        borderRadius: 16
                    }}>
                        <p style={{ fontSize: 48, marginBottom: 16 }}>🔍</p>
                        <p style={{ color: '#6b7280', fontSize: 18 }}>
                            {hasActiveFilters
                                ? 'No hay vacantes que coincidan con los filtros'
                                : 'No hay vacantes disponibles en este momento'}
                        </p>
                        {hasActiveFilters && (
                            <button
                                onClick={clearFilters}
                                style={{
                                    marginTop: 16,
                                    padding: '10px 20px',
                                    backgroundColor: config.colors.primary,
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 8,
                                    cursor: 'pointer'
                                }}
                            >
                                Limpiar filtros
                            </button>
                        )}
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
                        {filteredJobs.map(job => (
                            <Link
                                key={job.id}
                                href={`/careers/${job.id}`}
                                style={{ textDecoration: 'none' }}
                            >
                                <div style={{
                                    backgroundColor: 'white',
                                    borderRadius: 16,
                                    padding: 24,
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                    border: '1px solid #e5e7eb',
                                    transition: 'all 0.2s',
                                    cursor: 'pointer'
                                }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-4px)';
                                        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
                                    }}
                                >
                                    <h3 style={{ fontSize: 18, fontWeight: 600, color: '#111827', marginBottom: 8 }}>
                                        {job.titulo}
                                    </h3>

                                    {job.ubicacion && (
                                        <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 12 }}>
                                            📍 {job.ubicacion}
                                        </p>
                                    )}

                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                                        <span style={{
                                            padding: '4px 12px',
                                            backgroundColor: `${config.colors.primary}15`,
                                            color: config.colors.primary,
                                            borderRadius: 20,
                                            fontSize: 12,
                                            fontWeight: 500
                                        }}>
                                            {tipoContratoLabels[job.tipoContrato] || job.tipoContrato}
                                        </span>
                                        <span style={{
                                            padding: '4px 12px',
                                            backgroundColor: '#e0f2fe',
                                            color: '#0369a1',
                                            borderRadius: 20,
                                            fontSize: 12,
                                            fontWeight: 500
                                        }}>
                                            {modalidadLabels[job.modalidad] || job.modalidad}
                                        </span>
                                        {job.marcaNombre && (
                                            <span style={{
                                                padding: '4px 12px',
                                                backgroundColor: '#f3f4f6',
                                                color: '#4b5563',
                                                borderRadius: 20,
                                                fontSize: 12,
                                                fontWeight: 500
                                            }}>
                                                {job.marcaNombre}
                                            </span>
                                        )}
                                    </div>

                                    {job.mostrarSalario && job.salarioMin && (
                                        <p style={{ fontSize: 14, fontWeight: 600, color: '#059669' }}>
                                            💰 S/ {job.salarioMin.toLocaleString()}{job.salarioMax ? ` - ${job.salarioMax.toLocaleString()}` : '+'}
                                        </p>
                                    )}

                                    <div style={{
                                        marginTop: 16,
                                        paddingTop: 16,
                                        borderTop: '1px solid #f3f4f6',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between'
                                    }}>
                                        <span style={{ color: config.colors.primary, fontSize: 14, fontWeight: 500 }}>
                                            Ver detalles →
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </main>

            {/* Back to Portal */}
            <div style={{
                textAlign: 'center',
                padding: '32px 24px',
                borderTop: '1px solid #e5e7eb',
                backgroundColor: 'white',
                marginTop: 48
            }}>
                <Link
                    href={`/empleos/${holdingSlug}`}
                    style={{
                        color: config.colors.primary,
                        fontWeight: 500,
                        textDecoration: 'none'
                    }}
                >
                    ← Volver al Portal de {config.name}
                </Link>
            </div>

            <style jsx global>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
