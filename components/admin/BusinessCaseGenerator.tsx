import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { 
    collection, 
    addDoc, 
    updateDoc, 
    doc, 
    getDocs, 
    query, 
    orderBy, 
    Timestamp 
} from 'firebase/firestore';
import { 
    Copy, 
    ExternalLink, 
    Calculator, 
    DollarSign, 
    Save, 
    Edit, 
    Sparkles, 
    CheckCircle2, 
    AlertCircle,
    Eye,
    EyeOff
} from 'lucide-react';

interface Proposal {
    id: string;
    client: string;
    currency: string;
    stores: number;
    hires: number;
    pilotDuration: string;
    pilotCost: string;
    setupListPrice: number;
    setupFinalPrice: number;
    landingListPrice: number;
    landingFinalPrice: number;
    baseFeePerStore: number;
    variableFeePerHire: number;
    annualDiscount: number;
    annualFinalPrice?: number;
    growthClause: number;
    meetingNotes: string;
    executiveSummary: string;
    signName: string;
    signRole: string;
    signCompany: string;
    signRuc: string;
    isActive: boolean;
    createdAt?: any;
}

export default function BusinessCaseGenerator() {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        client: '',
        currency: 'PEN',
        stores: 50,
        hires: 100,
        pilotDuration: '30 a 60 días',
        pilotCost: 'Bonificado (S/ 0.00)',
        setupListPrice: 6000,
        setupFinalPrice: 3000,
        landingListPrice: 2500,
        landingFinalPrice: 0,
        baseFeePerStore: 10.00,
        variableFeePerHire: 2.50,
        annualDiscount: 20,
        annualFinalPrice: '', // Optional override
        growthClause: 10,
        meetingNotes: '',
        executiveSummary: '',
        signName: 'Oscar Quevedo',
        signRole: 'Gerente General',
        signCompany: 'Relié Labs',
        signRuc: '20615357848'
    });

    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [loadingProposals, setLoadingProposals] = useState(true);
    const [generatingSummary, setGeneratingSummary] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [generatedUrl, setGeneratedUrl] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        fetchProposals();
    }, []);

    const fetchProposals = async () => {
        try {
            setLoadingProposals(true);
            const proposalsRef = collection(db, 'business_cases');
            const q = query(proposalsRef, orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            const list: Proposal[] = [];
            querySnapshot.forEach((doc) => {
                list.push({ id: doc.id, ...doc.data() } as Proposal);
            });
            setProposals(list);
        } catch (err) {
            console.error('Error fetching proposals:', err);
        } finally {
            setLoadingProposals(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleGenerateSummary = async () => {
        if (!formData.client) {
            setErrorMessage('Por favor ingresa el nombre del cliente primero.');
            return;
        }

        try {
            setGeneratingSummary(true);
            setErrorMessage('');
            const res = await fetch('/api/ai/generate-summary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    client: formData.client,
                    stores: formData.stores,
                    hires: formData.hires,
                    meetingNotes: formData.meetingNotes
                })
            });

            const data = await res.json();
            if (data.success) {
                setFormData(prev => ({ ...prev, executiveSummary: data.summary }));
                setSuccessMessage('¡Resumen generado con éxito por Gemini!');
                setTimeout(() => setSuccessMessage(''), 4000);
            } else {
                throw new Error(data.error || 'Failed to generate summary');
            }
        } catch (err: any) {
            console.error(err);
            setErrorMessage('Error al generar resumen con IA: ' + err.message);
        } finally {
            setGeneratingSummary(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSaving(true);
            setErrorMessage('');
            setSuccessMessage('');

            const cleanStores = Number(formData.stores);
            const cleanHires = Number(formData.hires);
            const cleanSetupList = Number(formData.setupListPrice);
            const cleanSetupFinal = Number(formData.setupFinalPrice);
            const cleanLandingList = Number(formData.landingListPrice);
            const cleanLandingFinal = Number(formData.landingFinalPrice);
            const cleanBaseFee = Number(formData.baseFeePerStore);
            const cleanVariableFee = Number(formData.variableFeePerHire);
            const cleanDiscount = Number(formData.annualDiscount);
            const cleanAnnualPrice = formData.annualFinalPrice ? Number(formData.annualFinalPrice) : null;
            const cleanGrowthClause = Number(formData.growthClause);

            const proposalData = {
                client: formData.client,
                currency: formData.currency,
                stores: cleanStores,
                hires: cleanHires,
                pilotDuration: formData.pilotDuration,
                pilotCost: formData.pilotCost,
                setupListPrice: cleanSetupList,
                setupFinalPrice: cleanSetupFinal,
                landingListPrice: cleanLandingList,
                landingFinalPrice: cleanLandingFinal,
                baseFeePerStore: cleanBaseFee,
                variableFeePerHire: cleanVariableFee,
                annualDiscount: cleanDiscount,
                annualFinalPrice: cleanAnnualPrice,
                growthClause: cleanGrowthClause,
                meetingNotes: formData.meetingNotes,
                executiveSummary: formData.executiveSummary,
                signName: formData.signName,
                signRole: formData.signRole,
                signCompany: formData.signCompany,
                signRuc: formData.signRuc,
                isActive: true,
                createdBy: user?.email || 'kam',
                updatedAt: Timestamp.now()
            };

            let docId = '';
            if (editingId) {
                const docRef = doc(db, 'business_cases', editingId);
                await updateDoc(docRef, proposalData);
                docId = editingId;
                setSuccessMessage('Propuesta actualizada correctamente.');
            } else {
                const docRef = await addDoc(collection(db, 'business_cases'), {
                    ...proposalData,
                    createdAt: Timestamp.now()
                });
                docId = docRef.id;
                setSuccessMessage('Propuesta creada y guardada correctamente.');
            }

            const baseUrl = window.location.origin;
            const shortUrl = `${baseUrl}/roi/${docId}`;
            setGeneratedUrl(shortUrl);

            // Reset form if not editing, or refresh list
            if (!editingId) {
                handleReset();
            } else {
                setEditingId(null);
            }
            
            fetchProposals();
        } catch (err: any) {
            console.error('Error saving proposal:', err);
            setErrorMessage('Error al guardar propuesta: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (prop: Proposal) => {
        setEditingId(prop.id);
        setFormData({
            client: prop.client,
            currency: prop.currency || 'PEN',
            stores: prop.stores,
            hires: prop.hires,
            pilotDuration: prop.pilotDuration || '30 a 60 días',
            pilotCost: prop.pilotCost || 'Bonificado (S/ 0.00)',
            setupListPrice: prop.setupListPrice,
            setupFinalPrice: prop.setupFinalPrice,
            landingListPrice: prop.landingListPrice,
            landingFinalPrice: prop.landingFinalPrice,
            baseFeePerStore: prop.baseFeePerStore,
            variableFeePerHire: prop.variableFeePerHire,
            annualDiscount: prop.annualDiscount,
            annualFinalPrice: prop.annualFinalPrice !== undefined ? prop.annualFinalPrice.toString() : '',
            growthClause: prop.growthClause || 10,
            meetingNotes: prop.meetingNotes || '',
            executiveSummary: prop.executiveSummary || '',
            signName: prop.signName || 'Oscar Quevedo',
            signRole: prop.signRole || 'Gerente General',
            signCompany: prop.signCompany || 'Relié Labs',
            signRuc: prop.signRuc || '20615357848'
        });
        setGeneratedUrl(`${window.location.origin}/roi/${prop.id}`);
        // Scroll to form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleToggleActive = async (id: string, currentStatus: boolean) => {
        try {
            const docRef = doc(db, 'business_cases', id);
            await updateDoc(docRef, { isActive: !currentStatus });
            fetchProposals();
        } catch (err) {
            console.error('Error toggling proposal status:', err);
        }
    };

    const handleReset = () => {
        setEditingId(null);
        setFormData({
            client: '',
            currency: 'PEN',
            stores: 50,
            hires: 100,
            pilotDuration: '30 a 60 días',
            pilotCost: 'Bonificado (S/ 0.00)',
            setupListPrice: 6000,
            setupFinalPrice: 3000,
            landingListPrice: 2500,
            landingFinalPrice: 0,
            baseFeePerStore: 10.00,
            variableFeePerHire: 2.50,
            annualDiscount: 20,
            annualFinalPrice: '',
            growthClause: 10,
            meetingNotes: '',
            executiveSummary: '',
            signName: 'Oscar Quevedo',
            signRole: 'Gerente General',
            signCompany: 'Relié Labs',
            signRuc: '20615357848'
        });
    };

    const copyToClipboard = (url: string) => {
        navigator.clipboard.writeText(url);
        alert('Enlace copiado al portapapeles');
    };

    // Minimum rules config
    const getMinimums = (curr: string) => {
        if (curr === 'USD') return { monthly: 95, annual: 1000 };
        if (curr === 'MXN') return { monthly: 1800, annual: 18000 };
        return { monthly: 350, annual: 3600 }; // Default: PEN (Soles)
    };

    const minimums = getMinimums(formData.currency);

    // Auto calculations for preview helpers
    const monthlyBase = Number(formData.stores) * Number(formData.baseFeePerStore);
    const monthlyVariable = Number(formData.hires) * Number(formData.variableFeePerHire);
    const totalMonthly = Math.max(monthlyBase + monthlyVariable, minimums.monthly);
    const projectedAnnual = totalMonthly * 12;
    const calculatedDiscountedAnnual = Math.max(projectedAnnual * (1 - Number(formData.annualDiscount) / 100), minimums.annual);

    return (
        <div className="space-y-12">
            {/* Generator Form */}
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm max-w-5xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-violet-50 text-violet-600 rounded-2xl flex items-center justify-center">
                            <Calculator className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900 uppercase italic tracking-tight">
                                {editingId ? 'Editar Propuesta Comercial' : 'Nueva Propuesta Comercial'}
                            </h2>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Generador de ROI y Propuestas Liah</p>
                        </div>
                    </div>
                    {editingId && (
                        <button onClick={handleReset} className="px-4 py-2 text-xs font-bold text-violet-600 border border-violet-200 rounded-xl hover:bg-violet-50 transition-colors uppercase tracking-widest">
                            Cancelar Edición
                        </button>
                    )}
                </div>

                {successMessage && (
                    <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 text-sm font-semibold rounded-2xl flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                        {successMessage}
                    </div>
                )}

                {errorMessage && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-800 text-sm font-semibold rounded-2xl flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                        {errorMessage}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Section 1: Client & Volume Info */}
                    <div>
                        <h3 className="text-xs font-black uppercase text-violet-600 tracking-wider mb-4 border-b pb-2">1. Datos del Cliente e Ingresos</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nombre del Cliente</label>
                                <input type="text" name="client" value={formData.client} onChange={handleChange} required className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-violet-500 focus:outline-none" placeholder="Ej. NGR" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Moneda</label>
                                <select name="currency" value={formData.currency} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-violet-500 focus:outline-none">
                                    <option value="PEN">Soles (S/)</option>
                                    <option value="USD">Dólares (USD $)</option>
                                    <option value="MXN">Pesos Mexicanos ($)</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sedes / Locales</label>
                                <input type="number" name="stores" value={formData.stores} onChange={handleChange} required className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-violet-500 focus:outline-none" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ingresos Mensuales Estimados</label>
                                <input type="number" name="hires" value={formData.hires} onChange={handleChange} required className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-violet-500 focus:outline-none" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ingresos Anuales (Autocalculados)</label>
                                <div className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-sm font-bold text-gray-500">
                                    {Number(formData.hires) * 12} ingresos/año
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Meeting notes and Executive summary with Gemini */}
                    <div>
                        <h3 className="text-xs font-black uppercase text-violet-600 tracking-wider mb-4 border-b pb-2">2. Resumen Ejecutivo Personalizado con IA</h3>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Notas de la Reunión / Dolores del Cliente (Para la IA)</label>
                                <textarea name="meetingNotes" value={formData.meetingNotes} onChange={handleChange} rows={3} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-violet-500 focus:outline-none" placeholder="Ej. Tienen problemas de rotación en tiendas de provincia, les toma 15 días reclutar un operario y quieren automatizar las referencias y validación de antecedentes penales." />
                            </div>
                            <div className="flex justify-end">
                                <button type="button" onClick={handleGenerateSummary} disabled={generatingSummary || !formData.client} className="flex items-center gap-2 px-5 py-3 bg-violet-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-violet-700 active:scale-95 transition-all disabled:opacity-50">
                                    <Sparkles className="w-4 h-4" />
                                    {generatingSummary ? 'Generando Resumen...' : 'Redactar Resumen con IA'}
                                </button>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Texto Final del Resumen de la Propuesta</label>
                                <textarea name="executiveSummary" value={formData.executiveSummary} onChange={handleChange} rows={4} required className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-violet-500 focus:outline-none" placeholder="Este texto se mostrará en la Sección 1 de la propuesta." />
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Pilot & Setup Pricing */}
                    <div>
                        <h3 className="text-xs font-black uppercase text-violet-600 tracking-wider mb-4 border-b pb-2">3. Piloto e Inversión de Configuración</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Duración del Piloto</label>
                                <input type="text" name="pilotDuration" value={formData.pilotDuration} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-violet-500 focus:outline-none" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Costo del Piloto</label>
                                <input type="text" name="pilotCost" value={formData.pilotCost} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-violet-500 focus:outline-none" />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Implementación (Precio Lista, {formData.currency})</label>
                                <input type="number" name="setupListPrice" value={formData.setupListPrice} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-violet-500 focus:outline-none" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Implementación (Inversión Final, {formData.currency})</label>
                                <input type="number" name="setupFinalPrice" value={formData.setupFinalPrice} onChange={handleChange} className="w-full px-4 py-3 bg-emerald-50 text-emerald-950 border border-emerald-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Landing Page (Precio Lista, {formData.currency})</label>
                                <input type="number" name="landingListPrice" value={formData.landingListPrice} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-violet-500 focus:outline-none" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Landing Page (Inversión Final, {formData.currency})</label>
                                <input type="number" name="landingFinalPrice" value={formData.landingFinalPrice} onChange={handleChange} className="w-full px-4 py-3 bg-emerald-50 text-emerald-950 border border-emerald-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                            </div>
                        </div>
                    </div>

                    {/* Section 4: Subscription & Annual Discounts */}
                    <div>
                        <h3 className="text-xs font-black uppercase text-violet-600 tracking-wider mb-4 border-b pb-2">4. Estructura de Suscripción (SaaS) y Anual</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tarifa Base por Sede ({formData.currency})</label>
                                <input type="number" step="0.01" name="baseFeePerStore" value={formData.baseFeePerStore} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-violet-500 focus:outline-none" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tarifa Variable por Ingreso ({formData.currency})</label>
                                <input type="number" step="0.01" name="variableFeePerHire" value={formData.variableFeePerHire} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-violet-500 focus:outline-none" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ahorro Anual Proyectado (%)</label>
                                <input type="number" name="annualDiscount" value={formData.annualDiscount} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-violet-500 focus:outline-none" />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Monto Anual Final (Personalizado, {formData.currency})</label>
                                <input type="number" name="annualFinalPrice" value={formData.annualFinalPrice} onChange={handleChange} className="w-full px-4 py-3 bg-emerald-50 text-emerald-950 border border-emerald-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none" placeholder={`Calculado: ${formData.currency} ${calculatedDiscountedAnnual.toFixed(0)}`} />
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Dejar vacío para calcular automáticamente</span>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Mensual Proyectado</label>
                                <div className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-sm font-bold text-gray-700">
                                    {formData.currency} {totalMonthly.toFixed(2)} + IGV
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Anual Proyectado (Lista)</label>
                                <div className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-sm font-bold text-gray-700">
                                    {formData.currency} {projectedAnnual.toFixed(2)} + IGV
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 5: Legal Conditions & Signature */}
                    <div>
                        <h3 className="text-xs font-black uppercase text-violet-600 tracking-wider mb-4 border-b pb-2">5. Condiciones Comerciales y Firmas</h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cláusula de Crecimiento (%)</label>
                                <input type="number" name="growthClause" value={formData.growthClause} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-violet-500 focus:outline-none" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nombre del Firmante</label>
                                <input type="text" name="signName" value={formData.signName} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-violet-500 focus:outline-none" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cargo del Firmante</label>
                                <input type="text" name="signRole" value={formData.signRole} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-violet-500 focus:outline-none" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">RUC Empresa</label>
                                <input type="text" name="signRuc" value={formData.signRuc} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-violet-500 focus:outline-none" />
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-4 flex gap-4">
                        <button type="submit" disabled={saving} className="flex-1 py-4 bg-slate-900 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-800 active:scale-95 transition-all shadow-xl shadow-slate-900/10 flex items-center justify-center gap-2">
                            <Save className="w-4 h-4" />
                            {saving ? 'Guardando...' : editingId ? 'Guardar Cambios' : 'Crear y Guardar Propuesta'}
                        </button>
                    </div>
                </form>

                {/* Show Link Panel */}
                {generatedUrl && (
                    <div className="mt-8 p-6 bg-violet-50 rounded-2xl border border-violet-100 animate-fade-in">
                        <p className="text-[10px] font-black text-violet-400 uppercase tracking-widest mb-3">Enlace Directo de la Propuesta</p>
                        <div className="flex items-center gap-3">
                            <input type="text" readOnly value={generatedUrl} className="flex-1 bg-white border border-violet-200 px-4 py-3 rounded-xl text-sm text-gray-600 font-mono focus:outline-none" />
                            <button onClick={() => copyToClipboard(generatedUrl)} className="p-3 bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors shrink-0">
                                <Copy className="w-5 h-5" />
                            </button>
                            <a href={generatedUrl} target="_blank" rel="noopener noreferrer" className="p-3 bg-white text-violet-600 border border-violet-200 rounded-xl hover:bg-violet-50 transition-colors shrink-0">
                                <ExternalLink className="w-5 h-5" />
                            </a>
                        </div>
                    </div>
                )}
            </div>

            {/* History Table */}
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm max-w-5xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-black text-gray-900 uppercase italic tracking-tight">Historial de Propuestas</h3>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Propuestas activas e inactivas generadas</p>
                    </div>
                </div>

                {loadingProposals ? (
                    <div className="py-12 flex justify-center">
                        <div className="animate-spin w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full"></div>
                    </div>
                ) : proposals.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 italic text-sm">
                        No se han generado propuestas comerciales aún.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    <th className="py-4 px-4">Cliente</th>
                                    <th className="py-4 px-4">Volumen</th>
                                    <th className="py-4 px-4">Mensual Proyectado</th>
                                    <th className="py-4 px-4">Anual Membresía</th>
                                    <th className="py-4 px-4">Estatus</th>
                                    <th className="py-4 px-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 text-sm font-semibold">
                                {proposals.map((prop) => {
                                    const propMonthly = (prop.stores * prop.baseFeePerStore) + (prop.hires * prop.variableFeePerHire);
                                    const propAnnualDefault = propMonthly * 12 * (1 - prop.annualDiscount / 100);
                                    const finalAnnualVal = prop.annualFinalPrice !== undefined ? prop.annualFinalPrice : propAnnualDefault;
                                    const clientUrl = `${window.location.origin}/roi/${prop.id}`;

                                    return (
                                        <tr key={prop.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="py-4 px-4 font-black uppercase text-gray-900">{prop.client}</td>
                                            <td className="py-4 px-4 text-xs text-gray-500">
                                                {prop.stores} locales • {prop.hires} ingresos/mes
                                            </td>
                                            <td className="py-4 px-4 text-gray-900">
                                                {prop.currency || 'PEN'} {propMonthly.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td className="py-4 px-4 text-violet-600 font-bold">
                                                {prop.currency || 'PEN'} {finalAnnualVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td className="py-4 px-4">
                                                <span className={`inline-block px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                                    prop.isActive 
                                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                                        : 'bg-red-50 text-red-700 border border-red-100'
                                                }`}>
                                                    {prop.isActive ? 'Activa' : 'Inactiva'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 text-right flex items-center justify-end gap-2">
                                                <button onClick={() => handleEdit(prop)} className="p-2 text-gray-500 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-all" title="Editar">
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleToggleActive(prop.id, prop.isActive)} className={`p-2 rounded-lg transition-all ${
                                                    prop.isActive ? 'text-red-400 hover:text-red-600 hover:bg-red-50' : 'text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50'
                                                }`} title={prop.isActive ? 'Desactivar Enlace' : 'Activar Enlace'}>
                                                    {prop.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                                <button onClick={() => copyToClipboard(clientUrl)} className="p-2 text-gray-500 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-all" title="Copiar Enlace">
                                                    <Copy className="w-4 h-4" />
                                                </button>
                                                <a href={clientUrl} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-500 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-all animate-pulse" title="Ver Propuesta">
                                                    <ExternalLink className="w-4 h-4" />
                                                </a>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
