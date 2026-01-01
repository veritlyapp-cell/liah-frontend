'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

interface GlobalCandidate {
    id: string;
    nombre: string;
    apellidoPaterno?: string;
    apellidoMaterno?: string;
    dni: string;
    email: string;
    telefono: string;
    distrito?: string;
    holdingId?: string;
    createdAt?: any;
    applications?: any[];
}

interface GlobalCandidatesViewProps {
    holdings: { id: string; nombre: string }[];
}

export default function GlobalCandidatesView({ holdings }: GlobalCandidatesViewProps) {
    const [candidates, setCandidates] = useState<GlobalCandidate[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [holdingFilter, setHoldingFilter] = useState<string>('todos');

    useEffect(() => {
        loadAllCandidates();
    }, []);

    async function loadAllCandidates() {
        setLoading(true);
        try {
            const candidatesRef = collection(db, 'candidates');
            const q = query(candidatesRef, orderBy('createdAt', 'desc'), limit(500));
            const snapshot = await getDocs(q);

            const allCandidates = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as GlobalCandidate[];

            setCandidates(allCandidates);
            console.log('✅ Candidatos globales cargados:', allCandidates.length);
        } catch (error) {
            console.error('Error loading global candidates:', error);
        } finally {
            setLoading(false);
        }
    }

    // Filter candidates
    const filteredCandidates = candidates.filter(candidate => {
        // Holding filter (extract from applications)
        if (holdingFilter !== 'todos') {
            const hasMatchingApp = candidate.applications?.some(app =>
                holdings.find(h => h.id === holdingFilter)?.nombre
            );
            // For now, simple check if any holdingId matches
            if (candidate.holdingId !== holdingFilter) return false;
        }

        // Search
        const search = searchTerm.toLowerCase();
        return (
            candidate.nombre?.toLowerCase().includes(search) ||
            candidate.apellidoPaterno?.toLowerCase().includes(search) ||
            candidate.dni?.includes(search) ||
            candidate.email?.toLowerCase().includes(search)
        );
    });

    async function handleExportToExcel() {
        try {
            const { exportCandidates } = await import('@/lib/utils/export-csv');
            const dataToExport = filteredCandidates.map(c => ({
                ...c,
                // Flatten some fields for better Excel output
                fullName: `${c.nombre} ${c.apellidoPaterno || ''} ${c.apellidoMaterno || ''}`.trim(),
                applicationCount: c.applications?.length || 0
            }));
            exportCandidates(dataToExport as any[], `candidatos_global_${new Date().toISOString().split('T')[0]}.csv`);
            alert('✅ Exportación iniciada');
        } catch (error) {
            console.error('Export error:', error);
            alert('Error al exportar');
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Cargando candidatos globales...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Base de Datos de Candidatos (Global)</h2>
                <button
                    onClick={handleExportToExcel}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                    📥 Exportar Excel
                </button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                    <input
                        type="text"
                        placeholder="Buscar por nombre, DNI, email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    />
                </div>
                <select
                    value={holdingFilter}
                    onChange={(e) => setHoldingFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                >
                    <option value="todos">Todos los Holdings</option>
                    {holdings.map(h => (
                        <option key={h.id} value={h.id}>{h.nombre}</option>
                    ))}
                </select>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-card rounded-xl p-4">
                    <p className="text-sm text-gray-600 mb-1">Total Candidatos</p>
                    <p className="text-3xl font-bold gradient-primary">{candidates.length}</p>
                </div>
                <div className="glass-card rounded-xl p-4">
                    <p className="text-sm text-gray-600 mb-1">Filtrados</p>
                    <p className="text-3xl font-bold text-violet-600">{filteredCandidates.length}</p>
                </div>
                <div className="glass-card rounded-xl p-4">
                    <p className="text-sm text-gray-600 mb-1">Holdings con Candidatos</p>
                    <p className="text-3xl font-bold text-cyan-600">
                        {new Set(candidates.map(c => c.holdingId).filter(Boolean)).size}
                    </p>
                </div>
            </div>

            {/* Candidates Table */}
            {filteredCandidates.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">No se encontraron candidatos</p>
                </div>
            ) : (
                <div className="glass-card rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">DNI</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teléfono</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Distrito</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Postulaciones</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Registro</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredCandidates.slice(0, 100).map(candidate => (
                                    <tr key={candidate.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-gray-900">
                                                {candidate.nombre} {candidate.apellidoPaterno} {candidate.apellidoMaterno}
                                            </p>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600 font-mono">{candidate.dni}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600">{candidate.email}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600">{candidate.telefono}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600">{candidate.distrito || '-'}</td>
                                        <td className="px-4 py-3">
                                            <span className="px-2 py-1 bg-violet-100 text-violet-700 rounded text-xs font-medium">
                                                {candidate.applications?.length || 0}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500">
                                            {candidate.createdAt?.toDate
                                                ? candidate.createdAt.toDate().toLocaleDateString()
                                                : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {filteredCandidates.length > 100 && (
                        <div className="px-4 py-3 bg-gray-50 text-center text-sm text-gray-500">
                            Mostrando 100 de {filteredCandidates.length} candidatos. Usa filtros para ver más específicos o exporta a Excel.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
