'use client';

import { useState } from 'react';
import { useRQCreationStatus } from '@/lib/hooks/useRQCreationStatus';
import BulkCreateRQModal from '@/components/BulkCreateRQModal';

interface SupervisorStore {
    tiendaId: string;
    tiendaNombre: string;
    marcaId: string;
    marcaNombre?: string;
}

interface SupervisorCreateRQViewProps {
    supervisorId: string;
    supervisorName: string;
    assignedStores: SupervisorStore[];
    holdingId: string;
}

export default function SupervisorCreateRQView({ 
    supervisorId, 
    supervisorName, 
    assignedStores,
    holdingId 
}: SupervisorCreateRQViewProps) {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedStore, setSelectedStore] = useState<{
        tiendaId: string;
        tiendaNombre: string;
        marcaId: string;
        marcaNombre: string;
    } | null>(null);

    const [searchQuery, setSearchQuery] = useState('');

    // Filter stores first
    const filteredStores = assignedStores.filter(store => 
        store.tiendaNombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (store.marcaNombre || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Group filtered stores by marca
    const storesByMarca = filteredStores.reduce((acc, store) => {
        const marca = store.marcaNombre || store.marcaId;
        if (!acc[marca]) acc[marca] = [];
        acc[marca].push(store);
        return acc;
    }, {} as Record<string, SupervisorStore[]>);

    const { status: rqCreationStatus, message: rqLockMessage } = useRQCreationStatus(holdingId);
    const isRQLocked = rqCreationStatus !== 'allowed';

    const handleStoreSelect = (store: SupervisorStore) => {
        if (isRQLocked) return;
        setSelectedStore({
            tiendaId: store.tiendaId,
            tiendaNombre: store.tiendaNombre,
            marcaId: store.marcaId,
            marcaNombre: store.marcaNombre || store.marcaId
        });
        setShowCreateModal(true);
    };

    const handleSuccess = () => {
        setShowCreateModal(false);
        setSelectedStore(null);
        alert('✅ RQ creado exitosamente. Será enviado al Jefe de Marca para aprobación.');
    };

    return (
        <div className="space-y-6">
            <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900 italic uppercase">Crear Nuevo Requerimiento</h2>
                <p className="text-gray-500 mt-1 max-w-sm mx-auto">
                    Selecciona una tienda para crear un RQ. Incluye posiciones gerenciales.
                </p>
                <div className="mt-3 p-3 bg-blue-50/50 border border-blue-100 rounded-2xl inline-block px-6">
                    <p className="text-[10px] font-black uppercase text-blue-500 tracking-widest">
                        ℹ️ Flujo de Aprobación Activo
                    </p>
                </div>
            </div>

            {isRQLocked && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl mb-8">
                    <div className="px-6 py-4 flex items-center gap-3 text-amber-800">
                        <span className="text-xl">🔒</span>
                        <div>
                            <p className="font-semibold text-sm">Creación de RQs deshabilitada</p>
                            <p className="text-xs">{rqLockMessage}</p>
                        </div>
                    </div>
                </div>
            )}

            {!isRQLocked && assignedStores.length > 5 && (
                <div className="max-w-md mx-auto mb-8">
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                        <input
                            type="text"
                            placeholder="Buscar tienda por nombre..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all font-medium shadow-sm"
                        />
                    </div>
                </div>
            )}

            {/* Stores Grid */}
            {!isRQLocked && (
                <div className="space-y-8">
                    {Object.entries(storesByMarca).length > 0 ? (
                        Object.entries(storesByMarca).map(([marcaNombre, stores]) => (
                            <div key={marcaNombre} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="flex items-center gap-3 mb-4">
                                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-[0.2em] whitespace-nowrap">
                                        🏢 {marcaNombre}
                                    </h3>
                                    <div className="h-px flex-1 bg-slate-100"></div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {stores.map((store) => (
                                        <button
                                            key={store.tiendaId}
                                            onClick={() => handleStoreSelect(store)}
                                            className="p-5 bg-white border border-slate-200 rounded-3xl hover:border-violet-400 hover:shadow-xl hover:shadow-violet-100 transition-all text-left group relative overflow-hidden"
                                        >
                                            <div className="absolute top-0 right-0 w-24 h-24 bg-violet-50/50 -mr-8 -mt-8 rounded-full blur-2xl group-hover:bg-violet-100/50 transition-colors"></div>
                                            <div className="relative flex items-start justify-between">
                                                <div>
                                                    <p className="font-bold text-slate-900 group-hover:text-violet-700 transition-colors">
                                                        {store.tiendaNombre}
                                                    </p>
                                                    <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mt-1">
                                                        Click para redactar RQ
                                                    </p>
                                                </div>
                                                <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-violet-500 group-hover:text-white transition-all transform group-hover:rotate-12">
                                                    <span className="text-lg">➕</span>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))
                    ) : (
                        assignedStores.length > 0 && searchQuery && (
                            <div className="text-center py-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                                <p className="text-4xl mb-4">🔍</p>
                                <p className="text-slate-500 font-medium">No se encontraron tiendas para "{searchQuery}"</p>
                            </div>
                        )
                    )}
                </div>
            )}

            {/* Empty state */}
            {assignedStores.length === 0 && (
                <div className="text-center py-16 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                    <p className="text-5xl mb-4">🏪</p>
                    <p className="text-slate-600 font-bold text-lg">No tienes tiendas asignadas</p>
                    <p className="text-slate-400 text-sm mt-1 max-w-xs mx-auto">
                        Contacta al administrador del sistema para que te asigne tus tiendas de supervisión.
                    </p>
                </div>
            )}

            {/* Create RQ Modal */}
            {selectedStore && (
                <BulkCreateRQModal
                    isOpen={showCreateModal}
                    onClose={() => {
                        setShowCreateModal(false);
                        setSelectedStore(null);
                    }}
                    onSuccess={handleSuccess}
                    storeId={selectedStore.tiendaId}
                    storeName={selectedStore.tiendaNombre}
                    marcaId={selectedStore.marcaId}
                    marcaNombre={selectedStore.marcaNombre}
                    creatorRole="supervisor"
                />
            )}
        </div>
    );
}
