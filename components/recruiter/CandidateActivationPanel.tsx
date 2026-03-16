'use client';

import { useState, useMemo, useEffect } from 'react';
import { Upload, CheckCircle2, AlertCircle, Send, Search, FileText, Smartphone, UserCheck, Eye, MousePointer2, UserPlus, Store, ArrowLeft } from 'lucide-react';
import { SmsService } from '@/lib/notifications/sms-service';
import { useAuth } from '@/contexts/AuthContext';
import { subscribeToAllRQs, type RQ } from '@/lib/firestore/rqs';

interface ImportRow {
    id: string;
    nombre: string;
    celular: string;
    puesto: string;
    status: 'pending' | 'validated' | 'blacklisted' | 'sending' | 'sent' | 'error';
    details?: string;
    clicked?: boolean;
    registered?: boolean;
    selected?: boolean;
}

interface CandidateActivationPanelProps {
    candidates?: any[];
    allowedMarcaIds?: string[]; // IDs of brands assigned to the recruiter
}

export default function CandidateActivationPanel({ candidates = [], allowedMarcaIds = [] }: CandidateActivationPanelProps) {
    const { claims } = useAuth();
    const [rows, setRows] = useState<ImportRow[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    // RQ Selection state
    const [activeRQs, setActiveRQs] = useState<RQ[]>([]);
    const [selectedRQ, setSelectedRQ] = useState<RQ | null>(null);
    const [loadingRQs, setLoadingRQs] = useState(true);

    // Fetch Active RQs
    useEffect(() => {
        const holdingId = claims?.tenant_id || claims?.holdingId;
        if (!holdingId) {
            console.log('⚠️ CandidateActivationPanel: No holdingId found in claims', claims);
            // If internal loading, don't wait forever
            const timer = setTimeout(() => {
                if (loadingRQs) setLoadingRQs(false);
            }, 5000);
            return () => clearTimeout(timer);
        }
        
        const unsubscribe = subscribeToAllRQs(holdingId, (allRQs) => {
            console.log(`✅ CandidateActivationPanel: Fetched ${allRQs.length} RQs`);
            // Filter only approved and recruiting/active RQs
            let filtered = allRQs.filter(rq => 
                rq.approvalStatus === 'approved' && 
                (rq.status === 'recruiting' || rq.status === 'active')
            );

            // Further filter by allowed brands if provided
            if (allowedMarcaIds.length > 0) {
                filtered = filtered.filter(rq => allowedMarcaIds.includes(rq.marcaId));
            }

            setActiveRQs(filtered);
            setLoadingRQs(false);
        });

        return () => unsubscribe();
    }, [claims, allowedMarcaIds]);

    // Grouping RQs by store for the selection view
    const storesWithActiveRQs = useMemo(() => {
        const groups: Record<string, { storeId: string; storeName: string; rqs: RQ[] }> = {};
        activeRQs.forEach(rq => {
            const storeId = rq.tiendaId || 'unknown';
            if (!groups[storeId]) {
                groups[storeId] = { storeId, storeName: rq.tiendaNombre || 'Tienda sin nombre', rqs: [] };
            }
            groups[storeId].rqs.push(rq);
        });
        return Object.values(groups).sort((a, b) => a.storeName.localeCompare(b.storeName));
    }, [activeRQs]);

    const [selectedStoreGroup, setSelectedStoreGroup] = useState<{ storeId: string; storeName: string; rqs: RQ[] } | null>(null);

    // Mock parsing of CompuTrabajo CSV
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Default position from first RQ in group
        const defaultPuesto = selectedStoreGroup?.rqs[0]?.puesto || 'Multifuncional';

        // Simulate parsing logic from Excel/CSV
        setRows([
            { id: '1', nombre: 'Juan Perez', celular: '51999888777', puesto: defaultPuesto, status: 'pending', selected: true },
            { id: '2', nombre: 'Maria Garcia', celular: '51988777666', puesto: defaultPuesto, status: 'pending', selected: true },
            { id: '3', nombre: 'Carlos Ruiz', celular: '51977666555', puesto: defaultPuesto, status: 'pending', selected: true },
            { id: '4', nombre: 'Ana Lopez', celular: '51966555444', puesto: defaultPuesto, status: 'pending', selected: true },
            { id: '5', nombre: 'Luis Torres', celular: '51955444333', puesto: defaultPuesto, status: 'pending', selected: true }
        ]);
    };

    const validateCandidates = async () => {
        setIsProcessing(true);
        // Simulate background check against historical DB
        await new Promise(r => setTimeout(r, 1500));

        const updated = rows.map(row => {
            // Mocking a blacklist hit for reincidentes
            if (row.celular === '51988777666') {
                return { ...row, status: 'blacklisted' as const, details: 'Cesado (No Recomendar)' };
            }
            return { ...row, status: 'validated' as const };
        });
        setRows(updated);
        setIsProcessing(false);
    };

    const toggleSelectAll = () => {
        const allSelected = rows.every(r => r.selected);
        setRows(rows.map(r => ({ ...r, selected: !allSelected })));
    };

    const toggleSelect = (id: string) => {
        setRows(rows.map(r => r.id === id ? { ...r, selected: !r.selected } : r));
    };

    const startCampaign = async () => {
        setIsProcessing(true);
        const updated = [...rows];
        for (let i = 0; i < updated.length; i++) {
            if (updated[i].selected && updated[i].status === 'validated') {
                updated[i].status = 'sending';
                setRows([...updated]);

                // Simulate SMS Dispatch
                await new Promise(r => setTimeout(r, 400));

                updated[i].status = 'sent';
                setRows([...updated]);
            }
        }
        setIsProcessing(false);

        // Mock Tracking - After 5 seconds, simulate some clicks
        setTimeout(() => {
            setRows(current => current.map(r =>
                r.status === 'sent' && Math.random() > 0.5 ? { ...r, clicked: true } : r
            ));

            // After 8 seconds, simulate registration
            setTimeout(() => {
                setRows(current => current.map(r =>
                    r.clicked && Math.random() > 0.5 ? { ...r, registered: true } : r
                ));
            }, 3000);
        }, 5000);
    };

    const filteredRows = rows.filter(r =>
        r.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.celular.includes(searchTerm)
    );

    // IF NO STORE SELECTED, SHOW SELECTION SCREEN
    if (!selectedStoreGroup) {
        return (
            <div className="space-y-8 animate-fade-in">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic mb-1">
                            LIAH FLOW: Motor de Activación
                        </h2>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                            Selecciona una tienda con requerimiento activo para comenzar
                        </p>
                    </div>
                </div>

                {loadingRQs ? (
                    <div className="flex flex-col items-center justify-center p-20 gap-4 opacity-50">
                        <div className="w-10 h-10 rounded-full border-4 border-slate-200 border-t-brand animate-spin" />
                        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Cargando tiendas...</p>
                    </div>
                ) : storesWithActiveRQs.length === 0 ? (
                    <div className="white-label-card p-20 text-center space-y-4">
                        <AlertCircle className="mx-auto text-slate-200" size={48} />
                        <div>
                            <h3 className="text-lg font-black text-slate-900 uppercase">Sin Requerimientos Activos</h3>
                            <p className="text-xs font-bold text-slate-400 mt-2">No se encontraron tiendas con RQs en etapa de reclutamiento.</p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {storesWithActiveRQs.map((group, idx) => (
                            <button
                                key={idx}
                                onClick={() => setSelectedStoreGroup(group)}
                                className="white-label-card p-6 flex flex-col gap-4 text-left hover:border-brand/40 hover:shadow-xl hover:shadow-brand/5 transition-all group"
                            >
                                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                                    <div className="p-2.5 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-brand-soft group-hover:text-brand transition-colors">
                                        <Store size={20} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight truncate">{group.storeName}</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">{group.rqs.length} RQ(s) activos</p>
                                    </div>
                                    <ArrowLeft size={16} className="text-slate-200 group-hover:text-brand rotate-180 transition-all group-hover:translate-x-1" />
                                </div>
                                <div className="space-y-2">
                                    {group.rqs.slice(0, 3).map(rq => (
                                        <div key={rq.id} className="flex justify-between items-center bg-slate-50/50 p-2 rounded-lg">
                                            <span className="text-[10px] font-bold text-slate-600 truncate mr-2">{rq.puesto}</span>
                                            <div className="flex gap-1">
                                                <span className="text-[8px] font-black p-1 bg-white rounded border border-slate-100 uppercase text-slate-400">{rq.modalidad?.substring(0, 2)}</span>
                                                <span className="text-[8px] font-black p-1 bg-white rounded border border-slate-100 uppercase text-slate-400">{rq.turno?.substring(0, 1)}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {group.rqs.length > 3 && (
                                        <p className="text-[9px] font-bold text-slate-400 text-center uppercase">+ {group.rqs.length - 3} más</p>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // MAIN PANEL VIEW (After Selection)
    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <button 
                            onClick={() => { setSelectedStoreGroup(null); setRows([]); }}
                            className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
                        >
                            <ArrowLeft size={16} />
                        </button>
                        <span className="text-[10px] font-black text-brand uppercase tracking-widest bg-brand-soft px-2 py-0.5 rounded">
                            {selectedStoreGroup.storeName}
                        </span>
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic mb-1">
                        LIAH FLOW: Motor de Activación
                    </h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Importando candidatos para <span className="text-slate-900">{selectedStoreGroup.rqs[0]?.puesto || 'Puesto'}</span>
                    </p>
                </div>
                <div className="flex gap-3">
                    <label className="px-6 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all cursor-pointer flex items-center gap-2">
                        <Upload size={14} />
                        Importar Excel (CT/Otros)
                        <input type="file" className="hidden" accept=".csv,.xlsx" onChange={handleFileUpload} />
                    </label>
                    <button
                        onClick={validateCandidates}
                        disabled={rows.length === 0 || isProcessing}
                        className="px-6 py-2.5 bg-brand-soft text-brand rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand/10 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        <UserCheck size={14} />
                        Detectar Reincidentes
                    </button>
                    <button
                        onClick={startCampaign}
                        disabled={!rows.some(r => r.selected && r.status === 'validated') || isProcessing}
                        className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-xl shadow-slate-900/20 flex items-center gap-2 disabled:opacity-50"
                    >
                        <Send size={14} />
                        Enviar Invitaciones
                    </button>
                </div>
            </div>

            {/* Tracking Funnel States */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {[
                    { label: 'Cargados', val: rows.length, color: 'slate', icon: <FileText size={18} /> },
                    { label: 'Validados', val: rows.filter(r => r.status === 'validated' || r.status === 'sent').length, color: 'brand', icon: <CheckCircle2 size={18} /> },
                    { label: 'Invitados', val: rows.filter(r => r.status === 'sent').length, color: 'emerald', icon: <Smartphone size={18} /> },
                    { label: 'Clics', val: rows.filter(r => r.clicked).length, color: 'amber', icon: <MousePointer2 size={18} /> },
                    { label: 'Registrados', val: rows.filter(r => r.registered).length, color: 'violet', icon: <UserPlus size={18} /> }
                ].map((stat, i) => (
                    <div key={i} className="white-label-card p-6 flex items-center gap-4 group hover:border-brand/30 transition-all">
                        <div className={`p-3 rounded-xl bg-${stat.color}-50 text-${stat.color}-500 group-hover:scale-110 transition-transform`}>
                            {stat.icon}
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                            <p className="text-2xl font-black text-slate-900 italic tracking-tighter">{stat.val}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Search and Table */}
            <div className="white-label-card overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                        <input
                            type="text"
                            placeholder="Buscar en importación..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-lg text-xs outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white"
                        />
                    </div>
                    <div className="flex gap-2">
                        {rows.length > 0 && (
                            <button
                                onClick={async () => {
                                    const { exportSmsCampaignExcel } = await import('@/lib/utils/export-excel');
                                    // Map current rows to the format expected by the exporter
                                    const exportData = rows.filter(r => r.selected).map(r => ({
                                        nombre: r.nombre,
                                        celular: r.celular,
                                        puesto: r.puesto,
                                        tienda: selectedStoreGroup?.storeName || 'Sede Central'
                                    }));
                                    exportSmsCampaignExcel(exportData, claims?.tenant_id || 'ngr');
                                }}
                                className="flex items-center gap-2 text-[10px] font-black text-slate-600 border border-slate-200 uppercase tracking-widest hover:bg-slate-50 px-3 py-2 rounded-lg transition-colors"
                            >
                                <Smartphone size={14} className="text-brand" /> Export XL para SMS
                            </button>
                        )}
                        {rows.length > 0 && (
                            <button
                                onClick={async () => {
                                    const { exportAllCandidatesExcel } = await import('@/lib/utils/export-excel');
                                    exportAllCandidatesExcel(candidates);
                                }}
                                className="flex items-center gap-2 text-[10px] font-black text-emerald-600 uppercase tracking-widest hover:bg-emerald-50 px-3 py-2 rounded-lg transition-colors"
                            >
                                <FileText size={14} /> Exportar Base Actual
                            </button>
                        )}
                    </div>
                </div>
                <table className="w-full">
                    <thead>
                        <tr className="bg-slate-50/50">
                            <th className="px-6 py-4 text-left w-10">
                                <input
                                    type="checkbox"
                                    className="rounded border-slate-300 text-brand focus:ring-brand"
                                    checked={rows.length > 0 && rows.every(r => r.selected)}
                                    onChange={toggleSelectAll}
                                />
                            </th>
                            <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Candidato</th>
                            <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Puesto</th>
                            <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Estatus</th>
                            <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Conversión</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredRows.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                                    {searchTerm ? 'No hay resultados' : 'Importa un archivo para comenzar'}
                                </td>
                            </tr>
                        ) : filteredRows.map((row) => (
                            <tr key={row.id} className={`hover:bg-slate-50/50 transition-colors ${!row.selected ? 'opacity-60' : ''}`}>
                                <td className="px-6 py-4">
                                    <input
                                        type="checkbox"
                                        checked={row.selected}
                                        onChange={() => toggleSelect(row.id)}
                                        className="rounded border-slate-300 text-brand focus:ring-brand"
                                    />
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-slate-900">{row.nombre}</span>
                                        <span className="text-[10px] font-mono text-slate-400">{row.celular}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{row.puesto}</span>
                                </td>
                                <td className="px-6 py-4">
                                    {row.status === 'pending' && <span className="soft-badge-slate">🕒 Pendiente</span>}
                                    {row.status === 'validated' && <span className="soft-badge-brand">✅ Validado</span>}
                                    {row.status === 'blacklisted' && (
                                        <span className="soft-badge-rose" title={row.details}>🚫 Reincidente</span>
                                    )}
                                    {row.status === 'sending' && <span className="soft-badge-brand animate-pulse">📤 Enviando...</span>}
                                    {row.status === 'sent' && <span className="soft-badge-emerald">📲 Invitado</span>}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex gap-1">
                                            <div className={`w-2 h-2 rounded-full ${row.status === 'sent' ? 'bg-emerald-500' : 'bg-slate-200'}`} title="SMS Invitado" />
                                            <div className={`w-2 h-2 rounded-full ${row.clicked ? 'bg-amber-500' : 'bg-slate-200'}`} title="Link Cliked" />
                                            <div className={`w-2 h-2 rounded-full ${row.registered ? 'bg-violet-500' : 'bg-slate-200'}`} title="Registered" />
                                        </div>
                                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-tight">
                                            {row.registered ? 'Completado' : row.clicked ? 'En Proceso' : row.status === 'sent' ? 'Entregado' : '-'}
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
