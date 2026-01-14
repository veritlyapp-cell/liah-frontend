'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getDepartamentos, getProvincias, getDistritos } from '@/lib/data/peru-locations';

function PostularContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const holdingSlug = searchParams.get('holding') || 'ngr';

    const [step, setStep] = useState<'email' | 'register' | 'checking' | 'magic_sent'>('email');
    const [loading, setLoading] = useState(false);
    const [geocoding, setGeocoding] = useState(false);

    const [email, setEmail] = useState('');
    const [formData, setFormData] = useState({
        nombre: '',
        apellidos: '',
        celular: '',
        departamento: 'Lima',
        provincia: 'Lima',
        distrito: '',
        direccion: ''
    });

    const [provincias, setProvincias] = useState<string[]>([]);
    const [distritos, setDistritos] = useState<string[]>([]);
    const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
    const [geocodeError, setGeocodeError] = useState('');
    const [geocodeSuccess, setGeocodeSuccess] = useState(false);

    useEffect(() => {
        const provs = getProvincias(formData.departamento);
        setProvincias(provs);
        if (provs.length > 0 && !provs.includes(formData.provincia)) {
            setFormData(prev => ({ ...prev, provincia: provs[0], distrito: '' }));
        }
    }, [formData.departamento]);

    useEffect(() => {
        const dists = getDistritos(formData.departamento, formData.provincia);
        setDistritos(dists);
        if (dists.length > 0 && !dists.includes(formData.distrito)) {
            setFormData(prev => ({ ...prev, distrito: '' }));
        }
    }, [formData.departamento, formData.provincia]);

    async function handleEmailCheck(e: React.FormEvent) {
        e.preventDefault();
        if (!email.trim()) return;

        setLoading(true);
        setStep('checking');

        try {
            const res = await fetch('/api/portal/check-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await res.json();

            if (data.exists) {
                await fetch('/api/portal/magic-link', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, returnUrl: `/empleos/vacantes?holding=${holdingSlug}` })
                });
                setStep('magic_sent');
            } else {
                setStep('register');
            }
        } catch (error) {
            console.error('Error:', error);
            setStep('email');
        } finally {
            setLoading(false);
        }
    }

    async function handleGeocode() {
        if (!formData.direccion || !formData.distrito) return;

        setGeocoding(true);
        setGeocodeError('');
        setGeocodeSuccess(false);

        try {
            const fullAddress = `${formData.direccion}, ${formData.distrito}, ${formData.provincia}, ${formData.departamento}, Perú`;
            const res = await fetch('/api/geocode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address: fullAddress })
            });

            const data = await res.json();
            if (data.success && data.coordinates) {
                setCoordinates(data.coordinates);
                setGeocodeSuccess(true);
            } else {
                setGeocodeError(data.error || 'No se pudo ubicar la dirección');
            }
        } catch (error) {
            setGeocodeError('Error al buscar dirección');
        } finally {
            setGeocoding(false);
        }
    }

    async function handleRegister(e: React.FormEvent) {
        e.preventDefault();

        setLoading(true);

        try {
            const res = await fetch('/api/portal/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    ...formData,
                    coordinates: coordinates || null,
                    holdingSlug
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Error al registrar');
            }

            router.push(`/empleos/vacantes?holding=${holdingSlug}&token=${data.sessionToken}`);

        } catch (error) {
            console.error('Error:', error);
            alert('Error al registrar. Intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    }

    // Inline styles for Premium UI
    const inputStyle = {
        width: '100%',
        padding: '16px 20px',
        backgroundColor: '#F8FAFC',
        border: '1px solid #E5E5E5',
        borderRadius: '12px',
        color: '#0F172A',
        fontSize: '16px',
        lineHeight: '1.5',
        transition: 'all 0.2s ease',
        outline: 'none'
    };

    const selectStyle = {
        ...inputStyle,
        cursor: 'pointer',
        appearance: 'none' as const,
        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
        backgroundPosition: 'right 12px center',
        backgroundRepeat: 'no-repeat',
        backgroundSize: '20px 20px',
        paddingRight: '48px'
    };

    const labelStyle = {
        display: 'block',
        fontSize: '14px',
        fontWeight: 600,
        color: '#374151',
        marginBottom: '10px'
    };

    const primaryButtonStyle = {
        width: '100%',
        padding: '18px 32px',
        backgroundColor: '#F97316',
        color: '#FFFFFF',
        borderRadius: '12px',
        fontWeight: 700,
        fontSize: '16px',
        border: 'none',
        cursor: 'pointer',
        transition: 'all 0.25s ease',
        boxShadow: '0 4px 14px rgba(249,115,22,0.30)'
    };

    return (
        <div
            style={{
                minHeight: '100vh',
                backgroundColor: '#FBFBFB',
                fontFamily: "'Inter', 'Roboto', sans-serif"
            }}
        >
            {/* Header with back button */}
            <header
                style={{
                    padding: '24px 24px',
                    backgroundColor: '#FFFFFF',
                    borderBottom: '1px solid #E5E5E5'
                }}
            >
                <div style={{ maxWidth: '480px', margin: '0 auto' }}>
                    <button
                        onClick={() => router.push(`/empleos?holding=${holdingSlug}`)}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            color: '#64748B',
                            fontSize: '15px',
                            fontWeight: 500,
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                            transition: 'color 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#F97316'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#64748B'}
                    >
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        <span>Volver al inicio</span>
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main style={{ padding: '48px 24px 80px' }}>
                <div style={{ maxWidth: '480px', margin: '0 auto' }}>
                    {/* Card - Premium white design */}
                    <div
                        style={{
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #E5E5E5',
                            borderRadius: '16px',
                            boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
                            overflow: 'hidden'
                        }}
                    >
                        {/* Card Header - Solid orange */}
                        <div
                            style={{
                                backgroundColor: '#F97316',
                                padding: '40px 32px',
                                textAlign: 'center'
                            }}
                        >
                            <h1
                                style={{
                                    fontSize: '26px',
                                    fontWeight: 800,
                                    color: '#FFFFFF',
                                    lineHeight: 1.2,
                                    marginBottom: '8px'
                                }}
                            >
                                {step === 'email' && '¡Comienza tu postulación!'}
                                {step === 'register' && 'Completa tu perfil'}
                                {step === 'checking' && 'Verificando...'}
                                {step === 'magic_sent' && '¡Revisa tu correo!'}
                            </h1>
                            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '15px' }}>
                                {step === 'email' && 'Ingresa tu correo para continuar'}
                                {step === 'register' && 'Solo toma 2 minutos'}
                            </p>
                        </div>

                        {/* Card Body */}
                        <div style={{ padding: '40px 32px' }}>
                            {/* Email Step */}
                            {step === 'email' && (
                                <form onSubmit={handleEmailCheck}>
                                    <div style={{ marginBottom: '24px' }}>
                                        <label style={labelStyle}>
                                            Correo electrónico
                                        </label>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="tu@email.com"
                                            style={inputStyle}
                                            onFocus={(e) => e.currentTarget.style.borderColor = '#F97316'}
                                            onBlur={(e) => e.currentTarget.style.borderColor = '#E5E5E5'}
                                            required
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        style={{
                                            ...primaryButtonStyle,
                                            opacity: loading ? 0.6 : 1
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!loading) e.currentTarget.style.backgroundColor = '#EA580C';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = '#F97316';
                                        }}
                                    >
                                        Continuar →
                                    </button>
                                </form>
                            )}

                            {/* Checking */}
                            {step === 'checking' && (
                                <div style={{ textAlign: 'center', padding: '48px 0' }}>
                                    <div
                                        style={{
                                            width: '56px',
                                            height: '56px',
                                            border: '4px solid #FFEDD5',
                                            borderTop: '4px solid #F97316',
                                            borderRadius: '50%',
                                            margin: '0 auto 24px',
                                            animation: 'spin 1s linear infinite'
                                        }}
                                    />
                                    <p style={{ color: '#64748B', fontSize: '16px' }}>
                                        Verificando tu correo...
                                    </p>
                                </div>
                            )}

                            {/* Magic Link Sent */}
                            {step === 'magic_sent' && (
                                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                                    <div
                                        style={{
                                            width: '80px',
                                            height: '80px',
                                            background: 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)',
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            margin: '0 auto 24px',
                                            fontSize: '40px'
                                        }}
                                    >
                                        ✉️
                                    </div>
                                    <h3
                                        style={{
                                            fontSize: '20px',
                                            fontWeight: 700,
                                            color: '#0F172A',
                                            marginBottom: '12px'
                                        }}
                                    >
                                        Te enviamos un enlace mágico
                                    </h3>
                                    <p style={{ color: '#64748B', marginBottom: '4px' }}>
                                        Revisa tu bandeja de entrada:
                                    </p>
                                    <p
                                        style={{
                                            color: '#F97316',
                                            fontWeight: 600,
                                            fontSize: '17px',
                                            marginBottom: '32px'
                                        }}
                                    >
                                        {email}
                                    </p>
                                    <button
                                        onClick={() => setStep('email')}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: '#64748B',
                                            fontSize: '14px',
                                            textDecoration: 'underline',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        ¿Correo incorrecto? Cambiar
                                    </button>
                                </div>
                            )}

                            {/* Register Step */}
                            {step === 'register' && (
                                <form onSubmit={handleRegister}>
                                    {/* Name Fields */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                                        <div>
                                            <label style={labelStyle}>
                                                Nombre <span style={{ color: '#EF4444' }}>*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.nombre}
                                                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                                placeholder="Juan"
                                                style={inputStyle}
                                                onFocus={(e) => e.currentTarget.style.borderColor = '#F97316'}
                                                onBlur={(e) => e.currentTarget.style.borderColor = '#E5E5E5'}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label style={labelStyle}>
                                                Apellidos <span style={{ color: '#EF4444' }}>*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.apellidos}
                                                onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })}
                                                placeholder="Pérez"
                                                style={inputStyle}
                                                onFocus={(e) => e.currentTarget.style.borderColor = '#F97316'}
                                                onBlur={(e) => e.currentTarget.style.borderColor = '#E5E5E5'}
                                                required
                                            />
                                        </div>
                                    </div>

                                    {/* Phone */}
                                    <div style={{ marginBottom: '20px' }}>
                                        <label style={labelStyle}>
                                            Celular <span style={{ color: '#EF4444' }}>*</span>
                                        </label>
                                        <input
                                            type="tel"
                                            maxLength={9}
                                            value={formData.celular}
                                            onChange={(e) => setFormData({ ...formData, celular: e.target.value.replace(/\D/g, '') })}
                                            placeholder="987654321"
                                            style={inputStyle}
                                            onFocus={(e) => e.currentTarget.style.borderColor = '#F97316'}
                                            onBlur={(e) => e.currentTarget.style.borderColor = '#E5E5E5'}
                                            required
                                        />
                                    </div>

                                    {/* Location Section */}
                                    <div style={{ marginBottom: '20px' }}>
                                        <label style={labelStyle}>Ubicación</label>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            <select
                                                value={formData.departamento}
                                                onChange={(e) => setFormData({ ...formData, departamento: e.target.value, provincia: '', distrito: '' })}
                                                style={selectStyle}
                                                onFocus={(e) => e.currentTarget.style.borderColor = '#F97316'}
                                                onBlur={(e) => e.currentTarget.style.borderColor = '#E5E5E5'}
                                            >
                                                <option value="">Selecciona departamento</option>
                                                {getDepartamentos().map(dep => (
                                                    <option key={dep} value={dep}>{dep}</option>
                                                ))}
                                            </select>

                                            <select
                                                value={formData.provincia}
                                                onChange={(e) => setFormData({ ...formData, provincia: e.target.value, distrito: '' })}
                                                style={{
                                                    ...selectStyle,
                                                    opacity: !formData.departamento ? 0.6 : 1
                                                }}
                                                disabled={!formData.departamento}
                                                onFocus={(e) => e.currentTarget.style.borderColor = '#F97316'}
                                                onBlur={(e) => e.currentTarget.style.borderColor = '#E5E5E5'}
                                            >
                                                <option value="">Selecciona provincia</option>
                                                {provincias.map(prov => (
                                                    <option key={prov} value={prov}>{prov}</option>
                                                ))}
                                            </select>

                                            <select
                                                value={formData.distrito}
                                                onChange={(e) => {
                                                    setFormData({ ...formData, distrito: e.target.value });
                                                    setCoordinates(null);
                                                    setGeocodeSuccess(false);
                                                }}
                                                style={{
                                                    ...selectStyle,
                                                    opacity: !formData.provincia ? 0.6 : 1
                                                }}
                                                disabled={!formData.provincia}
                                                onFocus={(e) => e.currentTarget.style.borderColor = '#F97316'}
                                                onBlur={(e) => e.currentTarget.style.borderColor = '#E5E5E5'}
                                            >
                                                <option value="">Selecciona distrito</option>
                                                {distritos.map(dist => (
                                                    <option key={dist} value={dist}>{dist}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Address with Geocode */}
                                    <div style={{ marginBottom: '32px' }}>
                                        <label style={labelStyle}>
                                            Dirección exacta <span style={{ color: '#94A3B8', fontWeight: 400 }}>(opcional)</span>
                                        </label>
                                        <div style={{ display: 'flex', gap: '12px' }}>
                                            <input
                                                type="text"
                                                value={formData.direccion}
                                                onChange={(e) => {
                                                    setFormData({ ...formData, direccion: e.target.value });
                                                    setCoordinates(null);
                                                    setGeocodeSuccess(false);
                                                }}
                                                placeholder="Av. Ejemplo 123"
                                                style={{ ...inputStyle, flex: 1 }}
                                                onFocus={(e) => e.currentTarget.style.borderColor = '#F97316'}
                                                onBlur={(e) => e.currentTarget.style.borderColor = '#E5E5E5'}
                                            />
                                            <button
                                                type="button"
                                                onClick={handleGeocode}
                                                disabled={geocoding || !formData.direccion || !formData.distrito}
                                                style={{
                                                    padding: '16px 20px',
                                                    backgroundColor: geocodeSuccess ? '#10B981' : '#14B8A6',
                                                    color: '#FFFFFF',
                                                    borderRadius: '12px',
                                                    border: 'none',
                                                    cursor: geocoding || !formData.direccion || !formData.distrito ? 'not-allowed' : 'pointer',
                                                    opacity: geocoding || !formData.direccion || !formData.distrito ? 0.5 : 1,
                                                    transition: 'all 0.2s ease',
                                                    fontSize: '18px'
                                                }}
                                            >
                                                {geocoding ? '...' : geocodeSuccess ? '✓' : '📍'}
                                            </button>
                                        </div>

                                        {geocodeError && (
                                            <p style={{ marginTop: '10px', color: '#F59E0B', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span>⚠️</span> {geocodeError}
                                            </p>
                                        )}
                                        {geocodeSuccess && (
                                            <p style={{ marginTop: '10px', color: '#10B981', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span>✓</span> Ubicación confirmada
                                            </p>
                                        )}
                                    </div>

                                    {/* Submit Button - Solid orange */}
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        style={{
                                            ...primaryButtonStyle,
                                            opacity: loading ? 0.6 : 1
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!loading) {
                                                e.currentTarget.style.backgroundColor = '#EA580C';
                                                e.currentTarget.style.transform = 'translateY(-2px)';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = '#F97316';
                                            e.currentTarget.style.transform = 'translateY(0)';
                                        }}
                                    >
                                        {loading ? (
                                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                                                <div
                                                    style={{
                                                        width: '20px',
                                                        height: '20px',
                                                        border: '2px solid rgba(255,255,255,0.3)',
                                                        borderTop: '2px solid #FFFFFF',
                                                        borderRadius: '50%',
                                                        animation: 'spin 1s linear infinite'
                                                    }}
                                                />
                                                Registrando...
                                            </span>
                                        ) : (
                                            'Ver vacantes cerca de mí →'
                                        )}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <p
                        style={{
                            textAlign: 'center',
                            color: '#94A3B8',
                            fontSize: '13px',
                            marginTop: '32px'
                        }}
                    >
                        Powered by <span style={{ color: '#F97316', fontWeight: 600 }}>LIAH</span>
                    </p>
                </div>
            </main>

            {/* CSS Animation */}
            <style jsx global>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

export default function PostularPage() {
    return (
        <Suspense fallback={
            <div
                style={{
                    minHeight: '100vh',
                    backgroundColor: '#FBFBFB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                <div
                    style={{
                        width: '48px',
                        height: '48px',
                        border: '4px solid #FFEDD5',
                        borderTop: '4px solid #F97316',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                    }}
                />
            </div>
        }>
            <PostularContent />
        </Suspense>
    );
}
