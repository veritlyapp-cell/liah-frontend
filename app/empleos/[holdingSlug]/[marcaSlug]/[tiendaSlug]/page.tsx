'use client';

import React, { useState, useEffect, use } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Clock, Search, ArrowRight, ChevronRight, Zap, Info } from 'lucide-react';
import { getHoldingBySlug } from '@/lib/firestore/holdings';
import { getBrandBySlug } from '@/lib/firestore/marcas';
import { getStoreBySlug } from '@/lib/firestore/tiendas';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import Link from 'next/link';

interface StorePortalProps {
    params: Promise<{
        holdingSlug: string;
        marcaSlug: string;
        tiendaSlug: string;
    }>;
}

export default function StorePortal({ params }: StorePortalProps) {
    const { holdingSlug, marcaSlug, tiendaSlug } = use(params);
    const [loading, setLoading] = useState(true);
    const [holding, setHolding] = useState<any>(null);
    const [brand, setBrand] = useState<any>(null);
    const [store, setStore] = useState<any>(null);
    const [jobs, setJobs] = useState<any[]>([]);

    useEffect(() => {
        loadData();
    }, [holdingSlug, marcaSlug, tiendaSlug]);

    async function loadData() {
        try {
            const h = await getHoldingBySlug(holdingSlug);
            if (!h) return;
            setHolding(h);

            const b = await getBrandBySlug(h.id, marcaSlug);
            if (!b) return;
            setBrand(b);

            const s = await getStoreBySlug(b.id, tiendaSlug);
            if (!s) {
                // If not found by slug, maybe it's an ID
                // For now, assume it's slug
                return;
            }
            setStore(s);

            // Fetch vacancies (RQs) for this SPECIFIC store
            const rqsRef = collection(db, 'rqs');
            const q = query(
                rqsRef,
                where('tiendaId', '==', s.id),
                where('status', '==', 'recruiting')
            );
            const snapshot = await getDocs(q);
            setJobs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        } catch (error) {
            console.error('Error loading store portal:', error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
            </div>
        );
    }

    if (!store) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 text-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Tienda no encontrada</h1>
                    <Link href={`/empleos/${holdingSlug}/${marcaSlug}`} className="text-violet-600 font-medium">
                        Ver todas las tiendas de {brand?.nombre}
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 font-sans pb-20">
            {/* Header Branding */}
            <div className="bg-white border-b border-gray-100 p-6 sticky top-0 z-20">
                <div className="max-w-4xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        {brand.logoUrl && <img src={brand.logoUrl} alt={brand.nombre} className="h-8 w-auto object-contain" />}
                        <div className="h-4 w-px bg-gray-300 mx-1"></div>
                        <span className="text-sm font-black text-gray-900 uppercase tracking-tighter italic">{store.nombre}</span>
                    </div>
                </div>
            </div>

            {/* Welcome Banner */}
            <section className="bg-gradient-to-br from-gray-900 to-gray-800 text-white py-16 px-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600 rounded-full blur-[100px] opacity-20 -translate-y-1/2 translate-x-1/2"></div>
                <div className="max-w-4xl mx-auto relative">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="space-y-4"
                    >
                        <span className="inline-block px-3 py-1 bg-violet-600 rounded-full text-[10px] font-black uppercase tracking-widest">Postulación Directa</span>
                        <h1 className="text-4xl md:text-5xl font-black italic uppercase leading-none tracking-tighter">
                            ¡Qué bueno verte en <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">{store.nombre}!</span>
                        </h1>
                        <p className="text-gray-400 text-lg max-w-xl font-medium tracking-tight">
                            ¿Te gustaría trabajar con nosotros en esta sede? Revisa nuestras vacantes abiertas y postula ahora mismo.
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* Store Info Mini Card */}
            <div className="max-w-4xl mx-auto px-6 -mt-8 relative z-10">
                <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 flex flex-wrap gap-8 items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-violet-50 flex items-center justify-center text-violet-600">
                            <MapPin size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ubicación</p>
                            <p className="text-sm font-bold text-gray-900">{store.distrito}, {store.departamento}</p>
                        </div>
                    </div>
                    {store.direccion && (
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-violet-50 flex items-center justify-center text-violet-600">
                                <Info size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Referencia</p>
                                <p className="text-sm font-bold text-gray-900 truncate max-w-[200px]">{store.direccion}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Job Openings */}
            <section className="py-16 px-6 max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-black italic uppercase text-gray-900 underline decoration-violet-500 decoration-4 underline-offset-4">Vacantes en esta sede</h2>
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                        <Zap size={14} className="text-violet-500" />
                        ACTUALIZADO HOY
                    </div>
                </div>

                {jobs.length === 0 ? (
                    <div className="bg-white rounded-[2rem] p-12 text-center border-2 border-dashed border-gray-200">
                        <p className="text-gray-500 font-bold uppercase tracking-tight italic">No hay vacantes abiertas en {store.nombre} justo ahora.</p>
                        <Link href={`/empleos/${holdingSlug}/${marcaSlug}`} className="mt-4 inline-block text-violet-600 font-black text-sm uppercase underline">Ver otras sedes de {brand.nombre} →</Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {jobs.map((job) => (
                            <Link
                                key={job.id}
                                href={`/empleos/aplicar/${job.id}?holding=${holdingSlug}`}
                                className="group block bg-white p-8 rounded-[2rem] border-2 border-transparent hover:border-violet-600 shadow-sm hover:shadow-2xl transition-all"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-3xl font-black uppercase italic tracking-tighter leading-none group-hover:text-violet-600 transition-colors">
                                        {job.posicion}
                                    </h3>
                                    <div className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center group-hover:bg-violet-600 transition-all">
                                        <ArrowRight size={20} />
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-4 text-xs font-black uppercase tracking-widest text-gray-500">
                                    <span className="flex items-center gap-1 bg-gray-50 px-3 py-1.5 rounded-full"><Clock size={14} className="text-violet-500" /> {job.turno}</span>
                                    <span className="flex items-center gap-1 bg-gray-50 px-3 py-1.5 rounded-full"><Zap size={14} className="text-violet-500" /> Ingreso Inmediato</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </section>

            {/* Benefits Mini Section */}
            <section className="px-6 max-w-4xl mx-auto">
                <div className="bg-violet-600 rounded-[3rem] p-10 text-white relative overflow-hidden">
                    <div className="absolute bottom-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full translate-y-1/2 translate-x-1/2"></div>
                    <h3 className="text-2xl font-black italic uppercase mb-6 tracking-tighter">¿Por qué trabajar con nosotros?</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div className="space-y-2">
                            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center font-bold">1</div>
                            <p className="text-[10px] font-bold uppercase tracking-widest leading-tight">Cero papel: Postula 100% digital</p>
                        </div>
                        <div className="space-y-2">
                            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center font-bold">2</div>
                            <p className="text-[10px] font-bold uppercase tracking-widest leading-tight">Sueldo puntual + Beneficios</p>
                        </div>
                        <div className="space-y-2">
                            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center font-bold">3</div>
                            <p className="text-[10px] font-bold uppercase tracking-widest leading-tight">Línea de carrera real</p>
                        </div>
                        <div className="space-y-2">
                            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center font-bold">4</div>
                            <p className="text-[10px] font-bold uppercase tracking-widest leading-tight">Ambiente joven y dinámico</p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
