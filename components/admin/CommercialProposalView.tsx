import { useState } from 'react';
import { 
    Download, 
    ShieldCheck, 
    Zap, 
    Clock, 
    Users, 
    Building2, 
    CheckCircle2, 
    ArrowUpRight, 
    FileText, 
    Sparkles, 
    Scale, 
    TrendingUp, 
    PieChart, 
    BookOpen,
    EyeOff
} from 'lucide-react';

interface ProposalData {
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
    meetingNotes?: string;
    executiveSummary: string;
    signName: string;
    signRole: string;
    signCompany: string;
    signRuc: string;
}

export default function CommercialProposalView({ proposal }: { proposal: ProposalData }) {
    const [downloading, setDownloading] = useState(false);
    const [billingCycle, setBillingCycle] = useState<'annual' | 'monthly'>('annual');

    const formatPrice = (amount: number) => {
        const symbol = proposal.currency === 'PEN' ? 'S/' : proposal.currency === 'USD' ? 'USD $' : '$';
        return `${symbol} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    // Minimum rules config
    const getMinimums = (curr: string) => {
        if (curr === 'USD') return { monthly: 95, annual: 1000 };
        if (curr === 'MXN') return { monthly: 1800, annual: 18000 };
        return { monthly: 350, annual: 3600 }; // Default: PEN (Soles)
    };

    const minimums = getMinimums(proposal.currency);

    // Calculation values
    const monthlyBase = proposal.stores * proposal.baseFeePerStore;
    const monthlyVariable = proposal.hires * proposal.variableFeePerHire;
    
    // Enforce monthly minimum
    const totalMonthly = Math.max(monthlyBase + monthlyVariable, minimums.monthly);
    const projectedAnnual = totalMonthly * 12;

    const calculatedDiscountedAnnual = projectedAnnual * (1 - proposal.annualDiscount / 100);
    
    // Enforce annual minimum on final price
    let finalAnnualPrice = proposal.annualFinalPrice !== undefined && proposal.annualFinalPrice !== null
        ? proposal.annualFinalPrice 
        : calculatedDiscountedAnnual;
    finalAnnualPrice = Math.max(finalAnnualPrice, minimums.annual);

    // Calculate actual discount percentage dynamically
    const actualDiscount = Math.round(((projectedAnnual - finalAnnualPrice) / projectedAnnual) * 100);

    // Setup fees calculations based on cycle
    const activeLandingFinalPrice = billingCycle === 'annual' 
        ? proposal.landingFinalPrice 
        : (proposal.landingFinalPrice > 0 ? proposal.landingFinalPrice : proposal.landingListPrice);
    
    const totalSetupInvestment = proposal.setupFinalPrice + activeLandingFinalPrice;

    const handleDownloadPDF = async () => {
        try {
            setDownloading(true);
            
            // Dynamic script loading for html2pdf.js to avoid SSR/bundler issues in Next.js
            const loadHtml2Pdf = () => {
                return new Promise((resolve) => {
                    if ((window as any).html2pdf) {
                        resolve((window as any).html2pdf);
                        return;
                    }
                    const script = document.createElement('script');
                    script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
                    script.onload = () => resolve((window as any).html2pdf);
                    document.body.appendChild(script);
                });
            };

            const html2pdf = (await loadHtml2Pdf()) as any;
            const element = document.getElementById('proposal-pdf-content');
            
            const opt = {
                margin: [10, 10, 10, 10],
                filename: `Propuesta_Liah_${proposal.client.replace(/\s+/g, '_')}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { 
                    scale: 2, 
                    useCORS: true, 
                    logging: false,
                    letterRendering: true
                },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                pagebreak: { mode: ['css', 'legacy'] }
            };

            await html2pdf().set(opt).from(element).save();
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Hubo un error al generar el PDF. Por favor intenta de nuevo.');
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-16 selection:bg-violet-500 selection:text-white">
            {/* Action Header bar */}
            <div className="bg-white border-b border-slate-100 py-4 px-6 sticky top-0 z-50 shadow-sm flex items-center justify-between max-w-7xl mx-auto w-full">
                <div className="flex items-center gap-2">
                    <span className="font-black text-lg text-slate-900 tracking-tight">LIAH<span className="text-violet-600">.</span></span>
                    <span className="text-[10px] font-bold text-slate-400 border-l border-slate-200 pl-2 uppercase tracking-widest hidden sm:inline">Propuesta Comercial</span>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleDownloadPDF} 
                        disabled={downloading}
                        className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-black uppercase tracking-widest active:scale-95 transition-all shadow-md disabled:opacity-50 shrink-0 cursor-pointer"
                    >
                        <Download className="w-4 h-4" />
                        {downloading ? 'Descargando...' : 'Descargar PDF Oficial'}
                    </button>
                </div>
            </div>

            {/* Document Container */}
            <div 
                id="proposal-pdf-content" 
                className="max-w-[800px] mx-auto bg-white border border-gray-100 shadow-xl rounded-2xl mt-8 p-12 text-slate-800 space-y-12 relative overflow-hidden print:shadow-none print:border-none print:m-0 print:p-8"
            >
                {/* Print specific style overrides */}
                <style jsx global>{`
                    .pdf-section {
                        page-break-inside: avoid;
                        break-inside: avoid;
                    }
                    .page-break {
                        page-break-before: always;
                        break-before: page;
                    }
                `}</style>

                {/* Cover Header */}
                <div className="flex justify-between items-start border-b border-slate-100 pb-8 pdf-section">
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <img src="/Logo_Liah.png" alt="Liah Logo" className="h-9 object-contain" onError={(e) => {
                                // Fallback to styled text if image fails
                                e.currentTarget.style.display = 'none';
                                const parent = e.currentTarget.parentElement;
                                if (parent) {
                                    const textLogo = document.createElement('span');
                                    textLogo.className = "font-black text-2xl tracking-tight text-slate-950";
                                    textLogo.innerHTML = 'LIAH<span class="text-violet-600">.</span>';
                                    parent.appendChild(textLogo);
                                }
                            }} />
                        </div>
                        <h1 className="text-3xl font-black text-slate-950 tracking-tight leading-tight uppercase italic">
                            Propuesta de Alianza Estratégica
                        </h1>
                        <p className="text-xl font-bold text-violet-600 mt-1">
                            Liah x {proposal.client}
                        </p>
                    </div>
                    <div className="text-right">
                        <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-3 py-1 rounded-full uppercase tracking-widest">
                            CONFIDENCIAL
                        </span>
                        <p className="text-xs text-slate-400 mt-2 font-bold uppercase tracking-wider">
                            Fecha: {new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </div>
                </div>

                {/* Print-only badge indicating selected cycle */}
                <div className="hidden print:block text-right text-[10px] font-black text-violet-600 uppercase tracking-widest -mt-4">
                    Visualizando: Facturación {billingCycle === 'annual' ? 'Anual (Membresía)' : 'Mensual Recurrente'}
                </div>

                {/* Billing Cycle Selector (Interactive on web, prints active state) */}
                <div className="flex justify-center py-2 border-b border-slate-100 pb-6 pdf-section print:hidden">
                    <div className="bg-slate-50 p-1 rounded-2xl flex gap-1 border border-slate-200">
                        <button
                            type="button"
                            onClick={() => setBillingCycle('annual')}
                            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 cursor-pointer ${
                                billingCycle === 'annual'
                                    ? 'bg-violet-600 text-white shadow-md shadow-violet-600/10'
                                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/50'
                            }`}
                        >
                            Facturación Anual (Recomendado)
                        </button>
                        <button
                            type="button"
                            onClick={() => setBillingCycle('monthly')}
                            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 cursor-pointer ${
                                billingCycle === 'monthly'
                                    ? 'bg-violet-600 text-white shadow-md shadow-violet-600/10'
                                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/50'
                            }`}
                        >
                            Facturación Mensual
                        </button>
                    </div>
                </div>

                {/* 1. Resumen de la Solución */}
                <div className="space-y-4 pdf-section">
                    <h2 className="text-xl font-black text-slate-900 border-l-4 border-violet-600 pl-3 uppercase italic tracking-tight">
                        1. Resumen de la Solución
                    </h2>
                    <p className="text-sm text-slate-600 leading-relaxed font-medium">
                        {proposal.executiveSummary || `Implementación de Liah, asistente de inteligencia artificial para la automatización del reclutamiento masivo en las ${proposal.stores} sedes de ${proposal.client}. La solución optimiza todo el embudo de selección, desde la captación hasta el ingreso de candidatos, gestionando un flujo proyectado de más de ${proposal.hires * 12} ingresos anuales.`}
                    </p>

                    {/* Features checklist */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                        {[
                            { icon: <Building2 className="w-4 h-4 text-violet-600" />, text: `Gestión de requerimientos para ${proposal.stores} locales` },
                            { icon: <CheckCircle2 className="w-4 h-4 text-violet-600" />, text: "Aprobaciones multi-nivel de vacantes" },
                            { icon: <Users className="w-4 h-4 text-violet-600" />, text: `Gestión de ~${proposal.hires} ingresos mensuales promedio` },
                            { icon: <Clock className="w-4 h-4 text-violet-600" />, text: "Agendamiento en línea automático para entrevistas" },
                            { icon: <ShieldCheck className="w-4 h-4 text-violet-600" />, text: "Revisión y validación con IA del Certificado Único Laboral (CUL)" },
                            { icon: <Sparkles className="w-4 h-4 text-violet-600" />, text: "Portal de empleos / Landing page a la medida" },
                            { icon: <EyeOff className="w-4 h-4 text-violet-600" />, text: "Módulo de encuestas de salida automatizadas" },
                            { icon: <TrendingUp className="w-4 h-4 text-violet-600" />, text: "Reporte de costos de rotación y deserción" },
                            { icon: <PieChart className="w-4 h-4 text-violet-600" />, text: "Dashboard de analíticas avanzado (Analytics)" }
                        ].map((item, index) => (
                            <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 shadow-sm text-xs font-semibold text-slate-700">
                                {item.icon}
                                <span>{item.text}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 2. Periodo de Validación */}
                <div className="space-y-4 pdf-section">
                    <h2 className="text-xl font-black text-slate-900 border-l-4 border-violet-600 pl-3 uppercase italic tracking-tight">
                        2. Periodo de Validación (Piloto Cero Riesgo)
                    </h2>
                    <p className="text-sm text-slate-600 leading-relaxed font-medium">
                        Para asegurar la correcta alineación tecnológica, de procesos y operativa entre ambas empresas, se establece el siguiente esquema de validación:
                    </p>
                    <div className="bg-violet-50/50 border border-violet-100 rounded-2xl p-6 space-y-3">
                        <div className="flex justify-between items-center text-sm">
                            <span className="font-black text-slate-600 uppercase text-xs tracking-wider">Duración:</span>
                            <span className="font-bold text-slate-800 bg-white px-3 py-1 rounded-lg shadow-sm">{proposal.pilotDuration}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="font-black text-slate-600 uppercase text-xs tracking-wider">Costo:</span>
                            <span className="font-extrabold text-emerald-600 bg-white px-3 py-1 rounded-lg shadow-sm uppercase tracking-wider">{proposal.pilotCost}</span>
                        </div>
                        <div className="flex flex-col text-sm pt-2 border-t border-violet-100/50">
                            <span className="font-black text-slate-600 uppercase text-xs tracking-wider mb-2">Objetivo Principal:</span>
                            <p className="text-slate-500 font-medium text-xs leading-relaxed">
                                Medir empíricamente el impacto en la conversión de candidatos calificados, la reducción real del time-to-fill (tiempos de contratación), y la disminución en la carga operativa del equipo de reclutamiento y jefes de tienda.
                            </p>
                        </div>
                    </div>
                </div>

                {/* 3. Inversión de Configuración */}
                <div className="space-y-4 pdf-section">
                    <h2 className="text-xl font-black text-slate-900 border-l-4 border-violet-600 pl-3 uppercase italic tracking-tight">
                        3. Inversión de Configuración (Post-Validación)
                    </h2>
                    <p className="text-sm text-slate-600 leading-relaxed font-medium">
                        Los siguientes montos representan un pago único y se facturarán únicamente tras la conformidad satisfactoria del periodo piloto de validación:
                    </p>
                    
                    <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                        <table className="w-full text-left text-xs font-semibold text-slate-700">
                            <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                <tr>
                                    <th className="py-4 px-6">Concepto</th>
                                    <th className="py-4 px-6 text-center">Precio de Lista</th>
                                    <th className="py-4 px-6 text-right">Inversión Final</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                <tr>
                                    <td className="py-4 px-6 font-bold text-slate-800">Implementación y Onboarding</td>
                                    <td className="py-4 px-6 text-center text-slate-400 line-through font-medium">{formatPrice(proposal.setupListPrice)}</td>
                                    <td className="py-4 px-6 text-right font-black text-slate-900">{formatPrice(proposal.setupFinalPrice)}</td>
                                </tr>
                                <tr>
                                    <td className="py-4 px-6 font-bold text-slate-800">Portal de Empleos Custom (Landing Page)</td>
                                    <td className="py-4 px-6 text-center text-slate-400 line-through font-medium">{formatPrice(proposal.landingListPrice)}</td>
                                    <td className={`py-4 px-6 text-right font-black ${activeLandingFinalPrice === 0 ? 'text-emerald-600' : 'text-slate-900'}`}>
                                        {activeLandingFinalPrice === 0 
                                            ? 'Bonificado (S/ 0.00)' 
                                            : formatPrice(activeLandingFinalPrice)}
                                    </td>
                                </tr>
                                <tr className="bg-slate-50 font-black text-slate-900">
                                    <td className="py-4 px-6">Total Inversión de Configuración</td>
                                    <td className="py-4 px-6 text-center text-slate-400 line-through font-medium">
                                        {formatPrice(proposal.setupListPrice + proposal.landingListPrice)}
                                    </td>
                                    <td className="py-4 px-6 text-right text-violet-600">
                                        {formatPrice(proposal.setupFinalPrice + activeLandingFinalPrice)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Page break to ensure cleanest page cuts for table 4 */}
                <div className="page-break"></div>

                {/* 4. Estructura de Suscripción (SaaS) */}
                <div className="space-y-4 pdf-section">
                    <h2 className="text-xl font-black text-slate-900 border-l-4 border-violet-600 pl-3 uppercase italic tracking-tight">
                        4. Estructura de Suscripción (SaaS)
                    </h2>
                    <p className="text-sm text-slate-600 leading-relaxed font-medium">
                        El esquema de licenciamiento mensual recurrente es flexible y escalable, estructurado de la siguiente forma:
                    </p>

                    <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                        <table className="w-full text-left text-xs font-semibold text-slate-700">
                            <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                <tr>
                                    <th className="py-4 px-6">Componente</th>
                                    <th className="py-4 px-6">Detalle</th>
                                    <th className="py-4 px-6 text-right">Monto Mensual</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-bold text-slate-800">
                                <tr>
                                    <td className="py-4 px-6">Membresía Liah (Base)</td>
                                    <td className="py-4 px-6 text-slate-500 font-medium">Tarifa por sede ({proposal.stores} locales)</td>
                                    <td className="py-4 px-6 text-right text-slate-900">{formatPrice(monthlyBase)}</td>
                                </tr>
                                <tr>
                                    <td className="py-4 px-6">Variable de Selección</td>
                                    <td className="py-4 px-6 text-slate-500 font-medium">Por ingreso confirmado (~{proposal.hires} ingresos/mes)</td>
                                    <td className="py-4 px-6 text-right text-slate-900">{formatPrice(monthlyVariable)}</td>
                                </tr>
                                <tr className="bg-slate-50/50 font-black text-slate-950">
                                    <td className="py-4 px-6 uppercase tracking-wider" colSpan={2}>TOTAL MENSUAL ESTIMADO (Proyectado)</td>
                                    <td className="py-4 px-6 text-right text-violet-600 text-sm">{formatPrice(totalMonthly)} + IGV</td>
                                </tr>
                                <tr className="bg-violet-50/20 font-black text-slate-950">
                                    <td className="py-4 px-6 uppercase tracking-wider text-[10px] text-slate-400" colSpan={2}>Licenciamiento Anual Proyectado (Precio Lista)</td>
                                    <td className="py-4 px-6 text-right text-slate-500 text-xs">{formatPrice(projectedAnnual)} + IGV</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 5. Plan de Membresía Anual */}
                <div className="space-y-4 pdf-section">
                    <h2 className="text-xl font-black text-slate-900 border-l-4 border-violet-600 pl-3 uppercase italic tracking-tight">
                        5. Plan de Membresía Anual
                    </h2>
                    <p className="text-sm text-slate-600 leading-relaxed font-medium">
                        Para simplificar la gestión administrativa, facturación mensual y otorgar previsibilidad presupuestaria anual a {proposal.client}, proponemos la opción de membresía única anual con condiciones preferenciales:
                    </p>

                    <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 text-white rounded-3xl p-8 text-center relative overflow-hidden shadow-lg border border-slate-800">
                        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(124,58,237,0.05)_50%,transparent_75%,transparent_100%)] bg-[length:20px_20px]"></div>
                        <div className="relative z-10 space-y-4">
                            <span className="text-[10px] font-black uppercase tracking-widest text-violet-400">
                                Pago Único Preferencial Anual
                            </span>
                            <h3 className="text-3xl sm:text-4xl font-black italic tracking-tight">
                                {formatPrice(finalAnnualPrice)} <span className="text-lg font-bold not-italic text-violet-400">+ IGV</span>
                            </h3>
                            <div className="h-px bg-white/10 w-1/3 mx-auto"></div>
                            <p className="text-xs text-slate-300 font-bold uppercase tracking-wider max-w-lg mx-auto">
                                ({actualDiscount > 0 ? `Ahorro del ${actualDiscount}% + ` : ''}Bonificación total de Implementación y Landing Page)
                            </p>
                        </div>
                    </div>
                </div>

                {/* Resumen de Inversión Total (Dynamic based on billingCycle selection) */}
                <div className="space-y-4 pdf-section p-6 bg-slate-50 border border-slate-100 rounded-3xl">
                    <h2 className="text-lg font-black text-slate-900 border-l-4 border-violet-600 pl-3 uppercase italic tracking-tight">
                        Resumen de Inversión (Ciclo: {billingCycle === 'annual' ? 'Anual' : 'Mensual'})
                    </h2>
                    
                    <div className="space-y-3 text-xs font-semibold text-slate-700">
                        {billingCycle === 'annual' ? (
                            <>
                                <div className="flex justify-between items-center py-2 border-b border-slate-200/50">
                                    <span>Inversión de Configuración Inicial (Pago Único):</span>
                                    <span className="font-bold text-slate-900">{formatPrice(proposal.setupFinalPrice)} + IGV</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-slate-200/50">
                                    <span>Licenciamiento SaaS Anual Preferencial (Membresía):</span>
                                    <span className="font-bold text-slate-900">{formatPrice(finalAnnualPrice)} + IGV</span>
                                </div>
                                <div className="flex justify-between items-center py-3 text-sm font-black text-violet-600 bg-violet-50/50 px-4 rounded-xl mt-2">
                                    <span className="uppercase tracking-wider">Total Inversión Primer Año:</span>
                                    <span>{formatPrice(proposal.setupFinalPrice + finalAnnualPrice)} + IGV</span>
                                </div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider text-right">
                                    Ahorro Total Consolidado en el Año: {formatPrice(projectedAnnual + proposal.landingListPrice - finalAnnualPrice)} + IGV
                                </p>
                            </>
                        ) : (
                            <>
                                <div className="flex justify-between items-center py-2 border-b border-slate-200/50">
                                    <span>Inversión de Configuración Inicial (Pago Único, incluye Landing Page):</span>
                                    <span className="font-bold text-slate-900">{formatPrice(proposal.setupFinalPrice + proposal.landingListPrice)} + IGV</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-slate-200/50">
                                    <span>Suscripción SaaS Mensual Proyectada (Recurrente):</span>
                                    <span className="font-bold text-slate-900">{formatPrice(totalMonthly)} + IGV / mes</span>
                                </div>
                                <div className="flex justify-between items-center py-3 text-sm font-black text-violet-600 bg-violet-50/50 px-4 rounded-xl mt-2">
                                    <span className="uppercase tracking-wider">Total a pagar al Inicio (Configuración + 1er Mes):</span>
                                    <span>{formatPrice(proposal.setupFinalPrice + proposal.landingListPrice + totalMonthly)} + IGV</span>
                                </div>
                                <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wider text-right">
                                    💡 Nota: Pasa a Facturación Anual para bonificar la Landing Page (S/ 0) y ahorrar {proposal.annualDiscount}% en la suscripción.
                                </p>
                            </>
                        )}
                    </div>
                </div>

                {/* 6. Condiciones Comerciales */}
                <div className="space-y-6 pdf-section">
                    <h2 className="text-xl font-black text-slate-900 border-l-4 border-violet-600 pl-3 uppercase italic tracking-tight">
                        6. Condiciones Comerciales
                    </h2>
                    
                    <ul className="space-y-3 text-xs font-semibold text-slate-600 leading-relaxed list-disc pl-5">
                        <li>
                            <strong className="text-slate-800">Facturación:</strong> Se emite tras la validación satisfactoria y la firma de conformidad del periodo piloto.
                        </li>
                        <li>
                            <strong className="text-slate-800">Vigencia:</strong> Precios fijos durante 12 meses de contrato comercial.
                        </li>
                        <li>
                            <strong className="text-slate-800">Cláusula de Crecimiento:</strong> La estructura tarifaria por sedes se mantiene inalterada siempre que el incremento de tiendas operativas no supere el {proposal.growthClause}% del total inicial ({proposal.stores} sedes).
                        </li>
                        <li>
                            <strong className="text-slate-800">Reevaluación:</strong> Análisis anual de carga operativa de manera conjunta para ajustes de tarifa según el volumen real de contratación.
                        </li>
                    </ul>

                    {/* Signature block */}
                    <div className="pt-8 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                        <div className="space-y-1">
                            <p className="text-sm font-black text-slate-900 uppercase italic tracking-wide">{proposal.signName}</p>
                            <p className="text-xs font-semibold text-slate-500">{proposal.signRole}</p>
                            <p className="text-xs font-black text-violet-600 uppercase tracking-widest">{proposal.signCompany}</p>
                            <p className="text-[10px] font-bold text-slate-400">RUC: {proposal.signRuc}</p>
                        </div>
                        <div className="w-40 h-16 border-b-2 border-slate-200 border-dashed flex items-end justify-center">
                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest pb-1">Firma Digital Liah</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
