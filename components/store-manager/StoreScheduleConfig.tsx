'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Plus, Trash2, Clock, CalendarDays, Settings2, Info } from 'lucide-react';

interface TimeRange {
    start: string;
    end: string;
}

interface DayConfig {
    enabled: boolean;
    ranges: TimeRange[];
}

interface AvailabilityConfig {
    daysConfig: Record<string, DayConfig>;
    slotInterval: number;
    // Legacy fields for backward compatibility
    startHour?: string;
    endHour?: string;
    days?: string[];
}

interface StoreScheduleConfigProps {
    storeId: string;
}

const DAYS_MAP: Record<string, string> = {
    'lunes': 'Lunes',
    'martes': 'Martes',
    'miercoles': 'Miércoles',
    'jueves': 'Jueves',
    'viernes': 'Viernes',
    'sabado': 'Sábado',
    'domingo': 'Domingo'
};

const ORDERED_DAYS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

export default function StoreScheduleConfig({ storeId }: StoreScheduleConfigProps) {
    const [config, setConfig] = useState<AvailabilityConfig>({
        daysConfig: ORDERED_DAYS.reduce((acc, day) => ({
            ...acc,
            [day]: { enabled: day !== 'domingo', ranges: [{ start: '09:00', end: '13:00' }, { start: '14:00', end: '18:00' }] }
        }), {}),
        slotInterval: 15
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
                    const avail = data.availability;

                    // Migrating old simple format to new complex format if needed
                    if (!avail.daysConfig && avail.days) {
                        const newDaysConfig: Record<string, DayConfig> = {};
                        ORDERED_DAYS.forEach(day => {
                            const isEnabled = avail.days.includes(day);
                            newDaysConfig[day] = {
                                enabled: isEnabled,
                                ranges: isEnabled ? [{ start: avail.startHour || '09:00', end: avail.endHour || '18:00' }] : []
                            };
                        });
                        setConfig({
                            daysConfig: newDaysConfig,
                            slotInterval: avail.slotInterval || 15
                        });
                    } else if (avail.daysConfig) {
                        setConfig(avail);
                    }
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
                availability: config
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
        setConfig(prev => {
            const current = prev.daysConfig[day];
            return {
                ...prev,
                daysConfig: {
                    ...prev.daysConfig,
                    [day]: {
                        ...current,
                        enabled: !current.enabled,
                        ranges: !current.enabled && current.ranges.length === 0
                            ? [{ start: '09:00', end: '13:00' }, { start: '14:00', end: '18:00' }]
                            : current.ranges
                    }
                }
            };
        });
    };

    const addRange = (day: string) => {
        setConfig(prev => {
            const dayConf = prev.daysConfig[day];
            const lastRange = dayConf.ranges[dayConf.ranges.length - 1];
            const newStart = lastRange ? lastRange.end : '09:00';
            const [h, m] = newStart.split(':').map(Number);
            const newEndHour = Math.min(h + 2, 22).toString().padStart(2, '0');

            return {
                ...prev,
                daysConfig: {
                    ...prev.daysConfig,
                    [day]: {
                        ...dayConf,
                        ranges: [...dayConf.ranges, { start: newStart, end: `${newEndHour}:${m.toString().padStart(2, '0')}` }]
                    }
                }
            };
        });
    };

    const removeRange = (day: string, index: number) => {
        setConfig(prev => ({
            ...prev,
            daysConfig: {
                ...prev.daysConfig,
                [day]: {
                    ...prev.daysConfig[day],
                    ranges: prev.daysConfig[day].ranges.filter((_, i) => i !== index)
                }
            }
        }));
    };

    const updateRange = (day: string, index: number, field: 'start' | 'end', value: string) => {
        setConfig(prev => {
            const newRanges = [...prev.daysConfig[day].ranges];
            newRanges[index] = { ...newRanges[index], [field]: value };
            return {
                ...prev,
                daysConfig: {
                    ...prev.daysConfig,
                    [day]: {
                        ...prev.daysConfig[day],
                        ranges: newRanges
                    }
                }
            };
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-3xl bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex items-start justify-between">
                <div>
                    <h3 className="text-2xl font-black text-gray-900 flex items-center gap-2 italic uppercase tracking-tight">
                        <Clock className="text-violet-600" /> Agenda de Entrevistas
                    </h3>
                    <p className="text-sm text-gray-500 mt-2 max-w-xl">
                        Configura los bloques horarios en los que estarás disponible para entrevistar.
                        Puedes tener varios turnos por día (ej. mañana y tarde).
                    </p>
                </div>
                <div className="bg-violet-50 p-2 rounded-2xl">
                    <Settings2 className="text-violet-600 w-6 h-6" />
                </div>
            </div>

            <div className="space-y-6 mt-8">
                {/* Interval Selection */}
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-2 mb-4">
                        <Info size={16} className="text-violet-600" />
                        <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">Frecuencia de las citas</label>
                    </div>
                    <div className="flex gap-3">
                        {[15, 30, 45, 60].map(min => (
                            <button key={min} type="button"
                                onClick={() => setConfig(prev => ({ ...prev, slotInterval: min }))}
                                className={`flex-1 py-3 rounded-xl font-black text-sm transition-all border-2 ${config.slotInterval === min
                                    ? 'bg-violet-600 border-violet-600 text-white shadow-lg shadow-violet-200'
                                    : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200 hover:text-gray-600'}`}
                            >
                                {min} MIN
                            </button>
                        ))}
                    </div>
                </div>

                {/* Days Config Loop */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <CalendarDays size={18} className="text-violet-600" />
                        <h4 className="text-sm font-bold text-gray-700 uppercase tracking-widest">Disponibilidad por día</h4>
                    </div>

                    {ORDERED_DAYS.map(dayId => {
                        const dayConfig = config.daysConfig[dayId];
                        const isEnabled = dayConfig.enabled;

                        return (
                            <div key={dayId}
                                className={`rounded-2xl border transition-all ${isEnabled ? 'bg-white border-violet-200 shadow-sm ring-1 ring-violet-50' : 'bg-gray-50/50 border-gray-100'}`}
                            >
                                <div className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => toggleDay(dayId)}
                                            className={`w-12 h-6 rounded-full relative transition-colors ${isEnabled ? 'bg-violet-600' : 'bg-gray-300'}`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isEnabled ? 'left-7' : 'left-1'}`} />
                                        </button>
                                        <span className={`font-black uppercase italic tracking-tighter text-lg ${isEnabled ? 'text-gray-900' : 'text-gray-400'}`}>
                                            {DAYS_MAP[dayId]}
                                        </span>
                                    </div>

                                    {isEnabled && (
                                        <button
                                            onClick={() => addRange(dayId)}
                                            className="text-xs font-bold text-violet-600 flex items-center gap-1 hover:bg-violet-50 px-3 py-1.5 rounded-lg transition-colors border border-dashed border-violet-200"
                                        >
                                            <Plus size={14} /> AGREGAR TURNO
                                        </button>
                                    )}
                                </div>

                                {isEnabled && (
                                    <div className="px-4 pb-4 space-y-3">
                                        {dayConfig.ranges.length === 0 && (
                                            <p className="text-xs text-amber-600 font-medium px-1">⚠️ No hay rangos definidos. Agrega uno para que los candidatos puedan agendar.</p>
                                        )}
                                        {dayConfig.ranges.map((range, idx) => (
                                            <div key={idx} className="flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                                <div className="flex-1 grid grid-cols-2 gap-2">
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 uppercase">DE</span>
                                                        <input
                                                            type="time" value={range.start}
                                                            onChange={(e) => updateRange(dayId, idx, 'start', e.target.value)}
                                                            className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-200 focus:border-violet-500 text-sm font-bold outline-none"
                                                        />
                                                    </div>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 uppercase">A</span>
                                                        <input
                                                            type="time" value={range.end}
                                                            onChange={(e) => updateRange(dayId, idx, 'end', e.target.value)}
                                                            className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-200 focus:border-violet-500 text-sm font-bold outline-none"
                                                        />
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => removeRange(dayId, idx)}
                                                    className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {message && (
                    <div className={`p-4 rounded-2xl text-sm font-bold border animate-in zoom-in-95 ${message.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                        {message.text}
                    </div>
                )}

                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full px-6 py-5 bg-gray-900 text-white font-black text-lg rounded-2xl hover:bg-black transition-all shadow-xl hover:shadow-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 active:scale-[0.98]"
                >
                    {saving ? (
                        <>
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div>
                            <span>GUARDANDO HORARIOS...</span>
                        </>
                    ) : (
                        <span>💾 GUARDAR CONFIGURACIÓN DISPONIBILIDAD</span>
                    )}
                </button>
            </div>
        </div>
    );
}
