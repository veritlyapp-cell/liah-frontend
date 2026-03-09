'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { DEPARTAMENTOS, PROVINCIAS, DISTRITOS, getProvincias, getDistritos } from '@/lib/data/peru-ubigeo';

interface CandidateData {
    nombre: string;
    apellidoPaterno: string;
    apellidoMaterno: string;
    email: string;
    telefono: string;
    fechaNacimiento: string;
    departamento: string;
    provincia: string;
    distrito: string;
    direccion: string;
    cvUrl: string;
    culUrl: string;
    dni: string;
}

function FichaContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const candidateId = searchParams.get('candidateId');
    const rqId = searchParams.get('rqId');

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState('');

    // Brand config
    const [brandColor, setBrandColor] = useState('#4F46E5');
    const [brandName, setBrandName] = useState('');
    const [brandLogo, setBrandLogo] = useState('');

    // Candidate pre-filled data
    const [candidateData, setCandidateData] = useState<Partial<CandidateData>>({});
    const [rqInfo, setRqInfo] = useState<{ posicion: string; tiendaNombre: string; marcaNombre: string } | null>(null);

    // Form state
    const [form, setForm] = useState({
        fechaNacimiento: '',
        dni: '',
        estadoCivil: '',
        gradoInstruccion: '',
        banco: '',
        numeroCuenta: '',
        emergenciaNombre: '',
        emergenciaRelacion: '',
        emergenciaTelefono: '',
        departamento: '',
        provincia: '',
        distrito: '',
        direccion: '',
        culFile: null as File | null,
        cvFile: null as File | null
    });

    // Ubigeo state
    const [selectedDep, setSelectedDep] = useState<string>('15');
    const [selectedProv, setSelectedProv] = useState<string>('1501');

    useEffect(() => {
        async function loadFicha() {
            if (!token || !candidateId) {
                setError('Enlace inválido o expirado.');
                setLoading(false);
                return;
            }

            try {
                const res = await fetch(`/api/portal/ficha?token=${token}&candidateId=${candidateId}&rqId=${rqId || ''}`);
                if (!res.ok) {
                    const d = await res.json().catch(() => ({}));
                    setError(d.error || 'Enlace inválido o expirado.');
                    setLoading(false);
                    return;
                }

                const data = await res.json();
                const c = data.candidate || {};
                const rq = data.rq || {};

                setCandidateData(c);
                setRqInfo({
                    posicion: rq.puesto || rq.posicion || rq.posicionNombre || '',
                    tiendaNombre: rq.tiendaNombre || '',
                    marcaNombre: rq.marcaNombre || ''
                });

                // Brand config
                if (data.branding) {
                    if (data.branding.primaryColor) setBrandColor(data.branding.primaryColor);
                    if (data.branding.name) setBrandName(data.branding.name);
                    if (data.branding.logoUrl) setBrandLogo(data.branding.logoUrl);
                }

                // Pre-fill form with existing data
                setForm(f => ({
                    ...f,
                    fechaNacimiento: c.fechaNacimiento || '',
                    dni: c.dni || '',
                    estadoCivil: c.estadoCivil || '',
                    gradoInstruccion: c.gradoInstruccion || '',
                    banco: c.banco || '',
                    numeroCuenta: c.numeroCuenta || '',
                    emergenciaNombre: c.emergenciaNombre || '',
                    emergenciaRelacion: c.emergenciaRelacion || '',
                    emergenciaTelefono: c.emergenciaTelefono || '',
                    departamento: c.departamento || 'Lima',
                    provincia: c.provincia || 'Lima',
                    distrito: c.distrito || '',
                    direccion: c.direccion || ''
                }));

                // Set ubigeo selectors
                const depFound = DEPARTAMENTOS.find(d => d.nombre === (c.departamento || 'Lima'));
                if (depFound) setSelectedDep(depFound.id);
                const provs = getProvincias(depFound?.id || '15');
                const provFound = provs.find(p => p.nombre === (c.provincia || 'Lima'));
                if (provFound) setSelectedProv(provFound.id);

            } catch (e) {
                setError('Error cargando la ficha. Intenta de nuevo.');
            } finally {
                setLoading(false);
            }
        }

        loadFicha();
    }, [token, candidateId, rqId]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.fechaNacimiento || !form.dni) {
            alert('Por favor completa fecha de nacimiento y DNI.');
            return;
        }

        setSaving(true);
        try {
            // Upload CUL if provided
            let culUrl = candidateData.culUrl || '';
            if (form.culFile) {
                const fd = new FormData();
                fd.append('file', form.culFile);
                fd.append('folder', 'cul');
                try {
                    const r = await fetch('/api/upload', { method: 'POST', body: fd });
                    if (r.ok) culUrl = (await r.json()).url || '';
                } catch (e) { console.warn('CUL upload failed'); }
            }

            // Upload CV if provided
            let cvUrl = candidateData.cvUrl || '';
            if (form.cvFile) {
                const fd = new FormData();
                fd.append('file', form.cvFile);
                fd.append('folder', 'cvs');
                try {
                    const r = await fetch('/api/upload', { method: 'POST', body: fd });
                    if (r.ok) cvUrl = (await r.json()).url || '';
                } catch (e) { console.warn('CV upload failed'); }
            }

            const res = await fetch('/api/portal/ficha', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    candidateId,
                    rqId,
                    // Updated fields
                    fechaNacimiento: form.fechaNacimiento,
                    dni: form.dni,
                    estadoCivil: form.estadoCivil,
                    gradoInstruccion: form.gradoInstruccion,
                    banco: form.banco,
                    numeroCuenta: form.numeroCuenta,
                    emergenciaNombre: form.emergenciaNombre,
                    emergenciaRelacion: form.emergenciaRelacion,
                    emergenciaTelefono: form.emergenciaTelefono,
                    departamento: form.departamento,
                    provincia: form.provincia,
                    distrito: form.distrito,
                    direccion: form.direccion,
                    culUrl,
                    cvUrl
                })
            });

            if (!res.ok) {
                const d = await res.json().catch(() => ({}));
                throw new Error(d.error || 'Error al guardar');
            }

            setDone(true);
        } catch (err: any) {
            alert(err.message || 'Error al guardar. Intenta de nuevo.');
        } finally {
            setSaving(false);
        }
    }

    const accent = brandColor;
    const inputCls = 'w-full px-3 py-2.5 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-indigo-400 transition-colors text-sm';
    const labelCls = 'block text-sm font-semibold text-gray-700 mb-1';
    const sectionTitle = 'text-base font-black text-gray-900 italic uppercase tracking-tight mb-3 flex items-center gap-2';

    function handleDepChange(depId: string) {
        setSelectedDep(depId);
        const provs = getProvincias(depId);
        const firstProv = provs[0]?.id || '';
        setSelectedProv(firstProv);
        const depNombre = DEPARTAMENTOS.find(d => d.id === depId)?.nombre || '';
        const provNombre = provs[0]?.nombre || '';
        setForm(f => ({ ...f, departamento: depNombre, provincia: provNombre, distrito: '' }));
    }

    function handleProvChange(provId: string) {
        setSelectedProv(provId);
        const provNombre = getProvincias(selectedDep).find(p => p.id === provId)?.nombre || '';
        setForm(f => ({ ...f, provincia: provNombre, distrito: '' }));
    }

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
                <div className="animate-spin w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full mx-auto mb-3"></div>
                <p className="text-gray-500 text-sm">Cargando tu ficha...</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="text-center max-w-sm">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">⚠️</span>
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Enlace no válido</h2>
                <p className="text-gray-500">{error}</p>
            </div>
        </div>
    );

    if (done) return (
        <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: accent }}>
            <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
                {brandLogo && <img src={brandLogo} alt="Logo" className="h-14 w-auto mx-auto mb-4 object-contain" />}
                <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5" style={{ backgroundColor: accent + '20' }}>
                    <span className="text-5xl">🎉</span>
                </div>
                <h2 className="text-2xl font-black text-gray-900 mb-2 italic uppercase">¡Ficha Completada!</h2>
                <p className="text-gray-600">Tu información ha sido enviada al equipo de selección. Te contactaremos con los próximos pasos.</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="text-white shadow-lg py-6 px-4" style={{ backgroundColor: accent }}>
                <div className="max-w-2xl mx-auto">
                    <div className="flex items-center gap-3 mb-2">
                        {brandLogo && (
                            <img src={brandLogo} alt="Logo" className="h-10 w-auto object-contain bg-white/10 rounded-lg p-1" />
                        )}
                        <div>
                            <h1 className="text-xl font-black italic uppercase tracking-tight">Completa tu Ficha</h1>
                            <p className="text-white/75 text-sm">{brandName || 'Proceso de Selección'}</p>
                        </div>
                    </div>
                    {rqInfo && (
                        <div className="bg-white/15 rounded-xl px-4 py-2 mt-2 inline-block">
                            <p className="text-sm font-semibold italic uppercase">{rqInfo.posicion} — {rqInfo.tiendaNombre}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Pre-filled info banner */}
            <div className="max-w-2xl mx-auto px-4 pt-4">
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-start gap-2">
                    <span className="text-green-600 text-lg mt-0.5">✓</span>
                    <p className="text-green-800 text-sm">
                        Tu información está <strong>pre-llenada</strong> con los datos que ya registraste.
                        Solo completa o corrige lo que sea necesario.
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-4 py-4 space-y-5 pb-8">
                {/* READ-ONLY: Datos personales básicos */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                    <h2 className={sectionTitle}>
                        <span className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: accent }}>1</span>
                        Datos Personales
                    </h2>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelCls}>Nombre</label>
                            <div className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 text-sm">{candidateData.nombre}</div>
                        </div>
                        <div>
                            <label className={labelCls}>Apellido Paterno</label>
                            <div className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 text-sm">{candidateData.apellidoPaterno}</div>
                        </div>
                        <div>
                            <label className={labelCls}>Apellido Materno</label>
                            <div className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 text-sm">{candidateData.apellidoMaterno || '—'}</div>
                        </div>
                        <div>
                            <label className={labelCls}>Celular</label>
                            <div className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 text-sm">{candidateData.telefono}</div>
                        </div>
                    </div>
                    <div className="mt-3">
                        <label className={labelCls}>Email</label>
                        <div className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 text-sm">{candidateData.email}</div>
                    </div>
                </div>

                {/* EDITABLE: Datos de identidad */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                    <h2 className={sectionTitle}>
                        <span className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: accent }}>2</span>
                        Identidad
                    </h2>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelCls}>DNI <span className="text-red-500">*</span></label>
                            <input type="text" maxLength={8} value={form.dni}
                                onChange={e => setForm(f => ({ ...f, dni: e.target.value }))}
                                placeholder="12345678" required className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Fecha de Nacimiento <span className="text-red-500">*</span></label>
                            <input type="date" value={form.fechaNacimiento}
                                onChange={e => setForm(f => ({ ...f, fechaNacimiento: e.target.value }))}
                                required className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Estado Civil</label>
                            <select value={form.estadoCivil} onChange={e => setForm(f => ({ ...f, estadoCivil: e.target.value }))} className={inputCls}>
                                <option value="">Selecciona</option>
                                {['Soltero(a)', 'Casado(a)', 'Conviviente', 'Divorciado(a)', 'Viudo(a)'].map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>Grado de Instrucción</label>
                            <select value={form.gradoInstruccion} onChange={e => setForm(f => ({ ...f, gradoInstruccion: e.target.value }))} className={inputCls}>
                                <option value="">Selecciona</option>
                                {['Primaria', 'Secundaria incompleta', 'Secundaria completa', 'Técnico incompleto', 'Técnico completo', 'Universitario incompleto', 'Universitario completo'].map(g => (
                                    <option key={g} value={g}>{g}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* EDITABLE: Datos bancarios */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                    <h2 className={sectionTitle}>
                        <span className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: accent }}>3</span>
                        Datos Bancarios
                    </h2>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelCls}>Banco</label>
                            <select value={form.banco} onChange={e => setForm(f => ({ ...f, banco: e.target.value }))} className={inputCls}>
                                <option value="">Selecciona tu banco</option>
                                {['BCP', 'Interbank', 'BBVA', 'Scotiabank', 'BanBif', 'Mibanco', 'Banco de la Nación', 'Yape', 'Plin', 'Otro'].map(b => (
                                    <option key={b} value={b}>{b}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>N° de Cuenta / CCI</label>
                            <input type="text" value={form.numeroCuenta}
                                onChange={e => setForm(f => ({ ...f, numeroCuenta: e.target.value }))}
                                placeholder="Número de cuenta" className={inputCls} />
                        </div>
                    </div>
                </div>

                {/* EDITABLE: Domicilio */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                    <h2 className={sectionTitle}>
                        <span className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: accent }}>4</span>
                        Domicilio
                    </h2>
                    <div className="space-y-3">
                        <div>
                            <label className={labelCls}>Departamento</label>
                            <select value={selectedDep} onChange={e => handleDepChange(e.target.value)} className={inputCls}>
                                {DEPARTAMENTOS.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>Provincia</label>
                            <select value={selectedProv} onChange={e => handleProvChange(e.target.value)} className={inputCls}>
                                {getProvincias(selectedDep).map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>Distrito <span className="text-red-500">*</span></label>
                            <select value={form.distrito} onChange={e => setForm(f => ({ ...f, distrito: e.target.value }))} className={inputCls} required>
                                <option value="">Selecciona tu distrito</option>
                                {getDistritos(selectedProv).map(d => <option key={d.id} value={d.nombre}>{d.nombre}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>Dirección</label>
                            <input type="text" value={form.direccion}
                                onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))}
                                placeholder="Av. Principal 123, Urb. Las Flores" className={inputCls} />
                        </div>
                    </div>
                </div>

                {/* EDITABLE: Contacto de emergencia */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                    <h2 className={sectionTitle}>
                        <span className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: accent }}>5</span>
                        Contacto de Emergencia
                    </h2>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelCls}>Nombre completo</label>
                            <input type="text" value={form.emergenciaNombre}
                                onChange={e => setForm(f => ({ ...f, emergenciaNombre: e.target.value }))}
                                placeholder="Nombre y apellido" className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Relación</label>
                            <select value={form.emergenciaRelacion} onChange={e => setForm(f => ({ ...f, emergenciaRelacion: e.target.value }))} className={inputCls}>
                                <option value="">Selecciona</option>
                                {['Padre/Madre', 'Cónyuge/Pareja', 'Hermano(a)', 'Hijo(a)', 'Tío(a)', 'Amigo(a)', 'Otro'].map(r => (
                                    <option key={r} value={r}>{r}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className={labelCls}>Teléfono de emergencia</label>
                            <input type="tel" value={form.emergenciaTelefono}
                                onChange={e => setForm(f => ({ ...f, emergenciaTelefono: e.target.value }))}
                                placeholder="9XXXXXXXX" className={inputCls} />
                        </div>
                    </div>
                </div>

                {/* EDITABLE: Documentos */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                    <h2 className={sectionTitle}>
                        <span className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: accent }}>6</span>
                        Documentos
                    </h2>
                    <div className="space-y-4">
                        {/* CUL */}
                        <div>
                            <label className={labelCls}>
                                Carnet de Sanidad (CUL)
                                {!candidateData.culUrl && <span className="text-orange-500 ml-1 text-xs">(Pendiente)</span>}
                                {candidateData.culUrl && <span className="text-green-500 ml-1 text-xs">✓ Ya subido</span>}
                            </label>
                            <input type="file" accept=".pdf,.jpg,.jpeg,.png"
                                onChange={e => setForm(f => ({ ...f, culFile: e.target.files?.[0] || null }))}
                                className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:text-white cursor-pointer"
                                style={{ ['--file-bg' as any]: accent }}
                            />
                            <style>{`input[type=file]::file-selector-button { background-color: ${accent}; }`}</style>
                            {form.culFile && <p className="text-green-600 text-xs mt-1">✓ {form.culFile.name}</p>}
                        </div>
                        {/* CV */}
                        <div>
                            <label className={labelCls}>
                                CV / Currículum
                                {!candidateData.cvUrl && <span className="text-orange-500 ml-1 text-xs">(Pendiente)</span>}
                                {candidateData.cvUrl && <span className="text-green-500 ml-1 text-xs">✓ Ya subido</span>}
                            </label>
                            <input type="file" accept=".pdf,.doc,.docx"
                                onChange={e => setForm(f => ({ ...f, cvFile: e.target.files?.[0] || null }))}
                                className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:text-white cursor-pointer"
                            />
                            {form.cvFile && <p className="text-green-600 text-xs mt-1">✓ {form.cvFile.name}</p>}
                        </div>
                    </div>
                </div>

                {/* Submit */}
                <button
                    type="submit"
                    disabled={saving}
                    className="w-full py-4 text-white font-black rounded-2xl shadow-lg transition-all hover:brightness-110 disabled:opacity-60 text-lg italic uppercase"
                    style={{ backgroundColor: accent }}
                >
                    {saving ? (
                        <span className="flex items-center justify-center gap-2">
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Guardando...
                        </span>
                    ) : 'Confirmar y Enviar →'}
                </button>

                <p className="text-center text-gray-400 text-xs">
                    Powered by <strong className="text-indigo-500">LIAH</strong>
                </p>
            </form>
        </div>
    );
}

export default function FichaPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full" />
            </div>
        }>
            <FichaContent />
        </Suspense>
    );
}
