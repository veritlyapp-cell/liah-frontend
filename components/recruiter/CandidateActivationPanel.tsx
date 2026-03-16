import { useState, useMemo } from 'react';
import { Upload, CheckCircle2, AlertCircle, Send, Search, FileText, Smartphone, UserCheck, Eye, MousePointer2, UserPlus } from 'lucide-react';
import { SmsService } from '@/lib/notifications/sms-service';

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
}

export default function CandidateActivationPanel({ candidates = [] }: CandidateActivationPanelProps) {
    const [rows, setRows] = useState<ImportRow[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Mock parsing of CompuTrabajo CSV
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Simulate parsing logic from Excel/CSV
        setRows([
            { id: '1', nombre: 'Juan Perez', celular: '51999888777', puesto: 'Multifuncional', status: 'pending', selected: true },
            { id: '2', nombre: 'Maria Garcia', celular: '51988777666', puesto: 'Multifuncional', status: 'pending', selected: true },
            { id: '3', nombre: 'Carlos Ruiz', celular: '51977666555', puesto: 'Cajero', status: 'pending', selected: true },
            { id: '4', nombre: 'Ana Lopez', celular: '51966555444', puesto: 'Auxiliar', status: 'pending', selected: true },
            { id: '5', nombre: 'Luis Torres', celular: '51955444333', puesto: 'Multifuncional', status: 'pending', selected: true }
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

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic mb-1">
                        LIAH FLOW: Motor de Activación
                    </h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Gestión masiva, Detección de reincidentes y Conversión
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
                                        tienda: 'Sede Central' // Should come from mapping if available
                                    }));
                                    exportSmsCampaignExcel(exportData, 'ngr'); // Hardcoded ngr for now as example
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
