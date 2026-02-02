'use client';

import React, { useState, useEffect, use } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Clock, Search, ArrowRight, ChevronRight, Zap } from 'lucide-react';
import { getHoldingBySlug } from '@/lib/firestore/holdings';
import { getBrandBySlug } from '@/lib/firestore/marcas';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import Link from 'next/link';

interface BrandPortalProps {
    params: Promise<{
        holdingSlug: string;
        marcaSlug: string;
    }>;
}

export default function BrandPortal({ params }: BrandPortalProps) {
    const { holdingSlug, marcaSlug } = use(params);
    const [loading, setLoading] = useState(true);
    const [holding, setHolding] = useState<any>(null);
    const [brand, setBrand] = useState<any>(null);
    const [jobs, setJobs] = useState<any[]>([]);

    useEffect(() => {
        loadData();
    }, [holdingSlug, marcaSlug]);

    async function loadData() {
        try {
            const h = await getHoldingBySlug(holdingSlug);
            if (!h) return;
            setHolding(h);

            const b = await getBrandBySlug(h.id, marcaSlug);
            if (!b) return;
            setBrand(b);

            // Fetch dynamic vacancies (RQs) for this brand
            const rqsRef = collection(db, 'rqs');
            const q = query(
                rqsRef,
                where('marcaId', '==', b.id),
                where('status', '==', 'recruiting')
            );
            const snapshot = await getDocs(q);
            setJobs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        } catch (error) {
            console.error('Error loading brand portal:', error);
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

    if (!brand) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 text-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Marca no encontrada</h1>
                    <Link href={`/empleos/${holdingSlug}`} className="text-violet-600 font-medium">
                        Volver al portal principal
                    </Link>
                </div>
            </div>
        );
    }

    const brandColor = brand.color || '#6366f1'; // Default violet if not set

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            {/* Transparent Navbar */}
            <nav className="absolute top-0 left-0 right-0 p-6 z-10">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        {brand.logoUrl && (
                            <img src={brand.logoUrl} alt={brand.nombre} className="h-10 w-auto object-contain" />
                        )}
                        <span className="text-xl font-black text-gray-900 tracking-tighter uppercase">{brand.nombre}</span>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <header className="relative pt-32 pb-20 px-6">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center"
                    >
                        <h1 className="text-5xl md:text-7xl font-black text-gray-900 mb-6 tracking-tight leading-none uppercase italic">
                            Tu próximo <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600">gran reto</span> está aquí.
                        </h1>
                        <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
                            Únete al equipo de {brand.nombre}. Buscamos personas con pasión, actitud y ganas de crecer con nosotros.
                        </p>

                        <div className="flex flex-wrap justify-center gap-4">
                            <a href="#vacantes" className="px-8 py-4 bg-gray-900 text-white rounded-2xl font-bold text-lg hover:shadow-2xl transition-all hover:-translate-y-1">
                                Ver Vacantes
                            </a>
                        </div>
                    </motion.div>
                </div>
            </header>

            {/* Values / Features */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-3 gap-8">
                    <div className="p-8 rounded-3xl bg-gray-50 border border-gray-100 italic">
                        <Zap className="text-violet-600 mb-4" size={32} />
                        <h3 className="text-xl font-bold text-gray-900 mb-2 underline decoration-violet-200">Ingreso Inmediato</h3>
                        <p className="text-gray-600 text-sm">Nuestro proceso es ágil. Si haces match, puedes empezar en menos de 48 horas.</p>
                    </div>
                    <div className="p-8 rounded-3xl bg-gray-50 border border-gray-100 italic">
                        <MapPin className="text-violet-600 mb-4" size={32} />
                        <h3 className="text-xl font-bold text-gray-900 mb-2 underline decoration-violet-200">Cerca de tu Casa</h3>
                        <p className="text-gray-600 text-sm">Tenemos {brand.nombre} en todo el país. Trabajamos para asignarte a la tienda más cercana.</p>
                    </div>
                    <div className="p-8 rounded-3xl bg-gray-50 border border-gray-100 italic">
                        <Clock className="text-violet-600 mb-4" size={32} />
                        <h3 className="text-xl font-bold text-gray-900 mb-2 underline decoration-violet-200">Horarios Flexibles</h3>
                        <p className="text-gray-600 text-sm">Part-time o Full-time. Nos adaptamos a tus estudios o responsabilidades personales.</p>
                    </div>
                </div>
            </section>

            {/* Vacancies List */}
            <section id="vacantes" className="py-24 px-6">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center justify-between mb-12 border-b-4 border-gray-900 pb-4">
                        <h2 className="text-4xl font-black text-gray-900 italic tracking-tighter uppercase">Vacantes Disponibles</h2>
                        <span className="px-4 py-1 bg-violet-100 text-violet-700 rounded-full text-xs font-black uppercase">{jobs.length} Posiciones</span>
                    </div>

                    {jobs.length === 0 ? (
                        <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-gray-200">
                            <Search className="mx-auto text-gray-300 mb-4" size={48} />
                            <h3 className="text-xl font-bold text-gray-900">No hay vacantes activas en este momento</h3>
                            <p className="text-gray-500 mt-2">Estamos actualizando nuestras posiciones. Vuelve pronto.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {jobs.map((job) => (
                                <Link
                                    key={job.id}
                                    href={`/empleos/${holdingSlug}/${marcaSlug}/${job.tiendaSlug || job.tiendaId}/aplicar?rqId=${job.id}`}
                                    className="group bg-white p-6 md:p-8 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:border-violet-200 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
                                >
                                    <div>
                                        <h4 className="text-2xl font-black text-gray-900 mb-2 group-hover:text-violet-600 transition-colors uppercase italic">{job.posicion}</h4>
                                        <div className="flex flex-wrap gap-4 text-sm text-gray-500 font-bold uppercase tracking-tight">
                                            <span className="flex items-center gap-1"><MapPin size={16} className="text-violet-400" /> {job.tiendaNombre} ({job.tiendaDistrito})</span>
                                            <span className="flex items-center gap-1"><Clock size={16} className="text-violet-400" /> {job.turno}</span>
                                        </div>
                                    </div>
                                    <div className="w-12 h-12 rounded-full bg-gray-900 text-white flex items-center justify-center group-hover:bg-violet-600 transition-all group-hover:scale-110 shadow-lg">
                                        <ChevronRight size={24} />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* Footer */}
            <footer className="py-20 bg-gray-900 text-white px-6">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex items-center gap-3 grayscale invert opacity-50">
                        {brand.logoUrl && <img src={brand.logoUrl} alt={brand.nombre} className="h-8 w-auto" />}
                        <span className="text-lg font-black uppercase tracking-tighter">{brand.nombre}</span>
                    </div>
                    <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">
                        © {new Date().getFullYear()} {brand.nombre} • Powered by LIAH
                    </p>
                </div>
            </footer>
        </div>
    );
}
