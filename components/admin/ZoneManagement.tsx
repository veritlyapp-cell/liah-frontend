'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { getLimaCallaoDistritos } from '@/lib/data/peru-locations';

interface ZoneManagementProps {
    holdingId: string;
}

interface Zone {
    id: string;
    nombre: string;
    distritos: string[];
}

export default function ZoneManagement({ holdingId }: ZoneManagementProps) {
    const [zones, setZones] = useState<Zone[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);

    // Form state
    const [newZoneName, setNewZoneName] = useState('');
    const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    const allDistricts = getLimaCallaoDistritos();

    useEffect(() => {
        loadZones();
    }, [holdingId]);

    async function loadZones() {
        setLoading(true);
        try {
            const zonesRef = collection(db, 'zones');
            const q = query(zonesRef, where('holdingId', '==', holdingId));
            const snapshot = await getDocs(q);
            const loadedZones = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Zone[];
            setZones(loadedZones);
        } catch (error) {
            console.error('Error loading zones:', error);
        } finally {
            setLoading(false);
        }
    }

    const toggleDistrict = (district: string) => {
        if (selectedDistricts.includes(district)) {
            setSelectedDistricts(selectedDistricts.filter(d => d !== district));
        } else {
            setSelectedDistricts([...selectedDistricts, district]);
        }
    };

    const handleCreateZone = async () => {
        if (!newZoneName || selectedDistricts.length === 0) {
            alert('Por favor asigne un nombre y al menos un distrito.');
            return;
        }

        try {
            await addDoc(collection(db, 'zones'), {
                nombre: newZoneName,
                distritos: selectedDistricts,
                holdingId,
                createdAt: Timestamp.now()
            });
            setNewZoneName('');
            setSelectedDistricts([]);
            setIsAdding(false);
            loadZones();
        } catch (error) {
            console.error('Error creating zone:', error);
            alert('Error al crear la zona.');
        }
    };

    const handleDeleteZone = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar esta zona?')) return;
        try {
            await deleteDoc(doc(db, 'zones', id));
            loadZones();
        } catch (error) {
            console.error('Error deleting zone:', error);
        }
    };

    const filteredDistricts = allDistricts.filter(d =>
        d.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-gray-900">Zonas Geográficas</h3>
                    <p className="text-sm text-gray-500">Agrupa distritos para obtener reportes regionales.</p>
                </div>
                {!isAdding && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-bold hover:bg-violet-700 transition-colors flex items-center gap-2"
                    >
                        <span>➕</span> Nueva Zona
                    </button>
                )}
            </div>

            {isAdding && (
                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Nombre de la Zona</label>
                        <input
                            type="text"
                            value={newZoneName}
                            onChange={(e) => setNewZoneName(e.target.value)}
                            placeholder="Ej: Cono Norte, Playas, Lima Centro"
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500"
                        />
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <label className="block text-sm font-bold text-gray-700">Seleccionar Distritos ({selectedDistricts.length})</label>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Buscar distrito..."
                                className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg"
                            />
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-60 overflow-y-auto p-2 bg-white rounded-xl border border-gray-100">
                            {filteredDistricts.map(district => (
                                <button
                                    key={district}
                                    onClick={() => toggleDistrict(district)}
                                    className={`text-left px-3 py-2 rounded-lg text-xs transition-colors ${selectedDistricts.includes(district)
                                            ? 'bg-violet-100 text-violet-700 font-bold'
                                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                        }`}
                                >
                                    {district}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setIsAdding(false)}
                            className="px-6 py-2 text-sm font-bold text-gray-500 hover:text-gray-700"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleCreateZone}
                            className="px-6 py-2 bg-violet-600 text-white rounded-xl text-sm font-bold hover:bg-violet-700 transition-colors"
                        >
                            Guardar Zona
                        </button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {loading ? (
                    <div className="col-span-full py-12 text-center text-gray-400">Cargando zonas...</div>
                ) : zones.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-gray-400 italic">No hay zonas definidas.</div>
                ) : (
                    zones.map(zone => (
                        <div key={zone.id} className="p-5 border border-gray-100 rounded-2xl hover:shadow-md transition-shadow group">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="font-bold text-gray-900">{zone.nombre}</h4>
                                <button
                                    onClick={() => handleDeleteZone(zone.id)}
                                    className="p-1.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                >
                                    🗑️
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {zone.distritos.map(d => (
                                    <span key={d} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md text-[10px]">
                                        {d}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
