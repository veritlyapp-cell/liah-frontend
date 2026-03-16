import React, { useState, useEffect } from 'react';
import { Settings, Sparkles, ShieldCheck, BarChart3, FileText, Trash2, Wallet } from 'lucide-react';

interface EditHoldingModalProps {
    show: boolean;
    holding: {
        id: string;
        nombre: string;
        plan: 'bot_only' | 'rq_only' | 'full_stack';
        marcas: number;
        usuarios: number;
        activo: boolean;
    } | null;
    onCancel: () => void;
    onSave: (holding: any) => void;
}

export default function EditHoldingModal({ show, holding, onCancel, onSave }: EditHoldingModalProps) {
    // IMPORTANTE: Los hooks deben ejecutarse SIEMPRE, antes del early return
    const [activeSection, setActiveSection] = useState<'config' | 'branding' | 'aprobacion' | 'consumo'>('config');
    const [limiteWhatsApp, setLimiteWhatsApp] = useState(1000);
    const [limiteGemini, setLimiteGemini] = useState(100000); // Tokens per month
    const [limiteSMS, setLimiteSMS] = useState(1000);
    const [maxUsuarios, setMaxUsuarios] = useState(2);
    const [maxBrands, setMaxBrands] = useState(1);
    const [maxStores, setMaxStores] = useState(5);
    const [activo, setActivo] = useState(true);

    // Pricing Model
    const [precioPorTienda, setPrecioPorTienda] = useState(50);
    const [costosAdicionales, setCostosAdicionales] = useState(0);
    const [precioMensual, setPrecioMensual] = useState(0);
    const [moneda, setMoneda] = useState<'PEN' | 'USD'>('PEN');
    const [periodoFacturacion, setPeriodoFacturacion] = useState<'mensual' | 'trimestral' | 'semestral' | 'anual'>('mensual');

    const [tempPassword, setTempPassword] = useState('Liah2024!Cambiar');

    // Product Access Control
    const [hasLiahFlow, setHasLiahFlow] = useState(true);
    const [hasLiahTalent, setHasLiahTalent] = useState(false);
    const [hasExitAnalytics, setHasExitAnalytics] = useState(true);

    // Dynamic Documents
    const [requiredDocuments, setRequiredDocuments] = useState<any[]>([]);

    // Approval Matrix
    const [approvalLevels, setApprovalLevels] = useState<any[]>([]);

    // Employer Branding
    const [brandingEnabled, setBrandingEnabled] = useState(false);
    const [primaryColor, setPrimaryColor] = useState('#7c3aed');
    const [secondaryColor, setSecondaryColor] = useState('#4f46e5');
    const [brandPhrases, setBrandPhrases] = useState<string[]>([]);
    const [brandGallery, setBrandGallery] = useState<string[]>([]);
    const [brandVideos, setBrandVideos] = useState<{ id: string, title: string }[]>([]);
    const [brandDescription, setBrandDescription] = useState('');

    // Auto-calculate price
    const periodoMultiplier = { mensual: 1, trimestral: 3, semestral: 6, anual: 12 };
    useEffect(() => {
        const base = (maxStores * precioPorTienda) + costosAdicionales;
        setPrecioMensual(base * periodoMultiplier[periodoFacturacion]);
    }, [maxStores, precioPorTienda, costosAdicionales, periodoFacturacion]);

    // Actualizar valores cuando cambia el holding
    useEffect(() => {
        if (holding) {
            // Cargar config personalizada primero
            const config = (holding as any).config;

            setActivo(holding.activo);
            setMaxUsuarios(config?.maxUsuarios || holding.usuarios);
            setLimiteWhatsApp(config?.limiteWhatsApp || 1000);
            setLimiteGemini(config?.limiteGemini || 100000);
            setLimiteSMS(config?.limiteSMS || 1000);

            setPrecioPorTienda(config?.precioPorTienda || 50);
            setCostosAdicionales(config?.costosAdicionales || 0);
            setMoneda(config?.moneda || 'PEN');
            setPeriodoFacturacion(config?.periodoFacturacion || 'mensual');

            setMaxBrands(config?.maxBrands || 1);
            setMaxStores(config?.maxStores || 5);
            setTempPassword(config?.tempPassword || 'Liah2024!Cambiar');
            setRequiredDocuments(config?.requiredDocuments || [
                { id: 'cul', name: 'Certificado Único Laboral (CUL)', active: true }
            ]);
            setApprovalLevels(config?.approvalLevels || [
                { level: 1, name: 'Gerente de Tienda', role: 'store_manager' },
                { level: 2, name: 'Jefe de Marca', role: 'jefe_marca' }
            ]);
            // Products
            setHasLiahFlow(config?.hasLiahFlow !== false); // Default true
            setHasLiahTalent(config?.hasLiahTalent || false);
            setHasExitAnalytics(config?.hasExitAnalytics !== false); // Default true

            // Branding
            setBrandingEnabled(config?.branding?.enabled || false);
            setPrimaryColor(config?.branding?.primaryColor || '#7c3aed');
            setSecondaryColor(config?.branding?.secondaryColor || '#4f46e5');
            setBrandPhrases(config?.branding?.phrases || []);
            setBrandGallery(config?.branding?.gallery || []);
            setBrandVideos(config?.branding?.videos || []);
            setBrandDescription(config?.branding?.description || '');
        }
    }, [holding]);

    // Early return DESPUÉS de los hooks
    if (!show || !holding) return null;

    const handleSave = () => {
        onSave({
            ...holding,
            plan: 'full_stack' as const, // Standardizing on one type for compatibility
            activo,
            config: {
                limiteWhatsApp,
                limiteGemini,
                limiteSMS,
                maxUsuarios,
                maxBrands,
                maxStores,
                precioPorTienda,
                costosAdicionales,
                precioMensual,
                moneda,
                periodoFacturacion,
                tempPassword,
                requiredDocuments,
                approvalLevels,
                // Products
                hasLiahFlow,
                hasLiahTalent,
                hasExitAnalytics,
                // Branding
                branding: {
                    enabled: brandingEnabled,
                    primaryColor,
                    secondaryColor,
                    phrases: brandPhrases,
                    gallery: brandGallery,
                    videos: brandVideos,
                    description: brandDescription
                }
            }
        });
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-[2.5rem] p-8 md:p-10 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slide-up shadow-2xl relative border border-slate-100">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <span className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black italic text-xs">L</span>
                            <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">Editar Holding</h3>
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none ml-11">{holding.nombre}</p>
                    </div>
                    <button
                        onClick={onCancel}
                        className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center transition-all"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Tabbed Navigation */}
                <div className="flex items-center gap-2 p-1.5 bg-slate-100/50 rounded-2xl mb-8 overflow-x-auto hide-scrollbar border border-slate-100">
                    {[
                        { id: 'config', label: 'Configuración', icon: <Settings size={14} /> },
                        { id: 'branding', label: 'Branding', icon: <Sparkles size={14} /> },
                        { id: 'aprobacion', label: 'Aprobaciones', icon: <ShieldCheck size={14} /> },
                        { id: 'consumo', label: 'Consumo', icon: <BarChart3 size={14} /> }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveSection(tab.id as any)}
                            className={`flex-1 min-w-[120px] flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeSection === tab.id
                                ? 'bg-white shadow-lg shadow-slate-200/50 text-slate-900 scale-[1.02]'
                                : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
                                }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="min-h-[400px]">
                    {activeSection === 'config' && (
                        <div className="animate-fade-in space-y-10">
                            {/* Product Access Control */}
                            <div className="bg-slate-950 rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-brand/10 blur-[100px] rounded-full" />
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-brand mb-6 flex items-center gap-2 relative z-10">
                                    <Sparkles size={14} /> Acceso a Ecosistema LIAH
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
                                    {[
                                        { id: 'flow', active: hasLiahFlow, set: setHasLiahFlow, label: '🚀 Liah Flow', sub: 'ATS + Bot WA' },
                                        { id: 'talent', active: hasLiahTalent, set: setHasLiahTalent, label: '💼 Liah Talent', sub: 'IA Matching' },
                                        { id: 'exit', active: hasExitAnalytics, set: setHasExitAnalytics, label: '📊 Exit Analytics', sub: 'Dashboard Retención' }
                                    ].map(prod => (
                                        <button
                                            key={prod.id}
                                            onClick={() => prod.set(!prod.active)}
                                            className={`p-5 rounded-2xl border-2 text-left transition-all duration-300 ${prod.active
                                                ? 'border-brand bg-brand/5 shadow-lg shadow-brand/10'
                                                : 'border-white/5 bg-white/5 opacity-40 hover:opacity-60'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-black italic tracking-tight">{prod.label}</span>
                                                <div className={`w-3.5 h-3.5 rounded-full border-2 border-white/10 ${prod.active ? 'bg-brand' : 'bg-slate-700'}`} />
                                            </div>
                                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{prod.sub}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Pricing Model */}
                            <div className="space-y-6">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                                    <FileText size={14} /> Modelo de Suscripción
                                </h4>

                                {/* Currency & Period Selectors */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="white-label-card p-5 border-slate-200 border-2">
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 italic">Moneda</label>
                                        <div className="flex gap-2">
                                            {(['PEN', 'USD'] as const).map(cur => (
                                                <button
                                                    key={cur}
                                                    onClick={() => setMoneda(cur)}
                                                    className={`flex-1 py-3 rounded-xl font-black text-sm transition-all border-2 ${moneda === cur
                                                        ? 'bg-slate-900 text-white border-slate-900 shadow-lg'
                                                        : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-slate-300'
                                                    }`}
                                                >
                                                    {cur === 'PEN' ? 'S/ Soles' : '$ Dólares'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="white-label-card p-5 border-slate-200 border-2">
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 italic">Período de Facturación</label>
                                        <div className="flex gap-2 flex-wrap">
                                            {[
                                                { id: 'mensual' as const, label: 'Mensual' },
                                                { id: 'trimestral' as const, label: 'Trimestral' },
                                                { id: 'semestral' as const, label: 'Semestral' },
                                                { id: 'anual' as const, label: 'Anual' }
                                            ].map(p => (
                                                <button
                                                    key={p.id}
                                                    onClick={() => setPeriodoFacturacion(p.id)}
                                                    className={`flex-1 min-w-[70px] py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border-2 ${periodoFacturacion === p.id
                                                        ? 'bg-slate-900 text-white border-slate-900 shadow-lg'
                                                        : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-slate-300'
                                                    }`}
                                                >
                                                    {p.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="white-label-card p-5 border-slate-200 border-2">
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 italic">Tiendas Máximas</label>
                                        <input
                                            type="number"
                                            value={maxStores}
                                            min={1}
                                            onChange={(e) => setMaxStores(parseInt(e.target.value) || 1)}
                                            className="w-full px-4 py-3 bg-slate-50/50 border border-slate-100 rounded-xl font-black text-2xl text-center focus:ring-2 focus:ring-brand outline-none transition-all"
                                        />
                                    </div>
                                    <div className="white-label-card p-5 border-slate-200 border-2">
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 italic">Precio x Tienda</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">{moneda === 'PEN' ? 'S/' : '$'}</span>
                                            <input
                                                type="number"
                                                value={precioPorTienda}
                                                onChange={(e) => setPrecioPorTienda(parseInt(e.target.value) || 0)}
                                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border border-slate-100 rounded-xl font-black text-sm focus:ring-2 focus:ring-brand outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div className="white-label-card p-5 border-slate-200 border-2">
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 italic">Otros Adicionales</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">{moneda === 'PEN' ? 'S/' : '$'}</span>
                                            <input
                                                type="number"
                                                value={costosAdicionales}
                                                onChange={(e) => setCostosAdicionales(parseInt(e.target.value) || 0)}
                                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border border-slate-100 rounded-xl font-black text-sm focus:ring-2 focus:ring-brand outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="p-8 bg-slate-50 rounded-[2rem] border-2 border-slate-100/50 flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-2 h-full bg-brand" />
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Total a Facturar</p>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                            <p className="text-xs font-black text-slate-900 uppercase tracking-widest italic">Recurrente {periodoFacturacion}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-5xl font-black text-slate-900 italic tracking-tighter leading-none">{moneda === 'PEN' ? 'S/' : '$'}{precioMensual}</p>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{moneda} + IGV</p>
                                    </div>
                                </div>
                            </div>

                            {/* Flow Specific Limits */}
                            <div className="space-y-6">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                                    <ShieldCheck size={14} /> Límites LIAH FLOW
                                </h4>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Usuarios ATS</label>
                                        <input type="number" value={maxUsuarios} onChange={(e) => setMaxUsuarios(parseInt(e.target.value))} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-xs focus:border-brand outline-none transition-all shadow-sm" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Marcas Permitidas</label>
                                        <input type="number" value={maxBrands} onChange={(e) => setMaxBrands(parseInt(e.target.value))} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-xs focus:border-brand outline-none transition-all shadow-sm" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest italic">SMS / mes</label>
                                        <input type="number" value={limiteSMS} onChange={(e) => setLimiteSMS(parseInt(e.target.value))} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-xs focus:border-brand outline-none transition-all shadow-sm" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest italic">WhatsApp / mes</label>
                                        <input type="number" value={limiteWhatsApp} onChange={(e) => setLimiteWhatsApp(parseInt(e.target.value))} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-xs focus:border-brand outline-none transition-all shadow-sm" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Gemini Tokens / mes</label>
                                        <input type="number" value={limiteGemini} onChange={(e) => setLimiteGemini(parseInt(e.target.value))} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-xs focus:border-brand outline-none transition-all shadow-sm" />
                                        <p className="text-[9px] text-slate-400 font-bold italic">* Base sugerida: 100k tokens</p>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Password Temporal</label>
                                        <input type="text" value={tempPassword} onChange={(e) => setTempPassword(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:border-brand outline-none transition-all" />
                                    </div>
                                </div>
                            </div>

                            {/* Main Active Switch */}
                            <div className="flex items-center gap-4 p-6 bg-slate-50 rounded-3xl border border-slate-100 group hover:border-brand/30 transition-all cursor-pointer" onClick={() => setActivo(!activo)}>
                                <div className={`w-14 h-8 rounded-full p-1 transition-all duration-300 ${activo ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                                    <div className={`w-6 h-6 rounded-full bg-white transition-all duration-300 ${activo ? 'translate-x-6' : 'translate-x-0'}`} />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-slate-900 uppercase tracking-widest leading-none mb-1">Empresa Activa</p>
                                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest italic">Estado global del tenant</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSection === 'branding' && (
                        <div className="animate-fade-in space-y-10">
                            {/* Document Requirements */}
                            <div>
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-2">
                                    <FileText size={14} /> Documentación Obligatoria
                                </h4>
                                <div className="space-y-3">
                                    {requiredDocuments.map((doc, idx) => (
                                        <div key={idx} className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 group transition-all hover:bg-white hover:border-brand/30 hover:shadow-lg hover:shadow-slate-100">
                                            <input
                                                type="text"
                                                value={doc.name}
                                                onChange={(e) => {
                                                    const newDocs = [...requiredDocuments];
                                                    newDocs[idx].name = e.target.value;
                                                    setRequiredDocuments(newDocs);
                                                }}
                                                className="flex-1 px-4 py-2.5 bg-transparent border-b-2 border-transparent focus:border-brand outline-none text-xs font-bold text-slate-700 transition-all"
                                                placeholder="Nombre del documento..."
                                            />
                                            <div className="flex items-center gap-5">
                                                <button
                                                    onClick={() => {
                                                        const newDocs = [...requiredDocuments];
                                                        newDocs[idx].active = !newDocs[idx].active;
                                                        setRequiredDocuments(newDocs);
                                                    }}
                                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border-2 transition-all ${doc.active ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-slate-100 border-slate-200 text-slate-400'}`}
                                                >
                                                    {doc.active ? 'Activado' : 'Opcional'}
                                                </button>
                                                <button
                                                    onClick={() => setRequiredDocuments(requiredDocuments.filter((_, i) => i !== idx))}
                                                    className="w-10 h-10 rounded-xl bg-rose-50 text-rose-400 hover:text-rose-600 hover:bg-rose-100 flex items-center justify-center transition-all"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => setRequiredDocuments([...requiredDocuments, { id: `doc_${Date.now()}`, name: '', active: true }])}
                                        className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:border-brand hover:text-brand hover:bg-brand/5 transition-all"
                                    >
                                        + Agregar Nuevo Documento Requerido
                                    </button>
                                </div>
                            </div>

                            {/* Employer Branding Toggle */}
                            <div className="p-8 bg-orange-50/50 rounded-[2.5rem] border-2 border-orange-100/50 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="text-sm font-black text-slate-900 uppercase italic tracking-tight flex items-center gap-2">
                                            <Sparkles className="text-orange-500" size={18} /> Marca Empleadora
                                        </h4>
                                        <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest leading-none mt-1">Personalización de Portal Público</p>
                                    </div>
                                    <div onClick={() => setBrandingEnabled(!brandingEnabled)} className={`w-14 h-8 rounded-full p-1 transition-all duration-300 cursor-pointer ${brandingEnabled ? 'bg-orange-500' : 'bg-slate-300'}`}>
                                        <div className={`w-6 h-6 rounded-full bg-white transition-all duration-300 ${brandingEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                                    </div>
                                </div>

                                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                    {brandingEnabled 
                                        ? '✅ Habilitado — El holding puede personalizar su portal público con colores, logo, galería y videos desde su panel de Admin.'
                                        : '❌ Deshabilitado — El portal público usará los estilos genéricos de LIAH.'}
                                </p>
                            </div>
                        </div>
                    )}

                    {activeSection === 'aprobacion' && (
                        <div className="animate-fade-in space-y-10">
                            <div>
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-2">
                                    <ShieldCheck size={14} /> Flujo de Autorizaciones
                                </h4>
                                <div className="space-y-4">
                                    {approvalLevels.map((lvl, idx) => (
                                        <div key={idx} className="flex items-center gap-4 bg-slate-50 p-6 rounded-3xl border border-slate-100 relative group overflow-hidden">
                                            <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-900" />
                                            <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black italic text-lg shadow-lg shadow-slate-900/10">
                                                {lvl.level}
                                            </div>
                                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <input
                                                    type="text"
                                                    value={lvl.name}
                                                    onChange={(e) => {
                                                        const newLvls = [...approvalLevels];
                                                        newLvls[idx].name = e.target.value;
                                                        setApprovalLevels(newLvls);
                                                    }}
                                                    className="bg-transparent border-b-2 border-slate-200 focus:border-slate-900 outline-none px-2 py-1 text-sm font-black uppercase tracking-tight transition-all"
                                                    placeholder="Nombre del cargo..."
                                                />
                                                <select
                                                    value={lvl.role}
                                                    onChange={(e) => {
                                                        const newLvls = [...approvalLevels];
                                                        newLvls[idx].role = e.target.value;
                                                        setApprovalLevels(newLvls);
                                                    }}
                                                    className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest"
                                                >
                                                    <option value="store_manager">Gerente de Tienda</option>
                                                    <option value="supervisor">Supervisor</option>
                                                    <option value="jefe_marca">Jefe de Marca</option>
                                                    <option value="recruiter">Recruiter</option>
                                                    <option value="holding_admin">Holding Admin</option>
                                                </select>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const filtered = approvalLevels.filter((_, i) => i !== idx);
                                                    setApprovalLevels(filtered.map((l, i) => ({ ...l, level: i + 1 })));
                                                }}
                                                className="w-10 h-10 rounded-xl bg-rose-50 text-rose-400 hover:text-rose-600 hover:bg-rose-100 flex items-center justify-center transition-all"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => setApprovalLevels([...approvalLevels, { level: approvalLevels.length + 1, name: '', role: 'supervisor' }])}
                                        className="w-full py-5 border-2 border-dashed border-slate-200 rounded-3xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:border-slate-900 hover:text-slate-900 hover:bg-slate-50 transition-all font-italic"
                                    >
                                        + Agregar Nuevo Nivel de Aprobación en Serie
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSection === 'consumo' && (
                        <div className="animate-fade-in space-y-12">
                            {/* KPI Grid */}
                            <div>
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-2">
                                    <BarChart3 size={14} /> Consumo Real-Time (LIAH FLOW)
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {[
                                        { label: 'Bots WhatsApp', used: 12450, total: limiteWhatsApp, color: 'emerald', sub: 'Mensajes enviados' },
                                        { label: 'IA Gemini Tokens', used: 45000, total: limiteGemini, color: 'violet', sub: 'Tokens procesados' },
                                        { label: 'Alerta SMS', used: 840, total: limiteSMS, color: 'blue', sub: 'Mensajes masivos' },
                                        { label: 'Usuarios ATS', used: 8, total: maxUsuarios, color: 'slate', sub: 'Cuentas activas' }
                                    ].map((stat, i) => {
                                        const perc = (stat.used / stat.total) * 100;
                                        return (
                                            <div key={i} className="white-label-card p-6 border-slate-100 border-2">
                                                <div className="flex justify-between items-end mb-4">
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                                                        <p className="text-xs font-bold text-slate-800">{stat.sub}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm font-black italic tracking-tighter leading-none mb-1">
                                                            {stat.used.toLocaleString()}
                                                            <span className="text-slate-300 mx-1">/</span>
                                                            <span className="text-slate-400">{stat.total.toLocaleString()}</span>
                                                        </p>
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{perc.toFixed(1)}%</p>
                                                    </div>
                                                </div>
                                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-1000 ${perc > 90 ? 'bg-rose-500' :
                                                            perc > 70 ? 'bg-amber-500' : `bg-slate-900`
                                                            }`}
                                                        style={{ width: `${Math.min(100, perc)}%` }}
                                                    />
                                                </div>
                                                {perc > 90 && (
                                                    <p className="text-[9px] text-rose-500 font-black uppercase mt-3 flex items-center gap-1 animate-pulse">
                                                        ⚠️ Límite Excedido - Bloqueo Pendiente
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Billing History */}
                            <div>
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-2">
                                    <FileText size={14} /> Historico de Facturación & Cobros
                                </h4>
                                <div className="white-label-card overflow-hidden border-slate-100 border-2 rounded-3xl">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-100">
                                                <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Periodo</th>
                                                <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Monto</th>
                                                <th className="px-6 py-4 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {[
                                                { p: 'Marzo 2026', m: precioMensual, st: 'Pagado' },
                                                { p: 'Febrero 2026', m: precioMensual, st: 'Pagado' },
                                                { p: 'Enero 2026', m: 950, st: 'Pagado' }
                                            ].map((p, i) => (
                                                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-6 py-4 text-[10px] font-black text-slate-600 uppercase tracking-widest">{p.p}</td>
                                                    <td className="px-6 py-4 text-[11px] font-black text-slate-900 italic">${p.m}</td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-emerald-100">
                                                            {p.st}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="flex flex-col sm:flex-row gap-4 mt-12 pt-10 border-t-2 border-slate-100/50">
                    <button
                        onClick={onCancel}
                        className="flex-1 px-8 py-4 border-2 border-slate-200 text-slate-400 hover:text-slate-900 hover:bg-slate-50 hover:border-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all"
                    >
                        Descartar
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex-[2] px-8 py-4 bg-slate-950 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:scale-[1.02] hover:shadow-2xl hover:shadow-slate-900/40 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                    >
                        <ShieldCheck size={16} className="text-brand" />
                        Guardar Configuración Global
                    </button>
                </div>
            </div>
        </div>
    );
}
