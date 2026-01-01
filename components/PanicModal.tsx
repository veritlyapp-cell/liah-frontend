import { useState } from 'react';

interface PanicModalProps {
    show: boolean;
    onCancel: () => void;
    onConfirm: (scope: 'all_day' | 'time_range', timeFrom?: string, timeTo?: string) => void;
}

export default function PanicModal({ show, onCancel, onConfirm }: PanicModalProps) {
    const [scope, setScope] = useState<'all_day' | 'time_range'>('all_day');
    const [timeFrom, setTimeFrom] = useState('09:00');
    const [timeTo, setTimeTo] = useState('18:00');

    if (!show) return null;

    const handleConfirm = () => {
        if (scope === 'time_range') {
            onConfirm(scope, timeFrom, timeTo);
        } else {
            onConfirm(scope);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full animate-slide-up">
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                        <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">
                            🚨 Cancelación de Emergencia
                        </h3>
                        <p className="text-sm text-gray-600">
                            Reprogramar entrevistas
                        </p>
                    </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
                    <p className="text-sm text-amber-900">
                        ⚠️ Los candidatos afectados serán marcados para reprogramación automática.
                    </p>
                </div>

                {/* Opciones */}
                <div className="space-y-3 mb-6">
                    <label className="flex items-start gap-3 p-4 rounded-lg border-2 border-gray-200 cursor-pointer transition-all hover:bg-gray-50 hover:border-red-300">
                        <input
                            type="radio"
                            name="scope"
                            value="all_day"
                            checked={scope === 'all_day'}
                            onChange={() => setScope('all_day')}
                            className="mt-0.5 w-4 h-4 text-red-600"
                        />
                        <div className="flex-1">
                            <div className="font-medium text-gray-900 mb-1">
                                📅 Todo el Día
                            </div>
                            <p className="text-sm text-gray-600">
                                Cancelar y reprogramar todas las entrevistas del día
                            </p>
                        </div>
                    </label>

                    <label className="flex items-start gap-3 p-4 rounded-lg border-2 border-gray-200 cursor-pointer transition-all hover:bg-gray-50 hover:border-red-300">
                        <input
                            type="radio"
                            name="scope"
                            value="time_range"
                            checked={scope === 'time_range'}
                            onChange={() => setScope('time_range')}
                            className="mt-0.5 w-4 h-4 text-red-600"
                        />
                        <div className="flex-1">
                            <div className="font-medium text-gray-900 mb-1">
                                ⏰ Rango de Horas
                            </div>
                            <p className="text-sm text-gray-600 mb-3">
                                Cancelar solo un rango específico de horas
                            </p>

                            {scope === 'time_range' && (
                                <div className="flex items-center gap-3">
                                    <div className="flex-1">
                                        <label className="block text-xs text-gray-600 mb-1">Desde</label>
                                        <input
                                            type="time"
                                            value={timeFrom}
                                            onChange={(e) => setTimeFrom(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                        />
                                    </div>
                                    <div className="pt-5 text-gray-400">→</div>
                                    <div className="flex-1">
                                        <label className="block text-xs text-gray-600 mb-1">Hasta</label>
                                        <input
                                            type="time"
                                            value={timeTo}
                                            onChange={(e) => setTimeTo(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </label>
                </div>

                {/* Botones */}
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Confirmar Reprogramación
                    </button>
                </div>
            </div>
        </div>
    );
}
