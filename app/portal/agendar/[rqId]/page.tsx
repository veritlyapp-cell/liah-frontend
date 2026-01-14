'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

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
    const [vacancyInfo, setVacancyInfo] = useState<{ posicion: string; tiendaNombre: string } | null>(null);
    const [booked, setBooked] = useState(false);
    const [bookedSlot, setBookedSlot] = useState<TimeSlot | null>(null);

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
                    setVacancyInfo({
                        posicion: vacancyData.vacancy.posicion,
                        tiendaNombre: vacancyData.vacancy.tiendaNombre
                    });
                }

                // Generate available slots for next 7 days
                const generatedSlots = generateTimeSlots();
                setSlots(generatedSlots);

            } catch (error) {
                console.error('Error loading data:', error);
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, [params.rqId, searchParams, router]);

    // Generate time slots for the next 7 days (9am - 6pm)
    function generateTimeSlots(): TimeSlot[] {
        const slots: TimeSlot[] = [];
        const today = new Date();

        for (let day = 1; day <= 7; day++) {
            const date = new Date(today);
            date.setDate(today.getDate() + day);

            // Skip weekends
            if (date.getDay() === 0 || date.getDay() === 6) continue;

            const dateStr = date.toLocaleDateString('es-PE', {
                weekday: 'long',
                day: 'numeric',
                month: 'short'
            });

            // Generate slots from 9am to 5pm
            for (let hour = 9; hour <= 17; hour++) {
                const timeStr = `${hour.toString().padStart(2, '0')}:00`;
                slots.push({
                    id: `${date.toISOString().split('T')[0]}-${timeStr}`,
                    date: dateStr,
                    time: timeStr,
                    available: Math.random() > 0.3 // Simulate some slots being taken
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
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin w-12 h-12 border-4 border-violet-200 border-t-violet-600 rounded-full"></div>
            </div>
        );
    }

    if (booked && bookedSlot) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <span className="text-5xl">📅</span>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        ¡Entrevista Agendada!
                    </h2>
                    <p className="text-gray-600 mb-6">
                        Te esperamos para tu entrevista
                    </p>

                    <div className="bg-green-50 rounded-xl p-4 mb-6 text-left">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-xl">📋</span>
                            <span className="font-medium text-gray-900">{vacancyInfo?.posicion}</span>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-xl">🏪</span>
                            <span className="text-gray-600">{vacancyInfo?.tiendaNombre}</span>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-xl">📆</span>
                            <span className="text-gray-600 capitalize">{bookedSlot.date}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xl">🕐</span>
                            <span className="text-gray-600">{bookedSlot.time} hrs</span>
                        </div>
                    </div>

                    <p className="text-gray-500 text-sm mb-6">
                        Te hemos enviado un correo con los detalles de tu cita.
                    </p>

                    <button
                        onClick={() => router.push(`/portal/vacantes?token=${searchParams.get('token')}`)}
                        className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                    >
                        Ver más vacantes
                    </button>
                </div>
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
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-violet-600 to-cyan-500 text-white">
                <div className="max-w-2xl mx-auto px-4 py-6">
                    <h1 className="text-2xl font-bold">Agenda tu Entrevista</h1>
                    <p className="text-white/80">{vacancyInfo?.posicion} • {vacancyInfo?.tiendaNombre}</p>
                </div>
            </div>

            {/* Calendar */}
            <div className="max-w-2xl mx-auto px-4 py-6">
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                        Selecciona un horario disponible
                    </h2>

                    <div className="space-y-6">
                        {Object.entries(slotsByDate).map(([date, dateSlots]) => (
                            <div key={date}>
                                <h3 className="font-medium text-gray-700 capitalize mb-3">{date}</h3>
                                <div className="grid grid-cols-4 gap-2">
                                    {dateSlots.map(slot => (
                                        <button
                                            key={slot.id}
                                            onClick={() => slot.available && setSelectedSlot(slot.id)}
                                            disabled={!slot.available}
                                            className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${selectedSlot === slot.id
                                                ? 'bg-violet-600 text-white'
                                                : slot.available
                                                    ? 'bg-gray-100 text-gray-700 hover:bg-violet-100 hover:text-violet-700'
                                                    : 'bg-gray-50 text-gray-300 cursor-not-allowed line-through'
                                                }`}
                                        >
                                            {slot.time}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Confirm Button */}
                    <div className="mt-6 pt-6 border-t border-gray-100">
                        <button
                            onClick={handleBook}
                            disabled={!selectedSlot || booking}
                            className="w-full py-4 bg-gradient-to-r from-violet-600 to-cyan-500 text-white font-bold rounded-xl hover:from-violet-700 hover:to-cyan-600 transition-all disabled:opacity-50"
                        >
                            {booking ? 'Agendando...' : selectedSlot ? 'Confirmar Horario' : 'Selecciona un horario'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function AgendarPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin w-12 h-12 border-4 border-violet-200 border-t-violet-600 rounded-full"></div>
            </div>
        }>
            <AgendarContent />
        </Suspense>
    );
}
