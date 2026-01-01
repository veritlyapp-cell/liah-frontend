'use client';

import { useState } from 'react';
import { createCandidate, validateDNI } from '@/lib/firestore/candidates';
import { DEPARTAMENTOS, getProvincias, getDistritos } from '@/lib/data/peru-ubigeo';
import { useRouter } from 'next/navigation';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

export default function RegisterCandidate() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [warning, setWarning] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [candidateCode, setCandidateCode] = useState('');
    const [uploadingCUL, setUploadingCUL] = useState(false);

    const [formData, setFormData] = useState({
        dni: '',
        nombre: '',
        apellidoPaterno: '',
        apellidoMaterno: '',
        email: '',
        telefono: '',
        departamento: '',
        provincia: '',
        distrito: '',
        direccion: '',
        certificadoUnicoLaboral: ''
    });

    const [culFile, setCulFile] = useState<File | null>(null);

    const handleDNIBlur = async () => {
        if (formData.dni.length !== 8) {
            setWarning('El DNI debe tener 8 dígitos');
            return;
        }

        setLoading(true);
        const result = await validateDNI(formData.dni);
        setWarning(result.warning);
        setLoading(false);
    };

    const handleCULUpload = async (file: File) => {
        if (!file) return '';

        try {
            setUploadingCUL(true);
            const fileName = `cul_${formData.dni}_${Date.now()}.pdf`;
            const storageRef = ref(storage, `candidates/cul/${fileName}`);

            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);

            return downloadURL;
        } catch (error) {
            console.error('Error uploading CUL:', error);
            throw error;
        } finally {
            setUploadingCUL(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validaciones
        if (formData.dni.length !== 8) {
            alert('El DNI debe tener 8 dígitos');
            return;
        }

        if (!formData.nombre || !formData.apellidoPaterno || !formData.email || !formData.telefono) {
            alert('Complete todos los campos obligatorios');
            return;
        }

        if (!formData.departamento || !formData.provincia || !formData.distrito) {
            alert('Complete la ubicación geográfica (departamento, provincia, distrito)');
            return;
        }

        setLoading(true);

        try {
            // Validar DNI una vez más antes de crear
            const validation = await validateDNI(formData.dni);

            if (!validation.valid) {
                alert(validation.warning);
                setLoading(false);
                return;
            }

            // Upload CUL si existe
            let culURL = '';
            if (culFile) {
                culURL = await handleCULUpload(culFile);
            }

            // Si ya existe, usar el existente
            if (validation.existingCandidate) {
                setCandidateCode(validation.existingCandidate.candidateCode);
                setSuccess(true);
            } else {
                // Crear nuevo candidato
                await createCandidate({
                    ...formData,
                    certificadoUnicoLaboral: culURL
                });

                // Obtener el código generado
                const { getCandidateByDNI } = await import('@/lib/firestore/candidates');
                const newCandidate = await getCandidateByDNI(formData.dni);

                if (newCandidate) {
                    setCandidateCode(newCandidate.candidateCode);
                    setSuccess(true);
                }
            }

        } catch (error) {
            console.error('Error creando candidato:', error);
            alert('Error al registrar candidato. Intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-violet-50 to-cyan-50">
                <div className="max-w-md w-full glass-card rounded-2xl p-8 text-center">
                    <div className="text-6xl mb-4">✅</div>
                    <h2 className="text-2xl font-bold gradient-primary mb-2">
                        ¡Registro Exitoso!
                    </h2>
                    <p className="text-gray-600 mb-6">
                        Tu código de candidato es:
                    </p>
                    <div className="bg-violet-100 rounded-xl p-4 mb-6">
                        <p className="text-3xl font-mono font-bold text-violet-700">
                            {candidateCode}
                        </p>
                    </div>
                    <p className="text-sm text-gray-500 mb-6">
                        Guarda este código. El recruiter lo usará para asignarte a una vacante.
                    </p>
                    <button
                        onClick={() => router.push('/')}
                        className="w-full gradient-bg text-white py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
                    >
                        Finalizar
                    </button>
                </div>
            </div>
        );
    }

    // Get provincias and distritos based on selection
    const provincias = formData.departamento ? getProvincias(formData.departamento) : [];
    const distritos = formData.provincia ? getDistritos(formData.provincia) : [];

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-violet-50 to-cyan-50">
            <div className="max-w-2xl w-full glass-card rounded-2xl p-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold gradient-primary mb-2">
                        Registro de Candidato
                    </h1>
                    <p className="text-gray-600">
                        Completa tus datos para registrarte en nuestro sistema
                    </p>
                </div>

                {warning && (
                    <div className={`mb-6 p-4 rounded-lg ${warning.includes('BLOQUEADO')
                        ? 'bg-red-50 border-l-4 border-red-500 text-red-700'
                        : warning.includes('AVISO')
                            ? 'bg-yellow-50 border-l-4 border-yellow-500 text-yellow-700'
                            : 'bg-blue-50 border-l-4 border-blue-500 text-blue-700'
                        }`}>
                        {warning}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* DNI */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            DNI <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            maxLength={8}
                            value={formData.dni}
                            onChange={(e) => setFormData({ ...formData, dni: e.target.value.replace(/\D/g, '') })}
                            onBlur={handleDNIBlur}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                            placeholder="12345678"
                            required
                        />
                    </div>

                    {/* Nombre */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Nombre <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.nombre}
                            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                            placeholder="Juan"
                            required
                        />
                    </div>

                    {/* Apellidos */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Apellido Paterno <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.apellidoPaterno}
                                onChange={(e) => setFormData({ ...formData, apellidoPaterno: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                                placeholder="Pérez"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Apellido Materno
                            </label>
                            <input
                                type="text"
                                value={formData.apellidoMaterno}
                                onChange={(e) => setFormData({ ...formData, apellidoMaterno: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                                placeholder="López"
                            />
                        </div>
                    </div>

                    {/* Email y Teléfono */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Email <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                                placeholder="juan@email.com"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Teléfono <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="tel"
                                maxLength={9}
                                value={formData.telefono}
                                onChange={(e) => setFormData({ ...formData, telefono: e.target.value.replace(/\D/g, '') })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                                placeholder="987654321"
                                required
                            />
                        </div>
                    </div>

                    {/* Ubicación Geográfica */}
                    <div className="border-t pt-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Ubicación</h3>

                        {/* Departamento */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Departamento <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.departamento}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    departamento: e.target.value,
                                    provincia: '',
                                    distrito: ''
                                })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                                required
                            >
                                <option value="">Seleccionar departamento...</option>
                                {DEPARTAMENTOS.map(d => (
                                    <option key={d.id} value={d.id}>{d.nombre}</option>
                                ))}
                            </select>
                        </div>

                        {/* Provincia */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Provincia <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.provincia}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    provincia: e.target.value,
                                    distrito: ''
                                })}
                                disabled={!formData.departamento}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                                required
                            >
                                <option value="">Seleccionar provincia...</option>
                                {provincias.map(p => (
                                    <option key={p.id} value={p.id}>{p.nombre}</option>
                                ))}
                            </select>
                        </div>

                        {/* Distrito */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Distrito <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.distrito}
                                onChange={(e) => setFormData({ ...formData, distrito: e.target.value })}
                                disabled={!formData.provincia}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                                required
                            >
                                <option value="">Seleccionar distrito...</option>
                                {distritos.map(d => (
                                    <option key={d.id} value={d.nombre}>{d.nombre}</option>
                                ))}
                            </select>
                        </div>

                        {/* Dirección */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Dirección <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.direccion}
                                onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                                placeholder="Av. Larco 123"
                                required
                            />
                        </div>
                    </div>

                    {/* Certificado Único Laboral */}
                    <div className="border-t pt-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Documentos</h3>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Certificado Único Laboral (PDF)
                            </label>
                            <input
                                type="file"
                                accept=".pdf"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        if (file.size > 5 * 1024 * 1024) {
                                            alert('El archivo no debe superar 5MB');
                                            return;
                                        }
                                        setCulFile(file);
                                    }
                                }}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Tamaño máximo: 5MB
                            </p>
                            {culFile && (
                                <p className="text-sm text-green-600 mt-2">
                                    ✓ {culFile.name} seleccionado
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading || uploadingCUL || Boolean(warning && warning.includes('BLOQUEADO'))}
                        className="w-full gradient-bg text-white py-3 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {uploadingCUL ? 'Subiendo documento...' : loading ? 'Registrando...' : 'Registrarme'}
                    </button>
                </form>
            </div>
        </div>
    );
}
