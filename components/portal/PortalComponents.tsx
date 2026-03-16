'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ChefHat, Heart, Zap, ArrowRight, MapPin, Clock, ChevronRight, ChevronLeft, Search, Navigation } from 'lucide-react';
import Link from 'next/link';
import { getDepartmentNames, getProvincesByDepartment, getDistrictsByProvince } from '@/lib/data/peru-locations';
import GeolocationJobSearch from './GeolocationJobSearch';
import { formatDistance, calculateDistanceKm } from '@/lib/geo/distance-utils';

// ... (HeroSection and CultureSection keep the same as before, but I'll update types)

interface BaseProps {
    config: any;
}

export function HeroSection({ config, onExplore }: { config: any, onExplore: () => void }) {
    const { colors, hero } = config;
    return (
        <header style={{
            position: 'relative',
            paddingTop: 160,
            paddingBottom: 120,
            paddingLeft: 48,
            paddingRight: 48,
            backgroundColor: colors.purple,
            borderBottom: '1px solid rgba(255,255,255,0.05)'
        }}>
            <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        fontSize: 'clamp(3rem, 8vw, 5rem)',
                        fontWeight: 900,
                        letterSpacing: '-0.02em',
                        lineHeight: 1.1,
                        marginBottom: 32,
                        fontStyle: 'italic',
                        color: 'white'
                    }}
                >
                    {hero.title_line1} <br />
                    <span style={{ color: colors.yellow, textTransform: 'uppercase' }}>{hero.title_line2}</span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    style={{
                        fontSize: 'clamp(1rem, 2vw, 1.25rem)',
                        maxWidth: 600,
                        margin: '0 auto 48px',
                        lineHeight: 1.7,
                        color: colors.lavender
                    }}
                >
                    {hero.subtitle}
                </motion.p>

                <motion.a
                    href="#vacantes"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '20px 40px',
                        fontWeight: 800,
                        borderRadius: 999,
                        boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                        cursor: 'pointer',
                        backgroundColor: colors.yellow,
                        color: config.colors.purpleDeep || '#000',
                        textDecoration: 'none',
                        fontSize: 16
                    }}
                >
                    {hero.cta_text} <ArrowRight size={22} />
                </motion.a>
            </div>
        </header>
    );
}

