'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface Slot {
    date: string;
    times: string[];
}

interface RequestData {
    candidateName: string;
    jobTitle: string;
    interviewerName: string;
}

export default function BookingPage() {
    const { requestId } = useParams();
    const [loading, setLoading] = useState(true);
    const [slots, setSlots] = useState<Slot[]>([]);
    const [request, setRequest] = useState<RequestData | null>(null);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [booking, setBooking] = useState(false);
    const [booked, setBooked] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (requestId) {
            loadAvailability();
        }
    }, [requestId]);

    async function loadAvailability() {
        try {
            const response = await fetch('/api/talent/calendar/get-availability', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId })
            });

            const data = await response.json();
            if (data.success) {
                setSlots(data.slots);
                setRequest(data.request);
                if (data.slots.length > 0) {
                    setSelectedDate(data.slots[0].date);
                }
            } else {
                setError(data.error || 'No se pudo cargar la disponibilidad');
            }
        } catch (err) {
            setError('Error de conexión');
        } finally {
            setLoading(false);
        }
    }

    async function handleBook() {
        if (!selectedTime || !requestId) return;

        setBooking(true);
        try {
            const response = await fetch('/api/talent/calendar/book-slot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requestId,
                    startTime: selectedTime,
                    duration: 60 // Default 60 mins
                })
            });

            const data = await response.json();
            if (data.success) {
                setBooked(true);
            } else {
                alert(data.error || 'Error al agendar');
            }
        } catch (err) {
            alert('Error de conexión');
        } finally {
            setBooking(false);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
                    <div className="text-5xl mb-4">⚠️</div>
                    <h1 className="text-xl font-bold text-gray-900 mb-2">Enlace no válido o expirado</h1>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full py-3 bg-violet-600 text-white rounded-xl font-bold"
                    >
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }

    if (booked) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center animate-in zoom-in duration-300">
                    <div className="text-6xl mb-4">🎉</div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">¡Entrevista Agendada!</h1>
                    <p className="text-gray-600 mb-6">
                        Hola <strong>{request?.candidateName}</strong>, tu entrevista para <strong>{request?.jobTitle}</strong> ha sido confirmada.
                        Recibirás un correo con el link de la reunión y la invitación a tu calendario.
                    </p>
                    <div className="bg-violet-50 p-4 rounded-xl text-left border border-violet-100">
                        <p className="text-sm text-violet-800">
                            <strong>Interesante:</strong> Asegúrate de estar en un lugar tranquilo y con buena conexión a internet.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    const currentDaySlots = slots.find(s => s.date === selectedDate);

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Brand Logo Placeholder */}
                <div className="text-center mb-8">
                    <div className="inline-block p-3 bg-white rounded-2xl shadow-sm mb-4">
                        <span className="text-3xl font-bold text-violet-600">Liah</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Agenda tu Entrevista</h1>
                    <p className="text-gray-600">Para el puesto de <span className="text-violet-600 font-semibold">{request?.jobTitle}</span></p>
                </div>

                <div className="bg-white rounded-3xl shadow-xl overflow-hidden grid md:grid-cols-3">
                    {/* Left: Info & Calendar Navigation */}
                    <div className="p-8 border-r border-gray-100 bg-gray-50/50">
                        <div className="mb-8">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Entrevistador</p>
                            <p className="text-lg font-bold text-gray-900">{request?.interviewerName}</p>
                            <p className="text-sm text-gray-500">60 minutos • Videollamada</p>
                        </div>

                        <div className="space-y-4">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Selecciona Día</p>
                            <div className="space-y-2">
                                {slots.map((s) => {
                                    const dateObj = new Date(s.date);
                                    const isSelected = selectedDate === s.date;
                                    return (
                                        <button
                                            key={s.date}
                                            onClick={() => {
                                                setSelectedDate(s.date);
                                                setSelectedTime(null);
                                            }}
                                            className={`w-full p-4 rounded-xl border-2 transition-all text-left flex justify-between items-center ${isSelected
                                                    ? 'bg-violet-600 border-violet-600 text-white shadow-lg shadow-violet-200'
                                                    : 'bg-white border-transparent hover:border-violet-200 text-gray-700'
                                                }`}
                                        >
                                            <div>
                                                <p className={`text-xs ${isSelected ? 'text-violet-100' : 'text-gray-400'}`}>
                                                    {dateObj.toLocaleDateString('es-ES', { weekday: 'long' })}
                                                </p>
                                                <p className="font-bold">
                                                    {dateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                                </p>
                                            </div>
                                            {isSelected && <span>👉</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Middle: Time Selection */}
                    <div className="md:col-span-2 p-8">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Selecciona Hora (GMT-5)</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {currentDaySlots?.times.map((t) => {
                                const timeStr = new Date(t).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                                const isSelected = selectedTime === t;
                                return (
                                    <button
                                        key={t}
                                        onClick={() => setSelectedTime(t)}
                                        className={`p-3 rounded-xl border-2 transition-all text-center font-bold ${isSelected
                                                ? 'bg-violet-100 border-violet-600 text-violet-700'
                                                : 'bg-white border-gray-100 hover:border-violet-300 text-gray-600'
                                            }`}
                                    >
                                        {timeStr}
                                    </button>
                                );
                            })}
                        </div>

                        {selectedTime && (
                            <div className="mt-12 p-6 bg-violet-600 rounded-2xl text-white animate-in slide-in-from-bottom-4">
                                <p className="text-violet-100 text-sm mb-1">Has seleccionado:</p>
                                <p className="text-xl font-bold mb-6">
                                    {new Date(selectedTime).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })} a las {new Date(selectedTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                                <button
                                    onClick={handleBook}
                                    disabled={booking}
                                    className="w-full py-4 bg-white text-violet-600 rounded-xl font-bold text-lg shadow-xl hover:bg-violet-50 transition-colors disabled:opacity-50"
                                >
                                    {booking ? '⏳ Procesando...' : 'Confirmar Entrevista'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <p className="text-center text-gray-400 text-xs mt-8">
                    Desarrollado por <strong>Liah Talent</strong>
                </p>
            </div>
        </div>
    );
}
