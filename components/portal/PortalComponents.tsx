'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ChefHat, Heart, Zap, ArrowRight, MapPin, Clock, ChevronRight, ChevronLeft, Search } from 'lucide-react';
import Link from 'next/link';
import GeolocationJobSearch from './GeolocationJobSearch';
import { formatDistance } from '@/lib/geo/distance-utils';

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

    return (
        <section id="vacantes" style={{ padding: '160px 24px 160px', scrollMarginTop: 0 }}>
            <div style={{ maxWidth: 900, margin: '0 auto' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 48 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyItems: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 24, justifyContent: 'space-between' }}>
                        <h2 style={{ fontSize: 'clamp(2rem, 4vw, 2.5rem)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0, color: 'white' }}>
                            Oportunidades<span style={{ color: colors.yellow }}>_</span>
                        </h2>
                        <span style={{ fontWeight: 700, fontSize: 14, color: colors.yellow }}>
                            {allJobs.length} POSICIONES ABIERTAS
                        </span>
                    </div>

                    {allJobs.length > 0 && [...new Set(allJobs.map(j => j.tiendaNombre).filter(Boolean))].length > 1 && (
                        <div style={{ marginTop: -20 }}>
                            <GeolocationJobSearch
                                allJobs={selectedBrand ? allJobs.filter(j => j.marcaId === selectedBrand) : allJobs}
                                onFilterResults={onFilterResults}
                                theme={holdingSlug === 'ngr' ? 'dark' : 'light'}
                                colors={{
                                    accent: colors.yellow,
                                    bg: holdingSlug === 'ngr' ? colors.purpleDeep : undefined
                                }}
                            />
                        </div>
                    )}

                    {brands.length > 1 && (
                        <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar" style={{ marginTop: 24 }}>
                            <button
                                onClick={() => setSelectedBrand(null)}
                                style={{
                                    padding: '10px 20px', borderRadius: 16, fontSize: 13, fontWeight: 700,
                                    backgroundColor: !selectedBrand ? colors.yellow : 'rgba(255,255,255,0.05)',
                                    color: !selectedBrand ? colors.purpleDeep : colors.lavender,
                                    border: 'none', whiteSpace: 'nowrap', cursor: 'pointer', transition: 'all 0.2s'
                                }}
                            >
                                TODAS LAS MARCAS
                            </button>
                            {brands.map(brand => (
                                <button
                                    key={brand.id}
                                    onClick={() => setSelectedBrand(brand.id)}
                                    style={{
                                        padding: '10px 20px', borderRadius: 16, fontSize: 13, fontWeight: 700,
                                        backgroundColor: selectedBrand === brand.id ? colors.yellow : 'rgba(255,255,255,0.05)',
                                        color: selectedBrand === brand.id ? colors.purpleDeep : colors.lavender,
                                        border: 'none', whiteSpace: 'nowrap', cursor: 'pointer', transition: 'all 0.2s'
                                    }}
                                >
                                    {brand.nombre?.toUpperCase() || brand.id.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {filteredJobs.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        style={{
                            padding: '100px 40px', borderRadius: 40, textAlign: 'center',
                            backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24
                        }}
                    >
                        <div style={{
                            width: 80, height: 80, borderRadius: '50%',
                            backgroundColor: 'rgba(255,255,255,0.05)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <Search size={40} style={{ color: colors.yellow, opacity: 0.5 }} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: 28, fontWeight: 900, marginBottom: 12, color: 'white' }}>
                                No hay vacantes disponibles
                            </h3>
                            <p style={{ color: colors.lavender, fontSize: 18, maxWidth: 400, margin: '0 auto', lineHeight: 1.5 }}>
                                Prueba cambiando los filtros o vuelve más tarde para ver nuevas oportunidades.
                            </p>
                        </div>
                    </motion.div>
                ) : (
                    <div style={{ display: 'grid', gap: 16 }}>
                        {filteredJobs.map((job, idx) => (
                            <motion.div
                                key={job.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                            >
                                <Link
                                    href={`/empleos/aplicar/${job.id}?holding=${holdingSlug}`}
                                    style={{ textDecoration: 'none' }}
                                >
                                    <div style={{
                                        padding: '32px', borderRadius: 32,
                                        backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', cursor: 'pointer',
                                        position: 'relative', overflow: 'hidden'
                                    }}
                                        className="job-card-hover"
                                    >
                                        <div style={{ position: 'relative', zIndex: 2 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                                <span style={{
                                                    padding: '6px 14px', backgroundColor: colors.yellow, color: colors.purpleDeep,
                                                    borderRadius: 99, fontSize: 11, fontWeight: 900, letterSpacing: '1px'
                                                }}>
                                                    {job.marcaId?.toUpperCase() || (job.tiendaNombre?.toLowerCase().includes('bembos') ? 'BEMBOS' : 'NGR')}
                                                </span>
                                                {job.distance && (
                                                    <span style={{ color: colors.lavender, fontSize: 11, fontWeight: 700 }}>
                                                        A {formatDistance(job.distance)} de ti
                                                    </span>
                                                )}
                                            </div>
                                            <h3 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.02em', marginBottom: 8, fontStyle: 'italic', color: 'white' }}>
                                                {job.posicion || job.titulo}
                                            </h3>
                                            <div style={{ display: 'flex', gap: 20, color: colors.lavender, fontSize: 13, fontWeight: 600 }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <MapPin size={14} style={{ color: colors.yellow }} /> {job.tiendaNombre}
                                                </span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <Clock size={14} style={{ color: colors.yellow }} /> {job.turno || 'Rotativo'}
                                                </span>
                                            </div>
                                        </div>
                                        <div style={{ position: 'relative', zIndex: 2 }}>
                                            <div style={{
                                                width: 56, height: 56, borderRadius: '50%',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                transition: 'all 0.3s', color: 'white'
                                            }} className="arrow-circle">
                                                <ChevronRight size={24} />
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
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