export function CultureSection({ config }: BaseProps) {
    const { colors, culture, name } = config;
    return (
        <section style={{ padding: '120px 48px' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                <h2 style={{ fontSize: 'clamp(1.75rem, 3vw, 2rem)', fontWeight: 700, marginBottom: 48, fontStyle: 'italic', color: 'white' }}>
                    ¿Por qué <span style={{ color: colors.yellow }}>{name}?</span>
                </h2>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        style={{
                            gridColumn: 'span 2',
                            padding: 48,
                            borderRadius: 32,
                            minHeight: 350,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'flex-start',
                            backgroundColor: colors.yellow,
                            boxShadow: '0 24px 48px rgba(0,0,0,0.2)'
                        }}
                    >
                        <Zap size={48} style={{ marginBottom: 24, color: colors.purpleDeep }} />
                        <h3 style={{ fontSize: 'clamp(2rem, 4vw, 2.5rem)', fontWeight: 900, marginBottom: 12, lineHeight: 1.2, color: colors.purpleDeep }}>
                            {culture.main_title}
                        </h3>
                        <p style={{ fontSize: 18, fontWeight: 600, fontStyle: 'italic', color: `${colors.purpleDeep}cc` }}>
                            {culture.main_description}
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        style={{
                            padding: 48,
                            borderRadius: 32,
                            minHeight: 350,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'flex-start',
                            backgroundColor: colors.purple,
                            border: '1px solid rgba(255,255,255,0.1)',
                            boxShadow: '0 24px 48px rgba(0,0,0,0.2)'
                        }}
                    >
                        <MapPin size={36} style={{ marginBottom: 24, color: colors.yellow }} />
                        <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12, color: 'white' }}>{culture.secondary_title}</h3>
                        <p style={{ fontSize: 15, lineHeight: 1.6, color: colors.lavender }}>
                            {culture.secondary_description}
                        </p>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}

export function BrandsSection({ holdingSlug }: { holdingSlug: string }) {
    if (holdingSlug !== 'ngr') return null;
    return (
        <section style={{ padding: '60px 48px', backgroundColor: 'rgba(255,255,255,0.02)' }}>
            <div style={{ maxWidth: 1000, margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 60, flexWrap: 'wrap', opacity: 0.5, filter: 'grayscale(100%) brightness(2)' }}>
                    {['BEMBOS', 'PAPA JOHNS', 'POPEYES', 'DON BELISARIO', 'DUNKIN', 'CHINAWOK'].map(brand => (
                        <span key={brand} style={{ fontSize: 18, fontWeight: 900, fontStyle: 'italic', letterSpacing: '1px', color: 'white' }}>{brand}</span>
                    ))}
                </div>
            </div>
        </section>
    );
}

export function GallerySection({ config, currentSlide, setCurrentSlide }: { config: any, currentSlide: number, setCurrentSlide: (n: number | ((n: number) => number)) => void }) {
    const { colors, gallery } = config;
    if (!gallery || gallery.length === 0) return null;

    return (
        <section style={{ padding: '80px 24px', backgroundColor: colors.purple }}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 700, marginBottom: 48, textAlign: 'center', color: 'white' }}>
                    Conoce nuestro <span style={{ color: colors.yellow }}>equipo</span>
                </h2>

                <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 24 }}>
                    <div style={{
                        display: 'flex',
                        transition: 'transform 0.5s ease',
                        transform: `translateX(-${currentSlide * 100}%)`
                    }}>
                        {gallery.map((img: string, idx: number) => (
                            <div key={idx} style={{ minWidth: '100%', aspectRatio: '16/9' }}>
                                <img src={img} alt={`Equipo ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={() => setCurrentSlide((prev: number) => prev === 0 ? gallery.length - 1 : prev - 1)}
                        style={{
                            position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
                            width: 48, height: 48, borderRadius: '50%', border: 'none',
                            backgroundColor: 'rgba(0,0,0,0.5)', color: 'white', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <button
                        onClick={() => setCurrentSlide((prev: number) => (prev + 1) % gallery.length)}
                        style={{
                            position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
                            width: 48, height: 48, borderRadius: '50%', border: 'none',
                            backgroundColor: 'rgba(0,0,0,0.5)', color: 'white', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                    >
                        <ChevronRight size={24} />
                    </button>
                </div>
            </div>
        </section>
    );
}

export function VideoSection({ config }: BaseProps) {
    const { colors, videos } = config;
    if (!videos || videos.length === 0) return null;

    return (
        <section style={{ padding: '120px 48px' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 700, marginBottom: 48, textAlign: 'center', color: 'white' }}>
                    Mira nuestros <span style={{ color: colors.yellow }}>videos</span>
                </h2>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
                    {videos.map((video: { id: string; title: string }, idx: number) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            style={{ borderRadius: 24, overflow: 'hidden', backgroundColor: colors.purple }}
                        >
                            <iframe
                                width="100%"
                                height="280"
                                src={`https://www.youtube.com/embed/${video.id}`}
                                title={video.title}
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                style={{ display: 'block' }}
                            />
                            <div style={{ padding: 20 }}>
                                <h4 style={{ fontWeight: 600, fontSize: 16, color: 'white' }}>{video.title}</h4>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}

export function JobsSection({
    config,
    allJobs,
    filteredJobs,
    brands,
    selectedBrand,
    setSelectedBrand,
    onFilterResults,
    holdingSlug
}: {
    config: any;
    allJobs: any[];
    filteredJobs: any[];
    brands: any[];
    selectedBrand: string | null;
    setSelectedBrand: (id: string | null) => void;
    onFilterResults: (filtered: any[], coords: any) => void;
    holdingSlug: string;
}) {
    const { colors } = config;
    const [selectedDept, setSelectedDept] = React.useState('');
    const [selectedProv, setSelectedProv] = React.useState('');
    const [selectedDist, setSelectedDist] = React.useState('');
    const [availableProvinces, setAvailableProvinces] = React.useState<string[]>([]);
    const [availableDistricts, setAvailableDistricts] = React.useState<string[]>([]);

    const [viewMode, setViewMode] = React.useState<'list' | 'districts'>('list');
    const [geoStatus, setGeoStatus] = React.useState<'idle' | 'loading' | 'success' | 'failed'>('idle');
    const [userCoords, setUserCoords] = React.useState<{ lat: number; lng: number } | null>(null);

    // Location dependency updates
    React.useEffect(() => {
        if (selectedDept) {
            setAvailableProvinces(getProvincesByDepartment(selectedDept).map(p => p.name));
            setAvailableDistricts([]);
            setSelectedProv('');
            setSelectedDist('');
        }
    }, [selectedDept]);

    React.useEffect(() => {
        if (selectedDept && selectedProv) {
            setAvailableDistricts(getDistrictsByProvince(selectedDept, selectedProv).map(d => d.name));
            setSelectedDist('');
        }
    }, [selectedDept, selectedProv]);

    // Initial check for geolocation
    React.useEffect(() => {
        if ("geolocation" in navigator) {
            setGeoStatus('loading');
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
                    setUserCoords(coords);
                    setGeoStatus('success');
                    // Filter initially for 10km
                    const nearby = allJobs.filter(job => {
                        if (!job.storeCoordinates) return false;
                        const dist = formatDistance(calculateDistanceKm(coords, job.storeCoordinates));
                        const distNum = calculateDistanceKm(coords, job.storeCoordinates);
                        job.distance = distNum;
                        return distNum <= 10;
                    }).sort((a, b) => (a.distance || 0) - (b.distance || 0));

                    onFilterResults(nearby, coords);
                },
                () => {
                    setGeoStatus('failed');
                },
                { timeout: 5000 }
            );
        }
    }, []);

    const departamentos = React.useMemo(() => {
        const deps = new Set(allJobs.map(j => j.tiendaDepartamento).filter(Boolean).map(d => d.toUpperCase()));
        const list = Array.from(deps).sort();
        // Fallback to full list if data is incomplete but we want filters enabled
        if (list.length === 0) return getDepartmentNames();
        return list;
    }, [allJobs]);

    // List view filters
    const displayJobs = React.useMemo(() => {
        let list = [...allJobs];
        if (selectedBrand) list = list.filter(j => j.marcaId === selectedBrand);
        if (selectedDept) list = list.filter(j => j.tiendaDepartamento === selectedDept);
        if (selectedProv) list = list.filter(j => j.tiendaProvincia === selectedProv);
        if (selectedDist) list = list.filter(j => j.tiendaDistrito === selectedDist);
        return list;
    }, [allJobs, selectedBrand, selectedDept, selectedProv, selectedDist]);

    // Summary view filters (districts)
    const jobsByDistrict = React.useMemo(() => {
        const filtered = allJobs.filter(j => 
            (!selectedDept || j.tiendaDepartamento === selectedDept) &&
            (!selectedProv || j.tiendaProvincia === selectedProv) &&
            (!selectedBrand || j.marcaId === selectedBrand)
        );
        const groups: Record<string, any[]> = {};
        filtered.forEach(job => {
            const dist = job.tiendaDistrito || 'Otros';
            if (!groups[dist]) groups[dist] = [];
            groups[dist].push(job);
        });
        return groups;
    }, [allJobs, selectedDept, selectedProv, selectedBrand]);

    const selectStyle = {
        padding: '12px 20px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.1)',
        backgroundColor: 'rgba(255,255,255,0.05)', color: 'white',
        fontSize: 14, fontWeight: 700, cursor: 'pointer', outline: 'none', minWidth: 200
    };

    return (
        <section id="vacantes" style={{ padding: '120px 24px', backgroundColor: colors.purpleDeep }}>
            <div style={{ maxWidth: 1000, margin: '0 auto' }}>

                {/* Header Context */}
                <div style={{ textAlign: 'center', marginBottom: 60 }}>
                    <h2 style={{ fontSize: 'clamp(2.5rem, 5vw, 3.5rem)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.04em', color: 'white' }}>
                        Encuentra tu próximo <span style={{ color: colors.yellow }}>Desafío_</span>
                    </h2>

                    {geoStatus === 'success' && userCoords && (
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 8,
                            marginTop: 16, padding: '8px 16px', borderRadius: 99,
                            backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#4ade80',
                            fontSize: 13, fontWeight: 700
                        }}>
                            <Navigation size={14} className="fill-current" />
                            Mostrando vacantes a 10km de tu ubicación
                        </div>
                    )}
                </div>

                {/* Main Filter Control */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginBottom: 48 }}>
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                        gap: 16,
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        padding: 24,
                        borderRadius: 32,
                        border: '1px solid rgba(255,255,255,0.08)'
                    }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <label style={{ fontSize: 10, fontWeight: 900, color: colors.lavender, textTransform: 'uppercase', letterSpacing: '1px', marginLeft: 12 }}>Departamento</label>
                            <select 
                                value={selectedDept}
                                onChange={(e) => setSelectedDept(e.target.value)}
                                style={selectStyle}
                            >
                                <option value="">Todos</option>
                                {departamentos.map(d => <option key={d} value={d} style={{ color: 'black' }}>{d}</option>)}
                            </select>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <label style={{ fontSize: 10, fontWeight: 900, color: colors.lavender, textTransform: 'uppercase', letterSpacing: '1px', marginLeft: 12 }}>Provincia</label>
                            <select 
                                value={selectedProv}
                                onChange={(e) => setSelectedProv(e.target.value)}
                                disabled={!selectedDept}
                                style={{ ...selectStyle, opacity: !selectedDept ? 0.3 : 1 }}
                            >
                                <option value="">Todas</option>
                                {availableProvinces.map(p => <option key={p} value={p} style={{ color: 'black' }}>{p}</option>)}
                            </select>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <label style={{ fontSize: 10, fontWeight: 900, color: colors.lavender, textTransform: 'uppercase', letterSpacing: '1px', marginLeft: 12 }}>Distrito</label>
                            <select 
                                value={selectedDist}
                                onChange={(e) => setSelectedDist(e.target.value)}
                                disabled={!selectedProv}
                                style={{ ...selectStyle, opacity: !selectedProv ? 0.3 : 1 }}
                            >
                                <option value="">Todos</option>
                                {availableDistricts.map(d => <option key={d} value={d} style={{ color: 'black' }}>{d}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Quick Geo Status if active */}
                    {geoStatus === 'success' && !selectedDept && (
                        <div style={{ textAlign: 'center' }}>
                            <button 
                                onClick={() => {
                                    setSelectedDept('');
                                    setSelectedProv('');
                                    setSelectedDist('');
                                    onFilterResults(allJobs.filter(j => j.distance <= 10), userCoords);
                                }}
                                style={{ color: colors.yellow, fontSize: 12, fontWeight: 800, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                            >
                                Restaurar filtros por cercanía GPS
                            </button>
                        </div>
                    )}
                </div>

                {/* Content Rendering Logic */}
                {viewMode === 'districts' && selectedDept && !selectedDist ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Object.keys(jobsByDistrict).sort().map(dist => (
                            <motion.div
                                key={dist}
                                whileHover={{ scale: 1.02, y: -4, borderColor: colors.yellow }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => { setSelectedDist(dist); setViewMode('list'); }}
                                style={{
                                    padding: '32px 24px', borderRadius: 32, cursor: 'pointer',
                                    backgroundColor: 'rgba(255,255,255,0.03)', border: '2px solid rgba(255,255,255,0.08)',
                                    display: 'flex', flexDirection: 'column', gap: 12,
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                                    isolation: 'isolate'
                                }}
                            >
                                <div style={{
                                    width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.yellow,
                                    marginBottom: 8
                                }}>
                                    <MapPin size={24} />
                                </div>
                                <div className="flex-1">
                                    <h4 style={{ fontSize: 22, fontWeight: 900, color: 'white', textTransform: 'uppercase', fontStyle: 'italic', letterSpacing: '-0.02em', lineHeight: 1 }}>{dist}</h4>
                                    <p style={{ fontSize: 13, fontWeight: 800, color: colors.yellow, marginTop: 8, textTransform: 'uppercase', letterSpacing: '1px' }}>{jobsByDistrict[dist].length} VACANTES</p>
                                </div>
                                <div style={{
                                    width: '100%', padding: '12px', borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 11, fontWeight: 900,
                                    textTransform: 'uppercase', letterSpacing: '1px', gap: 6
                                }}>
                                    Ver todas <ChevronRight size={14} />
                                </div>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: 20 }}>
                        {displayJobs.length === 0 ? (
                            <div style={{ padding: '80px 24px', textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 40, border: '2px dashed rgba(255,255,255,0.05)' }}>
                                <div style={{ 
                                    width: 80, height: 80, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.05)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: colors.yellow 
                                }}>
                                    <MapPin size={40} />
                                </div>
                                <h3 style={{ fontSize: 24, fontWeight: 900, color: 'white', marginBottom: 12, fontStyle: 'italic', textTransform: 'uppercase' }}>Mira las tiendas con vacantes según ubicación</h3>
                                <p style={{ fontSize: 16, color: colors.lavender, maxWidth: 500, margin: '0 auto 32px', fontWeight: 600 }}>No encontramos vacantes a 10km de tu posición actual, prueba seleccionando tu ubicación manualmente.</p>
                                
                                <button
                                    onClick={() => { setSelectedDept(''); setSelectedProv(''); setSelectedDist(''); setViewMode('list'); }}
                                    style={{ 
                                        padding: '16px 40px', borderRadius: 99, backgroundColor: colors.yellow, color: colors.purpleDeep,
                                        fontWeight: 900, border: 'none', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '1px',
                                        boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
                                    }}
                                >
                                    MOSTRAR TODAS LAS POSICIONES
                                </button>
                            </div>
                        ) : (
                            <>
                                {selectedDist && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                                        <button
                                            onClick={() => { setSelectedDist(''); setViewMode('districts'); }}
                                            style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'white', fontSize: 12, fontWeight: 800, background: 'none', border: 'none', cursor: 'pointer' }}
                                        >
                                            <ChevronLeft size={16} /> VOLVER A DISTRITOS EN {selectedDept.toUpperCase()}
                                        </button>
                                    </div>
                                )}
                                {displayJobs.map((job, idx) => (
                                    <motion.div
                                        key={job.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                    >
                                        <Link
                                            href={`/portal/vacante/${job.id}?holding=${holdingSlug}&distrito=${job.tiendaDistrito}`}
                                            style={{ textDecoration: 'none' }}
                                        >
                                            <div
                                                className="job-card-hover"
                                                style={{
                                                    padding: '32px 40px', borderRadius: 40,
                                                    backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
                                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                    boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
                                                }}
                                            >
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                                                        <span style={{
                                                            backgroundColor: colors.yellow, color: colors.purpleDeep,
                                                            padding: '6px 14px', borderRadius: 99, fontSize: 10, fontWeight: 900, textTransform: 'uppercase',
                                                            letterSpacing: '1px'
                                                        }}>
                                                            {job.marcaNombre || config.name}
                                                        </span>
                                                        {job.distance && (
                                                            <span style={{ fontSize: 11, fontWeight: 800, color: '#4ade80', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                <Navigation size={10} className="fill-current" /> A {Math.round(job.distance * 10) / 10} KM DE TI
                                                            </span>
                                                        )}
                                                    </div>
                                                    <h3 style={{ fontSize: 26, fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.02em', color: 'white', marginBottom: 12 }}>
                                                        {job.posicion || job.titulo}
                                                    </h3>
                                                    <div style={{ display: 'flex', gap: 24, color: colors.lavender, fontSize: 14, fontWeight: 700 }}>
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                            <MapPin size={16} style={{ color: colors.yellow }} /> {job.tiendaNombre} • {job.tiendaDistrito || 'Sede'}
                                                        </span>
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                            <Clock size={16} style={{ color: colors.yellow }} /> {job.turno || 'Rotativo'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div style={{
                                                    width: 64, height: 64, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
                                                    transition: 'all 0.3s'
                                                }} className="arrow-circle">
                                                    <ChevronRight size={28} />
                                                </div>
                                            </div>
                                        </Link>
                                    </motion.div>
                                ))}
                            </>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
}

export function UneteSection({ config, holdingSlug }: { config: any, holdingSlug: string }) {
    const { colors } = config;
    return (
        <section style={{ padding: '0 24px 80px' }}>
            <div style={{ maxWidth: 900, margin: '0 auto' }}>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    style={{
                        padding: 48, borderRadius: 40, textAlign: 'center',
                        backgroundColor: colors.yellow, color: colors.purpleDeep,
                        position: 'relative', overflow: 'hidden'
                    }}
                >
                    <Zap size={60} style={{ position: 'absolute', top: -10, right: -10, opacity: 0.1, transform: 'rotate(20deg)' }} />
                    <h3 style={{ fontSize: 32, fontWeight: 900, marginBottom: 16, letterSpacing: '-0.02em', fontStyle: 'italic' }}>
                        ¿QUIERES FORMAR PARTE DE NUESTRO EQUIPO?
                    </h3>
                    <p style={{ fontSize: 18, fontWeight: 600, maxWidth: 500, margin: '0 auto 32px', lineHeight: 1.5, opacity: 0.8 }}>
                        Déjanos tu perfil en nuestra base de datos y te contactaremos cuando tengamos una vacante ideal para ti.
                    </p>
                    <Link
                        href={`/empleos/${holdingSlug}/unete`}
                        style={{
                            display: 'inline-flex', padding: '20px 48px', borderRadius: 999,
                            backgroundColor: colors.purpleDeep, color: 'white',
                            fontSize: 16, fontWeight: 800, textDecoration: 'none',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
                        }}
                    >
                        ÚNETE A NOSOTROS <ArrowRight size={20} style={{ marginLeft: 12 }} />
                    </Link>
                </motion.div>
            </div>
        </section>
    );
}

export function FooterSection({ config, jobsCount }: { config: any, jobsCount: number }) {
    const { colors, name } = config;
    return (
        <footer style={{ padding: '60px 24px', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                <p style={{ fontSize: 14, fontWeight: 500, color: colors.lavender }}>
                    © {new Date().getFullYear()} {name}. Powered by <span style={{ fontWeight: 700, color: colors.yellow }}>LIAH</span>
                </p>
                <p style={{ fontSize: 10, opacity: 0.3, marginTop: 12, letterSpacing: '1px', color: 'white' }}>
                    PORTAL V1.1.5 • {jobsCount} VACANCIES LOADED
                </p>
            </div>
        </footer>
    );
}
