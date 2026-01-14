'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// Peru districts for the dropdown
const DISTRITOS_LIMA = [
    'Ate', 'Barranco', 'Breña', 'Carabayllo', 'Chaclacayo', 'Chorrillos', 'Cieneguilla',
    'Comas', 'El Agustino', 'Independencia', 'Jesús María', 'La Molina', 'La Victoria',
    'Lima', 'Lince', 'Los Olivos', 'Lurigancho', 'Lurín', 'Magdalena del Mar',
    'Miraflores', 'Pachacámac', 'Pucusana', 'Pueblo Libre', 'Puente Piedra',
    'Punta Hermosa', 'Punta Negra', 'Rímac', 'San Bartolo', 'San Borja',
    'San Isidro', 'San Juan de Lurigancho', 'San Juan de Miraflores', 'San Luis',
    'San Martín de Porres', 'San Miguel', 'Santa Anita', 'Santa María del Mar',
    'Santa Rosa', 'Santiago de Surco', 'Surquillo', 'Villa El Salvador', 'Villa María del Triunfo'
];

function RegistroContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [geocoding, setGeocoding] = useState(false);
    const addressInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        email: '',
        nombre: '',
        apellidos: '',
        celular: '',
        distrito: '',
        direccion: '', // Full address
        cv: null as File | null
    });

    const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
    const [geocodeError, setGeocodeError] = useState('');
    const [formattedAddress, setFormattedAddress] = useState('');

    useEffect(() => {
        const emailParam = searchParams.get('email');
        if (emailParam) {
            setFormData(prev => ({ ...prev, email: emailParam }));
        }
    }, [searchParams]);

    // Geocode address when distrito and direccion are filled
    async function handleGeocodeAddress() {
        if (!formData.direccion || !formData.distrito) {
            setGeocodeError('Ingresa tu dirección completa');
            return;
        }

        setGeocoding(true);
        setGeocodeError('');

        try {
            const fullAddress = `${formData.direccion}, ${formData.distrito}, Lima, Perú`;

            const response = await fetch('/api/geocode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address: fullAddress })
            });

            const data = await response.json();

            if (data.success && data.coordinates) {
                setCoordinates(data.coordinates);
                setFormattedAddress(data.formattedAddress || fullAddress);
                setGeocodeError('');

                if (data.warning) {
                    setGeocodeError(data.warning);
                }
            } else {
                setGeocodeError(data.error || 'No se pudo ubicar la dirección');
                setCoordinates(null);
            }
        } catch (error) {
            console.error('Geocode error:', error);
            setGeocodeError('Error al buscar dirección');
        } finally {
            setGeocoding(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!formData.nombre || !formData.apellidos || !formData.celular || !formData.distrito || !formData.direccion) {
            alert('Por favor completa todos los campos obligatorios');
            return;
        }

        if (!coordinates) {
            alert('Por favor verifica tu dirección para obtener la ubicación');
            return;
        }

        setLoading(true);

        try {
            // Upload CV if provided
            let cvUrl = '';
            if (formData.cv) {
                const formDataUpload = new FormData();
                formDataUpload.append('file', formData.cv);
                formDataUpload.append('folder', 'cvs');

                const uploadRes = await fetch('/api/upload', {
                    method: 'POST',
                    body: formDataUpload
                });

                if (uploadRes.ok) {
                    const uploadData = await uploadRes.json();
                    cvUrl = uploadData.url;
                }
            }

            // Create candidate with coordinates
            const response = await fetch('/api/portal/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    cvUrl,
                    coordinates,
                    formattedAddress,
                    cv: undefined
                })
            });

            if (!response.ok) {
                throw new Error('Error al registrar');
            }

            const data = await response.json();

            // Redirect to vacancies with session token
            router.push(`/portal/vacantes?token=${data.sessionToken}`);

        } catch (error) {
            console.error('Error registering:', error);
            alert('Error al registrar. Intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-violet-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
            {/* Background Effects */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-20 left-10 w-72 h-72 bg-violet-500/20 rounded-full blur-3xl"></div>
                <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl"></div>
            </div>

            <div className="relative z-10 max-w-lg w-full">
                {/* Header */}
                <div className="text-center mb-6">
                    <h1 className="text-3xl font-bold text-white mb-2">
                        Registro Rápido
                    </h1>
                    <p className="text-white/70">
                        Completa tu perfil para ver vacantes cerca de ti
                    </p>
                </div>

                {/* Form Card */}
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Email (read-only) */}
                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-2">
                                Correo Electrónico
                            </label>
                            <input
                                type="email"
                                value={formData.email}
                                readOnly
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white/60 cursor-not-allowed"
                            />
                        </div>

                        {/* Name */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-white/80 mb-2">
                                    Nombre <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.nombre}
                                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-violet-400"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-white/80 mb-2">
                                    Apellidos <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.apellidos}
                                    onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })}
                                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-violet-400"
                                    required
                                />
                            </div>
                        </div>

                        {/* Phone */}
                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-2">
                                Celular <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="tel"
                                maxLength={9}
                                value={formData.celular}
                                onChange={(e) => setFormData({ ...formData, celular: e.target.value.replace(/\D/g, '') })}
                                placeholder="9XXXXXXXX"
                                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-violet-400"
                                required
                            />
                        </div>

                        {/* District */}
                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-2">
                                Distrito <span className="text-red-400">*</span>
                            </label>
                            <select
                                value={formData.distrito}
                                onChange={(e) => {
                                    setFormData({ ...formData, distrito: e.target.value });
                                    setCoordinates(null); // Reset coordinates when district changes
                                }}
                                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-400"
                                required
                            >
                                <option value="" className="text-gray-900">Selecciona tu distrito</option>
                                {DISTRITOS_LIMA.map(d => (
                                    <option key={d} value={d} className="text-gray-900">{d}</option>
                                ))}
                            </select>
                        </div>

                        {/* Address */}
                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-2">
                                Dirección exacta <span className="text-red-400">*</span>
                            </label>
                            <div className="flex gap-2">
                                <input
                                    ref={addressInputRef}
                                    type="text"
                                    value={formData.direccion}
                                    onChange={(e) => {
                                        setFormData({ ...formData, direccion: e.target.value });
                                        setCoordinates(null);
                                    }}
                                    placeholder="Av. Principal 123, Urb. Las Flores"
                                    className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-violet-400"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={handleGeocodeAddress}
                                    disabled={geocoding || !formData.direccion || !formData.distrito}
                                    className="px-4 py-3 bg-cyan-500 text-white rounded-xl font-medium hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {geocoding ? '...' : '📍'}
                                </button>
                            </div>
                            {geocodeError && (
                                <p className="text-amber-400 text-xs mt-1">{geocodeError}</p>
                            )}
                            {coordinates && (
                                <div className="mt-2 p-3 bg-green-500/20 border border-green-400/30 rounded-lg">
                                    <p className="text-green-400 text-sm flex items-center gap-2">
                                        <span>✓</span>
                                        <span>Ubicación confirmada</span>
                                    </p>
                                    {formattedAddress && (
                                        <p className="text-green-300/70 text-xs mt-1 truncate">
                                            {formattedAddress}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* CV Upload */}
                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-2">
                                CV (opcional)
                            </label>
                            <div className="relative">
                                <input
                                    type="file"
                                    accept=".pdf,.doc,.docx"
                                    onChange={(e) => setFormData({ ...formData, cv: e.target.files?.[0] || null })}
                                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-500 file:text-white hover:file:bg-violet-600"
                                />
                            </div>
                            {formData.cv && (
                                <p className="text-xs text-green-400 mt-1">
                                    ✓ {formData.cv.name}
                                </p>
                            )}
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading || !coordinates}
                            className="w-full py-4 bg-gradient-to-r from-violet-500 to-cyan-500 text-white font-bold rounded-xl hover:from-violet-600 hover:to-cyan-600 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 mt-6"
                        >
                            {loading ? 'Registrando...' : !coordinates ? 'Verifica tu dirección primero' : 'Ver Vacantes Cerca de Mí →'}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <p className="text-white/40 text-center text-sm mt-6">
                    Powered by <span className="text-violet-400 font-semibold">LIAH</span>
                </p>
            </div>
        </div>
    );
}

export default function RegistroPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gradient-to-br from-violet-900 via-purple-900 to-indigo-900 flex items-center justify-center">
                <div className="animate-spin w-12 h-12 border-4 border-white/20 border-t-violet-400 rounded-full"></div>
            </div>
        }>
            <RegistroContent />
        </Suspense>
    );
}
