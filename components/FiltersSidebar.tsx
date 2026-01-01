'use client';

interface FiltersSidebarProps {
    stores: Array<{ id: string, nombre: string }>;
    positions: string[];
    selectedStores: string[];
    setSelectedStores: (stores: string[]) => void;
    selectedPosition: string;
    setSelectedPosition: (position: string) => void;
    selectedCULStatus: string;
    setSelectedCULStatus: (status: string) => void;
    onClearFilters: () => void;
}

export default function FiltersSidebar({
    stores,
    positions,
    selectedStores,
    setSelectedStores,
    selectedPosition,
    setSelectedPosition,
    selectedCULStatus,
    setSelectedCULStatus,
    onClearFilters
}: FiltersSidebarProps) {

    const toggleStore = (storeId: string) => {
        if (selectedStores.includes(storeId)) {
            setSelectedStores(selectedStores.filter(s => s !== storeId));
        } else {
            setSelectedStores([...selectedStores, storeId]);
        }
    };

    const hasActiveFilters = selectedStores.length > 0 || selectedPosition || selectedCULStatus;

    return (
        <div className="w-64 bg-white rounded-lg border border-gray-200 p-4 sticky top-4 h-fit">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Filtros</h3>
                {hasActiveFilters && (
                    <button
                        onClick={onClearFilters}
                        className="text-xs text-violet-600 hover:text-violet-700 font-medium"
                    >
                        Limpiar
                    </button>
                )}
            </div>

            {/* Stores Filter */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tiendas
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                    {stores.map(store => (
                        <label key={store.id} className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                            <input
                                type="checkbox"
                                checked={selectedStores.includes(store.id)}
                                onChange={() => toggleStore(store.id)}
                                className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                            />
                            <span className="ml-2 text-sm text-gray-700">{store.nombre}</span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Position Filter */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Posición
                </label>
                <select
                    value={selectedPosition}
                    onChange={(e) => setSelectedPosition(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 text-sm"
                >
                    <option value="">Todas las posiciones</option>
                    {positions.map(position => (
                        <option key={position} value={position}>{position}</option>
                    ))}
                </select>
            </div>

            {/* CUL Status Filter */}
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estado CUL (Recruiter)
                </label>
                <div className="space-y-2">
                    <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                        <input
                            type="radio"
                            name="culStatus"
                            checked={selectedCULStatus === ''}
                            onChange={() => setSelectedCULStatus('')}
                            className="border-gray-300 text-violet-600 focus:ring-violet-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Todos</span>
                    </label>
                    <label className="flex items-center cursor-pointer hover:bg-green-50 p-2 rounded">
                        <input
                            type="radio"
                            name="culStatus"
                            checked={selectedCULStatus === 'apto'}
                            onChange={() => setSelectedCULStatus('apto')}
                            className="border-gray-300 text-green-600 focus:ring-green-500"
                        />
                        <span className="ml-2 text-sm font-medium text-green-700">✓ Aptos (Listos para ingresar)</span>
                    </label>
                    <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                        <input
                            type="radio"
                            name="culStatus"
                            checked={selectedCULStatus === 'pending'}
                            onChange={() => setSelectedCULStatus('pending')}
                            className="border-gray-300 text-violet-600 focus:ring-violet-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Pendiente</span>
                    </label>
                    <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                        <input
                            type="radio"
                            name="culStatus"
                            checked={selectedCULStatus === 'no_apto'}
                            onChange={() => setSelectedCULStatus('no_apto')}
                            className="border-gray-300 text-violet-600 focus:ring-violet-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">No Apto</span>
                    </label>
                    <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                        <input
                            type="radio"
                            name="culStatus"
                            checked={selectedCULStatus === 'manual_review'}
                            onChange={() => setSelectedCULStatus('manual_review')}
                            className="border-gray-300 text-violet-600 focus:ring-violet-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Revisión Manual</span>
                    </label>
                </div>
            </div>

            {/* Active Filters Summary */}
            {hasActiveFilters && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-500 mb-2">Filtros activos:</p>
                    <div className="space-y-1">
                        {selectedStores.length > 0 && (
                            <div className="text-xs">
                                <span className="font-medium text-gray-700">{selectedStores.length}</span>
                                <span className="text-gray-500"> tienda(s)</span>
                            </div>
                        )}
                        {selectedPosition && (
                            <div className="text-xs">
                                <span className="font-medium text-gray-700">{selectedPosition}</span>
                            </div>
                        )}
                        {selectedCULStatus && (
                            <div className="text-xs">
                                <span className="text-gray-500">CUL: </span>
                                <span className="font-medium text-gray-700">{selectedCULStatus}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
