'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { MapPin, Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ZonesManagerProps {
    holdingId: string;
}

export default function ZonesManager({ holdingId }: ZonesManagerProps) {
    const [zones, setZones] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [newZoneName, setNewZoneName] = useState('');
    const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!holdingId) return;

        const zonesRef = collection(db, 'zones');
        const q = query(zonesRef, where('holdingId', '==', holdingId));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const loadedZones = snapshot.docs.map(doc => ({
                id: doc.id,
                ...(doc.data() as any)
            }));
            // Sort by name
            loadedZones.sort((a, b) => a.nombre.localeCompare(b.nombre));
            setZones(loadedZones);
            setLoading(false);
        }, (error) => {
            console.error('Error loading zones:', error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [holdingId]);

    async function handleAddZone() {
        if (!newZoneName.trim() || saving) return;
        setSaving(true);
        try {
            await addDoc(collection(db, 'zones'), {
                nombre: newZoneName.trim(),
                holdingId,
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

    async function handleUpdateZone(zoneId: string) {
        if (!editingName.trim() || saving) return;
        setSaving(true);
        try {
            await updateDoc(doc(db, 'zones', zoneId), {
                nombre: editingName.trim(),
                updatedAt: Timestamp.now()
            });
            setEditingZoneId(null);
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
                    Agrupa tus unidades de negocio para una mejor supervisión y asignación de responsables.
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
                    {zones.map(zone => (
                        <motion.div
                            key={zone.id}
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-white p-6 rounded-[2.5rem] shadow-lg shadow-slate-200/40 border border-slate-100 hover:border-violet-300 transition-all group relative overflow-hidden"
                        >
                            {/* Decorative gradient corner */}
                            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-violet-500/5 to-transparent -mr-12 -mt-12 transition-transform group-hover:scale-150 duration-700" />

                            {editingZoneId === zone.id ? (
                                <div className="space-y-4 relative z-10">
                                    <input
                                        type="text"
                                        value={editingName}
                                        onChange={(e) => setEditingName(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border-2 border-violet-200 rounded-2xl focus:outline-none focus:bg-white transition-all text-slate-800 font-bold"
                                        autoFocus
                                    />
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => setEditingZoneId(null)}
                                            className="px-4 py-2 bg-slate-100 text-slate-500 rounded-xl font-bold text-xs uppercase transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={() => handleUpdateZone(zone.id)}
                                            className="px-4 py-2 bg-emerald-500 text-white rounded-xl font-black uppercase italic tracking-tighter text-xs shadow-lg shadow-emerald-200 transition-all hover:bg-emerald-600"
                                        >
                                            Guardar
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-4 relative z-10">
                                    <div className="flex items-center justify-between">
                                        <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center text-violet-600 shadow-inner group-hover:scale-110 transition-transform duration-500">
                                            <MapPin size={24} />
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                            <button
                                                onClick={() => {
                                                    setEditingZoneId(zone.id);
                                                    setEditingName(zone.nombre);
                                                }}
                                                className="p-2.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-xl transition-all"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteZone(zone.id, zone.nombre)}
                                                className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900 tracking-tight leading-tight group-hover:text-violet-600 transition-colors uppercase italic">{zone.nombre}</h3>
                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">ZONA ACTIVA</p>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    ))}
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
        </div>
    );
}
