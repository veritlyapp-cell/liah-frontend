'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { getInvitationByToken, markInvitationAsOpened, markInvitationAsCompleted, type Invitation } from '@/lib/firestore/invitations';
import { getCandidateByEmail, createCandidate } from '@/lib/firestore/candidates';
import { getDoc, doc } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { needsCULUpdate } from '@/lib/utils/candidate-helpers';
import { DEPARTAMENTOS, getProvincias, getDistritos } from '@/lib/data/peru-ubigeo';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function ApplyPage({ params }: { params: Promise<{ token: string }> }) {
    const router = useRouter();
    // Unwrap params Promise using React.use()
    const { token } = use(params);

    const [loading, setLoading] = useState(true);
    const [invitation, setInvitation] = useState<Invitation | null>(null);
    const [existingCandidate, setExistingCandidate] = useState<any | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [uploadingCUL, setUploadingCUL] = useState(false);
    const [success, setSuccess] = useState(false);
    const [candidateCode, setCandidateCode] = useState('');
    const [holdingConfig, setHoldingConfig] = useState<any>(null);
    const [marcaLogo, setMarcaLogo] = useState<string>('');
    const [holdingLogo, setHoldingLogo] = useState<string>('');

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
        certificadoUnicoLaboral: '',
        origenConvocatoria: '', // [NEW] Added field
        documents: {} as Record<string, string>
    });

    const [files, setFiles] = useState<Record<string, File>>({});

    useEffect(() => {
        loadInvitation();
    }, [token]);

    async function loadInvitation() {
        try {
            const inv = await getInvitationByToken(token);

            if (!inv) {
                alert('Invitación no encontrada');
                router.push('/');
                return;
            }

            if (inv.status === 'expired') {
                alert('Esta invitación ha expirado');
                router.push('/');
                return;
            }

            if (inv.status === 'completed') {
                const now = new Date();
                const expiresAt = inv.expiresAt.toDate();

                // Si ya completó pero aún no expira el link (48h), le dejamos entrar
                // para que pueda subir su CUL si le faltaba.
                if (now > expiresAt) {
                    alert('Esta invitación ya fue utilizada y el plazo para cambios ha vencido');
                    router.push('/');
                    return;
                }

                // Si entra aquí, es que status === 'completed' Y aún no expira.
                // Continuamos para que vea su éxito o suba CUL.
                console.log('Invitation completed but still within 48h window. Allowing access for updates.');
            }

            setInvitation(inv);

            // Obtener configuración del holding y logos
            const brandSnap = await getDoc(doc(db, 'marcas', inv.marcaId));
            if (brandSnap.exists()) {
                const brandData = brandSnap.data();
                setMarcaLogo(brandData.logoUrl || '');
                const holdingId = brandData.holdingId;
                if (holdingId) {
                    const holdingSnap = await getDoc(doc(db, 'holdings', holdingId));
                    if (holdingSnap.exists()) {
                        const hData = holdingSnap.data();
                        setHoldingConfig(hData.config || {});
                        setHoldingLogo(hData.logoUrl || '');
                    }
                }
            }

            // Marcar como abierta
            if (inv.status === 'sent') {
                await markInvitationAsOpened(inv.id);
            }

            // Verificar si el candidato ya existe
            const existing = await getCandidateByEmail(inv.candidateEmail);
            if (existing) {
                setExistingCandidate(existing);
                // Pre-llenar formulario
                setFormData({
                    dni: existing.dni || '',
                    nombre: existing.nombre || '',
                    apellidoPaterno: existing.apellidoPaterno || '',
                    apellidoMaterno: existing.apellidoMaterno || '',
                    email: existing.email || '',
                    telefono: existing.telefono || '',
                    departamento: existing.departamento || '',
                    provincia: existing.provincia || '',
                    distrito: existing.distrito || '',
                    direccion: existing.direccion || '',
                    certificadoUnicoLaboral: existing.certificadoUnicoLaboral || '',
                    origenConvocatoria: existing.origenConvocatoria || '', // [NEW]
                    documents: existing.documents || {}
                });
            } else {
                // Nuevo candidato, pre-llenar email
                setFormData(prev => ({ ...prev, email: inv.candidateEmail }));
            }

            setLoading(false);
        } catch (error) {
            console.error('Error loading invitation:', error);
            alert('Error al cargar invitación');
            router.push('/');
        }
    }

    const handleFileUpload = async (file: File, docId: string) => {
        if (!file) return '';

        try {
            setUploadingCUL(true);
            const fileName = `${docId}_${formData.dni}_${Date.now()}.pdf`;
            const storageRef = ref(storage, `candidates/documents/${fileName}`);

            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);

            return downloadURL;
        } catch (error) {
            console.error(`Error uploading ${docId}:`, error);
            throw error;
        } finally {
            setUploadingCUL(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!invitation) return;

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
            alert('Complete la ubicación geográfica');
            return;
        }

        if (!formData.origenConvocatoria) {
            alert('Seleccione cómo se enteró de la convocatoria');
            return;
        }

        try {
            setSubmitting(true);

            // 1. Subir archivos dinámicos
            const uploadedDocs = { ...(formData.documents || {}) };
            for (const [docId, file] of Object.entries(files)) {
                if (file && file.size > 0) {
                    console.log(`Uploading document: ${docId}`, file.name);
                    try {
                        uploadedDocs[docId] = await handleFileUpload(file, docId);
                    } catch (uploadError) {
                        console.error(`Error uploading ${docId}:`, uploadError);
                        alert(`Error al subir el documento: ${docId}. Intenta de nuevo.`);
                        setSubmitting(false);
                        return;
                    }
                }
            }

            // 2. Crear/Actualizar candidato
            const candidateData = {
                ...formData,
                documents: uploadedDocs,
                source: formData.origenConvocatoria, // [NEW] Sync with source field for Analytics
                // Mantener CUL en campo raíz para compatibilidad si existe un docId 'cul'
                certificadoUnicoLaboral: uploadedDocs['cul'] || formData.certificadoUnicoLaboral,
                culUploadedAt: uploadedDocs['cul'] ? new Date() : (existingCandidate?.culUploadedAt || null) // Update timestamp if new CUL uploaded
            };

            let candidateId = '';

            if (existingCandidate) {
                candidateId = existingCandidate.id;
                setCandidateCode(existingCandidate.candidateCode);

                // Actualizar datos
                const { updateCandidate } = await import('@/lib/firestore/candidate-update');
                await updateCandidate(candidateId, candidateData);
            } else {
                // Crear nuevo candidato
                const { createCandidate } = await import('@/lib/firestore/candidates');
                candidateId = await createCandidate(candidateData);
                // Obtener el código generado
                const newCandidateSnap = await getDoc(doc(db, 'candidates', candidateId));
                if (newCandidateSnap.exists()) {
                    setCandidateCode(newCandidateSnap.data().candidateCode);
                }
            }

            // 3. Crear application vinculada al RQ
            if (candidateId) {
                const { createApplication } = await import('@/lib/firestore/applications');
                await createApplication(candidateId, {
                    rqId: invitation.rqId || '',
                    rqNumber: invitation.rqNumber || '',
                    posicion: invitation.posicion || 'Posición no especificada',
                    modalidad: invitation.modalidad || 'Full Time',
                    marcaId: invitation.marcaId,
                    marcaNombre: invitation.marcaNombre,
                    tiendaId: invitation.tiendaId,
                    tiendaNombre: invitation.tiendaNombre,
                    invitationId: invitation.id,
                    sentBy: invitation.sentBy,
                    origenConvocatoria: formData.origenConvocatoria // [NEW] Save origin in application
                });
            }

            // 4. Marcar invitación como completada
            await markInvitationAsCompleted(invitation.id, candidateId);

            // 5. NUEVO: Validación automática de CUL con IA (en background)
            const culUrl = uploadedDocs['cul'] || candidateData.certificadoUnicoLaboral;
            if (culUrl && candidateId) {
                console.log('🤖 Triggering automatic CUL validation...');
                // No await - run in background to not block user
                fetch('/api/ai/auto-validate-cul', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        candidateId,
                        culUrl
                    })
                }).then(res => res.json())
                    .then(data => console.log('🤖 Auto-validation result:', data.validationStatus))
                    .catch(err => console.warn('Auto-validation failed (non-blocking):', err));
            }

            // 5. Enviar correo de confirmación al candidato
            try {
                await fetch('/api/send-registration-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        candidateEmail: formData.email,
                        candidateName: `${formData.nombre} ${formData.apellidoPaterno}`,
                        holdingName: invitation.marcaNombre || 'NGR',
                        applicationLink: `${window.location.origin}/apply/${token}`
                    })
                });
                console.log('✅ Registration email sent');
            } catch (emailErr) {
                console.warn('Email notification failed (non-blocking):', emailErr);
            }

            setSuccess(true);
            window.scrollTo(0, 0);

        } catch (error: any) {
            console.error('Error submitting application:', error);
            alert('Error al enviar la postulación: ' + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
                <div className="text-center animate-pulse">
                    <div className="inline-block p-4 bg-violet-50 rounded-3xl mb-6 shadow-xl shadow-violet-100/50">
                        <div className="w-20 h-20 bg-gradient-to-br from-violet-500 to-cyan-500 rounded-2xl flex items-center justify-center">
                            <span className="text-4xl font-bold text-white">L</span>
                        </div>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                        <div className="h-2 w-48 bg-gray-100 rounded-full overflow-hidden relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-cyan-500 w-1/2 rounded-full animate-loading-bar"></div>
                        </div>
                        <p className="text-gray-500 font-medium text-sm">Cargando postulación...</p>
                    </div>
                </div>
                <style jsx>{`
                    @keyframes loading-bar {
                        0% { transform: translateX(-100%); }
                        100% { transform: translateX(200%); }
                    }
                    .animate-loading-bar {
                        animation: loading-bar 1.5s infinite ease-in-out;
                    }
                `}</style>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-violet-50 to-cyan-50">
                <div className="max-w-md w-full glass-card rounded-2xl p-8 text-center">
                    <div className="text-6xl mb-4">✅</div>
                    <h2 className="text-2xl font-bold gradient-primary mb-2">
                        ¡Postulación Completada!
                    </h2>
                    <p className="text-gray-600 mb-2">
                        Tu postulación a:
                    </p>
                    <div className="bg-violet-50 rounded-xl p-4 mb-6">
                        <p className="font-semibold text-violet-900">{invitation?.marcaNombre}</p>
                        <p className="text-sm text-violet-700">{invitation?.tiendaNombre}</p>
                        {invitation?.rqNumber && (
                            <p className="text-xs text-violet-600 font-mono mt-2">{invitation.rqNumber}</p>
                        )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">Tu código de candidato:</p>
                    <div className="bg-violet-100 rounded-xl p-3 mb-6">
                        <p className="text-2xl font-mono font-bold text-violet-700">
                            {candidateCode}
                        </p>
                    </div>
                    <p className="text-sm text-gray-500">
                        El equipo de reclutamiento te contactará pronto.
                    </p>
                </div>
            </div>
        );
    }

    const provincias = formData.departamento ? getProvincias(formData.departamento) : [];
    const distritos = formData.provincia ? getDistritos(formData.provincia) : [];
    const needsNewCUL = existingCandidate && needsCULUpdate(existingCandidate);

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-violet-50 to-cyan-50">
            <div className="max-w-2xl w-full glass-card rounded-2xl p-8">
                <div className="text-center mb-8">
                    {/* Brand/Holding Logo */}
                    <div className="flex justify-center mb-6">
                        {marcaLogo || holdingLogo ? (
                            <div className="max-w-[200px] max-h-[80px] flex items-center justify-center">
                                <img
                                    src={marcaLogo || holdingLogo}
                                    alt={invitation?.marcaNombre || 'Empresa'}
                                    className="max-w-full max-h-full object-contain drop-shadow-sm"
                                />
                            </div>
                        ) : (
                            <div className="w-20 h-20 bg-gradient-to-br from-violet-500 to-cyan-500 rounded-3xl flex items-center justify-center shadow-lg shadow-violet-200">
                                <span className="text-4xl font-bold text-white">L</span>
                            </div>
                        )}
                    </div>
                    <h1 className="text-3xl font-bold gradient-primary mb-2">
                        Postulación {invitation?.marcaNombre}
                    </h1>
                    <p className="text-gray-600">
                        {invitation?.tiendaNombre}
                    </p>
                    {invitation?.rqNumber && (
                        <p className="text-sm text-violet-600 font-mono mt-2">{invitation.rqNumber}</p>
                    )}
                </div>


                {existingCandidate && (
                    <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-lg">
                        <h3 className="font-semibold text-blue-900 mb-2">
                            ¡Bienvenido de vuelta, {existingCandidate.nombre}!
                        </h3>
                        <p className="text-sm text-blue-700">
                            Tus datos han sido autocompletados. Verifica que estén correctos.
                        </p>
                        {existingCandidate.applications && existingCandidate.applications.length > 0 && (
                            <div className="mt-3">
                                <p className="text-xs text-blue-600 font-semibold mb-1">Historial de postulaciones:</p>
                                <ul className="text-xs text-blue-700 space-y-1">
                                    {existingCandidate.applications.slice(-3).map((app: any, idx: number) => (
                                        <li key={idx}>
                                            • {app.marcaNombre} - {app.tiendaNombre}
                                            ({app.appliedAt?.toDate ? app.appliedAt.toDate().toLocaleDateString() : app.appliedAt ? new Date(app.appliedAt).toLocaleDateString() : 'Sin fecha'})
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                {needsNewCUL && (
                    <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded-lg">
                        <p className="text-sm text-yellow-800">
                            ⚠️ Tu Certificado Único Laboral tiene más de 3 meses. Por favor sube uno actualizado.
                        </p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Similar al formulario de registro pero con campos pre-llenados */}
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
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                            required
                            disabled={!!existingCandidate}
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
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                            required
                            disabled={!!existingCandidate}
                        />
                    </div>

                    {/* Apellidos */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Apellido Paterno <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.apellidoPaterno}
                                onChange={(e) => setFormData({ ...formData, apellidoPaterno: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                                required
                                disabled={!!existingCandidate}
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
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                                disabled={!!existingCandidate}
                            />
                        </div>
                    </div>

                    {/* Email y  Teléfono */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Email <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                                required
                                disabled={!!existingCandidate}
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
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                                required
                                disabled={!!existingCandidate}
                            />
                        </div>
                    </div>

                    {/* Ubicación Geográfica */}
                    <div className="border-t pt-4">
                        <h3 className="text-md font-semibold text-gray-900 mb-3">Ubicación</h3>

                        <div className="grid grid-cols-1 gap-3">
                            {/* Departamento */}
                            <div>
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
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                                    required
                                >
                                    <option value="">Seleccionar...</option>
                                    {DEPARTAMENTOS.map(d => (
                                        <option key={d.id} value={d.id}>{d.nombre}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Provincia */}
                            <div>
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
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 disabled:bg-gray-100"
                                    required
                                >
                                    <option value="">Seleccionar...</option>
                                    {provincias.map(p => (
                                        <option key={p.id} value={p.id}>{p.nombre}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Distrito */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Distrito <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={formData.distrito}
                                    onChange={(e) => setFormData({ ...formData, distrito: e.target.value })}
                                    disabled={!formData.provincia}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 disabled:bg-gray-100"
                                    required
                                >
                                    <option value="">Seleccionar...</option>
                                    {distritos.map(d => (
                                        <option key={d.id} value={d.nombre}>{d.nombre}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Dirección <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.direccion}
                                    onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Origen de Convocatoria */}
                    <div className="border-t pt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            ¿Cómo te enteraste de esta convocatoria? <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={formData.origenConvocatoria}
                            onChange={(e) => setFormData({ ...formData, origenConvocatoria: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                            required
                        >
                            <option value="">Seleccionar...</option>
                            <option value="Bolsa de Trabajo">Bolsa de Trabajo (Computrabajo, LinkedIn, etc.)</option>
                            <option value="Referido">Referido de un trabajador</option>
                            <option value="Anuncio en Tienda">Anuncio en Tienda / Volante</option>
                            <option value="Redes Sociales">Redes Sociales (Facebook, Instagram, TikTok)</option>
                            <option value="Otros">Otros</option>
                        </select>
                    </div>

                    {/* Documentos Dinámicos */}
                    {holdingConfig?.requiredDocuments?.filter((d: any) => d.active).length > 0 && (
                        <div className="border-t pt-6 space-y-6">
                            <h3 className="text-lg font-semibold text-gray-900">Documentos Requeridos</h3>
                            {holdingConfig.requiredDocuments.filter((d: any) => d.active).map((doc: any) => (
                                <div key={doc.id}>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {doc.name} {(!existingCandidate?.documents?.[doc.id]) && <span className="text-red-500">*</span>}
                                    </label>
                                    <input
                                        type="file"
                                        accept=".pdf,image/*"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                setFiles(prev => ({ ...prev, [doc.id]: file }));
                                            }
                                        }}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                                        required={!existingCandidate?.documents?.[doc.id]}
                                    />
                                    {existingCandidate?.documents?.[doc.id] && (
                                        <p className="text-xs text-green-600 mt-1">
                                            {doc.id === 'cul' && needsNewCUL
                                                ? '⚠️ CUL detectado pero está desactualizado (>3 meses). Por favor sube uno nuevo.'
                                                : '✓ Ya has subido este documento. Puedes subir uno nuevo para actualizarlo.'}
                                        </p>
                                    )}
                                    {/* Fallback check for CUL if it's in the root field but not in documents map */}
                                    {doc.id === 'cul' && !existingCandidate?.documents?.[doc.id] && existingCandidate?.certificadoUnicoLaboral && (
                                        <p className="text-xs text-green-600 mt-1">
                                            {needsNewCUL
                                                ? '⚠️ CUL detectado pero está desactualizado (>3 meses). Por favor sube uno nuevo.'
                                                : '✓ Ya has subido tu CUL anteriormente. Puedes subir uno nuevo para actualizarlo.'}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Consent Checkbox */}
                    <div className="border-t pt-4">
                        <label className="flex items-start gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                id="consent"
                                required
                                className="mt-1 w-5 h-5 text-violet-600 border-gray-300 rounded focus:ring-violet-500"
                            />
                            <span className="text-sm text-gray-600">
                                He leído y acepto los{' '}
                                <a
                                    href="/terminos"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-violet-600 hover:text-violet-700 underline"
                                >
                                    Términos y Condiciones
                                </a>{' '}
                                y la{' '}
                                <a
                                    href="/privacidad"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-violet-600 hover:text-violet-700 underline"
                                >
                                    Política de Privacidad
                                </a>{' '}
                                de LIAH. Autorizo el tratamiento de mis datos personales para fines de reclutamiento.
                                <span className="text-red-500"> *</span>
                            </span>
                        </label>
                    </div>

                    <button
                        type="submit"
                        disabled={submitting || uploadingCUL}
                        className="w-full gradient-bg text-white py-3 rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
                    >
                        {uploadingCUL ? 'Subiendo documento...' : submitting ? 'Enviando...' : 'Completar Postulación'}
                    </button>
                </form>
            </div>
        </div>
    );
}
