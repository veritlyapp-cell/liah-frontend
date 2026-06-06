'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { TrendingDown, TrendingUp, Users, DollarSign, Clock, ShieldCheck, Zap, Building2, CheckCircle2 } from 'lucide-react';

function ROICalculatorContent() {
    const searchParams = useSearchParams();
    
    const client = searchParams.get('client') || 'Tu Empresa';
    const stores = parseInt(searchParams.get('stores') || '50');
    const hires = parseInt(searchParams.get('hires') || '150'); // Hires per month
    const turnover = parseFloat(searchParams.get('turnover') || '15'); // Monthly turnover %
    const salary = parseFloat(searchParams.get('salary') || '1025'); // Min wage in PEN or equivalent
    const currency = searchParams.get('currency') || 'USD';
    const conversionRate = currency === 'PEN' ? 1 : 3.8; // Approximate if they use PEN but we quote in USD
    
    // LIAH Proposal
    const liahMonthlyFee = parseFloat(searchParams.get('fee') || '499'); // in USD
    const liahSetupFee = parseFloat(searchParams.get('setup') || '1500'); // in USD

    // CALCULATIONS
    // 1. Cost of current manual process
    // Let's assume 1 recruiter can process 30 hires/month. So they need (hires/30) recruiters.
    const recruitersNeeded = Math.ceil(hires / 30);
    const recruiterCostMonthly = recruitersNeeded * (salary * 1.5); // Including benefits
    
    // 2. Cost of early turnover (Sunk Cost)
    // Assuming 30% of hires leave in the first 3 months. Cost of replacing is 30% of their salary (training, uniform, inefficiency)
    const earlyTurnoverHires = hires * (turnover / 100);
    const costOfTurnoverMonthly = earlyTurnoverHires * (salary * 0.3);

    // 3. Cost of unfilled vacancies (Loss of sales)
    // If a store is missing 1 person, they lose let's say 50 USD / day in sales. Assume it takes 15 days to fill.
    // That's 15 days * 50 = 750 USD per unfilled vacancy. Let's use local currency.
    const lostSalesPerVacancy = 150 * conversionRate; // Conservative
    const costOfUnfilledMonthly = hires * lostSalesPerVacancy;

    const totalHiddenCostMonthlyLocal = recruiterCostMonthly + costOfTurnoverMonthly + costOfUnfilledMonthly;
    const totalHiddenCostMonthlyUSD = totalHiddenCostMonthlyLocal / conversionRate;

    // LIAH Impact (Conservative estimates)
    const savedRecruiterCostLocal = recruiterCostMonthly * 0.4; // Liah automates 40% of recruiter time
    const savedTurnoverCostLocal = costOfTurnoverMonthly * 0.25; // Liah improves quality of hire, reducing turnover by 25%
    const savedUnfilledCostLocal = costOfUnfilledMonthly * 0.5; // Liah reduces time-to-fill by 50%

    const totalSavingsMonthlyLocal = savedRecruiterCostLocal + savedTurnoverCostLocal + savedUnfilledCostLocal;
    const totalSavingsMonthlyUSD = totalSavingsMonthlyLocal / conversionRate;

    const netSavingsYearlyUSD = (totalSavingsMonthlyUSD * 12) - ((liahMonthlyFee * 12) + liahSetupFee);
    const roiPercentage = ((netSavingsYearlyUSD / ((liahMonthlyFee * 12) + liahSetupFee)) * 100).toFixed(0);

    const formatCurrency = (amount: number, curr = 'USD') => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: curr, maximumFractionDigits: 0 }).format(amount);
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] font-sans selection:bg-violet-500 selection:text-white">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center">
                            <Zap className="text-white w-5 h-5" />
                        </div>
                        <span className="font-black text-xl tracking-tight text-gray-900">LIAH<span className="text-violet-600">.</span></span>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-bold text-gray-500 hidden sm:inline-block">Business Case Confidencial</span>
                        <div className="px-4 py-2 bg-gray-100 rounded-full text-xs font-bold text-gray-700 flex items-center gap-2">
                            <Building2 className="w-3 h-3" />
                            {client}
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-12 space-y-16">
                
                {/* Hero Section */}
                <section className="text-center max-w-3xl mx-auto space-y-6">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                        <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight">
                            El costo de operar sin <span className="text-violet-600">LIAH</span> en {client}
                        </h1>
                        <p className="text-lg text-gray-500 mt-6 leading-relaxed">
                            Hemos analizado tu operación con <strong>{stores} tiendas</strong> y <strong>{hires} ingresos mensuales</strong>. 
                            Este es el impacto financiero real de los procesos manuales y la rotación temprana, y cómo LIAH puede transformar esto en rentabilidad.
                        </p>
                    </motion.div>
                </section>

                {/* The Sunk Cost */}
                <section>
                    <div className="flex items-center gap-3 mb-8">
                        <h2 className="text-2xl font-black text-gray-900">1. Tu Costo Oculto Actual</h2>
                        <div className="h-px flex-1 bg-gray-200"></div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/40">
                            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-6">
                                <Users className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Carga Operativa (Reclutamiento)</h3>
                            <p className="text-sm text-gray-500 mb-6">El tiempo invertido por {recruitersNeeded} reclutadores en tareas manuales, revisión de CVs y llamadas fallidas.</p>
                            <p className="text-3xl font-black text-gray-900">{formatCurrency(recruiterCostMonthly / conversionRate)}<span className="text-sm font-medium text-gray-500">/mes</span></p>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/40">
                            <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center mb-6">
                                <TrendingDown className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Rotación Temprana (0-3 meses)</h3>
                            <p className="text-sm text-gray-500 mb-6">Sunk cost en uniformes, capacitación y curva de aprendizaje de los ~{earlyTurnoverHires.toFixed(0)} talentos que desertan.</p>
                            <p className="text-3xl font-black text-gray-900">{formatCurrency(costOfTurnoverMonthly / conversionRate)}<span className="text-sm font-medium text-gray-500">/mes</span></p>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/40">
                            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-6">
                                <Clock className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Pérdida por Vacantes (Ventas)</h3>
                            <p className="text-sm text-gray-500 mb-6">El costo de oportunidad y pérdida de ventas por operar tiendas con personal incompleto durante semanas.</p>
                            <p className="text-3xl font-black text-gray-900">{formatCurrency(costOfUnfilledMonthly / conversionRate)}<span className="text-sm font-medium text-gray-500">/mes</span></p>
                        </motion.div>
                    </div>

                    <div className="mt-8 bg-gray-900 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between text-white shadow-2xl">
                        <div>
                            <p className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-1">Fuga de Capital Mensual Estimada</p>
                            <p className="text-gray-300 max-w-lg mt-2 text-sm">Este es el dinero que {client} está perdiendo actualmente por no tener un proceso optimizado con IA.</p>
                        </div>
                        <div className="text-right mt-6 md:mt-0">
                            <p className="text-5xl font-black text-white">{formatCurrency(totalHiddenCostMonthlyUSD)}</p>
                            <p className="text-sm text-gray-400 mt-1">USD por mes</p>
                        </div>
                    </div>
                </section>

                {/* LIAH Value Proposition */}
                <section>
                    <div className="flex items-center gap-3 mb-8">
                        <h2 className="text-2xl font-black text-gray-900">2. El Impacto LIAH</h2>
                        <div className="h-px flex-1 bg-gray-200"></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            {[
                                { icon: <ShieldCheck className="w-5 h-5 text-emerald-600" />, title: "Filtro de Seguridad IA", desc: "Verificación automática de CUL y DNI. Evita contratar personal con antecedentes que dañan la marca." },
                                { icon: <Zap className="w-5 h-5 text-violet-600" />, title: "WhatsApp Bot Inteligente", desc: "Cero fricción. Los candidatos postulan, filtran y agendan en WhatsApp sin descargar apps, reduciendo el Time-to-Fill en 50%." },
                                { icon: <TrendingUp className="w-5 h-5 text-blue-600" />, title: "Menos Operatividad, Más Control", desc: "Los Jefes de Tienda reciben candidatos pre-filtrados y listos para entrevista, devolviéndoles tiempo para enfocarse en ventas." }
                            ].map((feature, i) => (
                                <motion.div key={i} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="flex gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center shrink-0 shadow-sm">
                                        {feature.icon}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900">{feature.title}</h4>
                                        <p className="text-sm text-gray-500 mt-1 leading-relaxed">{feature.desc}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        <div className="bg-violet-600 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl shadow-violet-600/30">
                            <div className="absolute -right-20 -top-20 w-64 h-64 bg-violet-500 rounded-full blur-3xl opacity-50"></div>
                            <div className="relative z-10">
                                <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><DollarSign className="w-6 h-6" /> Ahorro Proyectado (Mensual)</h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center pb-4 border-b border-violet-500/50">
                                        <span className="text-violet-100">Optimización de Reclutadores (40%)</span>
                                        <span className="font-bold">{formatCurrency(savedRecruiterCostLocal / conversionRate)}</span>
                                    </div>
                                    <div className="flex justify-between items-center pb-4 border-b border-violet-500/50">
                                        <span className="text-violet-100">Reducción de Rotación (25%)</span>
                                        <span className="font-bold">{formatCurrency(savedTurnoverCostLocal / conversionRate)}</span>
                                    </div>
                                    <div className="flex justify-between items-center pb-4 border-b border-violet-500/50">
                                        <span className="text-violet-100">Cobertura Rápida de Vacantes (50%)</span>
                                        <span className="font-bold">{formatCurrency(savedUnfilledCostLocal / conversionRate)}</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-2">
                                        <span className="font-black text-lg">Ahorro Bruto Mensual</span>
                                        <span className="font-black text-2xl text-emerald-300">+{formatCurrency(totalSavingsMonthlyUSD)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Investment & ROI */}
                <section>
                    <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-xl">
                        <div className="grid grid-cols-1 md:grid-cols-2">
                            <div className="p-10 md:p-12">
                                <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-black uppercase tracking-widest rounded-full mb-6">
                                    Propuesta Comercial
                                </span>
                                <h2 className="text-3xl font-black text-gray-900 mb-4">Inversión LIAH</h2>
                                <p className="text-gray-500 mb-8 leading-relaxed">
                                    Un modelo de precios SaaS transparente y escalable, facturado por tienda operativa, asegurando que el valor entregado siempre supere el costo de la licencia.
                                </p>
                                
                                <div className="space-y-6">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="font-bold text-gray-900 text-lg">Suscripción SaaS (Todas las tiendas)</p>
                                            <p className="text-sm text-gray-500">Incluye IA Ilimitada, WhatsApp, Dashboard</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-black text-gray-900">{formatCurrency(liahMonthlyFee)}</p>
                                            <p className="text-xs text-gray-500">/mes (USD)</p>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="font-bold text-gray-900 text-lg">Onboarding Estratégico (Pago Único)</p>
                                            <p className="text-sm text-gray-500">Configuración, KQs, y capacitación a jefes</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-black text-gray-900">{formatCurrency(liahSetupFee)}</p>
                                            <p className="text-xs text-gray-500">USD</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-gray-900 p-10 md:p-12 text-white relative flex flex-col justify-center">
                                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.05)_50%,transparent_75%,transparent_100%)] bg-[length:20px_20px]"></div>
                                <div className="relative z-10 text-center space-y-8">
                                    <div>
                                        <p className="text-gray-400 font-bold uppercase tracking-widest text-sm mb-2">Retorno de Inversión (ROI) Anual</p>
                                        <p className="text-6xl font-black text-emerald-400">{roiPercentage}%</p>
                                    </div>
                                    <div className="h-px bg-white/10 w-1/2 mx-auto"></div>
                                    <div>
                                        <p className="text-gray-400 font-bold uppercase tracking-widest text-sm mb-2">Ahorro Neto Anual (Librando Licencia LIAH)</p>
                                        <p className="text-4xl font-black text-white">{formatCurrency(netSavingsYearlyUSD)}</p>
                                    </div>
                                    
                                    <a href="mailto:ventas@getliah.com" className="inline-block mt-4 px-8 py-4 bg-white text-gray-900 rounded-full font-black uppercase tracking-widest text-sm hover:scale-105 transition-transform shadow-xl shadow-white/10">
                                        Avanzar con LIAH
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
                
                {/* Footer */}
                <footer className="text-center pb-8 pt-4">
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">
                        Confidencial • {new Date().getFullYear()} LIAH by Relié Labs
                    </p>
                </footer>
            </main>
        </div>
    );
}

export default function ROICalculator() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-10 h-10 border-4 border-violet-600 border-t-transparent rounded-full"></div></div>}>
            <ROICalculatorContent />
        </Suspense>
    );
}
