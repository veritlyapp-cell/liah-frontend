'use client';

import { useState } from 'react';

interface FiltersBarProps {
    brands: { id: string; name: string }[];
    positions: { id: string; name: string }[];
    stores: { id: string; name: string }[];
    districts: { id: string; name: string }[];
    onFilterChange: (filters: FilterValues) => void;
    // For role-based filtering
    userRole?: string;
    userBrandIds?: string[];
}

export interface FilterValues {
    dateRange: 'week' | 'month' | 'quarter' | 'year' | 'custom';
    customStartDate?: string;
    customEndDate?: string;
    brandIds: string[];
    positionIds: string[];
    storeIds: string[];
    districtIds: string[];
}

export default function FiltersBar({
    brands,
    positions,
    stores,
    districts,
    onFilterChange,
    userRole,
    userBrandIds = []
}: FiltersBarProps) {
    const [filters, setFilters] = useState<FilterValues>({
        dateRange: 'month',
        customStartDate: '',
        customEndDate: '',
        brandIds: [],
        positionIds: [],
        storeIds: [],
        districtIds: []
    });

    const [showAdvanced, setShowAdvanced] = useState(false);
    const [showCustomDate, setShowCustomDate] = useState(false);

    // Filter brands based on user role
    const isRecruiter = userRole === 'recruiter' || userRole === 'brand_recruiter';
    const availableBrands = isRecruiter && userBrandIds.length > 0
        ? brands.filter(b => userBrandIds.includes(b.id))
        : brands;

    const handleChange = (key: keyof FilterValues, value: string | string[]) => {
        const newFilters = { ...filters, [key]: value };
        setFilters(newFilters);
        onFilterChange(newFilters);
    };

    const handleDateRangeChange = (value: string) => {
        if (value === 'custom') {
            setShowCustomDate(true);
            handleChange('dateRange', 'custom');
        } else {
            setShowCustomDate(false);
            const newFilters = {
                ...filters,
                dateRange: value as FilterValues['dateRange'],
                customStartDate: '',
                customEndDate: ''
            };
            setFilters(newFilters);
            onFilterChange(newFilters);
        }
    };

    const handleCustomDateChange = (type: 'start' | 'end', value: string) => {
        const key = type === 'start' ? 'customStartDate' : 'customEndDate';
        const newFilters = { ...filters, [key]: value };
        setFilters(newFilters);
        onFilterChange(newFilters);
    };

    const dateRangeOptions = [
        { value: 'week', label: 'Esta Semana' },
        { value: 'month', label: 'Este Mes' },
        { value: 'quarter', label: 'Este Trimestre' },
        { value: 'year', label: 'Este Año' },
        { value: 'custom', label: '📅 Personalizado' }
    ];

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-8">
            <div className="flex flex-wrap items-center gap-6">
                {/* Date Range */}
                <div className="flex items-center gap-3">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Período</label>
                    <select
                        value={filters.dateRange}
                        onChange={(e) => handleDateRangeChange(e.target.value)}
                        className="px-4 py-2 bg-gray-50 border-none rounded-xl text-sm font-semibold text-gray-700 focus:ring-2 focus:ring-violet-500 cursor-pointer"
                    >
                        {dateRangeOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>

                {/* Custom Date Range Picker */}
                {showCustomDate && (
                    <div className="flex items-center gap-2 bg-violet-50 px-4 py-2 rounded-xl">
                        <label className="text-xs font-bold text-violet-400 uppercase">D</label>
                        <input
                            type="date"
                            value={filters.customStartDate || ''}
                            onChange={(e) => handleCustomDateChange('start', e.target.value)}
                            className="bg-transparent border-none p-0 text-sm font-bold text-violet-700 focus:ring-0"
                        />
                        <label className="text-xs font-bold text-violet-400 uppercase ml-2">H</label>
                        <input
                            type="date"
                            value={filters.customEndDate || ''}
                            onChange={(e) => handleCustomDateChange('end', e.target.value)}
                            className="bg-transparent border-none p-0 text-sm font-bold text-violet-700 focus:ring-0"
                        />
                    </div>
                )}

                {/* Brand Filter */}
                {(!isRecruiter || availableBrands.length > 1) && (
                    <div className="flex items-center gap-3">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Marca</label>
                        <select
                            value={filters.brandIds[0] || ''}
                            onChange={(e) => handleChange('brandIds', e.target.value ? [e.target.value] : [])}
                            className="px-4 py-2 bg-gray-50 border-none rounded-xl text-sm font-semibold text-gray-700 focus:ring-2 focus:ring-violet-500 cursor-pointer"
                        >
                            {!isRecruiter && <option value="">Todas</option>}
                            {availableBrands.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Position Filter */}
                <div className="flex items-center gap-3">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Posición</label>
                    <select
                        value={filters.positionIds[0] || ''}
                        onChange={(e) => handleChange('positionIds', e.target.value ? [e.target.value] : [])}
                        className="px-4 py-2 bg-gray-50 border-none rounded-xl text-sm font-semibold text-gray-700 focus:ring-2 focus:ring-violet-500 cursor-pointer"
                    >
                        <option value="">Todas</option>
                        {positions.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>

                {/* Toggle Advanced */}
                <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-violet-50 text-violet-600 rounded-xl text-xs font-bold hover:bg-violet-100 transition-colors"
                >
                    {showAdvanced ? 'Menos filtros' : 'Más filtros'}
                    <span>{showAdvanced ? '▲' : '▼'}</span>
                </button>

                {/* Clear Filters */}
                <button
                    onClick={() => {
                        const newFilters: FilterValues = {
                            dateRange: 'month',
                            customStartDate: '',
                            customEndDate: '',
                            brandIds: isRecruiter && userBrandIds.length === 1 ? userBrandIds : [],
                            positionIds: [],
                            storeIds: [],
                            districtIds: []
                        };
                        setFilters(newFilters);
                        setShowCustomDate(false);
                        onFilterChange(newFilters);
                    }}
                    className="ml-auto text-xs font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest"
                >
                    Limpiar
                </button>
            </div>

            {/* Advanced Filters */}
            {showAdvanced && (
                <div className="mt-6 pt-6 border-t border-gray-100 flex flex-wrap items-center gap-6 animate-fade-in">
                    {/* Store Filter */}
                    <div className="flex items-center gap-3">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Tienda</label>
                        <select
                            value={filters.storeIds[0] || ''}
                            onChange={(e) => handleChange('storeIds', e.target.value ? [e.target.value] : [])}
                            className="px-4 py-2 bg-gray-50 border-none rounded-xl text-sm font-semibold text-gray-700 focus:ring-2 focus:ring-violet-500 cursor-pointer"
                        >
                            <option value="">Todas</option>
                            {stores.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* District Filter */}
                    <div className="flex items-center gap-3">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Distrito</label>
                        <select
                            value={filters.districtIds[0] || ''}
                            onChange={(e) => handleChange('districtIds', e.target.value ? [e.target.value] : [])}
                            className="px-4 py-2 bg-gray-50 border-none rounded-xl text-sm font-semibold text-gray-700 focus:ring-2 focus:ring-violet-500 cursor-pointer"
                        >
                            <option value="">Todos</option>
                            {districts.map(d => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            )}
        </div>
    );
}
