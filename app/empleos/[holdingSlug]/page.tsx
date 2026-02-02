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
            const brandsSnap = await getDocs(query(collection(db, 'brands'), where('holdingId', 'in', possibleHoldingIds)));
            const brandsList = brandsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setBrands(brandsList);

            // Apply branding config if available
            if (holdingDocData) {
                const b = holdingDocData.config?.branding;
                if (b) {
                    const holdingData = holdingDocData;
                    setConfig(prev => {
                        const baseConfig = prev || HOLDING_CONFIGS[holdingSlug] || {
                            name: holdingData.nombre || holdingSlug,
                            logo_url: holdingData.logoUrl || '',
                            colors: { purple: '#1E1B4B', purpleDeep: '#0F0D1A', yellow: '#4F46E5', lavender: '#A5A3B3' },
                            hero: { title_line1: 'ÚNETE A', title_line2: 'NOSOTROS.', subtitle: 'Descubre oportunidades.', cta_text: 'VER' },
                            culture: { main_title: 'Crecimiento', main_description: 'Desarrolla tu carrera', secondary_title: 'Sedes', secondary_description: 'Nacional' }
                        };
                        return {
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
                                title_line1: (b.phrases?.[0] || baseConfig.hero.title_line1 || '').toUpperCase(),
                                title_line2: (b.phrases?.[1] || baseConfig.hero.title_line2 || '').toUpperCase(),
                                subtitle: b.description || baseConfig.hero.subtitle,
                            },
                            gallery: b.gallery?.length ? b.gallery : baseConfig.gallery,
                            videos: b.videos?.length ? b.videos : baseConfig.videos
                        };
                    });
                }
            }

            // 2. Fetch Jobs (all sources)
            const allJobsList: any[] = [];

            // a. RQs
            const rqsSnap = await getDocs(query(collection(db, 'rqs'), where('holdingSlug', '==', holdingSlug), limit(20)));
            rqsSnap.docs.forEach(doc => {
                const data = doc.data();
                if (data.status === 'recruiting') {
                    allJobsList.push({
                        id: doc.id,
                        titulo: data.posicionNombre || data.title,
                        tiendaNombre: data.tiendaNombre || 'Sede Central',
                        tiendaDistrito: data.distrito,
                        marcaId: data.marcaId,
                        modalidad: data.modalidad,
                        turno: data.turno,
                        createdAt: data.createdAt
                    });
                }
            });

            // b. Talent Jobs
            const talentJobsSnap = await getDocs(query(collection(db, 'talent_jobs'), where('holdingSlug', '==', holdingSlug), limit(20)));
            talentJobsSnap.docs.forEach(doc => {
                const data = doc.data();
                allJobsList.push({ id: doc.id, ...data });
            });

            // c. Nested Vacantes (Legacy/Alternative)
            for (const b of brandsList as any[]) {
                // Double check brand belongs to holding
                if (b.holdingId && !possibleHoldingIds.includes(b.holdingId)) continue;

                const vacSnap = await getDocs(collection(db, 'brands', b.id, 'vacantes'));
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
            setLoading(false);
        }
    }

    if (loading || !config) {
        return (
            <div style={{ minHeight: '100vh', backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="animate-spin" style={{ width: 40, height: 40, border: '4px solid #333', borderTopColor: '#FF6B35', borderRadius: '50%' }} />
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', color: 'white', fontFamily: "'Inter', sans-serif", backgroundColor: config.colors.purpleDeep }}>
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
            <BrandsSection holdingSlug={holdingSlug} />
            <CultureSection config={config} />
            <GallerySection config={config} currentSlide={currentSlide} setCurrentSlide={setCurrentSlide} />
            <VideoSection config={config} />
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
            <UneteSection config={config} holdingSlug={holdingSlug} />
            <FooterSection config={config} jobsCount={allJobs.length} />

            {/* DIAGNOSTICS */}
            {allJobs.length === 0 && (
                <div style={{ marginTop: 40, padding: 20, textAlign: 'center', fontSize: 10, opacity: 0.3 }}>
                    DIAGNOSTICS (V1.1.5): Jobs: {allJobs.length}, Slug: {holdingSlug}
                </div>
            )}
        </div>
    );
}
