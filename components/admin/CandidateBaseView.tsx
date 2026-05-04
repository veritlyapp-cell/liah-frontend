'use client';

import { useState, useEffect } from 'react';
import type { Candidate } from '@/lib/firestore/candidates';
import { Search, Filter, Mail, Smartphone, ExternalLink, Hash, FileText, Download, Play, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';

interface CandidateBaseViewProps {
    holdingId: string;
    marcas: { id: string; nombre: string }[];
}

export default function CandidateBaseView({ holdingId, marcas: marcasProp }: CandidateBaseViewProps) {
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterMarca, setFilterMarca] = useState('');
    const [filterStatus, setFilterStatus] = useState(''); // 'clean', 'detected', 'pending'
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisProgress, setAnalysisProgress] = useState({ current: 0, total: 0 });
    const [marcas, setMarcas] = useState<{ id: string; nombre: string }[]>(marcasProp);
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    useEffect(() => {
        loadCandidates();
    }, [holdingId, marcasProp]);

    async function loadCandidates() {
        setLoading(true);
        try {
            const { getCandidatesByMarca } = await import('@/lib/firestore/candidate-queries');
            
            const allCandidates: Candidate[] = [];
            for (const marca of marcasProp) {
                const marcaCandidates = await getCandidatesByMarca(marca.id);
                allCandidates.push(...marcaCandidates);
            }
            
            // Remove duplicates and set
            const unique = allCandidates.filter((c, i, arr) => arr.findIndex(x => x.id === c.id) === i);
            setCandidates(unique);
            setMarcas(marcasProp);
        } catch (error) {
            console.error('Error loading candidates:', error);
        } finally {
            setLoading(false);
        }
    }

    const filteredCandidates = candidates.filter(c => {
        // Search filter
        const search = searchTerm.toLowerCase();
        const fullName = `${c.nombre} ${c.apellidoPaterno} ${c.apellidoMaterno}`.toLowerCase();
        const matchesSearch = !searchTerm || fullName.includes(search) || c.dni?.includes(search) || c.email?.toLowerCase().includes(search);
        
        // Brand filter
        const latestApp = c.applications?.[c.applications.length - 1];
        const matchesMarca = !filterMarca || latestApp?.marcaNombre === filterMarca;

        // Status filter
        let matchesStatus = true;
        if (filterStatus === 'clean') {
            matchesStatus = !!c.culAntecedentesPenales && 
                           (c.culAntecedentesPenales.toLowerCase().includes('no encontrado') || c.culAntecedentesPenales === 'Limpio') &&
                           (c.culAntecedentesJudiciales?.toLowerCase().includes('no encontrado') || c.culAntecedentesJudiciales === 'Limpio') &&
                           (c.culAntecedentesPoliciales?.toLowerCase().includes('no encontrado') || c.culAntecedentesPoliciales === 'Limpio');
        } else if (filterStatus === 'detected') {
            matchesStatus = (c.culAntecedentesPenales === 'Encontrado') || 
                           (c.culAntecedentesJudiciales === 'Encontrado') || 
                           (c.culAntecedentesPoliciales === 'Encontrado');
        } else if (filterStatus === 'pending') {
            matchesStatus = !c.culAntecedentesPenales;
        }

        // Date range filter
        if (dateRange.start || dateRange.end) {
            const appDate = latestApp?.appliedAt?.toDate ? latestApp.appliedAt.toDate() : (latestApp?.appliedAt ? new Date(latestApp.appliedAt) : null);
            if (appDate) {
                if (dateRange.start && appDate < new Date(dateRange.start)) return false;
                if (dateRange.end && appDate > new Date(dateRange.end + 'T23:59:59')) return false;
            } else if (dateRange.start || dateRange.end) {
                return false;
            }
        }

        return matchesSearch && matchesMarca && matchesStatus;
    });

    const handleDeleteCandidate = async (candidateId: string, name: string) => {
        if (!confirm(`¿Estás seguro de eliminar a ${name}? Esta acción no se puede deshacer.`)) return;

        try {
            const { deleteDoc, doc } = await import('firebase/firestore');
            await deleteDoc(doc(db, 'candidates', candidateId));
            setCandidates(candidates.filter(c => c.id !== candidateId));
            alert('Candidato eliminado.');
        } catch (error) {
            console.error('Error deleting candidate:', error);
            alert('Error al eliminar candidato.');
        }
    };

    const runAutoAnalysis = async () => {
        const toAnalyze = filteredCandidates.filter(c => c.certificadoUnicoLaboral && !c.culAntecedentesPenales);
        if (toAnalyze.length === 0) {
            alert('No hay candidatos con CUL pendiente de análisis en esta vista.');
            return;
        }

        if (!confirm(`Se analizarán ${toAnalyze.length} candidatos con Vertex AI. ¿Continuar?`)) return;

        setIsAnalyzing(true);
        setAnalysisProgress({ current: 0, total: toAnalyze.length });

        for (let i = 0; i < toAnalyze.length; i++) {
            const candidate = toAnalyze[i];
            setAnalysisProgress({ current: i + 1, total: toAnalyze.length });

            try {
                const response = await fetch('/api/ai/analyze-document', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        documentType: 'cul',
                        documentUrl: candidate.certificadoUnicoLaboral,
                        candidateId: candidate.id,
                        candidateDni: candidate.dni
                    })
                });

                const result = await response.json();
                if (result.success && result.extractedData) {
                    const data = result.extractedData;
                    // Update Firestore
                    const candidateRef = doc(db, 'candidates', candidate.id);
                    await updateDoc(candidateRef, {
                        culAntecedentesPenales: data.antecedentesPenales,
                        culAntecedentesJudiciales: data.antecedentesJudiciales,
                        culAntecedentesPoliciales: data.antecedentesPoliciales,
                        culEstudios: data.estudios,
                        culExperienciaLaboral: data.experienciaLaboral,
                        culAiObservation: result.aiObservation,
                        culConfidence: result.confidence,
                        culStatus: result.validationStatus === 'approved_ai' ? 'apto' : (result.validationStatus === 'rejected_ai' ? 'no_apto' : 'manual_review'),
                        culValidatedAt: Timestamp.now()
                    });
                }
            } catch (err) {
                console.error(`Error analyzing candidate ${candidate.id}:`, err);
            }
        }

        setIsAnalyzing(false);
        loadCandidates();
        alert('Análisis masivo completado.');
    };

    const exportToExcel = () => {
        // Simple CSV export for now
        const headers = ['DNI', 'Nombre Completo', 'Celular', 'Email', 'Ultima Marca', 'Ultima Tienda', 'Ultimo Puesto', 'Penales', 'Judiciales', 'Policiales', 'Estudios', 'Experiencia'];
        const rows = filteredCandidates.map(c => {
            const latestApp = c.applications?.[c.applications.length - 1];
            return [
                c.dni,
                `${c.nombre} ${c.apellidoPaterno} ${c.apellidoMaterno}`,
                c.telefono,
                c.email,
                latestApp?.marcaNombre || '',
                latestApp?.tiendaNombre || '',
                latestApp?.posicion || '',
                c.culAntecedentesPenales || 'Pendiente',
                c.culAntecedentesJudiciales || 'Pendiente',
                c.culAntecedentesPoliciales || 'Pendiente',
                c.culEstudios || '',
                c.culExperienciaLaboral || ''
            ].join(',');
        });

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `base_candidatos_ngr_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic mb-1">
                        Base Maestra de Candidatos
                    </h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Información consolidada y validación Vertex AI
                    </p>
                </div>
                
                <div className="flex gap-3">
                    <button 
                        onClick={exportToExcel}
                        className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
                    >
                        <Download size={14} />
                        Exportar Excel (CSV)
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="white-label-card p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o DNI..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium focus:ring-2 focus:ring-brand focus:bg-white transition-all outline-none"
                        />
                    </div>

                    <div className="relative">
                        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <select
                            value={filterMarca}
                            onChange={(e) => setFilterMarca(e.target.value)}
                            className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium focus:ring-2 focus:ring-brand focus:bg-white transition-all outline-none appearance-none"
                        >
                            <option value="">Todas las Marcas</option>
                            {marcas.map(m => (
                                <option key={m.id} value={m.nombre}>{m.nombre}</option>
                            ))}
                        </select>
                    </div>

                    <div className="relative">
                        <AlertCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium focus:ring-2 focus:ring-brand focus:bg-white transition-all outline-none appearance-none"
                        >
                            <option value="">Todos los Estados CUL</option>
                            <option value="clean">Solo Limpios (Sin antecedentes)</option>
                            <option value="detected">Solo con Antecedentes Detectados</option>
                            <option value="pending">Pendientes de Análisis</option>
                        </select>
                    </div>

                    <div className="md:col-span-3 flex flex-col md:flex-row gap-4 items-center bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Filtrar por Fecha Postulación:</span>
                        <div className="flex items-center gap-2 w-full">
                            <input 
                                type="date" 
                                value={dateRange.start}
                                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                                className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-brand"
                            />
                            <span className="text-slate-400 text-xs">a</span>
                            <input 
                                type="date" 
                                value={dateRange.end}
                                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                                className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-brand"
                            />
                            {(dateRange.start || dateRange.end) && (
                                <button 
                                    onClick={() => setDateRange({ start: '', end: '' })}
                                    className="text-[10px] font-bold text-brand hover:underline"
                                >
                                    Limpiar
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="white-label-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full divide-y divide-slate-100">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Candidato</th>
                                <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">DNI / Contacto</th>
                                <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Última Postulación</th>
                                <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Fecha CUL</th>
                                <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Penales</th>
                                <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Judiciales</th>
                                <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Policiales</th>
                                <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Estudios / Exp.</th>
                                <th className="px-6 py-4 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="py-20 text-center">
                                        <div className="w-8 h-8 border-4 border-slate-100 border-t-brand rounded-full animate-spin mx-auto mb-4"></div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cargando base de datos...</span>
                                    </td>
                                </tr>
                            ) : filteredCandidates.map(candidate => {
                                const latestApp = candidate.applications?.[candidate.applications.length - 1];
                                return (
                                    <tr key={candidate.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-slate-900 uppercase">
                                                    {candidate.nombre} {candidate.apellidoPaterno}
                                                </span>
                                                <span className="text-[10px] text-slate-400">{candidate.apellidoMaterno}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded w-fit">{candidate.dni}</span>
                                                <span className="text-[10px] text-slate-500">{candidate.telefono}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {latestApp ? (
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black text-brand uppercase">{latestApp.marcaNombre}</span>
                                                    <span className="text-[9px] font-bold text-slate-500 uppercase">{latestApp.tiendaNombre} - {latestApp.posicion}</span>
                                                    <span className="text-[8px] text-slate-400 mt-0.5">Postuló: {latestApp.appliedAt?.toDate ? latestApp.appliedAt.toDate().toLocaleDateString('es-PE') : '---'}</span>
                                                </div>
                                            ) : (
                                                <span className="text-[9px] text-slate-300 italic">Sin historial</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {candidate.culFechaEmision ? (
                                                <span className="text-[10px] font-bold text-slate-600">{candidate.culFechaEmision}</span>
                                            ) : (
                                                <span className="text-[9px] text-slate-300 italic">Sin fecha</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {renderRecordStatus(candidate.culAntecedentesPenales)}
                                        </td>
                                        <td className="px-6 py-4">
                                            {renderRecordStatus(candidate.culAntecedentesJudiciales)}
                                        </td>
                                        <td className="px-6 py-4">
                                            {renderRecordStatus(candidate.culAntecedentesPoliciales)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1 max-w-[200px]">
                                                {candidate.culEstudios && (
                                                    <div className="text-[9px] text-slate-600 line-clamp-1 italic bg-blue-50/50 p-1 rounded">
                                                        🎓 {candidate.culEstudios}
                                                    </div>
                                                )}
                                                {candidate.culExperienciaLaboral && (
                                                    <div className="text-[9px] text-slate-600 line-clamp-1 italic bg-orange-50/50 p-1 rounded">
                                                        💼 {candidate.culExperienciaLaboral}
                                                    </div>
                                                )}
                                                {!candidate.culEstudios && !candidate.culExperienciaLaboral && (
                                                    <span className="text-[9px] text-slate-300">No analizado</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={() => handleDeleteCandidate(candidate.id, `${candidate.nombre} ${candidate.apellidoPaterno}`)}
                                                className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                                title="Eliminar candidato de la base maestra"
                                            >
                                                <AlertCircle size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function renderRecordStatus(status?: string) {
    if (!status) return <span className="text-[9px] text-slate-300 italic">Pendiente</span>;
    
    const isNegative = status.toLowerCase().includes('no encontrado') || status.toLowerCase() === 'limpio';
    
    if (isNegative) {
        return (
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[9px] font-bold border border-emerald-100">
                <CheckCircle size={10} />
                Limpio
            </div>
        );
    }
    
    return (
        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-rose-50 text-rose-600 rounded text-[9px] font-bold border border-rose-100">
            <AlertCircle size={10} />
            Detectado
        </div>
    );
}
