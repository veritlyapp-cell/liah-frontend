'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, MapPin, Clock, Zap, ChevronRight, ChevronLeft, Heart, ChefHat, Search, Play } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import Link from 'next/link';

// ============ TIPOS ============
interface BrandConfig {
    name: string;
    logo_url: string;
    colors: {
        purple: string;
        purpleDeep: string;
        yellow: string;
        lavender: string;
    };
    hero: {
        title_line1: string;
        title_line2: string;
        subtitle: string;
        cta_text: string;
    };
    culture: {
        main_title: string;
        main_description: string;
        secondary_title: string;
        secondary_description: string;
    };
    gallery?: string[];
    videos?: { id: string; title: string }[];
}

interface Job {
    id: string;
    titulo: string;
    ubicacion?: string;
    modalidad?: string;
    tipoContrato?: string;
    salarioMin?: number;
    salarioMax?: number;
    createdAt: any;
}

// ============ CONFIGURACIONES POR HOLDING ============
const HOLDING_CONFIGS: Record<string, BrandConfig> = {
    'llamagas': {
        name: 'Llamagas',
        logo_url: '/logos/llamagas-full-logo.png',
        colors: {
            purple: '#572483',
            purpleDeep: '#3D1C5C',
            yellow: '#FFB800',
            lavender: '#E0CFF2'
        },
        hero: {
            title_line1: 'TU FUTURO',
            title_line2: 'EMPIEZA AQUÍ.',
            subtitle: 'Únete a la familia Llamagas. Más de 40 años llevando energía confiable a todo el Perú.',
            cta_text: 'VER POSICIONES'
        },
        culture: {
            main_title: 'Energía que Transforma',
            main_description: 'Forma parte de la empresa líder en el sector energético del país.',
            secondary_title: 'Presencia Nacional',
            secondary_description: 'Trabaja cerca de casa con nuestras sedes en todo el Perú.'
        },
        gallery: [
            'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=600',
            'https://images.unsplash.com/photo-1552664730-d307ca884978?w=600',
            'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=600',
            'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600'
        ],
        videos: [
            { id: 'KaTPzl88o3I', title: 'Conoce Llamagas' },
            { id: 'zgDw67X3XRI', title: 'Trabaja con nosotros' }
        ]
    },
    'ngr': {
        name: 'NGR',
        logo_url: '/logos/ngr-logo.png',
        colors: {
            purple: '#1A1A1A',
            purpleDeep: '#0A0A0A',
            yellow: '#FF6B35',
            lavender: '#A0A0A0'
        },
        hero: {
            title_line1: 'SABOR Y',
            title_line2: 'PASIÓN.',
            subtitle: 'Somos el grupo gastronómico más grande del Perú. Bembos, Papa Johns, Popeyes y más.',
            cta_text: 'EXPLORAR VACANTES'
        },
        culture: {
            main_title: 'Gastronomía de Clase Mundial',
            main_description: '6 marcas que inspiran. 8,000 colaboradores apasionados.',
            secondary_title: 'Sin Experiencia',
            secondary_description: 'Solo necesitas actitud y ganas de aprender.'
        },
        gallery: [
            'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600',
            'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600',
            'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=600',
            'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=600'
        ],
        videos: [
            { id: 'dQw4w9WgXcQ', title: 'Conoce NGR' },
            { id: 'dQw4w9WgXcQ', title: 'Trabaja en nuestras marcas' }
        ]
    }
};

