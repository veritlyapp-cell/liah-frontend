'use client';

import { useState } from 'react';
import type { DateRange } from '@/lib/analytics/recruitment-metrics';

interface DateRangeFilterProps {
    onChange: (range: DateRange) => void;
    defaultRange?: 'all' | '30' | '90' | '180';
}

export default function DateRangeFilter({ onChange, defaultRange = 'all' }: DateRangeFilterProps) {
    const [selectedRange, setSelectedRange] = useState(defaultRange);
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    function handlePresetChange(preset: string) {
        setSelectedRange(preset);

        const today = new Date();
        let range: DateRange = {};

        switch (preset) {
            case '30':
                range.startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
                range.endDate = today;
                break;
            case '90':
                range.startDate = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
                range.endDate = today;
                break;
            case '180':
                range.startDate = new Date(today.getTime() - 180 * 24 * 60 * 60 * 1000);
                range.endDate = today;
                break;
            case 'all':
            default:
                range = { endDate: today };
                break;
        }

        onChange(range);
    }

    function handleCustomApply() {
        if (customStart && customEnd) {
            onChange({
                startDate: new Date(customStart),
                endDate: new Date(customEnd)
            });
        }
    }

    return (
        <div className="bg-white rounded-lg shadow p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Filtrar por Período</h4>

            {/* Preset Buttons */}
            <div className="flex flex-wrap gap-2 mb-4">
                {[
                    { value: 'all', label: 'Todo el histórico' },
                    { value: '30', label: 'Últimos 30 días' },
                    { value: '90', label: 'Últimos 90 días' },
                    { value: '180', label: 'Últimos 6 meses' }
                ].map(preset => (
                    <button
                        key={preset.value}
                        onClick={() => handlePresetChange(preset.value)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedRange === preset.value
                                ? 'bg-violet-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        {preset.label}
                    </button>
                ))}
            </div>

            {/* Custom Date Range */}
            <div className="space-y-2">
                <p className="text-xs text-gray-600 font-medium">Rango personalizado:</p>
                <div className="flex gap-2 items-end">
                    <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-1">Desde</label>
                        <input
                            type="date"
                            value={customStart}
                            onChange={(e) => setCustomStart(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                    </div>
                    <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-1">Hasta</label>
                        <input
                            type="date"
                            value={customEnd}
                            onChange={(e) => setCustomEnd(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                    </div>
                    <button
                        onClick={handleCustomApply}
                        disabled={!customStart || !customEnd}
                        className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Aplicar
                    </button>
                </div>
            </div>
        </div>
    );
}
