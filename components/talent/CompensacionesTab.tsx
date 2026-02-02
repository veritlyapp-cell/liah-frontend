'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, getDocs, getDoc } from 'firebase/firestore';
import { generateTRegistroAltas, generateTRegistroBajas } from '@/lib/utils/t-registro-utils';
import ReportarBajaModal from '@/components/talent/ReportarBajaModal';

interface CompensacionesTabProps {
    holdingId: string;
    marcaId?: string;
    storeId?: string;
}

export default function CompensacionesTab({ holdingId, marcaId, storeId }: CompensacionesTabProps) {
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
    const [holdingName, setHoldingName] = useState('Empresa');

    // Contact Edit State for Bajas
    const [editingContactBaja, setEditingContactBaja] = useState<string | null>(null);
    const [tempEmail, setTempEmail] = useState('');
    const [tempPhone, setTempPhone] = useState('');

    // Edit Hire State
    const [editingIngreso, setEditingIngreso] = useState<any | null>(null);
    const [updatingIngreso, setUpdatingIngreso] = useState(false);

    useEffect(() => {
        if (!holdingId) return;
        setLoading(true);

        // Fetch holding name for surveys
        const loadHoldingName = async () => {
            try {
                const hDoc = await getDoc(doc(db, 'holdings', holdingId));
                if (hDoc.exists()) {
                    setHoldingName(hDoc.data().nombre || 'Empresa');
                }
            } catch (error) {
                console.error('Error fetching holding name:', error);
            }
        };
        loadHoldingName();

        // Load Ingresos (Nuevos Colaboradores con status 'pendiente' o 'validado')
        const qIngresos = query(
            collection(db, 'nuevos_colaboradores'),
            where('holdingId', '==', holdingId),
            where('status', 'in', ['pendiente', 'validado']),
            orderBy('createdAt', 'desc')
        );

        // Filters applied in client side if needed or refine query if possible
        // Firestore 'in' query supports up to 10 values.


        const unsubIngresos = onSnapshot(qIngresos, (snap) => {
            const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setIngresos(data);
            setLoading(false);
        }, (error) => {
            console.error('Error loading ingresos:', error);
            setLoading(false);
        });

        // Load Salidas (Bajas)
        let qSalidas = query(
            collection(db, 'bajas_colaboradores'),
            where('holdingId', '==', holdingId),
            orderBy('fechaCese', 'desc')
        );

        if (marcaId && marcaId !== 'all') {
            qSalidas = query(qSalidas, where('marcaId', '==', marcaId));
        }
        if (storeId) {
            qSalidas = query(qSalidas, where('tiendaId', '==', storeId));
        }

        const unsubSalidas = onSnapshot(qSalidas, (snap) => {
            const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setSalidas(data);
        }, (error) => {
            console.error('Error loading salidas:', error);
        });

        return () => {
            unsubIngresos();
            unsubSalidas();
        };
    }, [holdingId]);

    const downloadAltasTXT = () => {
        const validados = ingresos.filter(c => c.status === 'validado' || !c.status); // Handle legacy records too
        if (validados.length === 0) return alert('No hay ingresos validados para exportar');
        const content = generateTRegistroAltas(validados);
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
        try {
            // First check if the baja record itself has email/phone (from ReportarBajaModal)
            let email = baja.email;
            let phone = baja.telefono || baja.phone;

            // If not, try to search in candidates collection (LIAH master)
            if (!email && !phone) {
                const docNum = baja.numeroDocumento;
                if (docNum && docNum !== 'DESCONOCIDO') {
                    const qCand = query(collection(db, 'candidates'), where('dni', '==', docNum));
                    const snapCand = await getDocs(qCand);
                    if (!snapCand.empty) {
                        const dataCand = snapCand.docs[0].data();
                        email = dataCand.email;
                        phone = dataCand.telefono || dataCand.phone;
                    }
                }
            }

            // If still not, try to find in nuevos_colaboradores (legacy)
            if (!email && !phone) {
                const docNum = baja.numeroDocumento;
                if (docNum && docNum !== 'DESCONOCIDO') {
                    const qNuevos = query(collection(db, 'nuevos_colaboradores'), where('numeroDocumento', '==', docNum));
                    const snapNuevos = await getDocs(qNuevos);
                    if (!snapNuevos.empty) {
                        const dataNuevos = snapNuevos.docs[0].data();
                        email = dataNuevos.emailPersonal || dataNuevos.email;
                        phone = dataNuevos.telefonoPersonal || dataNuevos.telefono;
                    }
                }
            }

            if (!email && !phone) {
                alert('⚠️ No se encontró correo o teléfono para este DNI en LIAH. Por favor, ingrésalos manualmente presionando "✏️" en el registro de baja.');
                return;
            }

            const res = await fetch('/api/send-exit-survey', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    phone,
                    name: baja.nombreCompleto,
                    holdingName: holdingName,
                    reason: baja.motivoLabel || 'Otro'
                })
            });

            if (res.ok) {
                alert(`✅ Encuesta reenviada a ${email || phone}`);
            } else {
                alert('❌ Error al reenviar la encuesta');
            }
        } catch (e) {
            console.error('Error triggering exit survey:', e);
            alert('❌ Error al procesar el reenvío');
        }
    };

    const handleUpdateContact = async (bajaId: string) => {
        if (!tempEmail && !tempPhone) return alert('Ingrese email o teléfono');
        try {
            const bajaRef = doc(db, 'bajas_colaboradores', bajaId);
            await updateDoc(bajaRef, {
                email: tempEmail || '',
                telefono: tempPhone || '',
                updatedAt: new Date()
            });
            setEditingContactBaja(null);
        } catch (err) {
            console.error('Error updating contact:', err);
            alert('Error al guardar datos de contacto');
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

    const handleUpdateIngreso = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingIngreso) return;

        setUpdatingIngreso(true);
        try {
            const hireRef = doc(db, 'nuevos_colaboradores', editingIngreso.id);
            const { id, ...updateData } = editingIngreso;
            await updateDoc(hireRef, updateData);
            setEditingIngreso(null);
            alert('✅ Datos del colaborador actualizados correctamente.');
        } catch (err) {
            console.error('Error updating hire:', err);
            alert('Error al actualizar los datos');
        } finally {
            setUpdatingIngreso(false);
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
                                    ingresos.filter(c => {
                                        if (marcaId && marcaId !== 'all' && c.marcaId !== marcaId) return false;
                                        if (storeId && c.tiendaId !== storeId) return false;
                                        return true;
                                    }).map(c => (
                                        <tr key={c.id} className={`hover:bg-gray-50 ${c.status === 'pendiente' ? 'bg-amber-50' : ''}`}>
                                            <td className="px-6 py-4 font-medium text-gray-900">{c.apellidos}, {c.nombres}</td>
                                            <td className="px-6 py-4">{c.numeroDocumento || c.dni}</td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-700">{c.posicion || c.puesto}</div>
                                                <div className="text-xs text-gray-500">{c.tiendaNombre}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-700">{c.banco}</div>
                                                <div className="text-xs text-gray-500">{c.numeroCuenta}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    {c.status === 'pendiente' ? (
                                                        <button
                                                            onClick={async () => {
                                                                if (!confirm(`¿Validar ingreso de ${c.nombres} ${c.apellidos}?`)) return;
                                                                try {
                                                                    const { doc, updateDoc } = await import('firebase/firestore');
                                                                    await updateDoc(doc(db, 'nuevos_colaboradores', c.id), {
                                                                        status: 'validado',
                                                                        validatedAt: new Date()
                                                                    });
                                                                } catch (err) {
                                                                    console.error('Error validating hire:', err);
                                                                }
                                                            }}
                                                            className="px-3 py-1 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-600 shadow-sm"
                                                        >
                                                            Validar
                                                        </button>
                                                    ) : (
                                                        <span className="text-green-600 font-medium flex items-center gap-1">
                                                            <span>✓</span> Validado
                                                        </span>
                                                    )}
                                                    <button
                                                        onClick={() => setEditingIngreso(c)}
                                                        className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                                                        title="Editar datos"
                                                    >
                                                        ✏️
                                                    </button>
                                                </div>
                                            </td>
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
                                    <th className="px-6 py-3">Acciones</th>
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
                                                <div className="flex flex-col gap-2">
                                                    {/* Existing Completar DNI logic */}
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
                                                                    className="text-[10px] px-2 py-1 bg-amber-500 text-white rounded font-bold hover:bg-amber-600 uppercase"
                                                                >
                                                                    Completar DNI
                                                                </button>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs font-mono text-gray-500">{s.numeroDocumento || 'S/D'}</span>
                                                    )}

                                                    {/* New Action Buttons */}
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => triggerExitSurvey(s)}
                                                            className="text-[10px] px-2 py-1 bg-violet-50 text-violet-600 border border-violet-200 rounded font-bold hover:bg-violet-100 uppercase flex items-center gap-1"
                                                            title="Reenviar Encuesta de Salida"
                                                        >
                                                            📧 Reenviar
                                                        </button>
                                                        <a
                                                            href="https://bit.ly/checklist-offboarding-liah" // Placeholder link
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-[10px] px-2 py-1 bg-blue-50 text-blue-600 border border-blue-200 rounded font-bold hover:bg-blue-100 uppercase flex items-center gap-1"
                                                            title="Ver Checklist de Activos"
                                                        >
                                                            📋 Checklist
                                                        </a>
                                                    </div>

                                                    {/* Contact Info Display/Edit */}
                                                    <div className="flex flex-col gap-1 border-t border-gray-100 pt-2 mt-1">
                                                        {editingContactBaja === s.id ? (
                                                            <div className="space-y-2">
                                                                <input
                                                                    type="email"
                                                                    value={tempEmail}
                                                                    onChange={(e) => setTempEmail(e.target.value)}
                                                                    placeholder="Email"
                                                                    className="w-full border rounded px-2 py-1 text-[10px]"
                                                                />
                                                                <input
                                                                    type="tel"
                                                                    value={tempPhone}
                                                                    onChange={(e) => setTempPhone(e.target.value)}
                                                                    placeholder="Teléfono"
                                                                    className="w-full border rounded px-2 py-1 text-[10px]"
                                                                />
                                                                <div className="flex gap-1">
                                                                    <button onClick={() => handleUpdateContact(s.id)} className="flex-1 bg-green-500 text-white rounded text-[10px] py-1 font-bold">Guardar</button>
                                                                    <button onClick={() => setEditingContactBaja(null)} className="flex-1 bg-gray-300 text-gray-700 rounded text-[10px] py-1 font-bold">✕</button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center justify-between gap-1 group">
                                                                <div className="flex flex-col truncate max-w-[120px]">
                                                                    <span className="text-[10px] text-gray-400 truncate italic">{s.email || 'Sin correo'}</span>
                                                                    <span className="text-[10px] text-gray-400 italic">{s.telefono || 'Sin telf.'}</span>
                                                                </div>
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingContactBaja(s.id);
                                                                        setTempEmail(s.email || '');
                                                                        setTempPhone(s.telefono || '');
                                                                    }}
                                                                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-violet-600 transition-all text-xs"
                                                                    title="Editar contacto"
                                                                >
                                                                    ✏️
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
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
                storeId=""
                storeName=""
                marcaId=""
                marcaNombre=""
            />

            {/* Edit Hire Modal */}
            {editingIngreso && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                ✏️ Editar Datos de Colaborador
                            </h3>
                            <button
                                onClick={() => setEditingIngreso(null)}
                                className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-200 rounded-full"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleUpdateIngreso} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nombres</label>
                                    <input
                                        type="text"
                                        required
                                        value={editingIngreso.nombres || ''}
                                        onChange={(e) => setEditingIngreso({ ...editingIngreso, nombres: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Apellidos</label>
                                    <input
                                        type="text"
                                        required
                                        value={editingIngreso.apellidos || ''}
                                        onChange={(e) => setEditingIngreso({ ...editingIngreso, apellidos: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">N° Documento</label>
                                    <input
                                        type="text"
                                        required
                                        value={editingIngreso.numeroDocumento || editingIngreso.dni || ''}
                                        onChange={(e) => setEditingIngreso({ ...editingIngreso, numeroDocumento: e.target.value, dni: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Puesto</label>
                                    <input
                                        type="text"
                                        required
                                        value={editingIngreso.posicion || editingIngreso.puesto || ''}
                                        onChange={(e) => setEditingIngreso({ ...editingIngreso, posicion: e.target.value, puesto: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Banco</label>
                                    <input
                                        type="text"
                                        value={editingIngreso.banco || ''}
                                        onChange={(e) => setEditingIngreso({ ...editingIngreso, banco: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">N° Cuenta</label>
                                    <input
                                        type="text"
                                        value={editingIngreso.numeroCuenta || ''}
                                        onChange={(e) => setEditingIngreso({ ...editingIngreso, numeroCuenta: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setEditingIngreso(null)}
                                    className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={updatingIngreso}
                                    className="flex-1 py-3 px-4 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {updatingIngreso ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        'Guardar Cambios'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
