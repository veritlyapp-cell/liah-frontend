'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { MapPin, Clock, Users, ArrowRight, ChevronLeft, Briefcase, CalendarCheck, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface VacancyDetail {
    id: string;
    posicion: string;
    modalidad: string;
    turno: string;
    tiendaNombre: string;
    tiendaDistrito: string;
    tiendaProvincia: string;
    tiendaDepartamento: string;
    storeAddress: string;
    marcaNombre: string;
    marcaId: string;
    holdingSlug: string;
    vacantes: number;
    description: string;
    killerQuestions: any[];
    storeCoordinates?: any;
    slotInterval: number;
}

function VacanteDetailContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const params = useParams();
    const rqId = params.rqId as string;

    const [vacancy, setVacancy] = useState<VacancyDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [brandColor, setBrandColor] = useState('#4F46E5'); // Default purple, but will be overwritten
    const [brandLogo, setBrandLogo] = useState('');
    const [brandName, setBrandName] = useState('');

    const token = searchParams.get('token');
    const holdingSlug = searchParams.get('holding');

    useEffect(() => {
        loadData();
    }, [rqId]);

    async function loadData() {
        try {
            // Fetch vacancy details
            const res = await fetch(`/api/portal/vacancy/${rqId}`);
            if (!res.ok) {
                setError('Esta vacante ya no está disponible');
                setLoading(false);
                return;
            }
            const data = await res.json();
            setVacancy(data.vacancy);

            // Use branding from vacancy if available
            if (data.vacancy.branding) {
                const b = data.vacancy.branding;
                if (b.primaryColor) setBrandColor(b.primaryColor);
                if (b.name) setBrandName(b.name);
                if (b.logoUrl) setBrandLogo(b.logoUrl);
            } else {
                // Fetch brand colors using holdingSlug from vacancy or param
                const slug = data.vacancy.holdingSlug || holdingSlug || '';
                if (slug) {
                    try {
                        const q = query(collection(db, 'holdings'), where('slug', '==', slug.toLowerCase()));
                        const snap = await getDocs(q);
                        if (!snap.empty) {
                            const h = snap.docs[0].data();
                            const b = h.config?.branding || h.branding || {};
                            if (b?.primaryColor) setBrandColor(b.primaryColor);
                            if (h.nombre) setBrandName(h.nombre);
                            if (h.logoUrl) setBrandLogo(h.logoUrl);
                        }
                    } catch (e) { console.warn('Brand error:', e); }
                }
            }
            
            // Safety check for NGR orange
            const isNGR = data.vacancy.holdingSlug?.toLowerCase() === 'ngr' || 
                         data.vacancy.marcaNombre?.toLowerCase() === 'bembos' || 
                         holdingSlug?.toLowerCase() === 'ngr' ||
                         (brandName?.toLowerCase() === 'ngr' || data.vacancy.branding?.name?.toLowerCase() === 'ngr');
            
            if (isNGR && (brandColor === '#4F46E5' || !brandColor)) {
                setBrandColor('#FF6B35');
            }
        } catch (e) {
            setError('Error al cargar la vacante');
        } finally {
            setLoading(false);
        }
    }

    function handlePostulate() {
        if (token) {
            // Already registered → go directly to application
            let url = `/portal/postular/${rqId}?token=${token}`;
            if (holdingSlug) url += `&holding=${holdingSlug}`;
            router.push(url);
        } else {
            // Not registered → go to registration
            let url = `/portal/registro?rqId=${rqId}`;
            if (holdingSlug) url += `&holding=${holdingSlug}`;
            router.push(url);
        }
    }

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: brandColor || '#1F2937' }}>
            <div className="animate-spin w-10 h-10 border-4 border-white/20 border-t-white rounded-full" />
        </div>
    );

    if (error || !vacancy) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white rounded-2xl p-8 text-center max-w-md shadow-lg">
                <div className="text-5xl mb-4">😔</div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Vacante no disponible</h2>
                <p className="text-gray-600 mb-6">{error || 'Esta posición ya no está activa'}</p>
                <button onClick={() => router.back()} className="px-6 py-2 bg-gray-900 text-white rounded-xl font-bold">
                    Volver
                </button>
            </div>
        </div>
    );

    const hasKQs = vacancy.killerQuestions && vacancy.killerQuestions.length > 0;

    return (
        <div className="min-h-screen font-sans" style={{ backgroundColor: '#F8FAFC' }}>
            {/* Hero Header */}
            <div className="relative text-white pb-32 overflow-hidden flex flex-col items-center" style={{ backgroundColor: brandColor }}>
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 0%, transparent 60%)' }} />
                <div className="max-w-4xl w-full px-5 pt-8 pb-4 relative z-10">
                    <div className="flex justify-between items-start mb-8">
                        <button onClick={() => router.back()}
                            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm font-bold uppercase tracking-widest">
                            <ChevronLeft size={18} /> Volver
                        </button>
                        {brandLogo && (
                            <div className="bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/20">
                                <img src={brandLogo} alt={brandName} className="h-10 w-auto object-contain" />
                            </div>
                        )}
                    </div>

                    <div className="text-center">
                        <div className="inline-flex px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 shadow-sm"
                            style={{ backgroundColor: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)' }}>
                            {vacancy.marcaNombre || brandName || 'Oferta Disponible'}
                        </div>
                        <h1 className="text-5xl md:text-6xl font-black uppercase italic tracking-tighter leading-[0.9] mb-6 drop-shadow-md">
                            {vacancy.posicion}
                        </h1>
                        <div className="flex flex-wrap items-center justify-center gap-5 text-sm font-bold">
                            <span className="flex items-center gap-2 bg-black/10 px-3 py-1.5 rounded-xl backdrop-blur-sm">
                                <MapPin size={16} className="text-white/60" />
                                <span className="uppercase tracking-tight text-white/90">
                                    {vacancy.tiendaNombre}
                                    {vacancy.tiendaDistrito && ` • ${vacancy.tiendaDistrito}`}
                                </span>
                            </span>
                            <span className="flex items-center gap-2 bg-black/10 px-3 py-1.5 rounded-xl backdrop-blur-sm text-white/90">
                                <Clock size={16} className="text-white/60" /> {vacancy.turno || 'Rotativo'}
                            </span>
                            <span className="flex items-center gap-2 bg-black/10 px-3 py-1.5 rounded-xl backdrop-blur-sm text-white/90">
                                <Briefcase size={16} className="text-white/60" /> {vacancy.modalidad}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Card — overlaps hero */}
            <div className="max-w-4xl mx-auto px-5 -mt-16 pb-32 relative z-20">
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] overflow-hidden border border-gray-100">

                    {/* Process steps */}
                    <div className="p-8 border-b border-gray-50">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: brandColor }} />
                            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Proceso de postulación</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[
                                { step: '1', label: 'Inicia sesión', icon: '👤', desc: 'Con tu correo o registro rápido' },
                                { step: '2', label: hasKQs ? 'Preguntas filtro' : 'Confirmación', icon: hasKQs ? '❓' : '✅', desc: 'Validamos tu perfil' },
                                { step: '3', label: 'Reserva entrevista', icon: '📅', desc: 'Elige tu fecha y hora' },
                            ].map((s) => (
                                <div key={s.step} className="group flex items-start gap-4 bg-gray-50/50 hover:bg-white hover:shadow-lg hover:shadow-gray-100 transition-all rounded-[2rem] p-5 border border-transparent hover:border-gray-100">
                                    <div className="w-10 h-10 rounded-2xl text-white text-sm font-black flex items-center justify-center flex-shrink-0 shadow-lg"
                                        style={{ backgroundColor: brandColor }}>
                                        {s.step}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-black text-gray-900 uppercase italic tracking-tight">{s.label}</span>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{s.desc}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3">
                        <div className="md:col-span-2 p-8 md:p-10 border-r border-gray-50">
                            {/* Description */}
                            {vacancy.description ? (
                                <div className="space-y-6">
                                    <h3 className="text-2xl font-black text-gray-900 uppercase italic tracking-tighter">Sobre el puesto</h3>
                                    <div className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                                        {vacancy.description}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-gray-50 rounded-3xl p-8 text-center">
                                    <h3 className="text-lg font-black text-gray-900 uppercase italic tracking-tighter mb-2">Descripción no disponible</h3>
                                    <p className="text-gray-500 text-xs font-medium">Postula para obtener más información sobre el puesto.</p>
                                </div>
                            )}
                        </div>

                        <div className="bg-gray-50/30 p-8 md:p-10 space-y-8">
                            {/* Location (Masked Address) */}
                            <div>
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Lugar de trabajo</h4>
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-white shadow-sm flex items-center justify-center flex-shrink-0 text-gray-400">
                                        <MapPin size={20} />
                                    </div>
                                    <div>
                                        <p className="font-black text-gray-900 text-sm uppercase italic tracking-tight">{vacancy.tiendaNombre}</p>
                                        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">
                                            {vacancy.tiendaDistrito}
                                            {vacancy.tiendaProvincia && `, ${vacancy.tiendaProvincia}`}
                                        </p>
                                        <p className="text-[10px] text-amber-600 font-bold uppercase tracking-tighter mt-2 flex items-center gap-1">
                                            <div className="w-1 h-1 rounded-full bg-amber-500" />
                                            Dirección exacta revelada al agendar
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Killer Questions Info */}
                            {hasKQs && (
                                <div>
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Tu Perfil</h4>
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-2xl bg-white shadow-sm flex items-center justify-center flex-shrink-0" style={{ color: brandColor }}>
                                            <CheckCircle2 size={20} />
                                        </div>
                                        <div>
                                            <p className="font-black text-gray-900 text-sm uppercase italic tracking-tight">{vacancy.killerQuestions.length} Preguntas Filtro</p>
                                            <p className="text-gray-500 text-[10px] leading-relaxed font-medium mt-1">
                                                Validaremos tus requisitos mínimos mediante un breve cuestionario.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Interview Scheduling note */}
                            <div>
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Entrevista</h4>
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-white shadow-sm flex items-center justify-center flex-shrink-0 text-emerald-600">
                                        <CalendarCheck size={20} />
                                    </div>
                                    <div>
                                        <p className="font-black text-gray-900 text-sm uppercase italic tracking-tight">Presencial</p>
                                        <p className="text-gray-500 text-[10px] leading-relaxed font-medium mt-1">
                                            Podrás elegir tu propio horario de entrevista inmediatamente después de postular.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Apply CTA */}
                    <div className="p-8 md:p-10 bg-white border-t border-gray-100 flex flex-col md:flex-row items-center gap-6">
                        <div className="flex-1 text-center md:text-left">
                            <p className="text-lg font-black text-gray-900 uppercase italic tracking-tighter">¿Listo para unirte?</p>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.1em] mt-1">Tu proceso toma menos de 3 minutos</p>
                        </div>
                        <button
                            onClick={handlePostulate}
                            className="w-full md:w-auto px-12 py-5 text-white rounded-[2rem] font-black uppercase italic tracking-widest text-xl flex items-center justify-center gap-3 shadow-2xl hover:brightness-110 hover:-translate-y-1 transition-all active:scale-[0.98]"
                            style={{ backgroundColor: brandColor }}
                        >
                            Postular ahora <ArrowRight size={24} />
                        </button>
                    </div>
                </motion.div>

                <p className="text-center text-gray-400 text-[10px] font-black uppercase tracking-[0.3em] mt-8">
                    POWERED BY <span className="text-gray-500">LIAH</span> DESIGN BY <span className="text-gray-500">RELIÉ LABS</span>
                </p>
            </div>

        </div>
    );
}

export default function VacanteDetailPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin w-10 h-10 border-4 border-gray-200 rounded-full" style={{ borderTopColor: '#4F46E5' }} />
            </div>
        }>
            <VacanteDetailContent />
        </Suspense>
    );
}
