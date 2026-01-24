'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, Timestamp, getDoc, setDoc } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import { NIVEL_EDUCATIVO_SUNAT } from '@/lib/constants/sunat-codes';

export default function OnboardingPage() {
    const params = useParams();
    const token = params.token as string;

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [applicationId, setApplicationId] = useState<string | null>(null);
    const [holdingData, setHoldingData] = useState<any>(null);
    const [holdingId, setHoldingId] = useState<string | null>(null);
    const [applicationData, setApplicationData] = useState<any>(null);

    // Form State
    const [formData, setFormData] = useState({
        nombreCompleto: '',
        dni: '',
        email: '',
        telefono: '',
        fechaNacimiento: '',
        direccion: '',
        distrito: '',
        banco: '',
        numeroCuenta: '',
        cci: '',
        sisPensiones: '', // AFP/ONP
        nivelEducativo: '', // SUNAT code
        contactoEmergenciaNombre: '',
        contactoEmergenciaTelefono: ''
    });

    useEffect(() => {
        const verifyToken = async () => {
            if (!token) return;

            try {
                // Find application with this token
                const q = query(collection(db, 'talent_applications'), where('onboardingToken', '==', token));
                const snapshot = await getDocs(q);

                if (snapshot.empty) {
                    setError('Enlace inválido o expirado.');
                    setLoading(false);
                    return;
                }

                const docData = snapshot.docs[0].data();
                const docId = snapshot.docs[0].id;
                setApplicationId(docId);
                setApplicationData(docData);
                if (docData.holdingId) setHoldingId(docData.holdingId);

                if (docData.onboardingStatus === 'completed') {
                    setSuccess(true); // Already completed
                    setLoading(false);
                    return;
                }

                // Pre-fill data
                setFormData(prev => ({
                    ...prev,
                    nombreCompleto: docData.culNombreCompleto || docData.nombre || '',
                    dni: docData.culDni || docData.dni || '',
                    email: docData.email || '',
                    telefono: docData.telefono || '',
                    // Try to get address from CUL analysis if exists (it usually doesn't have address, but let's check culAnalysis)
                    direccion: docData.culAnalysis?.direccion || '',
                }));

                // Get Holding Info for Branding
                if (docData.holdingId) {
                    try {
                        const holdingRef = doc(db, 'holdings', docData.holdingId);
                        const holdingSnap = await getDoc(holdingRef);
                        if (holdingSnap.exists()) {
                            setHoldingData(holdingSnap.data());
                        }
                    } catch (hError) {
                        console.error('Error fetching holding:', hError);
                    }
                }

                setLoading(false);
            } catch (err) {
                console.error('Error verifying token:', err);
                setError('Error al verificar el enlace. Por favor intenta nuevamente.');
                setLoading(false);
            }
        };

        verifyToken();
    }, [token]);

    const calculateAge = (dob: string) => {
        const diff = Date.now() - new Date(dob).getTime();
        const ageDate = new Date(diff);
        return Math.abs(ageDate.getUTCFullYear() - 1970);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!applicationId) return;

        // Basic validation
        if (calculateAge(formData.fechaNacimiento) < 18) {
            alert('Debes ser mayor de 18 años para continuar.');
            return;
        }

        setSubmitting(true);

        try {
            // 1. Update Application status
            await updateDoc(doc(db, 'talent_applications', applicationId), {
                ...formData,
                onboardingStatus: 'completed',
                onboardingCompletedAt: Timestamp.now(),
            });

            // 2. Create entry in nuevos_colaboradores for the Dashboard Tab
            if (holdingId) {
                const namesParts = formData.nombreCompleto.split(' ');
                const apellidos = namesParts.length > 2 ? namesParts.slice(-2).join(' ') : namesParts[namesParts.length - 1] || '';
                const nombres = namesParts.length > 2 ? namesParts.slice(0, -2).join(' ') : namesParts[0] || '';

                await setDoc(doc(db, 'nuevos_colaboradores', applicationId), {
                    applicationId,
                    holdingId,
                    nombres: nombres,
                    apellidos: apellidos,
                    nombreCompleto: formData.nombreCompleto,
                    tipoDocumento: 'DNI',
                    numeroDocumento: formData.dni,
                    fechaNacimiento: formData.fechaNacimiento,
                    direccion: formData.direccion,
                    distrito: formData.distrito,
                    telefono: formData.telefono,
                    email: formData.email,
                    banco: formData.banco,
                    numeroCuenta: formData.numeroCuenta,
                    cci: formData.cci,
                    sisPensiones: formData.sisPensiones,
                    nivelEducativo: formData.nivelEducativo,
                    contactoEmergenciaNombre: formData.contactoEmergenciaNombre,
                    contactoEmergenciaTelefono: formData.contactoEmergenciaTelefono,
                    status: 'pendiente_revision',
                    createdAt: Timestamp.now(),
                    // New fields for dashboard
                    puesto: applicationData?.jobTitle || applicationData?.jobTitulo || 'Sin puesto',
                    area: applicationData?.area || '',
                    gerencia: applicationData?.gerencia || '',
                    fechaIngreso: applicationData?.joiningDate || null,
                    jefeInmediatoId: applicationData?.hiringManagerId || null,
                    onboardingLink: window.location.href
                });
            }

            setSuccess(true);
        } catch (err) {
            console.error('Error saving onboarding data:', err);
            alert('Error al guardar la información. Por favor intenta nuevamente.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl">⚠️</span>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Enlace no disponible</h2>
                    <p className="text-gray-600">{error}</p>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">✅</span>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Registro Completado!</h2>
                    <p className="text-gray-600 mb-6">Gracias por completar tu información. Hemos registrado todos tus datos correctamente para tu ingreso.</p>
                    <p className="text-sm text-gray-500">Puedes cerrar esta ventana.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto">
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    {/* Header */}
                    <div className={`p-8 text-center ${holdingData ? 'bg-white' : 'bg-gradient-to-r from-emerald-500 to-green-600'}`}>
                        {holdingData?.logoUrl ? (
                            <img src={holdingData.logoUrl} alt="Logo" className="h-16 mx-auto mb-4 object-contain" />
                        ) : (
                            <h1 className={`text-3xl font-bold ${holdingData ? 'text-gray-900' : 'text-white'}`}>
                                {holdingData?.nombre || 'Formulario de Ingreso'}
                            </h1>
                        )}
                        <p className={`mt-2 ${holdingData ? 'text-gray-600' : 'text-green-100'}`}>
                            Completa tus datos para finalizar tu contratación
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 space-y-6">
                        {/* Personal Info */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-gray-900 border-b pb-2">Datos Personales</h3>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                                    <input
                                        type="text"
                                        name="nombreCompleto"
                                        value={formData.nombreCompleto}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition-all bg-gray-50"
                                        readOnly
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">DNI / Documento</label>
                                    <input
                                        type="text"
                                        name="dni"
                                        value={formData.dni}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition-all"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        className="w-full px-4 py-2 border rounded-lg bg-gray-100 text-gray-500"
                                        readOnly
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                                    <input
                                        type="tel"
                                        name="telefono"
                                        value={formData.telefono}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition-all"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Nacimiento</label>
                                    <input
                                        type="date"
                                        name="fechaNacimiento"
                                        value={formData.fechaNacimiento}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition-all"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Address */}
                        <div className="space-y-4 pt-4">
                            <h3 className="text-lg font-bold text-gray-900 border-b pb-2">Ubicación</h3>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Dirección Completa</label>
                                    <input
                                        type="text"
                                        name="direccion"
                                        value={formData.direccion}
                                        onChange={handleChange}
                                        placeholder="Av. Principal 123, Dpto 401..."
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition-all"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Distrito de Residencia</label>
                                    <input
                                        type="text"
                                        name="distrito"
                                        value={formData.distrito}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition-all"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Financial Info */}
                        <div className="space-y-4 pt-4">
                            <h3 className="text-lg font-bold text-gray-900 border-b pb-2">Datos para Pago & Pensión</h3>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Entidad Bancaria</label>
                                    <select
                                        name="banco"
                                        value={formData.banco}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition-all"
                                        required
                                    >
                                        <option value="">Selecciona tu banco</option>
                                        <option value="BCP">BCP</option>
                                        <option value="Interbank">Interbank</option>
                                        <option value="BBVA">BBVA</option>
                                        <option value="Scotiabank">Scotiabank</option>
                                        <option value="Banco de la Nación">Banco de la Nación</option>
                                        <option value="Otro">Otro</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Número de Cuenta</label>
                                    <input
                                        type="text"
                                        name="numeroCuenta"
                                        value={formData.numeroCuenta}
                                        onChange={handleChange}
                                        placeholder="Solo números"
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition-all"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Código Interbancario (CCI) <span className="text-xs text-gray-400">(Opcional si es el mismo banco)</span></label>
                                    <input
                                        type="text"
                                        name="cci"
                                        value={formData.cci}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Sistema de Pensiones</label>
                                    <select
                                        name="sisPensiones"
                                        value={formData.sisPensiones}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition-all"
                                        required
                                    >
                                        <option value="">Selecciona opción</option>
                                        <option value="ONP">ONP (Estado)</option>
                                        <option value="AFP Integra">AFP Integra</option>
                                        <option value="AFP Prima">AFP Prima</option>
                                        <option value="AFP Profuturo">AFP Profuturo</option>
                                        <option value="AFP Habitat">AFP Habitat</option>
                                        <option value="Sin afiliación">No tengo / Primera vez</option>
                                    </select>
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nivel Educativo (SUNAT)</label>
                                    <select
                                        name="nivelEducativo"
                                        value={formData.nivelEducativo}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition-all"
                                        required
                                    >
                                        <option value="">Selecciona tu nivel educativo</option>
                                        {NIVEL_EDUCATIVO_SUNAT.map(lvl => (
                                            <option key={lvl.code} value={lvl.code}>{lvl.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Emergency Contact */}
                        <div className="space-y-4 pt-4">
                            <h3 className="text-lg font-bold text-gray-900 border-b pb-2">En Caso de Emergencia</h3>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de Contacto</label>
                                    <input
                                        type="text"
                                        name="contactoEmergenciaNombre"
                                        value={formData.contactoEmergenciaNombre}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition-all"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono de Contacto</label>
                                    <input
                                        type="tel"
                                        name="contactoEmergenciaTelefono"
                                        value={formData.contactoEmergenciaTelefono}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition-all"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-6">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-emerald-700 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center"
                            >
                                {submitting ? (
                                    <>
                                        <span className="animate-spin mr-2 h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                                        Guardando...
                                    </>
                                ) : (
                                    '✅ Confirmar y Enviar Datos'
                                )}
                            </button>
                            <p className="text-center text-xs text-gray-500 mt-4">
                                Al enviar este formulario declaras que la información proporcionada es verdadera y correcta.
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
