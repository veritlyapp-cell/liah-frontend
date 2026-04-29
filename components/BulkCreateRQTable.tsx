'use client';

import { useState } from 'react';
import { useJobProfiles } from '@/lib/hooks/useJobProfiles';
import { createRQInstances } from '@/lib/firestore/rqs';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Trash2, X, CheckCircle2, Loader2 } from 'lucide-react';

interface BulkCreateRQTableProps {
    storeId: string;
    storeName: string;
    marcaId: string;
    marcaNombre: string;
    onSuccess: () => void;
    onClose: () => void;
    creatorRole: 'store_manager' | 'supervisor';
}

interface RQRow {
    id: string;
    cantidad: string;
    puestoId: string;
    horario: string;
    modalidad: string;
    observaciones: string;
}

export default function BulkCreateRQTable({
    storeId,
    storeName,
    marcaId,
    marcaNombre,
    onSuccess,
    onClose,
    creatorRole
}: BulkCreateRQTableProps) {
    const { user, claims } = useAuth();
    const { profiles, loading: profilesLoading } = useJobProfiles({
        marcaId,
        autoFetch: true
    });

    const [rows, setRows] = useState<RQRow[]>([
        { id: Math.random().toString(36).substr(2, 9), cantidad: '1', puestoId: '', horario: '', modalidad: 'Full Time', observaciones: '' }
    ]);
    const [isCreating, setIsCreating] = useState(false);

    const filteredProfiles = profiles.filter(p => {
        if (creatorRole === 'store_manager') {
            return !p.categoria || p.categoria === 'operativo';
        }
        return true;
    });

    const addRow = () => {
        setRows([...rows, { id: Math.random().toString(36).substr(2, 9), cantidad: '1', puestoId: '', horario: '', modalidad: 'Full Time', observaciones: '' }]);
    };

    const removeRow = (id: string) => {
        if (rows.length === 1) return;
        setRows(rows.filter(r => r.id !== id));
    };

    const updateRow = (id: string, field: keyof RQRow, value: string) => {
        setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
    };

    const handleBulkCreate = async () => {
        // Validation
        const isValid = rows.every(r => r.cantidad && parseInt(r.cantidad) > 0 && r.puestoId && r.horario && r.modalidad);
        if (!isValid) {
            alert('Por favor complete todos los campos obligatorios en todas las filas.');
            return;
        }

        setIsCreating(true);
        const tenantId = claims?.holdingId || claims?.tenant_id || (user as any)?.holdingId || 'ngr_holding';

        try {
            for (const row of rows) {
                const profile = filteredProfiles.find(p => p.id === row.puestoId);
                if (!profile) continue;

                // Create a temporary "custom" profile including the selected shifts and observations
                const customProfile = {
                    ...profile,
                    turno: row.horario,
                    modalidad: row.modalidad as any,
                    observaciones: row.observaciones,
                    motivo: 'Necesidad de Venta' as any // Default
                };

                await createRQInstances(
                    customProfile,
                    storeId,
                    storeName,
                    parseInt(row.cantidad),
                    tenantId,
                    marcaId,
                    profile.marcaNombre || marcaNombre,
                    user?.uid || '',
                    user?.email || '',
                    creatorRole
                );
            }

            alert(`✅ Se han creado exitosamente los requerimientos para ${storeName}`);
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error in bulk creation:', error);
            alert('Error al crear requerimientos masivos: ' + error.message);
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-auto p-1">
                <table className="w-full border-separate border-spacing-y-2">
                    <thead>
                        <tr className="text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">
                            <th className="px-4 py-2">Cant.</th>
                            <th className="px-4 py-2">Tipo de Puesto</th>
                            <th className="px-4 py-2">Modalidad</th>
                            <th className="px-4 py-2">Horario</th>
                            <th className="px-4 py-2">Observaciones</th>
                            <th className="px-4 py-2 w-10"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr key={row.id} className="bg-slate-50 border border-slate-100 rounded-xl overflow-hidden group">
                                <td className="px-4 py-3 rounded-l-xl">
                                    <input
                                        type="number"
                                        min="1"
                                        max="50"
                                        value={row.cantidad}
                                        onChange={(e) => updateRow(row.id, 'cantidad', e.target.value)}
                                        className="w-16 bg-white border border-slate-200 rounded-lg px-2 py-2 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all"
                                    />
                                </td>
                                <td className="px-4 py-3">
                                    <select
                                        value={row.puestoId}
                                        onChange={(e) => updateRow(row.id, 'puestoId', e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all"
                                    >
                                        <option value="">Seleccionar...</option>
                                        {filteredProfiles.map(p => (
                                            <option key={p.id} value={p.id}>{p.posicion}</option>
                                        ))}
                                    </select>
                                </td>
                                <td className="px-4 py-3">
                                    <select
                                        value={row.modalidad}
                                        onChange={(e) => updateRow(row.id, 'modalidad', e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all"
                                    >
                                        <option value="Full Time">Full Time</option>
                                        <option value="Part time 23">Part time 23</option>
                                        <option value="Part time 19">Part time 19</option>
                                    </select>
                                </td>
                                <td className="px-4 py-3">
                                    <select
                                        value={row.horario}
                                        onChange={(e) => updateRow(row.id, 'horario', e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all"
                                    >
                                        <option value="">Seleccionar...</option>
                                        <option value="Mañana">Mañana</option>
                                        <option value="Tarde">Tarde</option>
                                        <option value="Noche">Noche</option>
                                        <option value="Rotativo">Rotativo</option>
                                    </select>
                                </td>
                                <td className="px-4 py-3">
                                    <input
                                        type="text"
                                        placeholder="Opcional..."
                                        value={row.observaciones}
                                        onChange={(e) => updateRow(row.id, 'observaciones', e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all"
                                    />
                                </td>
                                <td className="px-4 py-3 rounded-r-xl">
                                    <button
                                        onClick={() => removeRow(row.id)}
                                        disabled={rows.length === 1}
                                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-0"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <button
                    onClick={addRow}
                    className="mt-4 flex items-center gap-2 px-4 py-2 text-sm font-bold text-violet-600 hover:bg-violet-50 rounded-xl transition-all"
                >
                    <Plus size={18} />
                    Agregar otra fila
                </button>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between gap-4">
                <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Resumen de carga</span>
                    <span className="text-sm font-bold text-slate-700">
                        {rows.reduce((acc, r) => acc + (parseInt(r.cantidad) || 0), 0)} vacantes totales
                    </span>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleBulkCreate}
                        disabled={isCreating}
                        className="px-8 py-2.5 bg-slate-900 text-white text-sm font-black uppercase tracking-widest rounded-xl hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center gap-2 shadow-lg shadow-slate-200"
                    >
                        {isCreating ? (
                            <>
                                <Loader2 className="animate-spin" size={16} />
                                Procesando...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 size={18} />
                                Confirmar y Crear
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
