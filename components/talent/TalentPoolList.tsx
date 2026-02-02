'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { Search, Mail, Phone, FileText, Calendar, Tag, ExternalLink } from 'lucide-react';

interface TalentCandidate {
    id: string;
    nombreCompleto: string;
    email: string;
    telefono: string;
    dni: string;
    expectativa: string;
    ai_keywords: string[];
    ai_summary: string;
    cvUrl: string;
    appliedAt: any;
    holdingSlug: string;
    status: string;
}

interface TalentPoolListProps {
    holdingId: string;
}

export default function TalentPoolList({ holdingId }: TalentPoolListProps) {
    const [candidates, setCandidates] = useState<TalentCandidate[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadPool();
    }, [holdingId]);

    async function loadPool() {
        setLoading(true);
        try {
            // We use holdingSlug in the pool, let's assume holdingId here might be the slug
            const poolRef = collection(db, 'talent_pool');
            const q = query(
                poolRef,
                where('holdingSlug', '==', (holdingId || '').toLowerCase()),
                orderBy('appliedAt', 'desc'),
                limit(100)
            );

            const snap = await getDocs(q);
            const list = snap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as TalentCandidate[];

            setCandidates(list);
        } catch (error) {
            console.error('Error loading talent pool:', error);
        } finally {
            setLoading(false);
        }
    }

    const filtered = candidates.filter(c =>
        c.nombreCompleto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.dni?.includes(searchTerm) ||
        c.ai_keywords?.some(k => k.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (loading) {
        return (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-violet-100 border-t-violet-600 rounded-full mx-auto mb-4" />
                <p className="text-gray-500 font-medium">Cargando base de datos de talento...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Red de Talento</h2>
                    <p className="text-sm text-gray-500">Candidatos que se unieron sin una vacante específica.</p>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, DNI o habilidades..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl w-full md:w-80 focus:ring-2 focus:ring-violet-500 outline-none transition-all"
                    />
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-20 text-center">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="text-gray-300" size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">No se encontraron candidatos</h3>
                    <p className="text-gray-500">Intenta con otros términos de búsqueda.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {filtered.map(candidate => (
                        <div key={candidate.id} className="bg-white rounded-3xl border border-gray-100 p-6 hover:shadow-lg transition-shadow group">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-violet-100 rounded-2xl flex items-center justify-center text-violet-600 font-bold text-lg">
                                            {candidate.nombreCompleto?.substring(0, 1).toUpperCase() || 'U'}
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-bold text-gray-900 leading-none mb-1">{candidate.nombreCompleto}</h4>
                                            <div className="flex items-center gap-3 text-sm text-gray-500">
                                                <span className="flex items-center gap-1"><FileText size={14} /> {candidate.dni}</span>
                                                <span className="flex items-center gap-1"><Calendar size={14} /> {candidate.appliedAt?.toDate ? candidate.appliedAt.toDate().toLocaleDateString() : 'Reciente'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {candidate.ai_summary && (
                                        <p className="text-sm text-gray-600 italic bg-gray-50 p-3 rounded-2xl border-l-4 border-violet-400">
                                            "{candidate.ai_summary}"
                                        </p>
                                    )}

                                    <div className="flex flex-wrap gap-1.5">
                                        {candidate.ai_keywords?.map((tag, i) => (
                                            <span key={i} className="px-2.5 py-1 bg-violet-50 text-violet-700 text-[10px] font-black uppercase tracking-wider rounded-lg">
                                                {tag}
                                            </span>
                                        )) || <span className="text-xs text-gray-400 italic">No hay etiquetas de IA</span>}
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-2 text-right">
                                    <div className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                                        <Tag size={12} /> S/ {candidate.expectativa || 'No especificada'}
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
                                        <a href={`mailto:${candidate.email}`} className="hover:text-violet-600 flex items-center gap-1"><Mail size={16} /></a>
                                        <a href={`tel:${candidate.telefono}`} className="hover:text-violet-600 flex items-center gap-1"><Phone size={16} /></a>
                                    </div>
                                    <a
                                        href={candidate.cvUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-4 flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-violet-600 transition-colors"
                                    >
                                        Ver CV <ExternalLink size={14} />
                                    </a>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
