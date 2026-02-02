'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, Timestamp, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';

interface ReportarBajaModalProps {
    isOpen: boolean;
    onClose: () => void;
    holdingId: string;
    storeId?: string;
    storeName?: string;
    marcaId?: string;
    marcaNombre?: string;
}

interface CandidateData {
    id: string;
    nombre: string;
    apellidoPaterno: string;
    apellidoMaterno: string;
    dni: string;
    email?: string;
    telefono?: string;
    tienda?: string;
    posicion?: string;
    modalidad?: string;
    fechaIngreso?: any;
    isFromLiah: boolean;
}

export default function ReportarBajaModal({
    isOpen,
    onClose,
    holdingId,
    storeId,
    storeName,
    marcaId,
    marcaNombre
}: ReportarBajaModalProps) {
    // DNI-based lookup
    const [dni, setDni] = useState('');
    const [searching, setSearching] = useState(false);
    const [candidateData, setCandidateData] = useState<CandidateData | null>(null);
    const [notFound, setNotFound] = useState(false);

    // Manual fields (used when candidate not found in LIAH)
    const [nombreManual, setNombreManual] = useState('');
    const [tiendaManual, setTiendaManual] = useState(storeName || '');
    const [posicionManual, setPosicionManual] = useState('');
    const [modalidadManual, setModalidadManual] = useState('Full Time');
    const [emailManual, setEmailManual] = useState('');
    const [telefonoManual, setTelefonoManual] = useState('');

    // Common fields
    const [motivo, setMotivo] = useState('01'); // Renuncia
    const [fechaCese, setFechaCese] = useState(new Date().toISOString().split('T')[0]);
    const [fechaIngresoManual, setFechaIngresoManual] = useState('');
    const [noSabeFechaIngreso, setNoSabeFechaIngreso] = useState(false);
    const [noRecomendar, setNoRecomendar] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Motivos de baja simplificados
    const motivosBaja = [
        { code: '01', label: 'Renuncia' },
        { code: '11', label: 'Abandono' },
        { code: '09', label: 'Vencimiento de Contrato' },
        { code: 'otros', label: 'Otros' }
    ];

    // Search candidate by DNI
    const searchByDni = async () => {
        if (dni.length < 8) return;

        setSearching(true);
        setNotFound(false);
        setCandidateData(null);

        try {
            const candidatesRef = collection(db, 'candidates');
            const q = query(candidatesRef, where('dni', '==', dni));
            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                const doc = snapshot.docs[0];
                const data = doc.data();

                // Find the latest hired application
                const hiredApp = data.applications?.find((app: any) => app.hiredStatus === 'hired');
                const latestApp = data.applications?.[data.applications.length - 1];
                const appToUse = hiredApp || latestApp;

                setCandidateData({
                    id: doc.id,
                    nombre: data.nombre || '',
                    apellidoPaterno: data.apellidoPaterno || '',
                    apellidoMaterno: data.apellidoMaterno || '',
                    dni: data.dni,
                    email: data.email || '',
                    telefono: data.telefono || data.phone || '',
                    tienda: appToUse?.tiendaNombre || storeName || '',
                    posicion: appToUse?.posicion || '',
                    modalidad: appToUse?.modalidad || 'Full Time',
                    fechaIngreso: hiredApp?.startDate || data.fechaIngreso,
                    isFromLiah: true
                });
            } else {
                setNotFound(true);
            }
        } catch (error) {
            console.error('Error searching candidate:', error);
            setNotFound(true);
        } finally {
            setSearching(false);
        }
    };

    // Auto-search when DNI is 8 digits
    useEffect(() => {
        if (dni.length === 8) {
            searchByDni();
        } else {
            setCandidateData(null);
            setNotFound(false);
        }
    }, [dni]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (dni.length < 8) {
            alert('❌ El DNI debe tener 8 dígitos');
            return;
        }

        setSubmitting(true);

        try {
            // Determine final values
            const isFromLiah = !!candidateData?.isFromLiah;
            const nombreCompleto = candidateData
                ? `${candidateData.nombre} ${candidateData.apellidoPaterno} ${candidateData.apellidoMaterno}`.trim()
                : nombreManual;

            // Calculate permanencia
            let permanenciaDias: number | null = null;
            const fechaIngresoFinal = candidateData?.fechaIngreso?.toDate?.() ||
                (candidateData?.fechaIngreso ? new Date(candidateData.fechaIngreso) : null) ||
                (fechaIngresoManual ? new Date(fechaIngresoManual) : null);

            if (fechaIngresoFinal && !noSabeFechaIngreso) {
                const cese = new Date(fechaCese);
                const diferencia = cese.getTime() - fechaIngresoFinal.getTime();
                permanenciaDias = Math.floor(diferencia / (1000 * 60 * 60 * 24));
            }

            // Determine status based on completeness
            const needsCompensacionReview = !isFromLiah || noSabeFechaIngreso;

            // Create Baja record
            await addDoc(collection(db, 'bajas_colaboradores'), {
                holdingId,
                storeId: storeId || '',
                storeName: candidateData?.tienda || tiendaManual || storeName || '',
                marcaId: marcaId || '',
                marcaNombre: marcaNombre || '',
                candidateId: candidateData?.id || null,
                nombreCompleto,
                numeroDocumento: dni,
                email: candidateData?.email || emailManual || '',
                telefono: candidateData?.telefono || telefonoManual || '',
                tipoDocumento: 'DNI',
                posicion: candidateData?.posicion || posicionManual || '',
                modalidad: candidateData?.modalidad || modalidadManual || 'Full Time',
                fechaIngreso: fechaIngresoFinal || null,
                fechaCese,
                permanenciaDias,
                noSabeFechaIngreso,
                noRecomendar,
                motivoBaja: motivo,
                motivoLabel: motivosBaja.find(m => m.code === motivo)?.label || 'Otro',
                createdAt: Timestamp.now(),
                status: needsCompensacionReview ? 'pendiente_data' : 'pendiente',
                isLiahCandidate: isFromLiah
            });

            // Release candidate's assignments to allow future re-hiring
            if (candidateData?.id) {
                try {
                    const candidatesRef = collection(db, 'candidates');
                    const candidateQuery = query(candidatesRef, where('dni', '==', dni));
                    const candidateSnapshot = await getDocs(candidateQuery);

                    if (!candidateSnapshot.empty) {
                        const candidateDoc = candidateSnapshot.docs[0];
                        const candidateDocData = candidateDoc.data();

                        // Mark all active assignments as 'released'
                        const updatedAssignments = (candidateDocData.assignments || []).map((a: any) => ({
                            ...a,
                            status: (a.status === 'assigned' || a.status === 'confirmed') ? 'released' : a.status
                        }));

                        // Update the candidate document
                        const candidateRef = doc(db, 'candidates', candidateDoc.id);
                        await updateDoc(candidateRef, {
                            assignments: updatedAssignments,
                            selectionStatus: null,
                            selectedForRQ: null,
                            updatedAt: Timestamp.now()
                        });
                        console.log(`[ReportarBaja] Released assignments for candidate ${dni}`);
                    }
                } catch (err) {
                    console.error('[ReportarBaja] Error releasing candidate assignments:', err);
                }
            }

            // 3. Trigger Exit Survey automatically
            const finalEmail = candidateData?.email || emailManual;
            const finalPhone = candidateData?.telefono || telefonoManual;

            if (finalEmail || finalPhone) {
                try {
                    await fetch('/api/send-exit-survey', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            email: finalEmail,
                            phone: finalPhone,
                            name: nombreCompleto,
                            holdingName: marcaNombre || 'la empresa',
                            reason: motivosBaja.find(m => m.code === motivo)?.label || 'Baja reportada'
                        })
                    });
                    console.log(`[ReportarBaja] Exit survey triggered for ${finalEmail || finalPhone}`);
                } catch (surveyErr) {
                    console.error('[ReportarBaja] Failed to trigger exit survey:', surveyErr);
                }
            }

            alert('✅ Baja reportada exitosamente. El equipo de Compensaciones validará el registro y se ha enviado la encuesta de salida.');
            onClose();
        } catch (error) {
            console.error('Error reporting baja:', error);
            alert('Error al reportar la baja');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
                <div className="bg-red-600 p-6 text-white">
                    <h3 className="text-xl font-bold">📤 Reportar Baja de Colaborador</h3>
                    <p className="text-red-100 text-sm mt-1">Este proceso generará el archivo para T-Registro (SUNAT)</p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* DNI - Primary Identifier */}
                    <div className="bg-violet-50 p-4 rounded-xl border border-violet-200">
                        <label className="block text-sm font-bold text-violet-800 mb-2">
                            🔍 DNI del Colaborador <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Ingresa los 8 dígitos del DNI"
                                value={dni}
                                onChange={(e) => setDni(e.target.value.replace(/\D/g, '').slice(0, 8))}
                                className="flex-1 border-2 border-violet-300 rounded-lg px-4 py-3 text-lg font-mono focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none"
                                required
                                maxLength={8}
                            />
                            {searching && (
                                <div className="flex items-center px-4">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-600"></div>
                                </div>
                            )}
                        </div>
                        <p className="text-xs text-violet-600 mt-2">
                            Al ingresar el DNI, buscaremos automáticamente en la base de LIAH
                        </p>
                    </div>

                    {/* Found in LIAH - Show auto-filled data */}
                    {candidateData && (
                        <div className="bg-green-50 p-4 rounded-xl border border-green-200 animate-in fade-in duration-300">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-green-600 text-lg">✅</span>
                                <span className="text-sm font-bold text-green-800">Encontrado en LIAH</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <span className="text-gray-500">Nombre:</span>
                                    <p className="font-semibold text-gray-900">
                                        {candidateData.nombre} {candidateData.apellidoPaterno} {candidateData.apellidoMaterno}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-gray-500">DNI:</span>
                                    <p className="font-mono font-semibold text-gray-900">{candidateData.dni}</p>
                                </div>
                                <div>
                                    <span className="text-gray-500">Tienda:</span>
                                    <p className="font-semibold text-violet-700">{candidateData.tienda || 'No especificada'}</p>
                                </div>
                                <div>
                                    <span className="text-gray-500">Posición:</span>
                                    <p className="font-semibold text-gray-900">{candidateData.posicion || 'No especificada'}</p>
                                </div>
                                <div>
                                    <span className="text-gray-500">Modalidad:</span>
                                    <p className="font-semibold text-gray-900">{candidateData.modalidad || 'Full Time'}</p>
                                </div>
                                {candidateData.fechaIngreso && (
                                    <div>
                                        <span className="text-gray-500">Fecha Ingreso:</span>
                                        <p className="font-semibold text-gray-900">
                                            {candidateData.fechaIngreso?.toDate?.().toLocaleDateString('es-PE') ||
                                                new Date(candidateData.fechaIngreso).toLocaleDateString('es-PE')}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Not Found - Manual Entry */}
                    {notFound && dni.length === 8 && (
                        <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 animate-in fade-in duration-300 space-y-3">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-amber-600 text-lg">⚠️</span>
                                <span className="text-sm font-bold text-amber-800">No encontrado en LIAH - Completar datos</span>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Nombres y Apellidos *</label>
                                <input
                                    type="text"
                                    placeholder="Ej: Juan Pérez García"
                                    value={nombreManual}
                                    onChange={(e) => setNombreManual(e.target.value)}
                                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                                    required={notFound}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Tienda</label>
                                    <input
                                        type="text"
                                        placeholder="Ej: Bembos Plaza San Miguel"
                                        value={tiendaManual}
                                        onChange={(e) => setTiendaManual(e.target.value)}
                                        className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Posición</label>
                                    <input
                                        type="text"
                                        placeholder="Ej: Cajero"
                                        value={posicionManual}
                                        onChange={(e) => setPosicionManual(e.target.value)}
                                        className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Email (Para Encuesta)</label>
                                    <input
                                        type="email"
                                        placeholder="Ej: juan@gmail.com"
                                        value={emailManual}
                                        onChange={(e) => setEmailManual(e.target.value)}
                                        className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Teléfono</label>
                                    <input
                                        type="tel"
                                        placeholder="Ej: 999888777"
                                        value={telefonoManual}
                                        onChange={(e) => setTelefonoManual(e.target.value)}
                                        className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Modalidad</label>
                                <select
                                    value={modalidadManual}
                                    onChange={(e) => setModalidadManual(e.target.value)}
                                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                                >
                                    <option value="Full Time">Full Time</option>
                                    <option value="Part Time 24">Part Time 24</option>
                                    <option value="Part Time 19">Part Time 19</option>
                                    <option value="Part Time 12">Part Time 12</option>
                                </select>
                            </div>

                            <p className="text-xs text-amber-700 bg-amber-100 p-2 rounded">
                                💡 El equipo de Compensaciones completará los datos faltantes
                            </p>
                        </div>
                    )}

                    {/* Show fields only after DNI lookup */}
                    {(candidateData || (notFound && dni.length === 8)) && (
                        <>
                            {/* Motivo de Baja */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Motivo de Baja (SUNAT)</label>
                                <select
                                    value={motivo}
                                    onChange={(e) => setMotivo(e.target.value)}
                                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none font-medium"
                                    required
                                >
                                    {motivosBaja.map(m => (
                                        <option key={m.code} value={m.code}>{m.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Fecha de Ingreso - only if not available */}
                            {!candidateData?.fechaIngreso && (
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">📅 Fecha de Ingreso</label>

                                    <div className="flex items-center gap-2 mb-3">
                                        <input
                                            type="checkbox"
                                            id="noSabeFecha"
                                            checked={noSabeFechaIngreso}
                                            onChange={(e) => setNoSabeFechaIngreso(e.target.checked)}
                                            className="w-4 h-4 text-red-600 rounded"
                                        />
                                        <label htmlFor="noSabeFecha" className="text-sm text-gray-600">No conozco la fecha de ingreso</label>
                                    </div>

                                    {!noSabeFechaIngreso && (
                                        <input
                                            type="date"
                                            value={fechaIngresoManual}
                                            onChange={(e) => setFechaIngresoManual(e.target.value)}
                                            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 outline-none"
                                            required={!noSabeFechaIngreso}
                                        />
                                    )}

                                    {noSabeFechaIngreso && (
                                        <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-100">
                                            ⚠️ El equipo de Compensaciones completará este dato.
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Último Día Laboral */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Último Día Laboral *</label>
                                <input
                                    type="date"
                                    value={fechaCese}
                                    onChange={(e) => setFechaCese(e.target.value)}
                                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 outline-none"
                                    required
                                />
                            </div>

                            {/* No Recomendar */}
                            <div className="bg-red-50 p-4 rounded-xl border border-red-200">
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        id="noRecomendar"
                                        checked={noRecomendar}
                                        onChange={(e) => setNoRecomendar(e.target.checked)}
                                        className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                                    />
                                    <div>
                                        <label htmlFor="noRecomendar" className="text-sm font-bold text-red-800 cursor-pointer">
                                            ⚠️ No recomendar para rehire
                                        </label>
                                        <p className="text-xs text-red-600 mt-0.5">Marcar si el colaborador no es recomendable para futuras contrataciones.</p>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Actions */}
                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || dni.length < 8 || (!candidateData && !nombreManual)}
                            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                        >
                            {submitting ? '⏳ Procesando...' : '📤 Reportar Baja'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
