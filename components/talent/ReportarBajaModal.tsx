'use client';

import { useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, Timestamp, query, where, getDocs } from 'firebase/firestore';
import { MOTIVOS_BAJA_SUNAT } from '@/lib/constants/sunat-codes';

interface ReportarBajaModalProps {
    isOpen: boolean;
    onClose: () => void;
    holdingId: string;
    colaborador?: {
        id: string;
        nombreCompleto: string;
        numeroDocumento: string;
        tipoDocumento: string;
        fechaIngreso?: any;
    };
}

export default function ReportarBajaModal({ isOpen, onClose, holdingId, colaborador }: ReportarBajaModalProps) {
    const isManual = colaborador?.id === 'manual';

    const [nombreManual, setNombreManual] = useState(colaborador?.nombreCompleto || '');
    const [dniManual, setDniManual] = useState(colaborador?.numeroDocumento || '');
    const [motivo, setMotivo] = useState('01'); // Renuncia
    const [fechaCese, setFechaCese] = useState(new Date().toISOString().split('T')[0]);
    const [fechaIngresoManual, setFechaIngresoManual] = useState('');
    const [noSabeFechaIngreso, setNoSabeFechaIngreso] = useState(false);
    const [noSabeDNI, setNoSabeDNI] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    if (!isOpen || !colaborador) return null;

    const filteredReasons = MOTIVOS_BAJA_SUNAT.filter(m => ['01', '09', '11'].includes(m.code)).map(m => {
        if (m.code === '11') return { ...m, label: 'Ausencia / Abandono' };
        if (m.code === '09') return { ...m, label: 'No renovación de contrato' };
        return m;
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            // Calculate permanencia
            let permanenciaDias: number | null = null;
            const fechaIngresoFinal = colaborador.fechaIngreso?.toDate?.() ||
                (colaborador.fechaIngreso ? new Date(colaborador.fechaIngreso) : null) ||
                (fechaIngresoManual ? new Date(fechaIngresoManual) : null);

            if (fechaIngresoFinal && !noSabeFechaIngreso) {
                const cese = new Date(fechaCese);
                const diferencia = cese.getTime() - fechaIngresoFinal.getTime();
                permanenciaDias = Math.floor(diferencia / (1000 * 60 * 60 * 24));
            }

            // Determine status based on missing data
            const missingData = noSabeDNI || noSabeFechaIngreso || (isManual && !dniManual && !noSabeDNI);

            // Create Baja record
            const docRef = await addDoc(collection(db, 'bajas_colaboradores'), {
                holdingId,
                colaboradorId: colaborador.id,
                nombreCompleto: isManual ? nombreManual : colaborador.nombreCompleto,
                numeroDocumento: isManual ? (noSabeDNI ? 'DESCONOCIDO' : dniManual) : colaborador.numeroDocumento,
                tipoDocumento: colaborador.tipoDocumento,
                fechaIngreso: fechaIngresoFinal || null,
                fechaCese,
                permanenciaDias,
                noSabeFechaIngreso,
                noSabeDNI,
                motivoBaja: motivo,
                motivoLabel: filteredReasons.find(m => m.code === motivo)?.label || 'Otro',
                createdAt: Timestamp.now(),
                status: missingData ? 'pendiente_data' : 'procesado',
                isLiahCandidate: !!colaborador.fechaIngreso && !isManual
            });

            // 🔍 Intento de buscar email para encuesta de salida
            try {
                const numDoc = isManual ? (noSabeDNI ? '' : dniManual) : colaborador.numeroDocumento;
                if (numDoc) {
                    const colabQuery = query(
                        collection(db, 'nuevos_colaboradores'),
                        where('numeroDocumento', '==', numDoc)
                    );
                    const colabSnap = await getDocs(colabQuery);

                    if (!colabSnap.empty) {
                        const colabData = colabSnap.docs[0].data();
                        const personalEmail = colabData.emailPersonal || colabData.email;

                        if (personalEmail) {
                            fetch('/api/send-exit-survey-email', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    email: personalEmail,
                                    name: isManual ? nombreManual : colaborador.nombreCompleto,
                                    holdingName: 'Empresa',
                                    reason: filteredReasons.find(m => m.code === motivo)?.label || 'Otro'
                                })
                            }).catch(err => console.error('Error triggering exit email:', err));
                        }
                    }
                }
            } catch (emailError) {
                console.warn('Could not trigger exit survey email:', emailError);
            }

            alert('✅ Baja reportada exitosamente');
            onClose();
        } catch (error) {
            console.error('Error reporting baja:', error);
            alert('Error al reportar la baja');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="bg-red-600 p-6 text-white">
                    <h3 className="text-xl font-bold">📤 Reportar Baja de Colaborador</h3>
                    <p className="text-red-100 text-sm mt-1">Este proceso generará el archivo para T-Registro (SUNAT)</p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-3">
                        <label className="text-xs text-gray-400 uppercase font-bold tracking-wider">Información del Colaborador</label>

                        {isManual ? (
                            <div className="space-y-3">
                                <input
                                    type="text"
                                    placeholder="Nombres y Apellidos Completos"
                                    value={nombreManual}
                                    onChange={(e) => setNombreManual(e.target.value)}
                                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none"
                                    required
                                />

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-gray-700">DNI:</label>
                                        <div className="flex items-center gap-1.5">
                                            <input
                                                type="checkbox"
                                                id="noSabeDNI"
                                                checked={noSabeDNI}
                                                onChange={(e) => setNoSabeDNI(e.target.checked)}
                                                className="w-3.5 h-3.5 text-red-600 rounded"
                                            />
                                            <label htmlFor="noSabeDNI" className="text-[11px] text-gray-500">DNI Desconocido</label>
                                        </div>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Número de DNI"
                                        value={dniManual}
                                        onChange={(e) => setDniManual(e.target.value)}
                                        disabled={noSabeDNI}
                                        className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none disabled:bg-gray-50 disabled:text-gray-400"
                                        required={!noSabeDNI}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <p className="font-bold text-gray-900">{colaborador.nombreCompleto}</p>
                                <p className="text-xs text-gray-500">{colaborador.tipoDocumento}: {colaborador.numeroDocumento}</p>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Motivo de Baja (SUNAT)</label>
                        <select
                            value={motivo}
                            onChange={(e) => setMotivo(e.target.value)}
                            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none font-medium"
                            required
                        >
                            {filteredReasons.map(m => (
                                <option key={m.code} value={m.code}>{m.label}</option>
                            ))}
                        </select>
                    </div>

                    {!colaborador.fechaIngreso && (
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                            <label className="block text-sm font-medium text-gray-700 mb-2">📅 Fecha de Ingreso (Personal Antiguo)</label>

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
                                    ⚠️ El equipo de Compensaciones completará este dato más tarde.
                                </p>
                            )}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Último Día Laboral</label>
                        <input
                            type="date"
                            value={fechaCese}
                            onChange={(e) => setFechaCese(e.target.value)}
                            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 outline-none"
                            required
                        />
                    </div>

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
                            disabled={submitting}
                            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 shadow-lg"
                        >
                            {submitting ? '⏳ Procesando...' : '📤 Reportar Baja'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
