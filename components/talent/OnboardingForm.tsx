'use client';

import { useState } from 'react';
import { getDepartamentos, getProvincias, getDistritos } from '@/lib/data/peru-locations';

interface OnboardingFormProps {
    candidatoEmail?: string;
    candidatoNombre?: string;
    holdingId: string;
    holdingNombre?: string;
    onSubmit: (data: OnboardingData) => Promise<void>;
}

export interface OnboardingData {
    apellidos: string;
    nombres: string;
    tipoDocumento: 'DNI' | 'CE';
    numeroDocumento: string;
    fechaNacimiento: string;
    departamento: string;
    provincia: string;
    distrito: string;
    direccion: string;
    telefono: string;
    email: string;
    // Datos bancarios opcionales
    banco?: string;
    tipoCuenta?: string;
    numeroCuenta?: string;
    cci?: string;
    // Contacto de emergencia
    contactoEmergenciaNombre?: string;
    contactoEmergenciaTelefono?: string;
    // Talla uniforme
    tallaUniforme?: string;
}

export default function OnboardingForm({
    candidatoEmail = '',
    candidatoNombre = '',
    holdingId,
    holdingNombre,
    onSubmit
}: OnboardingFormProps) {
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    // Form state
    const [apellidos, setApellidos] = useState('');
    const [nombres, setNombres] = useState(candidatoNombre);
    const [tipoDocumento, setTipoDocumento] = useState<'DNI' | 'CE'>('DNI');
    const [numeroDocumento, setNumeroDocumento] = useState('');
    const [fechaNacimiento, setFechaNacimiento] = useState('');
    const [departamento, setDepartamento] = useState('');
    const [provincia, setProvincia] = useState('');
    const [distrito, setDistrito] = useState('');
    const [direccion, setDireccion] = useState('');
    const [telefono, setTelefono] = useState('');
    const [email, setEmail] = useState(candidatoEmail);

    // Optional fields
    const [banco, setBanco] = useState('');
    const [tipoCuenta, setTipoCuenta] = useState('');
    const [numeroCuenta, setNumeroCuenta] = useState('');
    const [cci, setCci] = useState('');
    const [contactoEmergenciaNombre, setContactoEmergenciaNombre] = useState('');
    const [contactoEmergenciaTelefono, setContactoEmergenciaTelefono] = useState('');
    const [tallaUniforme, setTallaUniforme] = useState('');

    // Location helpers
    const departamentos = getDepartamentos();
    const provincias = departamento ? getProvincias(departamento) : [];
    const distritos = departamento && provincia ? getDistritos(departamento, provincia) : [];

    // Reset cascading when parent changes
    const handleDepartamentoChange = (value: string) => {
        setDepartamento(value);
        setProvincia('');
        setDistrito('');
    };

    const handleProvinciaChange = (value: string) => {
        setProvincia(value);
        setDistrito('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!apellidos || !nombres || !numeroDocumento || !fechaNacimiento || !departamento || !provincia || !distrito) {
            alert('Por favor completa todos los campos obligatorios');
            return;
        }

        setLoading(true);
        try {
            await onSubmit({
                apellidos,
                nombres,
                tipoDocumento,
                numeroDocumento,
                fechaNacimiento,
                departamento,
                provincia,
                distrito,
                direccion,
                telefono,
                email,
                banco,
                tipoCuenta,
                numeroCuenta,
                cci,
                contactoEmergenciaNombre,
                contactoEmergenciaTelefono,
                tallaUniforme,
            });
            setSubmitted(true);
        } catch (error) {
            console.error('Error submitting onboarding:', error);
            alert('Error al enviar el formulario. Intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
                    <div className="text-6xl mb-4">🎉</div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">¡Información Enviada!</h1>
                    <p className="text-gray-600">
                        Tu información ha sido registrada exitosamente. El equipo de Recursos Humanos se pondrá en contacto contigo pronto.
                    </p>
                    {holdingNombre && (
                        <p className="text-sm text-violet-600 mt-4">
                            Bienvenido a {holdingNombre}
                        </p>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-violet-100 to-indigo-100 py-8 px-4">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="text-5xl mb-4">👋</div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        ¡Bienvenido al equipo!
                    </h1>
                    {holdingNombre && (
                        <p className="text-lg text-violet-600 font-medium">{holdingNombre}</p>
                    )}
                    <p className="text-gray-600 mt-2">
                        Por favor completa tu información para finalizar tu registro.
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-6 space-y-6">
                    {/* Datos Personales */}
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            👤 Datos Personales
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos *</label>
                                <input
                                    type="text"
                                    value={apellidos}
                                    onChange={(e) => setApellidos(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                                    placeholder="Ej: García López"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombres *</label>
                                <input
                                    type="text"
                                    value={nombres}
                                    onChange={(e) => setNombres(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                                    placeholder="Ej: Juan Carlos"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Documento *</label>
                                <select
                                    value={tipoDocumento}
                                    onChange={(e) => setTipoDocumento(e.target.value as 'DNI' | 'CE')}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                                >
                                    <option value="DNI">DNI</option>
                                    <option value="CE">Carnet de Extranjería</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Número de Documento *</label>
                                <input
                                    type="text"
                                    value={numeroDocumento}
                                    onChange={(e) => setNumeroDocumento(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                                    placeholder={tipoDocumento === 'DNI' ? '12345678' : 'CE123456789'}
                                    maxLength={tipoDocumento === 'DNI' ? 8 : 12}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Nacimiento *</label>
                                <input
                                    type="date"
                                    value={fechaNacimiento}
                                    onChange={(e) => setFechaNacimiento(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                                <input
                                    type="tel"
                                    value={telefono}
                                    onChange={(e) => setTelefono(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                                    placeholder="999 999 999"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                                    placeholder="correo@ejemplo.com"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Dirección */}
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            📍 Dirección
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Departamento *</label>
                                <select
                                    value={departamento}
                                    onChange={(e) => handleDepartamentoChange(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                                    required
                                >
                                    <option value="">Seleccionar...</option>
                                    {departamentos.map(d => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Provincia *</label>
                                <select
                                    value={provincia}
                                    onChange={(e) => handleProvinciaChange(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                                    disabled={!departamento}
                                    required
                                >
                                    <option value="">Seleccionar...</option>
                                    {provincias.map(p => (
                                        <option key={p} value={p}>{p}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Distrito *</label>
                                <select
                                    value={distrito}
                                    onChange={(e) => setDistrito(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                                    disabled={!provincia}
                                    required
                                >
                                    <option value="">Seleccionar...</option>
                                    {distritos.map(d => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="md:col-span-3">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección (Calle, número, referencia)</label>
                                <input
                                    type="text"
                                    value={direccion}
                                    onChange={(e) => setDireccion(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                                    placeholder="Av. Principal 123, Urbanización X"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Datos Bancarios (Opcional) */}
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            🏦 Datos Bancarios <span className="text-xs text-gray-400 font-normal">(Opcional)</span>
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Banco</label>
                                <select
                                    value={banco}
                                    onChange={(e) => setBanco(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                                >
                                    <option value="">Seleccionar...</option>
                                    <option value="BCP">BCP</option>
                                    <option value="BBVA">BBVA</option>
                                    <option value="Interbank">Interbank</option>
                                    <option value="Scotiabank">Scotiabank</option>
                                    <option value="BanBif">BanBif</option>
                                    <option value="Otro">Otro</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Cuenta</label>
                                <select
                                    value={tipoCuenta}
                                    onChange={(e) => setTipoCuenta(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                                >
                                    <option value="">Seleccionar...</option>
                                    <option value="Ahorros">Cuenta de Ahorros</option>
                                    <option value="Corriente">Cuenta Corriente</option>
                                    <option value="Sueldo">Cuenta Sueldo</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Número de Cuenta</label>
                                <input
                                    type="text"
                                    value={numeroCuenta}
                                    onChange={(e) => setNumeroCuenta(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                                    placeholder="Número de cuenta"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">CCI (20 dígitos)</label>
                                <input
                                    type="text"
                                    value={cci}
                                    onChange={(e) => setCci(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                                    placeholder="00000000000000000000"
                                    maxLength={20}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Contacto de Emergencia */}
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            🆘 Contacto de Emergencia <span className="text-xs text-gray-400 font-normal">(Opcional)</span>
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                                <input
                                    type="text"
                                    value={contactoEmergenciaNombre}
                                    onChange={(e) => setContactoEmergenciaNombre(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                                    placeholder="Nombre del contacto"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                                <input
                                    type="tel"
                                    value={contactoEmergenciaTelefono}
                                    onChange={(e) => setContactoEmergenciaTelefono(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                                    placeholder="999 999 999"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Talla Uniforme */}
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            👔 Uniforme <span className="text-xs text-gray-400 font-normal">(Opcional)</span>
                        </h2>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Talla de Polo/Camisa</label>
                            <select
                                value={tallaUniforme}
                                onChange={(e) => setTallaUniforme(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                            >
                                <option value="">Seleccionar...</option>
                                <option value="XS">XS</option>
                                <option value="S">S</option>
                                <option value="M">M</option>
                                <option value="L">L</option>
                                <option value="XL">XL</option>
                                <option value="XXL">XXL</option>
                            </select>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                        {loading ? '⏳ Enviando...' : '✓ Enviar Información'}
                    </button>
                </form>

                {/* Footer */}
                <p className="text-center text-sm text-gray-500 mt-6">
                    Tu información está protegida. Solo será utilizada para fines laborales.
                </p>
            </div>
        </div>
    );
}
