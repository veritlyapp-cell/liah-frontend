'use client';

import { useState } from 'react';
import CreateRQModal from '@/components/CreateRQModal';

interface SupervisorCreateRQViewProps {
    supervisorId: string;
    supervisorName: string;
    assignedStores: Array<{
        tiendaId: string;
        tiendaNombre: string;
        marcaId: string;
        marcaNombre?: string;
    }>;
    holdingId: string;
}

export default function SupervisorCreateRQView({
    supervisorId,
    supervisorName,
    assignedStores,
    holdingId
}: SupervisorCreateRQViewProps) {
    const [selectedStore, setSelectedStore] = useState<{
        tiendaId: string;
        tiendaNombre: string;
        marcaId: string;
        marcaNombre: string;
    } | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Group stores by marca for better UX
    const storesByMarca = assignedStores.reduce((acc, store) => {
        const marca = store.marcaNombre || store.marcaId;
        if (!acc[marca]) {
            acc[marca] = [];
        }
        acc[marca].push(store);
        return acc;
    }, {} as Record<string, typeof assignedStores>);

    const handleStoreSelect = (store: typeof assignedStores[0]) => {
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
        // Show success message
        alert('✅ RQ creado exitosamente. Será enviado al Jefe de Marca para aprobación.');
    };

    return (
        <div className="space-y-6">
            <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Crear Nuevo Requerimiento</h2>
                <p className="text-gray-500 mt-1">
                    Selecciona una tienda para crear un RQ. Incluye posiciones gerenciales (Asistente/Gerente de Tienda).
                </p>
                <div className="mt-3 p-3 bg-blue-50 rounded-lg inline-block">
                    <p className="text-sm text-blue-700">
                        ℹ️ <strong>Flujo:</strong> Supervisor (crea) → Jefe de Marca (aprueba) → Recruiter (publica)
                    </p>
                </div>
            </div>

            {/* Stores Grid */}
            <div className="space-y-6">
                {Object.entries(storesByMarca).map(([marcaNombre, stores]) => (
                    <div key={marcaNombre}>
                        <h3 className="text-lg font-medium text-gray-800 mb-3">
                            🏢 {marcaNombre}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {stores.map((store) => (
                                <button
                                    key={store.tiendaId}
                                    onClick={() => handleStoreSelect(store)}
                                    className="p-4 bg-white border border-gray-200 rounded-xl hover:border-violet-400 hover:shadow-md transition-all text-left group"
                                >
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="font-medium text-gray-900 group-hover:text-violet-700">
                                                {store.tiendaNombre}
                                            </p>
                                            <p className="text-sm text-gray-500 mt-1">
                                                Clic para crear RQ
                                            </p>
                                        </div>
                                        <span className="text-2xl group-hover:scale-110 transition-transform">
                                            ➕
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Empty state */}
            {assignedStores.length === 0 && (
                <div className="text-center py-12 bg-gray-50 rounded-xl">
                    <p className="text-4xl mb-4">🏪</p>
                    <p className="text-gray-500">No tienes tiendas asignadas</p>
                    <p className="text-gray-400 text-sm mt-1">
                        Contacta al administrador para asignarte tiendas
                    </p>
                </div>
            )}

            {/* Create RQ Modal */}
            {selectedStore && (
                <CreateRQModal
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
                    creatorRole="supervisor" // This enables short approval flow
                />
            )}
        </div>
    );
}
