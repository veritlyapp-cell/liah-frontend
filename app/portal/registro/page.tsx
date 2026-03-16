'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { DEPARTAMENTOS, getProvincias, getDistritos } from '@/lib/data/peru-ubigeo';
import { ArrowRight, CheckCircle, Mail, Search, Loader2, AlertCircle } from 'lucide-react';

// ===================== TYPES =====================
interface CandidateFound {
    id: string;
    nombre: string;
    apellidos: string;
    celular: string;
    distrito: string;
    departamento: string;
    provincia: string;
    email: string;
    sessionToken?: string;
    hasActiveApplicationInStore?: boolean;
}

// ===================== MAIN COMPONENT =====================
function RegistroContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const holdingSlug = searchParams.get('holding') || '';
    const rqId = searchParams.get('rqId') || '';
    const emailParam = searchParams.get('email') || '';

    // Brand config
    const [brandColor, setBrandColor] = useState('#4F46E5');
    const [brandName, setBrandName] = useState('');
    const [brandLogo, setBrandLogo] = useState('');
    const accent = brandColor;

    // Flow steps: 'email' → 'autocomplete' | 'register_full'
    const [step, setStep] = useState<'email' | 'found' | 'form' | 'duplicate'>('email');
    const [email, setEmail] = useState(emailParam);
    const [searching, setSearching] = useState(false);
    const [foundCandidate, setFoundCandidate] = useState<CandidateFound | null>(null);

    // Full form data
    const [formData, setFormData] = useState({
        nombre: '', apellidos: '', celular: '',
        fechaNacimiento: '',
        departamento: 'LIMA', provincia: 'LIMA', distrito: '',
        direccion: '',
        documentType: 'DNI',
        documentNumber: ''
    });
    const [selectedDep, setSelectedDep] = useState('15');
    const [selectedProv, setSelectedProv] = useState('1501');
    const provincias = getProvincias(selectedDep);
    const distritos = getDistritos(selectedProv);

    const [loading, setLoading] = useState(false);
    const [submitError, setSubmitError] = useState('');

    // Load brand
    useEffect(() => {
        if (!holdingSlug) return;
        (async () => {
            try {
                const q = query(collection(db, 'holdings'), where('slug', '==', holdingSlug.toLowerCase()));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    const d = snap.docs[0].data();
                    const b = d.config?.branding || d.branding || {};
                    if (b?.primaryColor) setBrandColor(b.primaryColor);
                    if (d.nombre) setBrandName(d.nombre);
                    if (d.logoUrl) setBrandLogo(d.logoUrl);
                }
            } catch (e) { /* ignore */ }
        })();
    }, [holdingSlug]);

    // ── STEP 1: Search email ──
    async function handleEmailSearch(e: React.FormEvent) {
        e.preventDefault();
        if (!email.trim()) return;
        setSearching(true);
        setSubmitError('');

        try {
            const res = await fetch('/api/portal/lookup-candidate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.toLowerCase().trim(), rqId, holdingSlug })
            });
            const data = await res.json();

            if (data.found && data.candidate) {
                const cand = data.candidate as CandidateFound;

                if (data.hasActiveApplicationInStore) {
                    // Already applied in same store — block
                    setFoundCandidate(cand);
                    setStep('duplicate');
                    return;
                }

                if (data.hasSession) {
                    // Already registered + has session → redirect directly to postular
                    let url = rqId
                        ? `/portal/postular/${rqId}?token=${data.sessionToken}`
                        : `/portal/vacantes?token=${data.sessionToken}`;
                    if (holdingSlug) url += `&holding=${holdingSlug}`;
                    router.push(url);
                    return;
                }

                // Found but no active session → show autocomplete confirmation
                setFoundCandidate(cand);
                setFormData(f => ({
                    ...f,
                    nombre: cand.nombre || '',
                    apellidos: cand.apellidos || '',
                    celular: cand.celular || '',
                    distrito: cand.distrito || '',
                    departamento: cand.departamento || 'Lima',
                    provincia: cand.provincia || 'Lima'
                }));
                setStep('found');
            } else {
                // Not found → full registration
                setStep('form');
            }
        } catch (err) {
            setSubmitError('Error al buscar el correo. Intenta de nuevo.');
        } finally {
            setSearching(false);
        }
    }

    // ── STEP 2: Confirm existing candidate (create new session) ──
    async function handleConfirmExisting() {
        if (!foundCandidate) return;
        setLoading(true);
        setSubmitError('');
        try {
            const res = await fetch('/api/portal/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email.toLowerCase().trim(),
                    nombre: foundCandidate.nombre,
                    apellidos: foundCandidate.apellidos,
                    celular: foundCandidate.celular,
                    distrito: foundCandidate.distrito,
                    departamento: foundCandidate.departamento,
                    provincia: foundCandidate.provincia,
                    holdingSlug: holdingSlug || 'public',
                    existingCandidateId: foundCandidate.id
                })
            });
            const data = await res.json();
            if (!data.sessionToken) throw new Error('Sin token de sesión');

            let url = rqId
                ? `/portal/postular/${rqId}?token=${data.sessionToken}`
                : `/portal/vacantes?token=${data.sessionToken}`;
            if (holdingSlug) url += `&holding=${holdingSlug}`;
            router.push(url);
        } catch (err: any) {
            setSubmitError(err.message || 'Error al confirmar. Intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    }

    // ── STEP 3: Register new candidate ──
    async function handleRegister(e: React.FormEvent) {
        e.preventDefault();
        if (!formData.nombre || !formData.apellidos || !formData.celular || !formData.distrito || !formData.documentNumber) {
            setSubmitError('Completa todos los campos obligatorios (*)');
            return;
        }
        setLoading(true);
        setSubmitError('');

        try {
            const res = await fetch('/api/portal/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email.toLowerCase().trim(),
                    nombre: formData.nombre.trim(),
                    apellidos: formData.apellidos.trim(),
                    celular: formData.celular.trim(),
                    fechaNacimiento: formData.fechaNacimiento || '',
                    departamento: formData.departamento,
                    provincia: formData.provincia,
                    distrito: formData.distrito,
                    direccion: formData.direccion.trim(),
                    documentType: formData.documentType,
                    documentNumber: formData.documentNumber.trim(),
                    holdingSlug: holdingSlug || 'public'
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al registrar');
            if (!data.sessionToken) throw new Error('Sin token de sesión');

            let url = rqId
                ? `/portal/postular/${rqId}?token=${data.sessionToken}`
                : `/portal/vacantes?token=${data.sessionToken}`;
            if (holdingSlug) url += `&holding=${holdingSlug}`;
            router.push(url);
        } catch (err: any) {
            setSubmitError(err.message || 'Error al registrar. Intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    }

    function handleDepChange(depId: string) {
        setSelectedDep(depId);
        const provs = getProvincias(depId);
        const firstProv = provs[0]?.id || '';
        setSelectedProv(firstProv);
        const depNombre = DEPARTAMENTOS.find(d => d.id === depId)?.nombre || '';
        const provNombre = provs[0]?.nombre || '';
        setFormData(f => ({ ...f, departamento: depNombre, provincia: provNombre, distrito: '' }));
    }

    function handleProvChange(provId: string) {
        setSelectedProv(provId);
        const provNombre = provincias.find(p => p.id === provId)?.nombre || '';
        setFormData(f => ({ ...f, provincia: provNombre, distrito: '' }));
    }

    // ── Shared styles ──
    const inputCls = 'w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-white/50 transition-colors';
    const selectCls = 'w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-white/50 transition-colors appearance-none';
    const labelCls = 'block text-sm font-semibold text-white/80 mb-1';

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative" style={{ backgroundColor: accent }}>
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-10 w-72 h-72 bg-white/5 rounded-full blur-3xl" />
                <div className="absolute bottom-20 right-10 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 max-w-md w-full">
                {/* Header */}
                <div className="text-center mb-6">
                    {brandLogo && (
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-xl rounded-2xl mb-4 border border-white/20 overflow-hidden mx-auto">
                            <img src={brandLogo} alt="Logo" className="w-full h-full object-contain p-2" />
                        </div>
                    )}
                    <h1 className="text-2xl font-black text-white italic uppercase tracking-tighter">
                        {step === 'email' ? 'Empecemos' : step === 'found' ? '¡Te encontramos!' : step === 'duplicate' ? 'Ya postulaste' : 'Registro'}
                    </h1>
                    <p className="text-white/70 mt-1 text-sm">
                        {brandName ? `Postula en ${brandName}` : 'Portal de Empleo'}
                    </p>
                </div>

                <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-2xl space-y-4">

                    {/* ── STEP: EMAIL ── */}
                    {step === 'email' && (
                        <form onSubmit={handleEmailSearch} className="space-y-4">
                            <div>
                                <label className={labelCls}>
                                    <Mail size={14} className="inline mr-1.5 mb-0.5" />
                                    Tu correo electrónico
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="tu@correo.com"
                                    required
                                    autoFocus
                                    className={inputCls}
                                />
                                <p className="text-white/50 text-xs mt-1">
                                    Usamos tu correo para encontrar tu perfil o crear uno nuevo
                                </p>
                            </div>

                            {submitError && (
                                <div className="p-3 bg-red-500/20 border border-red-400/40 rounded-xl">
                                    <p className="text-red-300 text-sm">{submitError}</p>
                                </div>
                            )}

                            <button type="submit" disabled={searching || !email.trim()}
                                className="w-full py-4 text-white font-black rounded-xl transition-all hover:brightness-110 shadow-lg disabled:opacity-60 flex items-center justify-center gap-2"
                                style={{ backgroundColor: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)' }}>
                                {searching ? (
                                    <><Loader2 size={18} className="animate-spin" /> Buscando...</>
                                ) : (
                                    <><Search size={18} /> Continuar</>
                                )}
                            </button>
                        </form>
                    )}

                    {/* ── STEP: FOUND (autocomplete) ── */}
                    {step === 'found' && foundCandidate && (
                        <div className="space-y-4">
                            <div className="bg-green-500/20 border border-green-400/30 rounded-2xl p-4 flex items-start gap-3">
                                <CheckCircle size={20} className="text-green-300 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-white font-bold text-sm">¡Encontramos tu perfil!</p>
                                    <p className="text-white/70 text-xs mt-0.5">
                                        Hola <strong className="text-white">{foundCandidate.nombre} {foundCandidate.apellidos}</strong>, ¿eres tú?
                                    </p>
                                </div>
                            </div>

                            <div className="bg-white/5 rounded-xl p-4 space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-white/60">Correo</span>
                                    <span className="text-white font-medium">{email}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-white/60">Celular</span>
                                    <span className="text-white font-medium">{foundCandidate.celular || '—'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-white/60">Distrito</span>
                                    <span className="text-white font-medium">{foundCandidate.distrito || '—'}</span>
                                </div>
                            </div>

                            {submitError && (
                                <div className="p-3 bg-red-500/20 border border-red-400/40 rounded-xl">
                                    <p className="text-red-300 text-sm">{submitError}</p>
                                </div>
                            )}

                            <button onClick={handleConfirmExisting} disabled={loading}
                                className="w-full py-4 text-white font-black rounded-xl transition-all hover:brightness-110 shadow-lg disabled:opacity-60 flex items-center justify-center gap-2"
                                style={{ backgroundColor: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)' }}>
                                {loading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
                                {loading ? 'Entrando...' : 'Sí, continuar como yo'}
                            </button>

                            <button onClick={() => setStep('form')}
                                className="w-full py-2 text-white/60 text-sm hover:text-white transition-colors">
                                No soy yo — registrarme de nuevo
                            </button>
                        </div>
                    )}

                    {/* ── STEP: DUPLICATE ── */}
                    {step === 'duplicate' && (
                        <div className="space-y-4">
                            <div className="bg-amber-500/20 border border-amber-400/30 rounded-2xl p-4 flex items-start gap-3">
                                <AlertCircle size={20} className="text-amber-300 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-white font-bold text-sm">Ya tienes una postulación activa</p>
                                    <p className="text-white/70 text-xs mt-1">
                                        {foundCandidate?.nombre}, ya tienes un proceso en curso en esta tienda.
                                        Espera la respuesta del equipo de selección antes de postular nuevamente.
                                    </p>
                                </div>
                            </div>

                            <button onClick={() => setStep('email')}
                                className="w-full py-3 text-white/70 border border-white/20 rounded-xl text-sm hover:bg-white/10 transition-colors">
                                Usar otro correo
                            </button>
                        </div>
                    )}

                    {/* ── STEP: FORM (new registration) ── */}
                    {step === 'form' && (
                        <form onSubmit={handleRegister} className="space-y-4">
                            {/* Email display */}
                            <div className="bg-white/5 rounded-xl px-4 py-3 flex justify-between items-center">
                                <span className="text-white/60 text-sm">📧 {email}</span>
                                <button type="button" onClick={() => setStep('email')} className="text-white/50 text-xs hover:text-white">cambiar</button>
                            </div>

                            {/* Nombre + Apellidos */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelCls}>Nombre <span className="text-red-400">*</span></label>
                                    <input type="text" value={formData.nombre}
                                        onChange={e => setFormData(f => ({ ...f, nombre: e.target.value }))}
                                        placeholder="Juan" required className={inputCls} />
                                </div>
                                <div>
                                    <label className={labelCls}>Apellidos <span className="text-red-400">*</span></label>
                                    <input type="text" value={formData.apellidos}
                                        onChange={e => setFormData(f => ({ ...f, apellidos: e.target.value }))}
                                        placeholder="García P." required className={inputCls} />
                                </div>
                            </div>

                            {/* Celular + Fecha */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelCls}>Celular <span className="text-red-400">*</span></label>
                                    <input type="tel" value={formData.celular}
                                        onChange={e => setFormData(f => ({ ...f, celular: e.target.value }))}
                                        placeholder="9XXXXXXXX" required className={inputCls} />
                                </div>
                                <div>
                                    <label className={labelCls}>Fecha de Nacimiento</label>
                                    <input type="date" value={formData.fechaNacimiento}
                                        onChange={e => setFormData(f => ({ ...f, fechaNacimiento: e.target.value }))}
                                        className={inputCls} style={{ colorScheme: 'dark' }} />
                                </div>
                            </div>

                            {/* Tipo y N° de Documento */}
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className={labelCls}>Tipo Doc <span className="text-red-400">*</span></label>
                                    <select value={formData.documentType}
                                        onChange={e => setFormData(f => ({ ...f, documentType: e.target.value }))}
                                        className={selectCls} style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
                                        <option value="DNI" style={{ backgroundColor: '#1a1a2e' }}>DNI</option>
                                        <option value="CE" style={{ backgroundColor: '#1a1a2e' }}>CE</option>
                                        <option value="Pasaporte" style={{ backgroundColor: '#1a1a2e' }}>Pasaporte</option>
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className={labelCls}>N° Documento <span className="text-red-400">*</span></label>
                                    <input type="text" value={formData.documentNumber}
                                        onChange={e => setFormData(f => ({ ...f, documentNumber: e.target.value }))}
                                        placeholder={formData.documentType === 'DNI' ? '12345678' : 'Número'}
                                        required className={inputCls} />
                                </div>
                            </div>

                            {/* Ubigeo */}
                            <div>
                                <label className={labelCls}>Departamento <span className="text-red-400">*</span></label>
                                <select value={selectedDep} onChange={e => handleDepChange(e.target.value)}
                                    className={selectCls} style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
                                    {DEPARTAMENTOS.map(dep => (
                                        <option key={dep.id} value={dep.id} style={{ backgroundColor: '#1a1a2e' }}>{dep.nombre}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className={labelCls}>Provincia <span className="text-red-400">*</span></label>
                                <select value={selectedProv} onChange={e => handleProvChange(e.target.value)}
                                    className={selectCls} style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
                                    {provincias.map(p => (
                                        <option key={p.id} value={p.id} style={{ backgroundColor: '#1a1a2e' }}>{p.nombre}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className={labelCls}>Distrito <span className="text-red-400">*</span></label>
                                <select value={formData.distrito}
                                    onChange={e => setFormData(f => ({ ...f, distrito: e.target.value }))}
                                    className={selectCls} style={{ backgroundColor: 'rgba(0,0,0,0.3)' }} required>
                                    <option value="" style={{ backgroundColor: '#1a1a2e' }}>Selecciona tu distrito</option>
                                    {distritos.map(d => (
                                        <option key={d.id} value={d.nombre} style={{ backgroundColor: '#1a1a2e' }}>{d.nombre}</option>
                                    ))}
                                </select>
                            </div>

                            {submitError && (
                                <div className="p-3 bg-red-500/20 border border-red-400/40 rounded-xl">
                                    <p className="text-red-300 text-sm">{submitError}</p>
                                </div>
                            )}

                            <button type="submit" disabled={loading}
                                className="w-full py-4 text-white font-black rounded-xl transition-all hover:brightness-110 shadow-lg disabled:opacity-60 flex items-center justify-center gap-2"
                                style={{ backgroundColor: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)' }}>
                                {loading ? (
                                    <><Loader2 size={18} className="animate-spin" /> Registrando...</>
                                ) : (
                                    <>Completar registro <ArrowRight size={18} /></>
                                )}
                            </button>
                        </form>
                    )}
                </div>

                <p className="text-white/30 text-center text-xs mt-4">
                    Powered by <span className="text-white/50 font-semibold">LIAH</span>
                </p>
            </div>
        </div>
    );
}

export default function RegistroPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-indigo-900 flex items-center justify-center">
                <div className="animate-spin w-12 h-12 border-4 border-white/30 border-t-white rounded-full" />
            </div>
        }>
            <RegistroContent />
        </Suspense>
    );
}
