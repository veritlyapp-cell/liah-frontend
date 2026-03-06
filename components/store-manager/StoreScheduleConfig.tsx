'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

interface StoreScheduleConfigProps {
    storeId: string;
}

export default function StoreScheduleConfig({ storeId }: StoreScheduleConfigProps) {
    const [availability, setAvailability] = useState<{ startHour: string, endHour: string, days: string[] }>({
        startHour: '09:00',
        endHour: '18:00',
        days: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes']
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        loadStoreSchedule();
    }, [storeId]);

    const loadStoreSchedule = async () => {
        setLoading(true);
        try {
            const docRef = doc(db, 'tiendas', storeId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.availability) {
                    setAvailability(data.availability);
                }
            }
        } catch (error) {
            console.error('Error loading store schedule:', error);
            setMessage({ type: 'error', text: 'Error al cargar horarios de la tienda.' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            const docRef = doc(db, 'tiendas', storeId);
            await updateDoc(docRef, {
                availability: availability
            });
            setMessage({ type: 'success', text: '✅ Horarios guardados correctamente.' });
            setTimeout(() => setMessage(null), 3000);
        } catch (error) {
            console.error('Error saving store schedule:', error);
            setMessage({ type: 'error', text: 'Error al guardar los horarios.' });
        } finally {
            setSaving(false);
        }
    };

    const toggleDay = (day: string) => {
        setAvailability(prev => ({
            ...prev,
            days: prev.days.includes(day)
                ? prev.days.filter(d => d !== day)
                : [...prev.days, day]
        }));
    };

    const DAYS_OF_WEEK = [
        { id: 'lunes', label: 'L' },
        { id: 'martes', label: 'M' },
        { id: 'miercoles', label: 'X' },
        { id: 'jueves', label: 'J' },
        { id: 'viernes', label: 'V' },
        { id: 'sabado', label: 'S' },
        { id: 'domingo', label: 'D' }
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-2xl bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">⏱️ Horario de Entrevistas</h3>
                <p className="text-sm text-gray-500">
                    Configura los días y el rango de horas en los que estarás disponible para entrevistar candidatos en esta tienda física. LIAH Bot utilizará esta información para agendar citas automáticamente.
                </p>
            </div>

            <div className="space-y-8 mt-6 border-t border-gray-100 pt-6">
                {/* Days Selector */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-4">Días Disponibles</label>
                    <div className="flex flex-wrap gap-3">
                        {DAYS_OF_WEEK.map(day => (
                            <button
                                key={day.id}
                                type="button"
                                onClick={() => toggleDay(day.id)}
                                className={`w-12 h-12 rounded-full font-bold transition-all flex items-center justify-center ${availability.days.includes(day.id)
                                        ? 'bg-violet-600 text-white shadow-md shadow-violet-200 scale-105'
                                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                    }`}
                            >
                                {day.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Hours Selector */}
                <div className="grid grid-cols-2 gap-6 pb-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Desde (Apertura citas)</label>
                        <input
                            type="time"
                            value={availability.startHour}
                            onChange={(e) => setAvailability(prev => ({ ...prev, startHour: e.target.value }))}
                            className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-4 focus:ring-violet-100 focus:border-violet-500 font-medium text-lg text-gray-900 shadow-sm transition-all outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Hasta (Última cita)</label>
                        <input
                            type="time"
                            value={availability.endHour}
                            onChange={(e) => setAvailability(prev => ({ ...prev, endHour: e.target.value }))}
                            className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-4 focus:ring-violet-100 focus:border-violet-500 font-medium text-lg text-gray-900 shadow-sm transition-all outline-none"
                        />
                    </div>
                </div>

                {message && (
                    <div className={`p-4 rounded-xl text-sm font-medium border ${message.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                        {message.text}
                    </div>
                )}

                <button
                    onClick={handleSave}
                    disabled={saving || availability.days.length === 0}
                    className="w-full px-6 py-4 bg-violet-600 text-white font-bold text-lg rounded-xl hover:bg-violet-700 transition-all shadow-lg hover:shadow-violet-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                    {saving ? (
                        <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            <span>Guardando...</span>
                        </>
                    ) : (
                        <span>💾 Guardar Horario Comercial</span>
                    )}
                </button>
            </div>
        </div>
    );
}
