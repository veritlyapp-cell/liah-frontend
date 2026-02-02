'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';

interface BajasTabProps {
    holdingId: string;
}

interface BajaRecord {
    id: string;
    nombreCompleto: string;
    tipoDocumento?: string;
    numeroDocumento: string;
    fechaCese: any;
    motivoLabel: string;
    tiendaNombre: string;
    marcaLabel?: string;
    permanenciaDias: number;
    isLiahCandidate?: boolean;
    observaciones?: string;
}

export default function BajasTab({ holdingId }: BajasTabProps) {
    const [bajas, setBajas] = useState<BajaRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (!holdingId) {
            setLoading(false);
            return;
        }

        const bajasRef = collection(db, 'bajas_colaboradores');
        const q = query(
            bajasRef,
            where('holdingId', '==', holdingId),
            orderBy('fechaCese', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as BajaRecord[];
            setBajas(data);
            setLoading(false);
        }, (error) => {
            console.error('Error loading bajas:', error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [holdingId]);

    const filteredBajas = bajas.filter(b => {
        const term = searchTerm.toLowerCase();
        return (
            b.nombreCompleto?.toLowerCase().includes(term) ||
            b.numeroDocumento?.includes(term) ||
            b.tiendaNombre?.toLowerCase().includes(term)
        );
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">🚪 Registro de Bajas</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Historial de colaboradores que han cesado sus funciones.
                    </p>
                </div>
                <div className="flex gap-4">
                    <div className="bg-slate-100 px-4 py-2 rounded-xl border border-slate-200">
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Total Bajas</p>
                        <p className="text-xl font-black text-slate-900">{bajas.length}</p>
                    </div>
                </div>
            </div>

            <div className="max-w-md">
                <input
                    type="text"
                    placeholder="Buscar por nombre, DNI o tienda..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                />
            </div>

            {filteredBajas.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                    <p className="text-gray-400">No se encontraron registros de bajas.</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-100">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Colaborador</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Sede</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Fecha Cese</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Motivo</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Permanencia</th>
                                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Origen</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredBajas.map(b => (
                                    <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-900">{b.nombreCompleto}</div>
                                            <div className="text-xs text-gray-500">{b.numeroDocumento}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-700">{b.tiendaNombre}</div>
                                            <div className="text-xs text-gray-400">{b.marcaLabel}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900 capitalize">
                                                {b.fechaCese?.toDate?.().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' }) || 'No registrada'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-lg text-xs font-bold ${b.motivoLabel?.toLowerCase().includes('personal') ? 'bg-amber-100 text-amber-700' :
                                                    b.motivoLabel?.toLowerCase().includes('despido') ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                {b.motivoLabel}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className={`text-sm font-black ${b.permanenciaDias < 90 ? 'text-red-600' : 'text-green-600'}`}>
                                                {b.permanenciaDias} días
                                            </div>
                                            <div className="text-[10px] text-gray-400 uppercase tracking-tighter">
                                                {b.permanenciaDias < 30 ? 'Muerte Temprana' : b.permanenciaDias < 90 ? 'Capital Hundido' : 'Retención Saludable'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {b.isLiahCandidate ? (
                                                <span title="Candidato reclutado vía Liah AI" className="text-xl">🤖</span>
                                            ) : (
                                                <span title="Ingreso manual/externo" className="text-xl grayscale">👤</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
