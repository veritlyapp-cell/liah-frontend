'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { 
    LayoutDashboard, 
    BarChart3, 
    ShieldCheck, 
    Zap, 
    Clock, 
    Users, 
    Building2,
    ArrowUpRight,
    FileText,
    TrendingUp,
    CreditCard
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { AuditLog, getHoldingLogs, getLoginStatsByBrand } from '@/lib/firestore/logs';
import { RecruitmentMetrics, calculateMarcaMetrics } from '@/lib/analytics/recruitment-metrics';

interface HoldingData {
    nombre: string;
    logo?: string;
    plan: string;
    config?: {
        precioMensual: number;
        maxUsuarios: number;
        maxMarcas: number;
        maxTiendas: number;
    };
    opStartDate?: unknown;
    opRenewalDate?: unknown;
    opExpirationDate?: unknown;
}

interface MarcaData {
    id: string;
    nombre: string;
    logoUrl?: string;
    holdingId: string;
}

type KAMTab = 'overview' | 'consumption' | 'logs' | 'billing';

export default function KAMDashboard() {
    const { user, claims, loading } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<KAMTab>('overview');
    const [holdingData, setHoldingData] = useState<HoldingData | null>(null);
    const [marcas, setMarcas] = useState<MarcaData[]>([]);
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loginStats, setLoginStats] = useState<Record<string, number>>({});
    const [loadingData, setLoadingData] = useState(true);
    const [metrics, setMetrics] = useState<Record<string, RecruitmentMetrics>>({});

    useEffect(() => {
        if (!loading && (!user || (claims?.role !== 'kam' && claims?.role !== 'super_admin'))) {
            router.push('/login');
        }
    }, [user, claims, loading, router]);

    useEffect(() => {
        async function fetchData() {
            if (!claims?.holdingId) return;

            try {
                setLoadingData(true);
                
                // 1. Fetch Holding Data
                const holdingRef = doc(db, 'holdings', claims.holdingId);
                const holdingSnap = await getDoc(holdingRef);
                const hData = holdingSnap.exists() ? holdingSnap.data() : null;
                setHoldingData(hData);

                // 2. Fetch Marcas
                const marcasRef = collection(db, 'marcas');
                const marcasQ = query(marcasRef, where('holdingId', '==', claims.holdingId));
                const marcasSnap = await getDocs(marcasQ);
                const marcasList = marcasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setMarcas(marcasList);

                // 3. Fetch Audit Logs
                const holdingLogs = await getHoldingLogs(claims.holdingId);
                setLogs(holdingLogs);

                // 4. Fetch Login Stats
                const stats = await getLoginStatsByBrand(claims.holdingId);
                setLoginStats(stats);

                // 5. Fetch Consumption Metrics (per brand)
                const metricsMap: Record<string, RecruitmentMetrics> = {};
                for (const marca of marcasList) {
                    const m = await calculateMarcaMetrics(marca.id);
                    metricsMap[marca.id] = m;
                }
                setMetrics(metricsMap);

            } catch (error) {
                console.error('Error fetching KAM data:', error);
            } finally {
                setLoadingData(false);
            }
        }

        if (claims?.holdingId) {
            fetchData();
        }
    }, [claims?.holdingId]);

    if (loading || !user) return null;

    const sidebarItems = [
        { id: 'overview', label: 'Dashboard', icon: <LayoutDashboard /> },
        { id: 'consumption', label: 'Consumo', icon: <TrendingUp /> },
        { id: 'logs', label: 'Auditoría', icon: <ShieldCheck /> },
        { id: 'billing', label: 'Plan y Pagos', icon: <CreditCard /> },
    ];

    // Formatter for currency
    const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

    // Operational dates (Mocked if not present in DB)
    const opStartDate = holdingData?.opStartDate && typeof (holdingData.opStartDate as { toDate?: () => Date }).toDate === 'function' ? (holdingData.opStartDate as { toDate: () => Date }).toDate() : new Date(2024, 0, 1);
    const opRenewalDate = holdingData?.opRenewalDate && typeof (holdingData.opRenewalDate as { toDate?: () => Date }).toDate === 'function' ? (holdingData.opRenewalDate as { toDate: () => Date }).toDate() : new Date(2025, 0, 1);
    const opExpirationDate = holdingData?.opExpirationDate && typeof (holdingData.opExpirationDate as { toDate?: () => Date }).toDate === 'function' ? (holdingData.opExpirationDate as { toDate: () => Date }).toDate() : new Date(2025, 0, 1);

    return (
        <DashboardLayout
            items={sidebarItems}
            activeTab={activeTab}
            onTabChange={(id) => setActiveTab(id as KAMTab)}
            title="KAM Dashboard"
            subtitle={holdingData?.nombre || "Cargando..."}
            brandColor="#4f46e5"
        >
            <div className="space-y-8 animate-fade-in">
                {/* Header Information Card */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 white-label-card p-8 bg-gradient-to-br from-indigo-900 via-slate-900 to-black text-white overflow-hidden relative group">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
                        
                        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                            <div className="w-24 h-24 rounded-3xl bg-white/10 backdrop-blur-md flex items-center justify-center text-4xl font-black italic border border-white/10 shadow-2xl">
                                {holdingData?.logo ? (
                                    <img src={holdingData.logo} alt={holdingData.nombre} className="w-full h-full object-contain p-2" />
                                ) : (
                                    holdingData?.nombre?.substring(0, 2).toUpperCase() || '...'
                                )}
                            </div>
                            
                            <div className="flex-1 text-center md:text-left">
                                <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-2 sm:gap-3 mb-2">
                                    <h1 className="text-2xl sm:text-3xl font-black italic tracking-tight uppercase leading-none text-center sm:text-left">
                                        {holdingData?.nombre || 'Cargando Holding'}
                                    </h1>
                                    <span className="soft-badge-emerald bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] sm:text-xs">
                                        {holdingData?.plan === 'full_stack' ? 'ENTERPRISE' : 'STANDARD'}
                                    </span>
                                </div>
                                <p className="text-indigo-200/60 font-medium tracking-widest text-[10px] uppercase mb-4">
                                    Key Account Management & Analytics Hub
                                </p>
                                
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 border-t border-white/10 pt-4 sm:pt-6 mt-2">
                                    <div>
                                        <p className="text-[8px] sm:text-[9px] font-black text-indigo-300/50 uppercase tracking-[0.2em] mb-1">Inicio Operación</p>
                                        <p className="text-xs sm:text-sm font-bold">{opStartDate.toLocaleDateString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-[8px] sm:text-[9px] font-black text-indigo-300/50 uppercase tracking-[0.2em] mb-1">Próxima Renovación</p>
                                        <p className="text-xs sm:text-sm font-bold text-amber-400">{opRenewalDate.toLocaleDateString()}</p>
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <p className="text-[8px] sm:text-[9px] font-black text-indigo-300/50 uppercase tracking-[0.2em] mb-1">Estatus del Plan</p>
                                        <p className="text-xs sm:text-sm font-bold flex items-center justify-center md:justify-start gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                            Activo
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="white-label-card p-8 flex flex-col justify-between hover:border-indigo-200 transition-all">
                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                    <Zap size={24} />
                                </div>
                                <span className="text-xs font-black text-slate-300 uppercase tracking-widest">Consumo Mensual</span>
                            </div>
                            <h3 className="text-4xl font-black italic text-slate-900 tracking-tighter mb-1">
                                {formatCurrency(holdingData?.config?.precioMensual || 499)}
                            </h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Inversión contratada / mes</p>
                        </div>
                        
                        <div className="space-y-3 mt-8">
                            <div className="flex justify-between text-[11px] font-bold">
                                <span className="text-slate-500 uppercase">Capacidad Usuarios</span>
                                <span className="text-slate-900 italic">{holdingData?.config?.maxUsuarios || 20} / {holdingData?.config?.maxUsuarios || 20}</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500 rounded-full" style={{ width: '100%' }} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Dashboard Tabs Content */}
                {activeTab === 'overview' && (
                    <div className="space-y-8">
                        {/* Login Statistics per Brand */}
                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">Actividad por Marca</h2>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Accesos al sistema distribuidos</p>
                                </div>
                                <BarChart3 className="text-slate-300" size={24} />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {marcas.map(marca => {
                                    const logins = loginStats[marca.id] || 0;
                                    const totalUsers = metrics[marca.id]?.funnel?.applicationsCompleted || 0;
                                    
                                    return (
                                        <div key={marca.id} className="white-label-card p-6 group hover:border-indigo-200 transition-all">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden">
                                                    {marca.logoUrl ? (
                                                        <img src={marca.logoUrl} alt={marca.nombre} className="w-full h-full object-contain p-1" />
                                                    ) : (
                                                        <Building2 className="text-slate-300" size={16} />
                                                    )}
                                                </div>
                                                <h4 className="text-sm font-black text-slate-900 uppercase italic truncate">{marca.nombre}</h4>
                                            </div>
                                            
                                            <div className="flex flex-col gap-1">
                                                <span className="text-2xl font-black text-slate-900">{logins}</span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Inicios de sesión</span>
                                            </div>
                                            
                                            <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center">
                                                <span className="text-[10px] font-bold text-indigo-500 uppercase">Candidatos: {totalUsers}</span>
                                                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <ArrowUpRight size={14} />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                
                                {/* Total Holding Stat */}
                                <div className="white-label-card p-6 bg-slate-50 border-dashed border-2 border-slate-200 flex flex-col justify-center text-center">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Holding</p>
                                    <p className="text-3xl font-black italic text-slate-900">
                                        {Object.values(loginStats).reduce((a, b) => a + b, 0)}
                                    </p>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Sessions this month</p>
                                </div>
                            </div>
                        </div>

                        {/* Recent Activity Mini-Feed */}
                        <div>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4 sm:gap-0">
                                <div>
                                    <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">Logs de Seguridad</h2>
                                </div>
                                <button onClick={() => setActiveTab('logs')} className="text-[10px] sm:text-xs font-black text-indigo-600 uppercase tracking-widest hover:underline whitespace-nowrap">Ver Auditoría Completa →</button>
                            </div>
                            
                            <div className="white-label-card overflow-hidden">
                                <div className="divide-y divide-slate-50">
                                    {logs.slice(0, 5).map((log, i) => (
                                        <div key={i} className="p-4 hover:bg-slate-50/50 transition-colors flex items-center gap-4">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                                log.action === 'login' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                                            }`}>
                                                {log.action === 'login' ? <Clock size={14} /> : <FileText size={14} />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-slate-900">
                                                    {log.userName} <span className="font-normal text-slate-400">— {log.details}</span>
                                                </p>
                                                <p className="text-[10px] text-slate-400 uppercase font-medium">{log.userEmail}</p>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <p className="text-[10px] font-black text-slate-400 uppercase">{log.timestamp?.toDate?.().toLocaleDateString() || 'Hoy'}</p>
                                                <p className="text-[10px] font-medium text-slate-300">{log.timestamp?.toDate?.().toLocaleTimeString() || ''}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {logs.length === 0 && (
                                        <div className="p-12 text-center text-slate-400 italic text-sm">No se registran logs recientes.</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'consumption' && (
                    <div className="space-y-10">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tight">Métricas de Consumo</h2>
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Uso detallado de recursos por marca</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[
                                { title: 'RQs Creadas', value: Object.values(metrics).reduce((s, m) => s + m.funnel.rqsCreated, 0), icon: <FileText className="text-indigo-600" /> },
                                { title: 'Candidatos', value: Object.values(metrics).reduce((s, m) => s + m.funnel.applicationsCompleted, 0), icon: <Users className="text-emerald-600" /> },
                                { title: 'Contrataciones', value: Object.values(metrics).reduce((s, m) => s + m.funnel.hired, 0), icon: <Zap className="text-amber-600" /> },
                            ].map((card, i) => (
                                <div key={i} className="white-label-card p-8 flex items-center gap-6">
                                    <div className="w-16 h-16 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-2xl">
                                        {card.icon}
                                    </div>
                                    <div>
                                        <p className="text-4xl font-black italic tracking-tighter text-slate-900">{card.value}</p>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{card.title}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="white-label-card overflow-hidden overflow-x-auto">
                            <table className="w-full text-left min-w-[600px]">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100">
                                        <th className="px-4 sm:px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Marca</th>
                                        <th className="px-4 sm:px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">RQs</th>
                                        <th className="px-4 sm:px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Postulaciones</th>
                                        <th className="px-4 sm:px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Conversión</th>
                                        <th className="px-4 sm:px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Logins</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {marcas.map(marca => {
                                        const m = metrics[marca.id]?.funnel;
                                        return (
                                            <tr key={marca.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-4 sm:px-8 py-6">
                                                    <div className="flex items-center gap-2 sm:gap-3">
                                                        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                                                            {marca.logoUrl ? <img src={marca.logoUrl} alt={marca.nombre} className="w-full h-full object-contain" /> : <Building2 size={12} className="text-slate-400 sm:w-[14px] sm:h-[14px]" />}
                                                        </div>
                                                        <span className="text-xs sm:text-sm font-bold text-slate-900 italic uppercase truncate max-w-[100px] sm:max-w-none">{marca.nombre}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 sm:px-8 py-6 text-xs sm:text-sm font-black text-slate-700 text-center">{m?.rqsCreated || 0}</td>
                                                <td className="px-4 sm:px-8 py-6 text-xs sm:text-sm font-black text-slate-700 text-center">{m?.applicationsCompleted || 0}</td>
                                                <td className="px-4 sm:px-8 py-6">
                                                    <div className="flex items-center gap-1 sm:gap-2">
                                                        <span className="text-[10px] sm:text-xs font-black text-emerald-600 italic">{(m?.overallConversion || 0).toFixed(1)}%</span>
                                                        <div className="w-8 sm:w-16 h-1 sm:h-1.5 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                                                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, m?.overallConversion || 0)}%` }} />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 sm:px-8 py-6 text-xs sm:text-sm font-black text-indigo-500 italic text-center">{loginStats[marca.id] || 0}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                
                {activeTab === 'logs' && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tight">Auditoría de Sistema</h2>
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Registro de eventos críticos y accesos</p>
                        </div>
                        
                        <div className="white-label-card overflow-hidden overflow-x-auto">
                             <table className="w-full text-left min-w-[600px]">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        <th className="px-4 sm:px-8 py-4 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Timestamp</th>
                                        <th className="px-4 sm:px-8 py-4 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Usuario</th>
                                        <th className="px-4 sm:px-8 py-4 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Acción</th>
                                        <th className="px-4 sm:px-8 py-4 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Detalles</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 italic">
                                    {logs.map((log, i) => (
                                        <tr key={i} className="hover:bg-slate-50/50 transition-all font-medium">
                                            <td className="px-4 sm:px-8 py-4 text-[10px] sm:text-[11px] text-slate-500 whitespace-nowrap">
                                                {log.timestamp?.toDate?.().toLocaleString() || 'N/A'}
                                            </td>
                                            <td className="px-4 sm:px-8 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-[11px] sm:text-xs font-bold text-slate-900">{log.userName}</span>
                                                    <span className="text-[8px] sm:text-[9px] text-slate-400 uppercase tracking-tighter truncate max-w-[120px] sm:max-w-[200px]">{log.userEmail}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 sm:px-8 py-4">
                                                <span className={`soft-badge-sm text-[9px] sm:text-[10px] ${
                                                    log.action === 'login' ? 'soft-badge-emerald' : 'soft-badge-indigo'
                                                }`}>
                                                    {log.action.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-4 sm:px-8 py-4 text-[10px] sm:text-[11px] text-slate-600 truncate max-w-[150px] sm:max-w-none">
                                                {log.details}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'billing' && (
                    <div className="space-y-10">
                        <div className="white-label-card p-10 bg-slate-950 text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-600/20 blur-[150px] rounded-full" />
                            
                            <div className="relative z-10 flex flex-col md:flex-row gap-12">
                                <div className="flex-1">
                                    <h2 className="text-xs sm:text-sm font-black uppercase tracking-[0.3em] sm:tracking-[0.5em] text-indigo-400 mb-6">Plan de Servicio Actual</h2>
                                    <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4 mb-4">
                                        <h3 className="text-4xl sm:text-6xl font-black italic uppercase tracking-tighter">Enterprise</h3>
                                        <span className="soft-badge-emerald animate-pulse self-start sm:self-auto text-xs">✓ Activo</span>
                                    </div>
                                    <p className="text-slate-400 text-xs sm:text-sm leading-relaxed max-w-lg mb-8">
                                        Tu cuenta de holding tiene habilitado el ecosistema completo LIAH: Bot Conversacional, Gestión de Requerimientos (Flow) y Módulo de Talento con IA Generativa.
                                    </p>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 border-t border-white/5 pt-6 sm:pt-8">
                                        <div>
                                            <p className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Próxima Factura</p>
                                            <p className="text-xl sm:text-2xl font-black italic">{formatCurrency(holdingData?.config?.precioMensual || 499)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Fecha de Cobro</p>
                                            <p className="text-xl sm:text-2xl font-black italic">{opRenewalDate.toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="w-full md:w-80 bg-white/5 backdrop-blur-md rounded-2xl sm:rounded-[2.5rem] p-6 sm:p-8 border border-white/10 mt-8 md:mt-0">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-indigo-300 mb-6">Próxima Renovación</h4>
                                    <div className="space-y-6">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase">Días restantes</span>
                                            <span className="text-4xl font-black italic">
                                                {Math.ceil((opRenewalDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} DÍAS
                                            </span>
                                        </div>
                                        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                                            <div className="h-full bg-indigo-500" style={{ width: '85%' }} />
                                        </div>
                                        <button className="w-full py-4 bg-white text-indigo-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-colors shadow-2xl">
                                            Solicitar Factura
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
