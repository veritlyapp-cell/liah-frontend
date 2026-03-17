'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import {
    HeroSection,
    CultureSection,
    BrandsSection,
    GallerySection,
    VideoSection,
    JobsSection,
    UneteSection,
    FooterSection
} from '@/components/portal/PortalComponents';

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
    showCompanyInfo?: boolean;
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
    },
    'mainframe': {
        name: 'Mainframe',
        logo_url: '/icons/icon-512x512.png', // Fallback to PWA icon
        colors: {
            purple: '#0F172A',
            purpleDeep: '#020617',
            yellow: '#22D3EE',
            lavender: '#94A3B8'
        },
        hero: {
            title_line1: 'CONECTANDO EL',
            title_line2: 'FUTURO.',
            subtitle: 'Únete al equipo que está redefiniendo la infraestructura tecnológica del mañana.',
            cta_text: 'EXPLORAR'
        },
        culture: {
            main_title: 'Innovación sin Límites',
            main_description: 'Trabajamos en proyectos de alto impacto que desafían lo convencional.',
            secondary_title: 'Cultura Tech',
            secondary_description: 'Entorno ágil, remoto y orientado a resultados.'
        },
        gallery: [
            'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600',
            'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600',
            'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600'
        ],
        videos: [
            { id: 'y8Xv4T0ReVw', title: 'Life at Mainframe' }
        ]
    },
    'tambo': {
        name: 'Tambo',
        logo_url: 'https://firebasestorage.googleapis.com/v0/b/botwhatsapp-5dac9.firebasestorage.app/o/logos%2Fholdings%2Ftambo_1772774260917.jpeg?alt=media&token=89406e84-e4b0-49ff-ad16-0bf9f220f0bd',
        colors: {
            purple: '#a51890',
            purpleDeep: '#5b1050',
            yellow: '#fce024',
            lavender: '#fdf3fa'
        },
        hero: {
            title_line1: 'ÚNETE A',
            title_line2: 'TAMBO',
            subtitle: 'Somos la Tienda del Perú. Elaboramos y ofrecemos a nuestros clientes productos variados de calidad a precios accesibles.',
            cta_text: 'VER POSICIONES'
        },
        culture: {
            main_title: 'El Sabor de Aprender',
            main_description: 'Construye tu carrera en la cadena de tiendas más grande del país.',
            secondary_title: 'Siempre Cerca',
            secondary_description: 'Más de 400 tiendas esperándote.'
        },
        gallery: [
            'https://firebasestorage.googleapis.com/v0/b/botwhatsapp-5dac9.firebasestorage.app/o/branding%2Ftambo%2Fgallery%2F1772774819360_tambo2.webp?alt=media&token=5d1c9c95-1e2e-4300-b684-0b50db54cdae',
            'https://firebasestorage.googleapis.com/v0/b/botwhatsapp-5dac9.firebasestorage.app/o/branding%2Ftambo%2Fgallery%2F1772774821603_tambo1.jpeg?alt=media&token=ed3efc0e-2555-47b5-bc24-5b92f8cd4dda'
        ],
        videos: [
            { id: 'W9d02V0ZEzs', title: 'Trabaja en Tambo' }
        ]
    }
};

