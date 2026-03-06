'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import CreateRQModal from '@/components/CreateRQModal';

interface AdminCreateRQFlowProps {
    holdingId: string;
    marcas: { id: string; nombre: string }[];
    onClose: () => void;
    onSuccess: () => void;
}

export default function AdminCreateRQFlow({ holdingId, marcas, onClose, onSuccess }: AdminCreateRQFlowProps) {
    const [step, setStep] = useState<1 | 2>(1);
    const [selectedMarca, setSelectedMarca] = useState<{ id: string, nombre: string } | null>(null);
    const [selectedStore, setSelectedStore] = useState<{ id: string, nombre: string } | null>(null);
    const [stores, setStores] = useState<any[]>([]);
    const [loadingStores, setLoadingStores] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);

    useEffect(() => {
        if (marcas.length === 1) {
            handleBrandSelection(marcas[0]);
        }
    }, [marcas]);

    async function loadStoresForBrand(marcaId: string) {
        setLoadingStores(true);
        try {
            const q = query(collection(db, 'tiendas'), where('marcaId', '==', marcaId));
            const snapshot = await getDocs(q);
            const storesData = snapshot.docs.map(doc => ({
                id: doc.id,
                nombre: doc.data().nombre || 'Tienda Sin Nombre',
                ...doc.data()
            }));

            // Sort alphabetically by name
            storesData.sort((a, b) => a.nombre.localeCompare(b.nombre));
            setStores(storesData);
        } catch (error) {
            console.error('Error loading stores:', error);
        } finally {
            setLoadingStores(false);
        }
    }

    function handleBrandSelection(marca: { id: string, nombre: string }) {
        setSelectedMarca(marca);
        loadStoresForBrand(marca.id);
        setStep(2);
    }

    function handleStoreSelection(store: any) {
        setSelectedStore(store);
        setShowCreateModal(true);
    }

    if (showCreateModal && selectedMarca && selectedStore) {
        return (
            <CreateRQModal
                isOpen={showCreateModal}
                onClose={() => {
                    setShowCreateModal(false);
                    onClose();
                }}
                onSuccess={() => {
                    setShowCreateModal(false);
                    onSuccess();
                }}
                storeId={selectedStore.id}
                storeName={selectedStore.nombre}
                marcaId={selectedMarca.id}
                marcaNombre={selectedMarca.nombre}
            />
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50 shrink-0">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">Crear Requerimiento</h3>
                        <p className="text-xs text-gray-500 mt-1">
                            {step === 1 ? 'Paso 1: Selecciona la marca' : `Paso 2: Tienda de ${selectedMarca?.nombre}`}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 bg-white rounded-full p-2 h-10 w-10 flex items-center justify-center shadow-sm border border-gray-200"
                    >
                        ✕
                    </button>
                </div>

                <div className="p-6 overflow-y-auto grow">
                    {step === 1 && (
                        <div className="space-y-4">
                            <label className="block text-sm font-medium text-gray-700">Selecciona la marca destino</label>
                            <div className="grid grid-cols-1 gap-3">
                                {marcas.map(m => (
                                    <button
                                        key={m.id}
                                        onClick={() => handleBrandSelection(m)}
                                        className="p-4 bg-white border border-gray-200 rounded-xl hover:border-violet-400 hover:shadow-md transition-all text-left flex items-center justify-between group"
                                    >
                                        <span className="font-semibold text-gray-900 group-hover:text-violet-700">{m.nombre}</span>
                                        <span className="text-violet-500 opacity-0 group-hover:opacity-100 transition-opacity">➔</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            {marcas.length > 1 && (
                                <button
                                    onClick={() => setStep(1)}
                                    className="text-sm font-medium text-violet-600 hover:underline flex items-center gap-1 mb-2"
                                >
                                    <span>←</span> Cambiar Marca
                                </button>
                            )}

                            <label className="block text-sm font-medium text-gray-700">Selecciona la tienda</label>

                            {loadingStores ? (
                                <div className="text-center py-10">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600 mx-auto"></div>
                                    <p className="text-xs text-gray-500 mt-3">Cargando tiendas...</p>
                                </div>
                            ) : stores.length === 0 ? (
                                <div className="text-center py-8 bg-gray-50 rounded-xl">
                                    <p className="text-gray-500 text-sm">No hay tiendas registradas en esta marca.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-3 max-h-[60vh] overflow-y-auto pr-2">
                                    {stores.map(store => (
                                        <button
                                            key={store.id}
                                            onClick={() => handleStoreSelection(store)}
                                            className="p-4 bg-white border border-gray-200 rounded-xl hover:border-violet-400 hover:shadow-md transition-all text-left flex items-center justify-between group"
                                        >
                                            <div>
                                                <p className="font-semibold text-gray-900 group-hover:text-violet-700">{store.nombre}</p>
                                                {store.address && <p className="text-xs text-gray-500 mt-1 line-clamp-1">{store.address}</p>}
                                            </div>
                                            <span className="text-2xl group-hover:scale-110 transition-transform">➕</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
