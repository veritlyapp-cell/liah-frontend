'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
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
    AlertCircle,
    ChevronLeft,
    CalendarDays
} from 'lucide-react';

interface TimeSlot {
    id: string; // "YYYY-MM-DD-HH:mm"
    date: string; // Display date "Lunes, 15 Mar"
    time: string; // "09:00"
    available: boolean;
}

function AgendarContent() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [loading, setLoading] = useState(true);
    const [booking, setBooking] = useState(false);
    const [slots, setSlots] = useState<TimeSlot[]>([]);
    const [bookedSlots, setBookedSlots] = useState<string[]>([]);
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [vacancyInfo, setVacancyInfo] = useState<{ posicion: string; tiendaNombre: string; tiendaDistrito: string; storeAddress?: string } | null>(null);

    const [booked, setBooked] = useState(false);
    const [bookedSlot, setBookedSlot] = useState<TimeSlot | null>(null);
    const [managerAvailability, setManagerAvailability] = useState<any>(null);
    const [brandColor, setBrandColor] = useState<string | null>(null);
    const [brandName, setBrandName] = useState<string | null>(null);
    const [brandLogo, setBrandLogo] = useState<string | null>(null);

    const holdingSlug = searchParams.get('holding');
    const accent = brandColor || '#4F46E5';

    useEffect(() => {
        async function loadData() {
            const token = searchParams.get('token');
            const rqId = params.rqId as string;

            if (!token) {
                router.push('/portal');
                return;
            }

            // Load brand config
            if (holdingSlug) {
                try {
                    const { db } = await import('@/lib/firebase');
                    const { collection, query, where, getDocs } = await import('firebase/firestore');
                    const q = query(collection(db, 'holdings'), where('slug', '==', holdingSlug.toLowerCase()));
                    const snap = await getDocs(q);
                    if (!snap.empty) {
                        const hData = snap.docs[0].data();
                        const b = hData.config?.branding || hData.branding || {};
                        if (b?.primaryColor) setBrandColor(b.primaryColor);
                        if (hData.nombre) setBrandName(hData.nombre);
                        if (hData.logoUrl) setBrandLogo(hData.logoUrl);
                    }
                    
                    // NGR Orange Fallback
                    if (holdingSlug.toLowerCase() === 'ngr' || (brandName && brandName.toLowerCase() === 'ngr')) {
                        if (!brandColor || brandColor === '#4F46E5') {
                            setBrandColor('#FF6B35');
                        }
                    }
                } catch (e) { console.warn('Brand load error:', e); }
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
                        tiendaDistrito: v.tiendaDistrito,
                        storeAddress: v.storeAddress || ''
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
                                if (availData.bookedSlots) {
                                    setBookedSlots(availData.bookedSlots);
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
    }, [params.rqId, searchParams, router, holdingSlug]);

    // Re-generate slots when managerAvailability changes
    useEffect(() => {
        if (!loading && managerAvailability) {
            const generatedSlots = generateTimeSlots(managerAvailability, bookedSlots);
            setSlots(generatedSlots);

            // Set initial selected date
            if (generatedSlots.length > 0) {
                const firstAvailable = generatedSlots.find(s => s.available);
                if (firstAvailable) {
                    setSelectedDate(firstAvailable.id.substring(0, 10));
                } else {
                    setSelectedDate(generatedSlots[0].id.substring(0, 10));
                }
            }
        } else if (!loading && !managerAvailability) {
            // Default availability if none found
            const defaultAvail = {
                daysConfig: {
                    lunes: { enabled: true, ranges: [{ start: '09:00', end: '13:00' }, { start: '15:00', end: '18:00' }] },
                    martes: { enabled: true, ranges: [{ start: '09:00', end: '13:00' }, { start: '15:00', end: '18:00' }] },
                    miercoles: { enabled: true, ranges: [{ start: '09:00', end: '13:00' }, { start: '15:00', end: '18:00' }] },
                    jueves: { enabled: true, ranges: [{ start: '09:00', end: '13:00' }, { start: '15:00', end: '18:00' }] },
                    viernes: { enabled: true, ranges: [{ start: '09:00', end: '13:00' }, { start: '15:00', end: '18:00' }] },
                },
                slotInterval: 30
            };
            const generatedSlots = generateTimeSlots(defaultAvail, bookedSlots);
            setSlots(generatedSlots);
            if (generatedSlots.length > 0) {
                const firstAvailable = generatedSlots.find(s => s.available);
                setSelectedDate(firstAvailable ? firstAvailable.id.substring(0, 10) : generatedSlots[0].id.substring(0, 10));
            }
        }
    }, [loading, managerAvailability, bookedSlots]);

    function generateTimeSlots(avail: any, booked: string[] = []): TimeSlot[] {
        const slots: TimeSlot[] = [];
        const today = new Date();
        const intervalMin = avail?.slotInterval || 15;
        const dayNames = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

        const hasNewFormat = !!avail.daysConfig;

        for (let dayOffset = 1; dayOffset <= 14; dayOffset++) {
            const date = new Date(today);
            date.setDate(today.getDate() + dayOffset);
            const dayIdx = date.getDay();
            const dayName = dayNames[dayIdx];

            const dateStr = date.toLocaleDateString('es-PE', {
                weekday: 'long', day: 'numeric', month: 'short'
            });
            const isoDate = date.toISOString().split('T')[0];

            if (hasNewFormat) {
                const dayConf = avail.daysConfig[dayName];
                if (!dayConf || !dayConf.enabled) continue;

                dayConf.ranges.forEach((range: any) => {
                    const [startH, startM] = range.start.split(':').map(Number);
                    const [endH, endM] = range.end.split(':').map(Number);

                    let totalMinutes = startH * 60 + startM;
                    const endTotalMinutes = endH * 60 + endM;

                    while (totalMinutes < endTotalMinutes) {
                        const hour = Math.floor(totalMinutes / 60);
                        const min = totalMinutes % 60;
                        const timeStr = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
                        const slotId = `${isoDate}-${timeStr}`;

                        slots.push({
                            id: slotId,
                            date: dateStr,
                            time: timeStr,
                            available: !booked.includes(slotId)
                        });
                        totalMinutes += intervalMin;
                    }
                });
            } else {
                // Fallback to old format
                const allowedDays = avail.days || ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];
                if (!allowedDays.includes(dayName)) continue;

                const startH = parseInt(avail.startHour?.split(':')[0] || '9');
                const endH = parseInt(avail.endHour?.split(':')[0] || '18');

                let totalMinutes = startH * 60;
                const endTotalMinutes = endH * 60;

                while (totalMinutes < endTotalMinutes) {
                    const hour = Math.floor(totalMinutes / 60);
                    const min = totalMinutes % 60;
                    const timeStr = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
                    const slotId = `${isoDate}-${timeStr}`;

                    slots.push({
                        id: slotId,
                        date: dateStr,
                        time: timeStr,
                        available: !booked.includes(slotId)
                    });
                    totalMinutes += intervalMin;
                }
            }
        }
        return slots;
    }

    // Unique dates for the ribbon
    const availableDates = useMemo(() => {
        const datesMap: Record<string, { iso: string, label: string, day: string }> = {};
        slots.forEach(s => {
            const iso = s.id.substring(0, 10);
            if (!datesMap[iso]) {
                const [weekday, daynum, month] = s.date.split(' ');
                datesMap[iso] = {
                    iso,
                    label: `${daynum} ${month}`,
                    day: weekday.replace(',', '').substring(0, 3).toUpperCase()
                };
            }
        });
        return Object.values(datesMap).sort((a, b) => a.iso.localeCompare(b.iso));
    }, [slots]);

    const filteredSlots = useMemo(() => {
        if (!selectedDate) return [];
        return slots.filter(s => s.id.startsWith(selectedDate));
    }, [slots, selectedDate]);

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

            if (!response.ok) throw new Error('Error al agendar');
            setBookedSlot(slot);
            setBooked(true);
        } catch (error) {
            console.error('Error booking:', error);
            alert('Error al agendar. Intenta con otro horario.');
        } finally {
            setBooking(false);
        }
    }

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: accent }}>
            <div className="text-center text-white">
                <div className="animate-spin w-12 h-12 border-4 border-white/20 border-t-white rounded-full mx-auto mb-4" />
                <p className="font-bold tracking-widest uppercase italic text-sm">Cargando agenda...</p>
            </div>
        </div>
    );

    if (booked && bookedSlot) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center p-4">
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-[3rem] p-8 max-w-lg w-full text-center shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border border-gray-100 relative">
                    <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 text-white shadow-lg" style={{ backgroundColor: accent }}>
                        <CheckCircle2 size={48} />
                    </div>
                    <h2 className="text-4xl font-black text-gray-900 mb-2 tracking-tighter uppercase italic leading-none">¡Cita agendada!</h2>
                    <p className="text-gray-500 mb-8 text-sm px-4">Te hemos enviado un correo con todos los detalles de tu entrevista en <strong>{vacancyInfo?.tiendaNombre}</strong>.</p>

                    <div className="bg-gray-50 rounded-3xl p-6 text-left border border-gray-100 mb-8 space-y-4">
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 text-white shadow-sm" style={{ backgroundColor: accent }}>
                                <MapPin size={18} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Tienda y Dirección</p>
                                <p className="font-bold text-gray-900">{vacancyInfo?.tiendaNombre}</p>
                                <p className="text-gray-500 text-xs leading-tight mt-0.5">{vacancyInfo?.storeAddress}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200/50">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: accent }}>
                                    <CalendarIcon size={18} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Fecha</p>
                                    <p className="font-bold text-gray-900 capitalize">{bookedSlot.date.split(',')[0]}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: accent }}>
                                    <Clock size={18} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Hora</p>
                                    <p className="font-bold text-gray-900">{bookedSlot.time}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button onClick={() => {
                        if (holdingSlug) {
                            router.push(`/empleos/${holdingSlug}`);
                        } else {
                            router.push(`/portal/vacantes`);
                        }
                    }}
                        className="w-full py-5 text-white rounded-2xl font-black uppercase italic text-lg tracking-wider hover:brightness-110 transition-all shadow-xl active:scale-[0.98]"
                        style={{ backgroundColor: accent }}>
                        Volver al Portal
                    </button>
                    <p className="text-gray-400 text-[10px] mt-4 uppercase font-bold tracking-widest">Recuerda asistir 10 minutos antes con tu DNI</p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] font-sans pb-32">
            {/* Top Navigation */}
            <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-6 py-4">
                <div className="max-w-2xl mx-auto flex items-center justify-between">
                    <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 hover:text-gray-900 transition-colors font-bold uppercase text-[10px] tracking-widest">
                        <ChevronLeft size={16} /> Volver
                    </button>
                    <div className="text-center">
                        <h1 className="text-sm font-black uppercase italic tracking-tighter text-gray-900">Agendar Entrevista</h1>
                    </div>
                    {brandLogo ? <img src={brandLogo} alt="Logo" className="h-6 object-contain" /> : <div className="w-6" />}
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-5 py-8">
                {/* Header Info */}
                <div className="mb-8">
                    <div className="inline-flex px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest mb-3"
                        style={{ backgroundColor: `${accent}15`, color: accent }}>
                        {vacancyInfo?.posicion}
                    </div>
                    <h2 className="text-4xl font-black text-gray-900 uppercase italic tracking-tighter leading-none mb-2">Selecciona tu horario</h2>
                    <p className="text-gray-500 text-sm font-medium">Te esperamos en <strong>{vacancyInfo?.tiendaNombre}</strong>. Elige el día y la hora que prefieras.</p>
                </div>

                {/* Date Filter Ribbon */}
                <div className="mb-8">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2">
                        <CalendarIcon size={12} /> Selecciona un día
                    </h3>
                    <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar -mx-5 px-5">
                        {availableDates.map((d) => (
                            <button key={d.iso} onClick={() => setSelectedDate(d.iso)}
                                className={`flex-shrink-0 w-20 h-24 rounded-3xl flex flex-col items-center justify-center transition-all border-2 ${selectedDate === d.iso
                                    ? 'bg-white border-transparent shadow-xl'
                                    : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'}`}
                                style={selectedDate === d.iso ? { ringColor: `${accent}20`, ringWidth: '2px' } : {}}>
                                <span className="text-[10px] font-black tracking-widest uppercase mb-1"
                                    style={selectedDate === d.iso ? { color: accent } : {}}>{d.day}</span>
                                <span className={`text-xl font-black leading-none ${selectedDate === d.iso ? 'text-gray-900' : 'text-gray-400'}`}>{d.label.split(' ')[0]}</span>
                                <span className={`text-[10px] font-bold uppercase tracking-tighter mt-1 ${selectedDate === d.iso ? 'text-gray-400' : 'text-gray-300'}`}>{d.label.split(' ')[1]}</span>
                                {selectedDate === d.iso && (
                                    <div className="w-1.5 h-1.5 rounded-full mt-2" style={{ backgroundColor: accent }} />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Time Slots Grid */}
                <div>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                        <Clock size={12} /> Horarios disponibles
                    </h3>

                    {filteredSlots.length === 0 ? (
                        <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-200">
                            <CalendarDays size={48} className="mx-auto text-gray-200 mb-4" />
                            <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">No hay horarios este día</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {filteredSlots.map(slot => (
                                <button
                                    key={slot.id}
                                    onClick={() => slot.available && setSelectedSlot(slot.id)}
                                    disabled={!slot.available}
                                    className={`py-6 px-4 rounded-[2rem] border-2 transition-all text-center relative overflow-hidden active:scale-[0.98] ${selectedSlot === slot.id
                                        ? 'bg-white shadow-xl shadow-gray-100'
                                        : !slot.available
                                            ? 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed opacity-60'
                                            : 'bg-white border-gray-100 hover:border-gray-200 text-gray-400 hover:text-gray-600'
                                        }`}
                                    style={selectedSlot === slot.id ? { borderColor: accent, ringColor: `${accent}10`, ringWidth: '4px' } : {}}
                                >
                                >
                                    <span className={`text-xl font-black uppercase italic tracking-tight ${selectedSlot === slot.id ? 'text-gray-900' : ''}`}>
                                        {slot.time}
                                    </span>
                                    {!slot.available && (
                                        <div className="text-[8px] font-black uppercase tracking-widest mt-1 text-gray-400">
                                            Ocupado
                                        </div>
                                    )}
                                    {selectedSlot === slot.id && slot.available && (
                                        <div className="absolute top-2 right-4">
                                            <CheckCircle2 size={16} style={{ color: accent }} />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Confirm CTA Floating */}
            <AnimatePresence>
                {selectedSlot && (
                    <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }}
                        className="fixed bottom-8 left-0 w-full px-5 z-50">
                        <div className="max-w-lg mx-auto bg-white rounded-[2.5rem] p-6 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] flex flex-col gap-4 border border-gray-100">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Entrevista confirmada para:</p>
                                    <h4 className="text-xl font-black text-gray-900 uppercase italic tracking-tight leading-none">
                                        {slots.find(s => s.id === selectedSlot)?.date.split(',')[0]} • {slots.find(s => s.id === selectedSlot)?.time}
                                    </h4>
                                    <p className="text-gray-500 text-xs mt-1">📍 {vacancyInfo?.tiendaNombre}</p>
                                </div>
                                <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400">
                                    <CalendarCheck size={24} />
                                </div>
                            </div>
                            <button onClick={handleBook} disabled={booking}
                                className="w-full py-5 text-white rounded-[1.5rem] font-black uppercase italic tracking-wider text-lg flex items-center justify-center gap-3 shadow-lg hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
                                style={{ backgroundColor: accent }}>
                                {booking ? <Loader2 className="animate-spin" size={24} /> : <>Confirmar Cita <ArrowLeft className="rotate-180" size={24} /></>}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            
            <p className="text-center text-gray-300 text-[10px] font-black uppercase tracking-[0.3em] mt-12 pb-8">
                POWERED BY <span className="text-gray-400">LIAH</span> DESIGN BY <span className="text-gray-400">RELIÉ LABS</span>
            </p>
        </div>
    );
}

function Loader2({ className, size }: { className?: string, size?: number }) {
    return <div className={`animate-spin rounded-full border-4 border-white/20 border-t-white ${className}`} style={{ width: size, height: size }} />;
}

export default function AgendarPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="animate-spin w-12 h-12 border-4 border-gray-100 rounded-full" style={{ borderTopColor: accent }} />
            </div>
        }>
            <AgendarContent />
        </Suspense>
    );
}
