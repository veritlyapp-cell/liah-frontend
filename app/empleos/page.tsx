'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface MarcaVacancy {
    marcaId: string;
    marcaNombre: string;
    logo: string;
    photo?: string;
    vacantesCount: number;
}

// NGR Brand data
const NGR_DATA = {
    name: 'NGR',
    logo: '/logos/ngr-logo.png',
    tagline: '¡Sé parte de NGR y vive experiencias únicas!',
    description: 'Somos NGR, el holding gastronómico del Grupo Intercorp. Estamos presentes en 14 provincias del país, con 6 marcas que inspiran. Con más de 8,000 colaboradores y más de 13 años entregando cariño y energía.',
    benefits: [
        { icon: '💼', title: 'Primer empleo', description: 'No necesitas experiencia, solo actitud y ganas de aprender' },
        { icon: '⏰', title: 'Horario flexible', description: 'Estudias y necesitas un horario que se adapte a ti' },
        { icon: '📍', title: 'Cerca de casa', description: 'Trabaja en una tienda cercana a tu domicilio' },
        { icon: '📈', title: 'Línea de carrera', description: 'Crece profesionalmente dentro de la empresa' }
    ]
};

// Brand logos
const BRAND_LOGOS: Record<string, string> = {
    'bembos': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Bembos_logo.svg/1200px-Bembos_logo.svg.png',
    'don_belisario': 'https://seeklogo.com/images/D/don-belisario-logo-B0A3B3F7E6-seeklogo.com.png',
    'popeyes': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Popeyes_logo.svg/1200px-Popeyes_logo.svg.png',
    'papa_johns': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Papa_Johns_Logo.svg/1200px-Papa_Johns_Logo.svg.png',
    'china_wok': 'https://seeklogo.com/images/C/china-wok-logo-8E9E9F4F9F-seeklogo.com.png',
    'dunkin': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Dunkin%27_Donuts_logo.svg/1200px-Dunkin%27_Donuts_logo.svg.png',
};

function EmpleosContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [marcas, setMarcas] = useState<MarcaVacancy[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            try {
                const holdingSlug = searchParams.get('holding') || 'ngr';
                const res = await fetch(`/api/empleos/vacancies-by-marca?holding=${holdingSlug}`);
                if (res.ok) {
                    const data = await res.json();
                    setMarcas(data.marcas || []);
                }
            } catch (error) {
                console.error('Error loading data:', error);
                setMarcas([
                    { marcaId: 'bembos', marcaNombre: 'Bembos', logo: BRAND_LOGOS.bembos, vacantesCount: 17 },
                    { marcaId: 'don_belisario', marcaNombre: 'Don Belisario', logo: BRAND_LOGOS.don_belisario, vacantesCount: 12 },
                    { marcaId: 'popeyes', marcaNombre: 'Popeyes', logo: BRAND_LOGOS.popeyes, vacantesCount: 9 },
                    { marcaId: 'papa_johns', marcaNombre: 'Papa Johns', logo: BRAND_LOGOS.papa_johns, vacantesCount: 26 },
                    { marcaId: 'china_wok', marcaNombre: 'China Wok', logo: BRAND_LOGOS.china_wok, vacantesCount: 6 },
                    { marcaId: 'dunkin', marcaNombre: "Dunkin'", logo: BRAND_LOGOS.dunkin, vacantesCount: 18 },
                ]);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [searchParams]);

    function handleApply(categoria?: string) {
        const holdingSlug = searchParams.get('holding') || 'ngr';
        router.push(`/empleos/postular?holding=${holdingSlug}${categoria ? `&categoria=${categoria}` : ''}`);
    }

    return (
        <div style={{ fontFamily: "'Open Sans', 'Inter', sans-serif", color: '#1a1a2e' }}>
            {/* ==================== NAVBAR ==================== */}
            <nav style={{
                position: 'sticky',
                top: 0,
                zIndex: 50,
                backgroundColor: '#fff',
                borderBottom: '1px solid #eee',
                padding: '16px 0'
            }}>
                <div style={{
                    maxWidth: '1200px',
                    margin: '0 auto',
                    padding: '0 24px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <img src={NGR_DATA.logo} alt="NGR" style={{ height: '48px', objectFit: 'contain' }} />
                    <button
                        onClick={() => handleApply()}
                        style={{
                            background: 'linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)',
                            color: '#fff',
                            padding: '14px 32px',
                            borderRadius: '8px',
                            fontWeight: 600,
                            fontSize: '15px',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'transform 0.2s, box-shadow 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 8px 24px rgba(255,107,53,0.4)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    >
                        Solicitar postulación
                    </button>
                </div>
            </nav>

            {/* ==================== HERO SECTION ==================== */}
            <section style={{
                padding: '100px 24px 120px',
                background: 'linear-gradient(180deg, #fff 0%, #FFF8F5 100%)'
            }}>
                <div style={{
                    maxWidth: '1200px',
                    margin: '0 auto',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
                    gap: '80px',
                    alignItems: 'center'
                }}>
                    {/* Left Content */}
                    <div>
                        <h1 style={{
                            fontSize: 'clamp(2.5rem, 5vw, 3.5rem)',
                            fontWeight: 800,
                            lineHeight: 1.15,
                            marginBottom: '24px',
                            color: '#1a1a2e'
                        }}>
                            ¿Qué es <span style={{ color: '#FF6B35' }}>NGR</span>?
                        </h1>
                        <div style={{
                            fontSize: '17px',
                            lineHeight: 1.8,
                            color: '#4a4a68'
                        }}>
                            <p style={{ marginBottom: '16px' }}>
                                <strong>¿Buscas tu primer empleo o un trabajo flexible?</strong>
                            </p>
                            <p style={{ marginBottom: '16px' }}>
                                Descubre cómo NGR puede ayudarte a encontrar el trabajo ideal,
                                <strong> cerca de casa y con horarios que se adaptan a ti</strong>.
                            </p>
                            <p>
                                Somos el holding gastronómico del Grupo Intercorp con más de
                                <strong> 8,000 colaboradores</strong> y <strong>6 marcas</strong> que inspiran.
                            </p>
                        </div>
                    </div>

                    {/* Right Image/Visual */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center'
                    }}>
                        <div style={{
                            position: 'relative',
                            width: '100%',
                            maxWidth: '500px',
                            aspectRatio: '4/3',
                            background: 'linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)',
                            borderRadius: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 32px 64px rgba(255,107,53,0.2)'
                        }}>
                            <img
                                src={NGR_DATA.logo}
                                alt="NGR"
                                style={{
                                    height: '120px',
                                    objectFit: 'contain',
                                    filter: 'brightness(0) invert(1)'
                                }}
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* ==================== BRANDS CTA SECTION ==================== */}
            <section style={{
                padding: '80px 24px',
                background: 'linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)'
            }}>
                <div style={{
                    maxWidth: '1000px',
                    margin: '0 auto',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '40px'
                }}>
                    <div style={{ flex: '1 1 300px' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            marginBottom: '16px'
                        }}>
                            <span style={{
                                background: 'rgba(255,255,255,0.2)',
                                padding: '8px 12px',
                                borderRadius: '20px',
                                fontSize: '14px',
                                color: '#fff'
                            }}>
                                ✨ Oportunidades
                            </span>
                        </div>
                        <h2 style={{
                            fontSize: '2rem',
                            fontWeight: 700,
                            color: '#fff',
                            marginBottom: '12px'
                        }}>
                            NGR Ready: Candidatos listos para ti
                        </h2>
                        <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '16px', lineHeight: 1.6 }}>
                            • Candidatos pre-filtrados según tus necesidades<br />
                            • Acceso a nuestra bolsa de +3000 candidatos<br />
                            • Proceso de postulación en menos de 5 minutos
                        </p>
                    </div>
                    <button
                        onClick={() => handleApply()}
                        style={{
                            background: '#fff',
                            color: '#FF6B35',
                            padding: '18px 40px',
                            borderRadius: '8px',
                            fontWeight: 700,
                            fontSize: '16px',
                            border: 'none',
                            cursor: 'pointer',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
                        }}
                    >
                        Conoce más →
                    </button>
                </div>
            </section>

            {/* ==================== FEATURES SECTION ==================== */}
            <section style={{
                padding: '120px 48px',
                backgroundColor: '#FAFAFA'
            }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    {/* Section Header */}
                    <div style={{ textAlign: 'center', marginBottom: '80px' }}>
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: '#F0E6FF',
                            padding: '8px 16px',
                            borderRadius: '20px',
                            marginBottom: '24px'
                        }}>
                            <span style={{
                                width: '8px',
                                height: '8px',
                                background: '#8B5CF6',
                                borderRadius: '50%'
                            }}></span>
                            <span style={{ color: '#8B5CF6', fontSize: '14px', fontWeight: 600 }}>
                                BENEFICIOS
                            </span>
                        </div>
                        <h2 style={{
                            fontSize: 'clamp(2rem, 4vw, 2.75rem)',
                            fontWeight: 800,
                            color: '#1a1a2e',
                            maxWidth: '600px',
                            margin: '0 auto'
                        }}>
                            Todo lo que necesitas en un solo lugar
                        </h2>
                    </div>

                    {/* Features Grid */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                        gap: '32px'
                    }}>
                        {NGR_DATA.benefits.map((benefit, idx) => (
                            <div
                                key={idx}
                                style={{
                                    background: '#fff',
                                    borderRadius: '16px',
                                    padding: '40px 32px',
                                    border: '1px solid #E5E7EB',
                                    transition: 'transform 0.3s, box-shadow 0.3s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-8px)';
                                    e.currentTarget.style.boxShadow = '0 16px 48px rgba(0,0,0,0.08)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            >
                                <div style={{
                                    width: '64px',
                                    height: '64px',
                                    background: 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)',
                                    borderRadius: '16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '28px',
                                    marginBottom: '24px'
                                }}>
                                    {benefit.icon}
                                </div>
                                <h3 style={{
                                    fontSize: '18px',
                                    fontWeight: 700,
                                    color: '#1a1a2e',
                                    marginBottom: '12px'
                                }}>
                                    {benefit.title}
                                </h3>
                                <p style={{
                                    color: '#6B7280',
                                    fontSize: '15px',
                                    lineHeight: 1.6
                                }}>
                                    {benefit.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ==================== TWO-COLUMN STORY SECTION ==================== */}
            <section style={{ padding: '120px 48px', backgroundColor: '#fff' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
                        gap: '80px',
                        alignItems: 'center'
                    }}>
                        {/* Image Side */}
                        <div style={{
                            background: '#F3F4F6',
                            borderRadius: '24px',
                            aspectRatio: '4/3',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '16px',
                                justifyContent: 'center',
                                padding: '32px'
                            }}>
                                {Object.entries(BRAND_LOGOS).slice(0, 6).map(([key, url]) => (
                                    <img
                                        key={key}
                                        src={url}
                                        alt={key}
                                        style={{
                                            height: '48px',
                                            objectFit: 'contain',
                                            opacity: 0.8,
                                            transition: 'opacity 0.3s'
                                        }}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Content Side */}
                        <div>
                            <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: '#F0E6FF',
                                padding: '8px 16px',
                                borderRadius: '20px',
                                marginBottom: '24px'
                            }}>
                                <span style={{
                                    width: '8px',
                                    height: '8px',
                                    background: '#8B5CF6',
                                    borderRadius: '50%'
                                }}></span>
                                <span style={{ color: '#8B5CF6', fontSize: '14px', fontWeight: 600 }}>
                                    NUESTRA HISTORIA
                                </span>
                            </div>
                            <h2 style={{
                                fontSize: 'clamp(1.75rem, 3vw, 2.25rem)',
                                fontWeight: 800,
                                color: '#1a1a2e',
                                marginBottom: '24px',
                                lineHeight: 1.2
                            }}>
                                Cada gran historia comienza con un pequeño paso
                            </h2>
                            <p style={{
                                color: '#4a4a68',
                                fontSize: '16px',
                                lineHeight: 1.8
                            }}>
                                Eres mayor de edad y estás buscando tu <strong style={{ color: '#FF6B35' }}>primer empleo</strong>,
                                estudias y necesitas un <strong style={{ color: '#FF6B35' }}>horario flexible</strong>,
                                en NGR encontrarás el lugar ideal para empezar.
                                <br /><br />
                                Aquí <strong style={{ color: '#FF6B35' }}>no necesitas experiencia</strong>,
                                solo actitud, cariño y mucha energía.
                            </p>
                            <button
                                onClick={() => handleApply()}
                                style={{
                                    marginTop: '32px',
                                    background: 'linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)',
                                    color: '#fff',
                                    padding: '16px 32px',
                                    borderRadius: '8px',
                                    fontWeight: 600,
                                    fontSize: '15px',
                                    border: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                Postula ahora →
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* ==================== BRANDS POSTULA SECTION ==================== */}
            <section style={{
                padding: '120px 48px',
                backgroundColor: '#FAFAFA'
            }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '64px' }}>
                        <h2 style={{
                            fontSize: 'clamp(2rem, 4vw, 2.75rem)',
                            fontWeight: 800,
                            color: '#1a1a2e',
                            marginBottom: '16px'
                        }}>
                            POSTULA
                        </h2>
                        <p style={{ color: '#6B7280', fontSize: '17px' }}>
                            Elige tu marca favorita y únete al equipo
                        </p>
                    </div>

                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
                            <div style={{
                                width: '48px',
                                height: '48px',
                                border: '4px solid #FFEDD5',
                                borderTop: '4px solid #FF6B35',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite'
                            }} />
                        </div>
                    ) : (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                            gap: '24px'
                        }}>
                            {marcas.map((marca) => (
                                <div
                                    key={marca.marcaId}
                                    style={{
                                        background: '#fff',
                                        borderRadius: '16px',
                                        padding: '28px 20px',
                                        border: '1px solid #E5E7EB',
                                        textAlign: 'center',
                                        transition: 'transform 0.3s, box-shadow 0.3s'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-4px)';
                                        e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.08)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                >
                                    <div style={{
                                        height: '56px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginBottom: '16px'
                                    }}>
                                        {marca.logo ? (
                                            <img src={marca.logo} alt={marca.marcaNombre} style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                                        ) : (
                                            <span style={{ fontSize: '16px', fontWeight: 700, color: '#1a1a2e' }}>{marca.marcaNombre}</span>
                                        )}
                                    </div>
                                    <p style={{ color: '#FF6B35', fontWeight: 800, fontSize: '28px', marginBottom: '4px' }}>
                                        {marca.vacantesCount}
                                    </p>
                                    <p style={{ color: '#9CA3AF', fontSize: '13px', marginBottom: '20px' }}>vacantes</p>
                                    <button
                                        onClick={() => handleApply('operativo')}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            background: 'linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)',
                                            color: '#fff',
                                            borderRadius: '8px',
                                            fontWeight: 600,
                                            fontSize: '13px',
                                            border: 'none',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Postular
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* ==================== FINAL CTA ==================== */}
            <section style={{
                padding: '100px 24px',
                background: 'linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)',
                textAlign: 'center'
            }}>
                <div style={{ maxWidth: '700px', margin: '0 auto' }}>
                    <h2 style={{
                        fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
                        fontWeight: 800,
                        color: '#fff',
                        marginBottom: '20px'
                    }}>
                        Descubre el futuro de tu carrera
                    </h2>
                    <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '17px', marginBottom: '40px', lineHeight: 1.6 }}>
                        Postula ahora y experimenta cómo NGR puede transformar tu futuro profesional.
                    </p>
                    <button
                        onClick={() => handleApply()}
                        style={{
                            background: '#fff',
                            color: '#FF6B35',
                            padding: '18px 48px',
                            borderRadius: '8px',
                            fontWeight: 700,
                            fontSize: '17px',
                            border: 'none',
                            cursor: 'pointer',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
                        }}
                    >
                        Agenda tu postulación gratuita
                    </button>
                </div>
            </section>

            {/* ==================== FOOTER ==================== */}
            <footer style={{
                padding: '48px 24px',
                backgroundColor: '#1a1a2e',
                color: '#9CA3AF'
            }}>
                <div style={{
                    maxWidth: '1200px',
                    margin: '0 auto',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '24px'
                }}>
                    <img src={NGR_DATA.logo} alt="NGR" style={{ height: '40px', filter: 'brightness(0) invert(1)' }} />
                    <p style={{ fontSize: '14px' }}>
                        © 2026 NGR. Powered by <span style={{ color: '#FF6B35' }}>LIAH</span>
                    </p>
                </div>
            </footer>

            <style jsx global>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

export default function EmpleosPage() {
    return (
        <Suspense fallback={
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAFAFA' }}>
                <div style={{ width: '48px', height: '48px', border: '4px solid #FFEDD5', borderTop: '4px solid #FF6B35', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            </div>
        }>
            <EmpleosContent />
        </Suspense>
    );
}
