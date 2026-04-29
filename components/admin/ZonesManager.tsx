'use client';

import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { MapPin, Plus, Trash2, Edit2, Store, X, Check, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ZonesManagerProps {
    holdingId: string;
}

interface Zone {
    id: string;
    nombre: string;
    holdingId: string;
    storeIds?: string[];
    activa: boolean;
}

interface StoreItem {
    id: string;
    nombre: string;
    marcaNombre?: string;
    marcaId?: string;
    distrito?: string;
    activa?: boolean;
}

export default function ZonesManager({ holdingId }: ZonesManagerProps) {
    const [zones, setZones] = useState<Zone[]>([]);
    const [rawStores, setRawStores] = useState<StoreItem[]>([]);
    const [stores, setStores] = useState<StoreItem[]>([]);
    const [marcas, setMarcas] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [newZoneName, setNewZoneName] = useState('');
    const [saving, setSaving] = useState(false);

    // Edit modal state
    const [editingZone, setEditingZone] = useState<Zone | null>(null);
    const [editName, setEditName] = useState('');
    const [editSelectedStores, setEditSelectedStores] = useState<string[]>([]);

    // Store picker filters
    const [pickerSearch, setPickerSearch] = useState('');
    const [pickerMarca, setPickerMarca] = useState('all');

    useEffect(() => {
        if (!holdingId) return;

        const unsub1 = onSnapshot(
            query(collection(db, 'zones'), where('holdingId', '==', holdingId)),
            (snapshot) => {
                const loaded = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Zone));
                loaded.sort((a, b) => a.nombre.localeCompare(b.nombre));
                setZones(loaded);
                setLoading(false);
            },
            () => setLoading(false)
        );

        const unsub2 = onSnapshot(
            query(collection(db, 'tiendas'), where('holdingId', '==', holdingId)),
            (snapshot) => {
                const loaded = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) } as StoreItem));
                loaded.sort((a, b) => a.nombre.localeCompare(b.nombre));
                setRawStores(loaded);
            }
        );

        const unsub3 = onSnapshot(
            query(collection(db, 'marcas'), where('holdingId', '==', holdingId)),
            (snapshot) => {
                const loaded = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
                setMarcas(loaded);
            }
        );

        return () => { unsub1(); unsub2(); unsub3(); };
    }, [holdingId]);

    // Enrich stores with marcaNombre if missing
    useEffect(() => {
        if (rawStores.length === 0) {
            setStores([]);
            return;
        }
        const brandMap: Record<string, string> = {};
        marcas.forEach(m => { if (m.id) brandMap[m.id] = m.nombre; });
        
        setStores(rawStores.map(s => ({
            ...s,
            marcaNombre: s.marcaNombre || (s.marcaId ? brandMap[s.marcaId] : '') || ''
        })));
    }, [rawStores, marcas]);

    // Set of all storeIds already assigned to ANY zone (to prevent duplicates)
    const assignedElsewhere = useMemo(() => {
        const result = new Set<string>();
        zones.forEach(z => {
            if (editingZone && z.id === editingZone.id) return; // skip current zone being edited
            (z.storeIds || []).forEach(sid => result.add(sid));
        });
        return result;
    }, [zones, editingZone]);

    // Unique brands for picker filter
    const pickerMarcas = useMemo(() =>
        Array.from(new Set(stores.map(s => s.marcaNombre).filter(Boolean))).sort() as string[],
    [stores]);

    // Filtered stores for picker
    const pickerStores = useMemo(() => {
        return stores.filter(s => {
            if (pickerMarca !== 'all' && s.marcaNombre !== pickerMarca) return false;
            if (pickerSearch) {
                const term = pickerSearch.toLowerCase();
                if (!s.nombre.toLowerCase().includes(term) &&
                    !(s.distrito || '').toLowerCase().includes(term) &&
                    !(s.marcaNombre || '').toLowerCase().includes(term)) return false;
            }
            return true;
        });
    }, [stores, pickerMarca, pickerSearch]);

    async function handleAddZone() {
        if (!newZoneName.trim() || saving) return;
        setSaving(true);
        try {
            await addDoc(collection(db, 'zones'), {
                nombre: newZoneName.trim(),
                holdingId,
                storeIds: [],
                activa: true,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            });
            setNewZoneName('');
        } catch (error) {
            console.error('Error adding zone:', error);
        } finally {
            setSaving(false);
        }
    }

    async function handleSaveEdit() {
        if (!editingZone || !editName.trim() || saving) return;
        setSaving(true);
        try {
            await updateDoc(doc(db, 'zones', editingZone.id), {
                nombre: editName.trim(),
                storeIds: editSelectedStores,
                updatedAt: Timestamp.now()
            });
            setEditingZone(null);
        } catch (error) {
            console.error('Error updating zone:', error);
        } finally {
            setSaving(false);
        }
    }

    async function handleDeleteZone(zoneId: string, zoneName: string) {
        if (!confirm(`¿Eliminar la zona "${zoneName}"?`)) return;
        try {
            await deleteDoc(doc(db, 'zones', zoneId));
        } catch (error) {
            console.error('Error deleting zone:', error);
        }
    }

    function openEdit(zone: Zone) {
        setEditingZone(zone);
        setEditName(zone.nombre);
        setEditSelectedStores(zone.storeIds || []);
        setPickerSearch('');
        setPickerMarca('all');
    }

    function toggleStore(storeId: string) {
        // Prevent adding stores already in another zone
        if (assignedElsewhere.has(storeId)) return;
        setEditSelectedStores(prev =>
            prev.includes(storeId) ? prev.filter(id => id !== storeId) : [...prev, storeId]
        );
    }

    if (loading) return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <div key={i} className="animate-pulse h-32 bg-slate-100 rounded-[2rem]" />)}
        </div>
    );

    return (
        <div className="space-y-10">
            <div className="flex flex-col gap-1">
                <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase italic flex items-center gap-2">
                    <MapPin className="text-violet-600" />
                    Gestión de Zonas
                </h2>
                <p className="text-slate-400 font-medium text-sm">
                    Agrupa tus tiendas por zona geográfica. Cada tienda solo puede pertenecer a una zona.
                </p>
            </div>

            {/* Create Zone Form */}
            <div className="bg-white p-2 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 flex gap-2 max-w-2xl group transition-all focus-within:ring-4 focus-within:ring-violet-500/10">
                <input
                    type="text"
                    value={newZoneName}
                    onChange={(e) => setNewZoneName(e.target.value)}
                    placeholder="Escribe el nombre de la nueva zona..."
                    className="flex-1 px-6 py-4 bg-slate-50 border-none rounded-[1.5rem] focus:outline-none focus:bg-white transition-all text-slate-700 font-medium"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddZone()}
                />
                <button
                    onClick={handleAddZone}
                    disabled={!newZoneName.trim() || saving}
                    className="px-8 py-4 gradient-bg text-white font-black uppercase italic tracking-tighter rounded-[1.5rem] hover:opacity-90 transition-all shadow-lg shadow-violet-200 disabled:opacity-30 flex items-center gap-2"
                >
                    {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white animate-spin rounded-full" /> : <Plus size={20} />}
                    Crear Zona
                </button>
            </div>

            {/* Zones Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                    {zones.map(zone => {
                        const zoneStores = stores.filter(s => (zone.storeIds || []).includes(s.id));
                        return (
                            <motion.div
                                key={zone.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="bg-white p-6 rounded-[2.5rem] shadow-lg shadow-slate-200/40 border border-slate-100 hover:border-violet-300 transition-all group relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-violet-500/5 to-transparent -mr-12 -mt-12 transition-transform group-hover:scale-150 duration-700" />

                                <div className="flex flex-col gap-4 relative z-10">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center text-violet-600 shadow-inner">
                                                <MapPin size={22} />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black text-slate-900 tracking-tight leading-tight group-hover:text-violet-600 transition-colors uppercase italic">
                                                    {zone.nombre}
                                                </h3>
                                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                                                    {zoneStores.length} tienda{zoneStores.length !== 1 ? 's' : ''}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                            <button
                                                onClick={() => openEdit(zone)}
                                                className="p-2.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-xl transition-all"
                                                title="Editar zona y asignar tiendas"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteZone(zone.id, zone.nombre)}
                                                className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    {zoneStores.length > 0 ? (
                                        <div className="flex flex-col gap-1.5">
                                            {zoneStores.slice(0, 3).map(s => (
                                                <div key={s.id} className="flex items-center gap-2 text-xs text-slate-500">
                                                    <Store size={10} className="text-violet-400 flex-shrink-0" />
                                                    <span className="font-medium truncate">{s.nombre}</span>
                                                    {s.distrito && <span className="text-slate-300 text-[9px]">· {s.distrito}</span>}
                                                </div>
                                            ))}
                                            {zoneStores.length > 3 && (
                                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest ml-4">
                                                    +{zoneStores.length - 3} más
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => openEdit(zone)}
                                            className="w-full py-2.5 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:border-violet-300 hover:text-violet-500 transition-all"
                                        >
                                            + Asignar tiendas
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>

                {zones.length === 0 && !loading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="col-span-full py-24 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200"
                    >
                        <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-slate-300 mx-auto mb-6 shadow-sm">
                            <MapPin size={40} />
                        </div>
                        <h4 className="text-xl font-black text-slate-400 uppercase italic tracking-tight">No hay zonas definidas</h4>
                        <p className="text-slate-400 font-medium max-w-xs mx-auto mt-2">Empieza creando una zona para organizar tus tiendas y responsables.</p>
                    </motion.div>
                )}
            </div>

            {/* Edit Zone Modal */}
            {editingZone && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="bg-white rounded-[2.5rem] shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">Editar Zona</h3>
                                <p className="text-xs text-slate-400 font-medium mt-0.5">
                                    Asigna tiendas a esta zona. Una tienda solo puede estar en una zona.
                                </p>
                            </div>
                            <button
                                onClick={() => setEditingZone(null)}
                                className="w-9 h-9 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-all"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-8 space-y-6">
                            {/* Zone name */}
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Nombre de la zona</label>
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:outline-none focus:border-violet-400 focus:bg-white transition-all text-slate-800 font-bold"
                                />
                            </div>

                            {/* Store picker filters */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                        Tiendas asignadas ({editSelectedStores.length})
                                    </label>
                                    {editSelectedStores.length > 0 && (
                                        <button
                                            onClick={() => setEditSelectedStores([])}
                                            className="text-[10px] text-rose-500 hover:underline font-bold uppercase tracking-widest"
                                        >
                                            Limpiar selección
                                        </button>
                                    )}
                                </div>

                                {/* Filters row */}
                                <div className="flex gap-2 mb-3">
                                    {/* Brand filter */}
                                    <select
                                        value={pickerMarca}
                                        onChange={e => setPickerMarca(e.target.value)}
                                        className="h-9 bg-white border border-slate-200 rounded-xl px-3 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-violet-300 flex-shrink-0"
                                    >
                                        <option value="all">Todas las marcas</option>
                                        {pickerMarcas.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>

                                    {/* Search input */}
                                    <div className="relative flex-1">
                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            value={pickerSearch}
                                            onChange={e => setPickerSearch(e.target.value)}
                                            placeholder="Buscar tienda..."
                                            className="w-full h-9 pl-8 pr-4 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-violet-300"
                                        />
                                    </div>
                                </div>

                                {/* Store grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                                    {pickerStores.map(store => {
                                        const isSelected = editSelectedStores.includes(store.id);
                                        const isBlocked = assignedElsewhere.has(store.id);
                                        return (
                                            <button
                                                key={store.id}
                                                onClick={() => !isBlocked && toggleStore(store.id)}
                                                disabled={isBlocked}
                                                title={isBlocked ? 'Esta tienda ya pertenece a otra zona' : undefined}
                                                className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all text-left ${
                                                    isBlocked
                                                        ? 'border-slate-100 bg-slate-50 opacity-40 cursor-not-allowed'
                                                        : isSelected
                                                            ? 'border-violet-500 bg-violet-50'
                                                            : 'border-slate-100 bg-white hover:border-violet-200 hover:bg-slate-50'
                                                }`}
                                            >
                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                                                    isBlocked ? 'bg-slate-200 text-slate-400'
                                                    : isSelected ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-400'
                                                }`}>
                                                    {isBlocked ? <X size={12} /> : isSelected ? <Check size={14} /> : <Store size={14} />}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className={`text-xs font-bold truncate ${isSelected ? 'text-violet-700' : 'text-slate-700'}`}>
                                                        {store.nombre}
                                                    </p>
                                                    {(store.marcaNombre || store.distrito) && (
                                                        <p className="text-[10px] text-slate-400 truncate">
                                                            {store.marcaNombre}{store.distrito ? ` · ${store.distrito}` : ''}
                                                            {isBlocked && <span className="ml-1 text-rose-400">· ya asignada</span>}
                                                        </p>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                    {pickerStores.length === 0 && (
                                        <p className="col-span-2 text-center text-slate-400 text-sm py-6">
                                            {stores.length === 0 ? 'No hay tiendas registradas' : 'No hay tiendas con ese filtro'}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-8 py-5 border-t border-slate-100 flex justify-between gap-3 flex-shrink-0">
                            <button
                                onClick={() => setEditingZone(null)}
                                className="px-6 py-2.5 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                disabled={!editName.trim() || saving}
                                className="px-8 py-2.5 bg-violet-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-violet-700 transition-all shadow-xl shadow-violet-200 disabled:opacity-40 flex items-center gap-2"
                            >
                                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={14} />}
                                Guardar Zona
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