// ============ COMPONENTE PRINCIPAL ============
export default function PremiumCareerPortal() {
    const params = useParams();
    const searchParams = useSearchParams();
    const holdingSlug = (params.holdingSlug as string || searchParams.get('holding') || 'llamagas').toLowerCase();

    const [loading, setLoading] = useState(true);
    const [config, setConfig] = useState<BrandConfig | null>(null);
    const [jobs, setJobs] = useState<Job[]>([]);
    const [currentSlide, setCurrentSlide] = useState(0);

    useEffect(() => {
        loadData();
    }, [holdingSlug]);

    async function loadData() {
        const predefinedConfig = HOLDING_CONFIGS[holdingSlug];

        if (predefinedConfig) {
            setConfig(predefinedConfig);
            // Set page title immediately
            document.title = `${predefinedConfig.name} - Trabaja con Nosotros`;
        } else {
            setConfig({
                name: holdingSlug.charAt(0).toUpperCase() + holdingSlug.slice(1),
                logo_url: '',
                colors: {
                    purple: '#1E1B4B',
                    purpleDeep: '#0F0D1A',
                    yellow: '#4F46E5',
                    lavender: '#A5A3B3'
                },
                hero: {
                    title_line1: 'ÚNETE A',
                    title_line2: 'NOSOTROS.',
                    subtitle: 'Descubre oportunidades increíbles.',
                    cta_text: 'VER POSICIONES'
                },
                culture: {
                    main_title: 'Crecimiento Profesional',
                    main_description: 'Desarrolla tu carrera con nosotros.',
                    secondary_title: 'Ubicación Ideal',
                    secondary_description: 'Trabaja desde donde quieras.'
                }
            });
        }

        try {
            const holdingsQuery = query(collection(db, 'holdings'), where('slug', '==', holdingSlug));
            const holdingsSnap = await getDocs(holdingsQuery);

            let holdingId = holdingSlug;
            if (!holdingsSnap.empty) holdingId = holdingsSnap.docs[0].id;

            const jobsQuery = query(
                collection(db, 'talent_jobs'),
                where('holdingId', '==', holdingId),
                where('status', '==', 'published')
            );
            const jobsSnap = await getDocs(jobsQuery);
            let loadedJobs = jobsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Job[];

            // Filter out confidential jobs
            loadedJobs = loadedJobs.filter(j => !(j as any).confidencial);

            loadedJobs.sort((a, b) => {
                const dateA = a.createdAt?.toDate?.() || new Date(0);
                const dateB = b.createdAt?.toDate?.() || new Date(0);
                return dateB.getTime() - dateA.getTime();
            });
            setJobs(loadedJobs);
        } catch (e) {
            console.log('No jobs found');
        }

        setLoading(false);
    }

    useEffect(() => {
        if (config?.name) document.title = `${config.name} - Trabaja con Nosotros`;
    }, [config?.name]);

    // Auto-slide gallery
    useEffect(() => {
        if (!config?.gallery?.length) return;
        const timer = setInterval(() => {
            setCurrentSlide(prev => (prev + 1) % (config.gallery?.length || 1));
        }, 4000);
        return () => clearInterval(timer);
    }, [config?.gallery?.length]);

    if (loading || !config) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A0A0A' }}>
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    style={{ width: 48, height: 48, border: '4px solid rgba(255,255,255,0.2)', borderTopColor: 'white', borderRadius: '50%' }}
                />
            </div>
        );
    }

    const { colors, hero, culture, name, logo_url, gallery, videos } = config;

    return (
        <div style={{ minHeight: '100vh', color: 'white', fontFamily: "'Inter', sans-serif", backgroundColor: colors.purpleDeep }}>

            {/* NAVBAR */}
            <nav style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '24px 48px', zIndex: 20 }}>
                <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        {logo_url && <img src={logo_url} alt={name} style={{ height: 80, objectFit: 'contain' }} />}
                        <span style={{ fontSize: 28, fontWeight: 800, color: colors.yellow, letterSpacing: '-0.02em' }}>{name}</span>
                    </div>
                    <a href="#vacantes" style={{
                        padding: '10px 24px',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: 999,
                        fontSize: 14,
                        fontWeight: 500,
                        color: colors.lavender,
                        textDecoration: 'none'
                    }}>
                        Ver Vacantes
                    </a>
                </div>
            </nav>

            {/* 1. HERO SECTION - CENTRADO TOTAL */}
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
                            fontStyle: 'italic'
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
                            color: colors.purpleDeep,
                            textDecoration: 'none',
                            fontSize: 16
                        }}
                    >
                        {hero.cta_text} <ArrowRight size={22} />
                    </motion.a>
                </div>
            </header>

            {/* 2. CULTURA / BENTO GRID */}
            <section style={{ padding: '120px 48px' }}>
                <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                    <h2 style={{ fontSize: 'clamp(1.75rem, 3vw, 2rem)', fontWeight: 700, marginBottom: 48, fontStyle: 'italic' }}>
                        ¿Por qué <span style={{ color: colors.yellow }}>{name}?</span>
                    </h2>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
                        {/* Tarjeta Principal */}
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

                        {/* Tarjeta Secundaria */}
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
                            <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>{culture.secondary_title}</h3>
                            <p style={{ fontSize: 15, lineHeight: 1.6, color: colors.lavender }}>
                                {culture.secondary_description}
                            </p>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* 3. GALERÍA DE FOTOS */}
            {gallery && gallery.length > 0 && (
                <section style={{ padding: '80px 24px', backgroundColor: colors.purple }}>
                    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                        <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 700, marginBottom: 48, textAlign: 'center' }}>
                            Conoce nuestro <span style={{ color: colors.yellow }}>equipo</span>
                        </h2>

                        {/* Carousel */}
                        <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 24 }}>
                            <div style={{
                                display: 'flex',
                                transition: 'transform 0.5s ease',
                                transform: `translateX(-${currentSlide * 100}%)`
                            }}>
                                {gallery.map((img, idx) => (
                                    <div key={idx} style={{ minWidth: '100%', aspectRatio: '16/9' }}>
                                        <img src={img} alt={`Equipo ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    </div>
                                ))}
                            </div>

                            {/* Controls */}
                            <button
                                onClick={() => setCurrentSlide(prev => prev === 0 ? gallery.length - 1 : prev - 1)}
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
                                onClick={() => setCurrentSlide(prev => (prev + 1) % gallery.length)}
                                style={{
                                    position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
                                    width: 48, height: 48, borderRadius: '50%', border: 'none',
                                    backgroundColor: 'rgba(0,0,0,0.5)', color: 'white', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}
                            >
                                <ChevronRight size={24} />
                            </button>

                            {/* Dots */}
                            <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 8 }}>
                                {gallery.map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setCurrentSlide(idx)}
                                        style={{
                                            width: 10, height: 10, borderRadius: '50%', border: 'none', cursor: 'pointer',
                                            backgroundColor: idx === currentSlide ? colors.yellow : 'rgba(255,255,255,0.5)'
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* 4. VIDEOS */}
            {videos && videos.length > 0 && (
                <section style={{ padding: '120px 48px' }}>
                    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                        <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 700, marginBottom: 48, textAlign: 'center' }}>
                            Mira nuestros <span style={{ color: colors.yellow }}>videos</span>
                        </h2>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
                            {videos.map((video, idx) => (
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
                                        <h4 style={{ fontWeight: 600, fontSize: 16 }}>{video.title}</h4>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* 5. LISTADO DE VACANTES */}
            <section id="vacantes" style={{ padding: '120px 24px 160px' }}>
                <div style={{ maxWidth: 900, margin: '0 auto' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 48, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 24 }}>
                        <h2 style={{ fontSize: 'clamp(2rem, 4vw, 2.5rem)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
                            Oportunidades<span style={{ color: colors.yellow }}>_</span>
                        </h2>
                        <span style={{ fontWeight: 700, fontSize: 14, color: colors.yellow }}>
                            {jobs.length} POSICIONES ABIERTAS
                        </span>
                    </div>

                    {jobs.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            style={{ padding: 80, borderRadius: 32, textAlign: 'center', backgroundColor: colors.purple, border: '1px solid rgba(255,255,255,0.05)' }}
                        >
                            <Search size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                            <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>No hay vacantes disponibles</h3>
                            <p style={{ color: colors.lavender }}>Vuelve pronto para ver nuevas oportunidades</p>
                        </motion.div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {jobs.slice(0, 6).map((job, index) => (
                                <motion.div
                                    key={job.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    whileHover={{ x: 10 }}
                                >
                                    <Link
                                        href={`/careers/${job.id}`}
                                        style={{
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            gap: 24,
                                            padding: 32,
                                            borderRadius: 24,
                                            backgroundColor: colors.purple,
                                            border: '1px solid rgba(255,255,255,0.05)',
                                            textDecoration: 'none',
                                            color: 'white',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <div>
                                            <h4 style={{ fontSize: 'clamp(1.25rem, 3vw, 1.75rem)', fontWeight: 900, fontStyle: 'italic', marginBottom: 8 }}>
                                                {job.titulo}
                                            </h4>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 14, fontWeight: 500, color: colors.lavender }}>
                                                {job.modalidad && (
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={16} /> {job.modalidad}</span>
                                                )}
                                                {job.tipoContrato && (
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={16} /> {job.tipoContrato}</span>
                                                )}
                                            </div>
                                            {(job.salarioMin || job.salarioMax) && (
                                                <p style={{ marginTop: 12, fontWeight: 700, color: colors.yellow }}>
                                                    S/ {job.salarioMin?.toLocaleString()}{job.salarioMax && ` - ${job.salarioMax.toLocaleString()}`}
                                                </p>
                                            )}
                                        </div>
                                        <div style={{
                                            width: 56, height: 56, borderRadius: '50%',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            flexShrink: 0
                                        }}>
                                            <ChevronRight size={28} />
                                        </div>
                                    </Link>
                                </motion.div>
                            ))}

                            {/* Ver todas las vacantes button */}
                            {jobs.length > 6 && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    whileInView={{ opacity: 1 }}
                                    style={{ textAlign: 'center', marginTop: 32 }}
                                >
                                    <Link
                                        href={`/empleos/${holdingSlug}/vacantes`}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 8,
                                            padding: '16px 32px',
                                            backgroundColor: colors.yellow,
                                            color: colors.purpleDeep,
                                            borderRadius: 12,
                                            fontWeight: 700,
                                            fontSize: 16,
                                            textDecoration: 'none',
                                            boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
                                        }}
                                    >
                                        Ver todas las vacantes ({jobs.length}) →
                                    </Link>
                                </motion.div>
                            )}
                        </div>
                    )}
                </div>
            </section>

            {/* FOOTER */}
            <footer style={{ padding: '60px 24px', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                    <p style={{ fontSize: 14, fontWeight: 500, color: colors.lavender }}>
                        © {new Date().getFullYear()} {name}. Powered by <span style={{ fontWeight: 700, color: colors.yellow }}>LIAH</span>
                    </p>
                </div>
            </footer>
        </div>
    );
}
