'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar as CalendarIcon,
    Clock,
    MapPin,
    CheckCircle2,
    ArrowLeft,
    ChevronRight,
    CalendarCheck,
    AlertCircle
} from 'lucide-react';

interface TimeSlot {
    id: string;
    date: string;
    time: string;
    available: boolean;
}

function AgendarContent() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [loading, setLoading] = useState(true);
    const [booking, setBooking] = useState(false);
    const [slots, setSlots] = useState<TimeSlot[]>([]);
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [vacancyInfo, setVacancyInfo] = useState<{ posicion: string; tiendaNombre: string; tiendaDistrito: string } | null>(null);
    const [booked, setBooked] = useState(false);
    const [bookedSlot, setBookedSlot] = useState<TimeSlot | null>(null);

    const [managerAvailability, setManagerAvailability] = useState<{ startHour: string; endHour: string; days: string[] } | null>(null);

    useEffect(() => {
        async function loadData() {
            const token = searchParams.get('token');
            const rqId = params.rqId as string;

            if (!token) {
                router.push('/portal');
                return;
            }

            try {
                // Validate session
                const sessionRes = await fetch('/api/portal/validate-session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token })
                });

                if (!sessionRes.ok) {
                    router.push('/portal');
                    return;
                }

                // Get vacancy info
                const vacancyRes = await fetch(`/api/portal/vacancy/${rqId}`);
                if (vacancyRes.ok) {
                    const vacancyData = await vacancyRes.json();
                    const v = vacancyData.vacancy;
                    setVacancyInfo({
                        posicion: v.posicion,
                        tiendaNombre: v.tiendaNombre,
                        tiendaDistrito: v.tiendaDistrito
                    });

                    // Fetch Manager Availability based on storeId
                    if (v.tiendaId) {
                        try {
                            const availabilityRes = await fetch(`/api/portal/manager-availability?storeId=${v.tiendaId}`);
                            if (availabilityRes.ok) {
                                const availData = await availabilityRes.json();
                                if (availData.availability) {
                                    setManagerAvailability(availData.availability);
                                }
                            }
                        } catch (e) {
                            console.warn('Could not fetch manager availability, using defaults', e);
                        }
                    }
                }

            } catch (error) {
                console.error('Error loading data:', error);
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, [params.rqId, searchParams, router]);

    // Re-generate slots when managerAvailability changes
    useEffect(() => {
        if (!loading) {
            const generatedSlots = generateTimeSlots(params.rqId as string, managerAvailability);
            setSlots(generatedSlots);
        }
    }, [loading, managerAvailability, params.rqId]);

    // Generate time slots respecting manager availability
    function generateTimeSlots(id: string, customAvail: any): TimeSlot[] {
        const slots: TimeSlot[] = [];
        const today = new Date();

        // Use custom availability or defaults
        const startH = customAvail ? parseInt(customAvail.startHour.split(':')[0]) : 9;
        const endH = customAvail ? parseInt(customAvail.endHour.split(':')[0]) : 16;
        const allowedDays = customAvail ? customAvail.days : ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];

        const dayMap: Record<number, string> = {
            1: 'lunes',
            2: 'martes',
            3: 'miercoles',
            4: 'jueves',
            5: 'viernes',
            6: 'sabado',
            0: 'domingo'
        };

        // Simple hash function for deterministic randomness
        const hash = (str: string) => {
            let h = 0;
            for (let i = 0; i < str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0;
            return Math.abs(h);
        };

        const seed = hash(id);

        for (let dayOffset = 1; dayOffset <= 7; dayOffset++) {
            const date = new Date(today);
            date.setDate(today.getDate() + dayOffset);

            const dayName = dayMap[date.getDay()];

            // Skip if day not allowed by manager
            if (!allowedDays.includes(dayName)) continue;

            const dateStr = date.toLocaleDateString('es-PE', {
                weekday: 'long',
                day: 'numeric',
                month: 'short'
            });

            // Generate slots within manager's window
            for (let hour = startH; hour <= endH; hour++) {
                const timeStr = `${hour.toString().padStart(2, '0')}:00`;
                const slotId = `${date.toISOString().split('T')[0]}-${timeStr}`;

                // Deterministic availability based on id and day/hour
                const isAvailable = (seed + dayOffset + hour) % 3 !== 0;

                slots.push({
                    id: slotId,
                    date: dateStr,
                    time: timeStr,
                    available: isAvailable
                });
            }
        }

        return slots;
    }

    async function handleBook() {
        if (!selectedSlot) return;

        setBooking(true);

        try {
            const token = searchParams.get('token');
            const appId = searchParams.get('appId');
            const rqId = params.rqId as string;

            const slot = slots.find(s => s.id === selectedSlot);
            if (!slot) return;

            const response = await fetch('/api/portal/book-interview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionToken: token,
                    rqId,
                    applicationId: appId,
                    slotId: selectedSlot,
                    slotDate: slot.date,
                    slotTime: slot.time
                })
            });

            if (!response.ok) {
                throw new Error('Error al agendar');
            }

            setBookedSlot(slot);
            setBooked(true);

        } catch (error) {
            console.error('Error booking:', error);
            alert('Error al agendar. Intenta con otro horario.');
        } finally {
            setBooking(false);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="animate-spin w-12 h-12 border-4 border-violet-500/20 border-t-violet-500 rounded-full"></div>
            </div>
        );
    }

    if (booked && bookedSlot) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-[3rem] p-12 max-w-lg w-full text-center shadow-2xl relative overflow-hidden"
                >
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-400 to-emerald-500"></div>
                    <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-8 text-green-600">
                        <CheckCircle2 size={48} />
                    </div>
                    <h2 className="text-4xl font-black text-gray-900 mb-4 tracking-tighter uppercase italic leading-none">¡Cita <br /><span className="text-green-600">confirmada!</span></h2>
                    <p className="text-lg text-gray-600 mb-8 font-medium">
                        Te esperamos para tu entrevista. Hemos enviado los detalles a tu correo.
                    </p>

                    <div className="bg-gray-50 rounded-[2.5rem] p-8 text-left border border-gray-100 mb-10">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center text-violet-600">
                                <MapPin size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Ubicación</p>
                                <p className="font-bold text-gray-900">{vacancyInfo?.tiendaNombre}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center text-violet-600">
                                    <CalendarIcon size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Fecha</p>
                                    <p className="font-bold text-gray-900 capitalize">{bookedSlot.date.split(',')[0]}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center text-violet-600">
                                    <Clock size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Hora</p>
                                    <p className="font-bold text-gray-900">{bookedSlot.time}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => router.push(`/empleos/vacantes?token=${searchParams.get('token')}`)}
                        className="w-full py-5 bg-gray-900 text-white rounded-2xl font-black uppercase italic tracking-widest hover:bg-violet-600 transition-all shadow-xl"
                    >
                        Volver al Portal
                    </button>
                </motion.div>
            </div>
        );
    }

    // Group slots by date
    const slotsByDate: Record<string, TimeSlot[]> = {};
    slots.forEach(slot => {
        if (!slotsByDate[slot.date]) {
            slotsByDate[slot.date] = [];
        }
        slotsByDate[slot.date].push(slot);
    });

    return (
        <div className="min-h-screen bg-gray-950 font-sans pb-20">
            {/* Header */}
            <div className="bg-gray-900 border-b border-white/5 p-6 sticky top-0 z-30 backdrop-blur-xl bg-gray-900/80">
                <div className="max-w-3xl mx-auto flex justify-between items-center text-white">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all">
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-xl font-black uppercase italic tracking-tighter leading-none">Agendar Entrevista</h1>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">{vacancyInfo?.posicion} • {vacancyInfo?.tiendaNombre}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-6 py-12">
                {/* Intro Card */}
                <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-[2.5rem] p-10 text-white mb-10 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                    <div className="relative z-10">
                        <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6">
                            <CalendarCheck size={32} />
                        </div>
                        <h2 className="text-4xl font-black uppercase italic tracking-tighter leading-none mb-4">Elige tu horario</h2>
                        <p className="text-violet-100 font-medium opacity-80 max-w-md">
                            Selecciona el momento que mejor te acomode para conversar sobre tu futuro en {vacancyInfo?.tiendaNombre}.
                        </p>
                    </div>
                </div>

                {/* Calendar Interface */}
                <div className="space-y-10">
                    {Object.entries(slotsByDate).map(([date, dateSlots], dateIdx) => (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: dateIdx * 0.1 }}
                            key={date}
                            className="bg-white/5 rounded-[2.5rem] p-8 border border-white/5 backdrop-blur-sm"
                        >
                            <h3 className="text-lg font-black text-white uppercase italic tracking-tight mb-6 flex items-center gap-3">
                                <span className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-xs not-italic">{date.split(',')[0].substring(0, 2)}</span>
                                {date}
                            </h3>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {dateSlots.map(slot => (
                                    <button
                                        key={slot.id}
                                        onClick={() => slot.available && setSelectedSlot(slot.id)}
                                        disabled={!slot.available}
                                        className={`
                                            group relative py-4 px-4 rounded-2xl border-2 transition-all text-center
                                            ${selectedSlot === slot.id
                                                ? 'bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-600/20'
                                                : slot.available
                                                    ? 'bg-white/5 border-white/5 text-gray-300 hover:border-violet-500/50 hover:bg-white/10'
                                                    : 'bg-transparent border-transparent text-gray-600 opacity-40 cursor-not-allowed'
                                            }
                                        `}
                                    >
                                        <div className="flex flex-col items-center">
                                            <span className="text-sm font-black tracking-widest uppercase">{slot.time}</span>
                                            {selectedSlot === slot.id && (
                                                <motion.div layoutId="check" className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center text-violet-600">
                                                    <CheckCircle2 size={12} />
                                                </motion.div>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Floating Bottom Action */}
                <AnimatePresence>
                    {selectedSlot && (
                        <motion.div
                            initial={{ opacity: 0, y: 100 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 100 }}
                            className="fixed bottom-8 left-0 w-full px-6 z-50"
                        >
                            <div className="max-w-lg mx-auto bg-white rounded-[2rem] p-6 shadow-2xl flex items-center gap-6 border border-gray-100">
                                <div className="flex-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Cita seleccionada</p>
                                    <p className="font-bold text-gray-900 leading-tight">
                                        {slots.find(s => s.id === selectedSlot)?.date.split(',')[0]} • {slots.find(s => s.id === selectedSlot)?.time}
                                    </p>
                                </div>
                                <button
                                    onClick={handleBook}
                                    disabled={booking}
                                    className="px-8 py-4 bg-gray-900 text-white rounded-2xl font-black uppercase italic tracking-widest hover:bg-violet-600 transition-all flex items-center gap-3 disabled:opacity-50"
                                >
                                    {booking ? (
                                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <>Confirmar <ChevronRight size={18} /></>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Legend */}
                <div className="mt-12 flex justify-center gap-8">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
                        <div className="w-2 h-2 rounded-full bg-violet-600"></div>
                        Seleccionado
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
                        <div className="w-2 h-2 rounded-full bg-white/10 border border-white/10"></div>
                        Disponible
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500 opacity-40">
                        <div className="w-2 h-2 rounded-full bg-transparent border border-dashed border-gray-600"></div>
                        Ocupado
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function AgendarPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="animate-spin w-12 h-12 border-4 border-violet-500/20 border-t-violet-500 rounded-full"></div>
            </div>
        }>
            <AgendarContent />
        </Suspense>
    );
}
