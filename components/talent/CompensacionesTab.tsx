'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc } from 'firebase/firestore';
import { generateTRegistroAltas, generateTRegistroBajas } from '@/lib/utils/t-registro-utils';
import ReportarBajaModal from '@/components/talent/ReportarBajaModal';

interface CompensacionesTabProps {
    holdingId: string;
}

export default function CompensacionesTab({ holdingId }: CompensacionesTabProps) {
    const [activeTab, setActiveTab] = useState<'ingresos' | 'salidas'>('ingresos');
    const [ingresos, setIngresos] = useState<any[]>([]);
    const [salidas, setSalidas] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingBaja, setEditingBaja] = useState<string | null>(null);
    const [editingFechaBaja, setEditingFechaBaja] = useState<string | null>(null);
    const [tempDni, setTempDni] = useState('');
    const [tempFechaIngreso, setTempFechaIngreso] = useState('');
    const [showBajaModal, setShowBajaModal] = useState(false);
    const [periodo, setPeriodo] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [selectedBajas, setSelectedBajas] = useState<string[]>([]);
    const [processingBulk, setProcessingBulk] = useState(false);

    useEffect(() => {
        if (!holdingId) return;
        setLoading(true);

        // Load Ingresos (Nuevos Colaboradores con status 'validado')
        const qIngresos = query(
            collection(db, 'nuevos_colaboradores'),
            where('holdingId', '==', holdingId),
            where('status', '==', 'validado'),
            orderBy('createdAt', 'desc')
        );

        const unsubIngresos = onSnapshot(qIngresos, (snap) => {
            const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setIngresos(data);
            setLoading(false);
        });

        // Load Salidas (Bajas)
        const qSalidas = query(
            collection(db, 'bajas_colaboradores'),
            where('holdingId', '==', holdingId),
            orderBy('fechaCese', 'desc')
        );

        const unsubSalidas = onSnapshot(qSalidas, (snap) => {
            const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setSalidas(data);
        });

        return () => {
            unsubIngresos();
            unsubSalidas();
        };
    }, [holdingId]);

    const downloadAltasTXT = () => {
        if (ingresos.length === 0) return alert('No hay ingresos validados para exportar');
        const content = generateTRegistroAltas(ingresos);
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `RP_01_ALTAS_${periodo}.txt`;
        link.click();
    };

    const downloadBajasTXT = () => {
        if (salidas.length === 0) return alert('No hay bajas registradas para exportar');
        const content = generateTRegistroBajas(salidas);
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `RP_PERIODOS_BAJAS_${periodo}.txt`;
        link.click();
    };

    const triggerExitSurvey = async (baja: any) => {
        // Find email in nuevos_colaboradores
        try {
            const docNum = baja.numeroDocumento;
            if (!docNum || docNum === 'DESCONOCIDO') return;

            const q = query(collection(db, 'nuevos_colaboradores'), where('numeroDocumento', '==', docNum));
            const snap = await getDocs(q);
            if (!snap.empty) {
                const data = snap.docs[0].data();
                const email = data.emailPersonal || data.email;
                if (email) {
                    await fetch('/api/send-exit-survey-email', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            email,
                            name: baja.nombreCompleto,
                            holdingName: 'Empresa',
                            reason: baja.motivoLabel || 'Otro'
                        })
                    });
                }
            }
        } catch (e) {
            console.error('Error triggering exit survey:', e);
        }
    };

    const handleUpdateDNI = async (bajaId: string) => {
        if (!tempDni || tempDni.length < 8) return alert('Ingrese un DNI válido');
        try {
            const bajaRef = doc(db, 'bajas_colaboradores', bajaId);
            await updateDoc(bajaRef, {
                numeroDocumento: tempDni,
                tipoDocumento: 'DNI',
                status: 'procesado'
            });

            const bajaFull = salidas.find(s => s.id === bajaId);
            if (bajaFull) triggerExitSurvey({ ...bajaFull, numeroDocumento: tempDni });

            setEditingBaja(null);
            setTempDni('');
            alert('✅ DNI actualizado y registro validado');
        } catch (error) {
            console.error('Error updating DNI:', error);
            alert('Error al actualizar DNI');
        }
    };

    const handleUpdateFechaIngreso = async (bajaId: string, fechaCese: string) => {
        if (!tempFechaIngreso) return alert('Ingrese una fecha válida');
        try {
            const ingreso = new Date(tempFechaIngreso);
            const cese = new Date(fechaCese);
            const diferencia = cese.getTime() - ingreso.getTime();
            const permanenciaDias = Math.floor(diferencia / (1000 * 60 * 60 * 24));

            const bajaRef = doc(db, 'bajas_colaboradores', bajaId);
            await updateDoc(bajaRef, {
                fechaIngreso: ingreso,
                permanenciaDias,
                status: 'procesado',
                noSabeFechaIngreso: false
            });

            const bajaFull = salidas.find(s => s.id === bajaId);
            if (bajaFull) triggerExitSurvey(bajaFull);

            setEditingFechaBaja(null);
            setTempFechaIngreso('');
            alert('✅ Fecha de ingreso actualizada y permanencia calculada');
        } catch (error) {
            console.error('Error updating fecha ingreso:', error);
            alert('Error al actualizar fecha de ingreso');
        }
    };

    const handleBulkValidate = async () => {
        if (selectedBajas.length === 0) return;
        const toValidate = salidas.filter(s =>
            selectedBajas.includes(s.id) &&
            s.numeroDocumento &&
            s.numeroDocumento !== 'DESCONOCIDO' &&
            !s.noSabeFechaIngreso
        );

        if (toValidate.length === 0) return alert('Los registros seleccionados deben tener DNI y Fecha de Ingreso para validarse en bloque.');

        setProcessingBulk(true);
        try {
            for (const s of toValidate) {
                const bajaRef = doc(db, 'bajas_colaboradores', s.id);
                await updateDoc(bajaRef, { status: 'procesado' });
                triggerExitSurvey(s);
            }
            setSelectedBajas([]);
            alert(`✅ ${toValidate.length} bajas validadas y encuestas enviadas.`);
        } catch (err) {
            console.error(err);
            alert('Error en validación masiva');
        } finally {
            setProcessingBulk(false);
        }
    };

    const handleSmartAutoFill = async () => {
        const pendientes = salidas.filter(s => s.status === 'pendiente_data' || s.status === 'INCOMPLETE_INFO');
        if (pendientes.length === 0) return alert('No hay registros pendientes para auto-completar');

        setProcessingBulk(true);
        let filledCount = 0;
        try {
            for (const s of pendientes) {
                // Try to find in ingresos (we already have them in state)
                const match = ingresos.find(i =>
                    i.nombreCompleto?.toLowerCase().trim() === s.nombreCompleto?.toLowerCase().trim() ||
                    (i.numeroDocumento && i.numeroDocumento === s.numeroDocumento)
                );

                if (match) {
                    const bajaRef = doc(db, 'bajas_colaboradores', s.id);
                    const updateData: any = { status: 'procesado' };

                    if (!s.numeroDocumento || s.numeroDocumento === 'DESCONOCIDO') {
                        updateData.numeroDocumento = match.numeroDocumento;
                        updateData.tipoDocumento = match.tipoDocumento || 'DNI';
                    }

                    if (s.noSabeFechaIngreso && match.fechaIngreso) {
                        const ingresoDate = match.fechaIngreso?.toDate?.() || new Date(match.fechaIngreso);
                        const ceseDate = new Date(s.fechaCese);
                        const diff = ceseDate.getTime() - ingresoDate.getTime();
                        updateData.fechaIngreso = match.fechaIngreso;
                        updateData.permanenciaDias = Math.floor(diff / (1000 * 60 * 60 * 24));
                        updateData.noSabeFechaIngreso = false;
                    }

                    await updateDoc(bajaRef, updateData);
                    triggerExitSurvey({ ...s, ...updateData });
                    filledCount++;
                }
            }
            alert(`✨ Auto-Fill completado: Se encontraron coincidencias para ${filledCount} registros.`);
        } catch (err) {
            console.error(err);
        } finally {
            setProcessingBulk(false);
        }
    };

    const toggleSelection = (id: string) => {
        setSelectedBajas(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">📑 Módulo de Compensaciones</h1>
                    <p className="text-sm text-gray-500 mt-1">Gestión de Altas y Bajas para T-Registro (SUNAT)</p>
                </div>
                <div className="flex items-center gap-3">
                    <input
                        type="month"
                        value={periodo}
                        onChange={(e) => setPeriodo(e.target.value)}
                        className="border rounded-lg px-3 py-2 text-sm focus:ring-violet-500"
                    />
                    <button
                        onClick={() => setShowBajaModal(true)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-2 whitespace-nowrap"
                    >
                        📤 Reportar Baja
                    </button>
                </div>
            </div>

            <div className="flex border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('ingresos')}
                    className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'ingresos' ? 'border-violet-600 text-violet-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                >
                    📥 Ingresos (Altas)
                    <span className="ml-2 bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full text-xs">
                        {ingresos.length}
                    </span>
                </button>
                <button
                    onClick={() => setActiveTab('salidas')}
                    className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'salidas' ? 'border-violet-600 text-violet-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                >
                    📤 Salidas (Bajas)
                    <span className="ml-2 bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs">
                        {salidas.length}
                    </span>
                </button>
            </div>

            {activeTab === 'ingresos' ? (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="font-semibold text-gray-900">Personal Validado para Alta</h3>
                        <button
                            onClick={downloadAltasTXT}
                            className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 flex items-center gap-2"
                        >
                            📥 Exportar .txt (T-Registro)
                        </button>
                    </div>

                    <div className="bg-white rounded-xl shadow overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                                <tr>
                                    <th className="px-6 py-3">Colaborador</th>
                                    <th className="px-6 py-3">Doc</th>
                                    <th className="px-6 py-3">Puesto</th>
                                    <th className="px-6 py-3">Banco / Cuenta</th>
                                    <th className="px-6 py-3">Validado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {ingresos.length === 0 ? (
                                    <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-400">No hay ingresos validados en este periodo</td></tr>
                                ) : (
                                    ingresos.map(c => (
                                        <tr key={c.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 font-medium text-gray-900">{c.apellidos}, {c.nombres}</td>
                                            <td className="px-6 py-4">{c.numeroDocumento}</td>
                                            <td className="px-6 py-4">{c.puesto || '-'}</td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-700">{c.banco}</div>
                                                <div className="text-xs text-gray-500">{c.numeroCuenta}</div>
                                            </td>
                                            <td className="px-6 py-4 text-green-600 font-medium">✓</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <h3 className="font-semibold text-gray-900">Ceses Reportados</h3>
                            {selectedBajas.length > 0 && (
                                <button
                                    onClick={handleBulkValidate}
                                    disabled={processingBulk}
                                    className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 shadow-sm"
                                >
                                    ✅ Validar {selectedBajas.length} seleccionados
                                </button>
                            )}
                            <button
                                onClick={handleSmartAutoFill}
                                disabled={processingBulk}
                                className="px-3 py-1.5 bg-violet-100 text-violet-700 rounded-lg text-xs font-bold hover:bg-violet-200"
                            >
                                ✨ Smart Auto-Fill
                            </button>
                        </div>
                        <button
                            onClick={downloadBajasTXT}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-2"
                        >
                            📤 Exportar .txt (T-Registro)
                        </button>
                    </div>

                    <div className="bg-white rounded-xl shadow overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                                <tr>
                                    <th className="px-6 py-3 w-10">
                                        <input
                                            type="checkbox"
                                            onChange={(e) => {
                                                if (e.target.checked) setSelectedBajas(salidas.map(s => s.id));
                                                else setSelectedBajas([]);
                                            }}
                                            checked={selectedBajas.length === salidas.length && salidas.length > 0}
                                            className="rounded"
                                        />
                                    </th>
                                    <th className="px-6 py-3">Colaborador</th>
                                    <th className="px-6 py-3">Permanencia</th>
                                    <th className="px-6 py-3">Motivo</th>
                                    <th className="px-6 py-3">Fecha Cese</th>
                                    <th className="px-6 py-3">Comprobante / DNI</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {salidas.length === 0 ? (
                                    <tr><td colSpan={4} className="px-6 py-10 text-center text-gray-400">No hay ceses reportados en este periodo</td></tr>
                                ) : (
                                    salidas.map(s => (
                                        <tr key={s.id} className={`hover:bg-gray-50 transition-colors ${s.status === 'INCOMPLETE_INFO' || s.status === 'pendiente_data' ? 'bg-amber-50' : ''}`}>
                                            <td className="px-6 py-4">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedBajas.includes(s.id)}
                                                    onChange={() => toggleSelection(s.id)}
                                                    className="rounded"
                                                />
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-900">{s.nombreCompleto}</div>
                                                {(s.status === 'INCOMPLETE_INFO' || s.status === 'pendiente_data') && (
                                                    <span className="text-[10px] bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded font-bold uppercase">
                                                        {s.status === 'INCOMPLETE_INFO' ? 'Info Incompleta' : 'Falta Fecha Ingreso'}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {s.status === 'pendiente_data' ? (
                                                    <div className="flex items-center gap-2">
                                                        {editingFechaBaja === s.id ? (
                                                            <>
                                                                <input
                                                                    type="date"
                                                                    value={tempFechaIngreso}
                                                                    onChange={(e) => setTempFechaIngreso(e.target.value)}
                                                                    className="border rounded px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-red-500"
                                                                />
                                                                <button
                                                                    onClick={() => handleUpdateFechaIngreso(s.id, s.fechaCese)}
                                                                    className="p-1 bg-green-500 text-white rounded hover:bg-green-600"
                                                                >
                                                                    ✅
                                                                </button>
                                                                <button
                                                                    onClick={() => setEditingFechaBaja(null)}
                                                                    className="p-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                                                                >
                                                                    ✕
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <button
                                                                onClick={() => {
                                                                    setEditingFechaBaja(s.id);
                                                                    setTempFechaIngreso('');
                                                                }}
                                                                className="text-[10px] px-2 py-1 bg-amber-500 text-white rounded font-bold hover:bg-amber-600 uppercase"
                                                            >
                                                                Completar Ingreso
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-gray-700">
                                                            {s.permanenciaDias !== undefined ? `${s.permanenciaDias} días` : '-'}
                                                        </span>
                                                        <span className="text-[10px] text-gray-400">Permanencia</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-lg text-xs font-bold ${s.motivoBaja === '01' ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'
                                                    }`}>
                                                    {s.motivoLabel || s.motivoBaja}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-gray-900">{s.fechaCese}</div>
                                                {s.fechaInicioFalta && (
                                                    <div className="text-[10px] text-gray-500 italic">Falta desde: {s.fechaInicioFalta}</div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {s.status === 'INCOMPLETE_INFO' ? (
                                                    <div className="flex items-center gap-2">
                                                        {editingBaja === s.id ? (
                                                            <>
                                                                <input
                                                                    type="text"
                                                                    value={tempDni}
                                                                    onChange={(e) => setTempDni(e.target.value)}
                                                                    placeholder="DNI"
                                                                    className="border rounded px-2 py-1 text-xs w-24 outline-none focus:ring-1 focus:ring-violet-500"
                                                                    maxLength={12}
                                                                />
                                                                <button
                                                                    onClick={() => handleUpdateDNI(s.id)}
                                                                    className="p-1 bg-green-500 text-white rounded hover:bg-green-600"
                                                                    title="Guardar"
                                                                >
                                                                    ✅
                                                                </button>
                                                                <button
                                                                    onClick={() => setEditingBaja(null)}
                                                                    className="p-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                                                                    title="Cancelar"
                                                                >
                                                                    ✕
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <button
                                                                onClick={() => {
                                                                    setEditingBaja(s.id);
                                                                    setTempDni('');
                                                                }}
                                                                className="text-xs px-2 py-1 bg-amber-500 text-white rounded font-medium hover:bg-amber-600 flex items-center gap-1"
                                                            >
                                                                ✏️ Completar DNI
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col">
                                                        <span className="text-gray-700 font-medium">{s.numeroDocumento}</span>
                                                        {s.cartaUrl && (
                                                            <a href={s.cartaUrl} target="_blank" className="text-blue-600 hover:underline text-xs">📄 Carta</a>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <ReportarBajaModal
                isOpen={showBajaModal}
                onClose={() => setShowBajaModal(false)}
                holdingId={holdingId}
                colaborador={{
                    id: 'manual',
                    nombreCompleto: 'Selección Manual / Búsqueda',
                    numeroDocumento: '',
                    tipoDocumento: 'DNI'
                }}
            />
        </div>
    );
}