// ============ COMPONENTE PRINCIPAL ============
export default function PremiumCareerPortal() {
    const params = useParams();
    const searchParams = useSearchParams();
    const holdingSlug = (params?.holdingSlug as string || searchParams.get('holding') || 'ngr').toLowerCase();

    const [loading, setLoading] = useState(true);
    const [config, setConfig] = useState<BrandConfig | null>(HOLDING_CONFIGS[holdingSlug] || null);
    const [brands, setBrands] = useState<any[]>([]);
    const [allJobs, setAllJobs] = useState<any[]>([]);
    const [filteredJobs, setFilteredJobs] = useState<any[]>([]);
    const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
    const [userCoords, setUserCoords] = useState<{ lat: number, lng: number } | null>(null);
    const [currentSlide, setCurrentSlide] = useState(0);

    useEffect(() => {
        // Add auth state listener for debugging public vs private access
        import('@/lib/firebase').then(({ auth }) => {
            const unsub = auth.onAuthStateChanged((user: any) => {
                console.log('[DEBUG] Auth State:', user ? `Logged in as ${user.email}` : 'Public User');
            });
            return unsub;
        });

        console.log('[DEBUG] Portal Version: 1.1.5 - Starting data load');
        loadData();
    }, [holdingSlug]);

    async function loadData() {
        if (!config && HOLDING_CONFIGS[holdingSlug]) {
            setConfig(HOLDING_CONFIGS[holdingSlug]);
        }

        let finalConfig: any = null;

        try {
            const holdingsQuery = query(collection(db, 'holdings'), where('slug', '==', holdingSlug));
            let holdingsSnap = await getDocs(holdingsQuery);

            let holdingDocData = null;
            let holdingId = holdingSlug;

            if (!holdingsSnap.empty) {
                holdingId = holdingsSnap.docs[0].id;
                holdingDocData = holdingsSnap.docs[0].data();
            } else {
                // Fallback: Try fetching by ID directly
                const { getDoc, doc } = await import('firebase/firestore');
                const directDoc = await getDoc(doc(db, 'holdings', holdingSlug));
                if (directDoc.exists()) {
                    holdingId = directDoc.id;
                    holdingDocData = directDoc.data();
                }
            }

            // STICK TO EXACT SLUG: This prevents leakage from NGR into others
            const possibleHoldingIds = [holdingId, holdingSlug].filter(Boolean);

            // 1. Fetch Brands
            const brandsSnap = await getDocs(query(collection(db, 'marcas'), where('holdingId', 'in', possibleHoldingIds)));
            const brandsList = brandsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setBrands(brandsList);

            // 1b. Fetch Stores to map location to RQs efficiently
            const storesSnap = await getDocs(query(collection(db, 'tiendas'), where('holdingId', 'in', possibleHoldingIds)));
            const storesMap: Record<string, any> = {};
            storesSnap.docs.forEach(doc => {
                storesMap[doc.id] = doc.data();
            });

            // Apply branding config if available
            console.log("[DEBUG] Holding Doc loaded:", holdingId, !!holdingDocData);

            if (holdingDocData) {
                const b = holdingDocData.config?.branding || holdingDocData.branding || {}; // Catch both locations
                console.log("[DEBUG] Branding found:", b);

                const holdingData = holdingDocData;
                const baseConfig = HOLDING_CONFIGS[holdingSlug] || {
                    name: holdingData.nombre || holdingSlug,
                    logo_url: holdingData.logoUrl || '',
                    colors: { purple: '#1E1B4B', purpleDeep: '#0F0D1A', yellow: '#4F46E5', lavender: '#A5A3B3' },
                    hero: { title_line1: 'ÚNETE A', title_line2: 'NOSOTROS.', subtitle: 'Descubre oportunidades.', cta_text: 'VER' },
                    culture: { main_title: 'Crecimiento', main_description: 'Desarrolla tu carrera', secondary_title: 'Sedes', secondary_description: 'Nacional' },
                    gallery: [],
                    videos: []
                };

                finalConfig = {
                    ...baseConfig,
                    name: holdingData.nombre || baseConfig.name,
                    logo_url: holdingData.logoUrl || baseConfig.logo_url,
                    colors: {
                        ...baseConfig.colors,
                        purple: b.primaryColor || baseConfig.colors.purple,
                        purpleDeep: b.secondaryColor || baseConfig.colors.purpleDeep,
                        yellow: b.primaryColor || baseConfig.colors.yellow, // Use primary for accents too
                    },
                    hero: {
                        ...baseConfig.hero,
                        title_line1: (b.phrases?.[0] || baseConfig.hero?.title_line1 || '').toUpperCase(),
                        title_line2: (b.phrases?.[1] || (b.phrases?.[0] ? '' : baseConfig.hero?.title_line2) || '').toUpperCase(),
                        subtitle: b.description || baseConfig.hero?.subtitle,
                    },
                    culture: {
                        ...baseConfig.culture,
                        main_title: b.cultureTitle || baseConfig.culture?.main_title,
                        main_description: b.cultureDescription || baseConfig.culture?.main_description,
                        secondary_title: b.secondaryTitle || baseConfig.culture?.secondary_title,
                        secondary_description: b.secondaryDescription || baseConfig.culture?.secondary_description
                    },
                    gallery: b.gallery?.length ? b.gallery : baseConfig.gallery,
                    videos: b.videos?.length ? b.videos : baseConfig.videos,
                    showCompanyInfo: b.showCompanyInfo !== false
                };
            }

            let internalConfigSet = !!holdingDocData;


            // 2. Fetch Jobs (all sources)
            const allJobsList: any[] = [];

            // a. RQs
            const rqsSnap = await getDocs(query(collection(db, 'rqs'), where('holdingId', 'in', possibleHoldingIds), limit(50)));
            rqsSnap.docs.forEach(doc => {
                const data = doc.data();
                if (data.status === 'recruiting' || data.status === 'approved' || data.estado === 'aprobado' || data.status === 'activo' || data.status === 'active' || data.status === 'published') {
                    const job: any = {
                        id: doc.id,
                        titulo: data.puesto || data.posicion || data.posicionNombre || data.title || 'Vacante',
                        tiendaNombre: data.tiendaNombre || 'Sede Central',
                        tiendaDistrito: data.distrito || data.tiendaDistrito || '',
                        tiendaProvincia: data.provincia || '',
                        tiendaDepartamento: data.departamento || '',
                        storeCoordinates: data.storeCoordinates || data.ubicacion || null,
                        marcaId: data.marcaId,
                        marcaNombre: data.marcaNombre || '',
                        modalidad: data.modalidad,
                        turno: data.turno,
                        createdAt: data.createdAt,
                        holdingSlug: holdingSlug // Explicitly tag with current holding
                    };

                    // Backfill missing location data from storesMap if needed
                    if (!job.tiendaDistrito && data.tiendaId && storesMap[data.tiendaId]) {
                        const s = storesMap[data.tiendaId];
                        job.tiendaDistrito = s.distrito || '';
                        job.tiendaProvincia = s.provincia || '';
                        job.tiendaDepartamento = s.departamento || '';
                        if (!job.storeCoordinates) job.storeCoordinates = s.location || null;
                    }

                    allJobsList.push(job);
                }
            });

            // b. Talent Jobs
            const talentJobsSnap = await getDocs(query(collection(db, 'talent_jobs'), where('holdingId', 'in', possibleHoldingIds), limit(50)));
            talentJobsSnap.docs.forEach(doc => {
                const data = doc.data();
                if (data.status === 'published' || data.status === 'active' || data.status === 'recruiting') {
                    allJobsList.push({ id: doc.id, holdingSlug: holdingSlug, ...data });
                }
            });

            // c. Nested Vacantes (Legacy/Alternative)
            for (const b of brandsList as any[]) {
                // Double check brand belongs to holding
                if (b.holdingId && !possibleHoldingIds.includes(b.holdingId)) continue;

                try {
                    const vacQuery = query(collection(db, 'marcas', b.id, 'vacantes'), where('estado', '==', 'activo'));
                    const vacSnap = await getDocs(vacQuery);
                    vacSnap.docs.forEach(doc => {
                        const data = doc.data();
                        if (data.active !== false) {
                            allJobsList.push({
                                id: doc.id,
                                marcaId: b.id,
                                holdingSlug: holdingSlug, // Explicitly tag with current holding
                                ...data
                            });
                        }
                    });
                } catch (vacErr) {
                    console.warn(`[DEBUG] Could not fetch vacantes for brand ${b.id}:`, vacErr);
                }
            }

            // Final safety filter before setting state
            const strictlyFilteredJobs = allJobsList.filter(job => {
                // If it came from talent_jobs or rqs, it already has holdingSlug.
                // If it's legacy, we tagged it above.
                return (job.holdingSlug === holdingSlug) || (!job.holdingSlug && holdingSlug === 'ngr');
            });

            console.log(`[DEBUG] Loaded ${strictlyFilteredJobs.length} isolated jobs for ${holdingSlug}`);
            setAllJobs(strictlyFilteredJobs);
            setFilteredJobs(strictlyFilteredJobs);

        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            if (finalConfig) {
                setConfig(finalConfig);
            } else if (HOLDING_CONFIGS[holdingSlug]) {
                setConfig(HOLDING_CONFIGS[holdingSlug]);
            } else {
                setConfig({
                    name: holdingSlug.toUpperCase(),
                    logo_url: '/logo-white.png',
                    colors: { purple: '#1E1B4B', purpleDeep: '#0F0D1A', yellow: '#FF6B35', lavender: '#A5A3B3' },
                    hero: { title_line1: 'ÚNETE A', title_line2: 'NUESTRO EQUIPO', subtitle: 'Descubre nuevas oportunidades laborales.', cta_text: 'VER POSICIONES' },
                    culture: { main_title: 'Crecemos Contigo', main_description: 'Construye una carrera sostenible con nosotros.', secondary_title: 'Múltiples Sedes', secondary_description: 'Trabaja cerca a casa.' },
                    gallery: [],
                    videos: []
                });
            }
            setLoading(false);
        }
    }

    if (loading || !config) {
        return (
            <div style={{ minHeight: '100vh', backgroundColor: config?.colors?.purpleDeep || '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="animate-spin" style={{ width: 40, height: 40, border: '4px solid #333', borderTopColor: config?.colors?.yellow || '#FF6B35', borderRadius: '50%' }} />
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            color: 'white',
            fontFamily: "'Inter', sans-serif",
            backgroundColor: config.colors.purpleDeep,
            // Setup CSS variables for children hover effects
            '--portal-primary': config.colors.purple,
            '--portal-accent': config.colors.yellow,
        } as React.CSSProperties}>
            <style dangerouslySetInnerHTML={{
                __html: `
                .job-card-hover:hover {
                    box-shadow: 0 20px 40px rgba(0,0,0,0.4) !important;
                    border-color: var(--portal-accent) !important;
                    transform: translateY(-4px);
                }
                .job-card-hover:hover .arrow-circle {
                    background-color: var(--portal-accent) !important;
                    color: var(--portal-primary) !important;
                    transform: scale(1.1);
                    border-color: var(--portal-accent) !important;
                }
            `}} />

            {/* NAVBAR */}
            <nav style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '24px 48px', zIndex: 20 }}>
                <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        {config.logo_url && <img src={config.logo_url} alt={config.name} style={{ height: 80, objectFit: 'contain' }} />}
                        <span style={{ fontSize: 28, fontWeight: 800, color: config.colors.yellow, letterSpacing: '-0.02em' }}>{config.name}</span>
                    </div>
                    <a href="#vacantes" style={{
                        padding: '10px 24px',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: 999,
                        fontSize: 14,
                        fontWeight: 500,
                        color: config.colors.lavender,
                        textDecoration: 'none'
                    }}>
                        Ver Vacantes
                    </a>
                </div>
            </nav>

            <HeroSection config={config} onExplore={() => document.getElementById('vacantes')?.scrollIntoView({ behavior: 'smooth' })} />
            
            {config.showCompanyInfo !== false && (
                <>
                    <BrandsSection holdingSlug={holdingSlug} />
                    <CultureSection config={config} />
                    <GallerySection config={config} currentSlide={currentSlide} setCurrentSlide={setCurrentSlide} />
                    <VideoSection config={config} />
                </>
            )}

            <JobsSection
                config={config}
                allJobs={allJobs}
                filteredJobs={filteredJobs}
                brands={brands}
                selectedBrand={selectedBrand}
                setSelectedBrand={setSelectedBrand}
                onFilterResults={(filtered, coords) => {
                    setFilteredJobs(filtered);
                    setUserCoords(coords);
                }}
                holdingSlug={holdingSlug}
            />
            
            {config.showCompanyInfo !== false && (
                <UneteSection config={config} holdingSlug={holdingSlug} />
            )}
            
            <FooterSection config={config} jobsCount={allJobs.length} />

        </div>
    );
}
