'use client';

import { useState, useEffect } from 'react';
import type { Candidate } from '@/lib/firestore/candidates';
import CandidateProfileModal from '@/components/CandidateProfileModal';

interface AdminCandidatesViewProps {
    holdingId: string;
    marcas: { id: string; nombre: string }[];
    tiendas: { id: string; nombre: string; marcaId: string }[];
}

export default function AdminCandidatesView({ holdingId, marcas, tiendas }: AdminCandidatesViewProps) {
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMarca, setSelectedMarca] = useState<string>('all');
    const [selectedTienda, setSelectedTienda] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

    // Filter tiendas by selected marca
    const filteredTiendas = selectedMarca === 'all'
        ? tiendas
        : tiendas.filter(t => t.marcaId === selectedMarca);

    // Load candidates
    useEffect(() => {
        loadCandidates();
    }, [holdingId, selectedMarca, selectedTienda]);

    async function loadCandidates() {
        setLoading(true);
        try {
            const { getCandidatesByMarca, getCandidatesByStore } = await import('@/lib/firestore/candidate-queries');

            let result: Candidate[] = [];

            if (selectedTienda !== 'all') {
                result = await getCandidatesByStore(selectedTienda);
            } else if (selectedMarca !== 'all') {
                result = await getCandidatesByMarca(selectedMarca);
            } else {
                // Get all candidates for all marcas
                const allCandidates: Candidate[] = [];
                for (const marca of marcas) {
                    const marcaCandidates = await getCandidatesByMarca(marca.id);
                    allCandidates.push(...marcaCandidates);
                }
                // Remove duplicates by id
                result = allCandidates.filter((c, i, arr) => arr.findIndex(x => x.id === c.id) === i);
            }

            setCandidates(result);
        } catch (error) {
            console.error('Error loading candidates:', error);
        } finally {
            setLoading(false);
        }
    }

    // Filter by search term
    const filteredCandidates = candidates.filter(c => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        const fullName = `${c.nombre} ${c.apellidoPaterno} ${c.apellidoMaterno}`.toLowerCase();
        return fullName.includes(search) || c.dni?.includes(search) || c.email?.toLowerCase().includes(search);
    });

    // Get status badge
    function getStatusBadge(candidate: Candidate) {
        if (candidate.selectionStatus === 'selected') {
            return <span className="px-2 py-1 rounded text-xs font-medium bg-emerald-100 text-emerald-700">Seleccionado</span>;
        }
        if (candidate.culStatus === 'apto') {
            return <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">CUL Apto</span>;
        }
        if (candidate.culStatus === 'no_apto') {
            return <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700">CUL No Apto</span>;
        }
        return <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">Pendiente</span>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Vista de Candidatos</h2>
                <span className="text-sm text-gray-500">{filteredCandidates.length} candidatos</span>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex flex-wrap gap-4">
                    {/* Search */}
                    <div className="flex-1 min-w-[200px]">
                        <input
                            type="text"
                            placeholder="Buscar por nombre, DNI o email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                        />
                    </div>

                    {/* Marca Filter */}
                    <select
                        value={selectedMarca}
                        onChange={(e) => {
                            setSelectedMarca(e.target.value);
                            setSelectedTienda('all'); // Reset tienda when marca changes
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                        <option value="all">Todas las marcas</option>
                        {marcas.map(marca => (
                            <option key={marca.id} value={marca.id}>{marca.nombre}</option>
                        ))}
                    </select>

                    {/* Tienda Filter */}
                    <select
                        value={selectedTienda}
                        onChange={(e) => setSelectedTienda(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                        disabled={selectedMarca === 'all'}
                    >
                        <option value="all">Todas las tiendas</option>
                        {filteredTiendas.map(tienda => (
                            <option key={tienda.id} value={tienda.id}>{tienda.nombre}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Candidates Table */}
            {loading ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Cargando candidatos...</p>
                </div>
            ) : filteredCandidates.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">No hay candidatos</p>
                    <p className="text-sm text-gray-400 mt-1">Ajusta los filtros para ver resultados</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Candidato</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">DNI</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contacto</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Marca/Tienda</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredCandidates.slice(0, 50).map(candidate => {
                                const latestApp = candidate.applications?.[candidate.applications.length - 1];
                                return (
                                    <tr key={candidate.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-gray-900">
                                                {candidate.nombre} {candidate.apellidoPaterno} {candidate.apellidoMaterno}
                                            </div>
                                            <div className="text-xs text-gray-500">{latestApp?.posicion || '-'}</div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">{candidate.dni}</td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm text-gray-600">{candidate.email}</div>
                                            <div className="text-xs text-gray-400">{candidate.telefono}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm text-gray-900">{latestApp?.marcaNombre || '-'}</div>
                                            <div className="text-xs text-gray-500">{latestApp?.tiendaNombre || '-'}</div>
                                        </td>
                                        <td className="px-4 py-3">{getStatusBadge(candidate)}</td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => setSelectedCandidate(candidate)}
                                                className="text-violet-600 hover:text-violet-700 text-sm font-medium"
                                            >
                                                Ver Perfil
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {filteredCandidates.length > 50 && (
                        <div className="px-4 py-3 bg-gray-50 text-center text-sm text-gray-500">
                            Mostrando 50 de {filteredCandidates.length} candidatos
                        </div>
                    )}
                </div>
            )}

            {/* Candidate Profile Modal */}
            {selectedCandidate && (
                <CandidateProfileModal
                    candidate={selectedCandidate}
                    onClose={() => setSelectedCandidate(null)}
                    onRefresh={() => {
                        setSelectedCandidate(null);
                        loadCandidates();
                    }}
                />
            )}
        </div>
    );
}
