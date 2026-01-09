'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, Timestamp, getDocs, query, where, doc, updateDoc, getDoc } from 'firebase/firestore';
import { getDepartmentNames, getProvincesByDepartment, getDistrictsByProvince } from '@/lib/data/peru-locations';

interface CreateStoreModalProps {
    show: boolean;
    holdingId: string;
    onCancel: () => void;
    onSave: (storeData: any) => void;
}

export default function CreateStoreModal({ show, holdingId, onCancel, onSave }: CreateStoreModalProps) {
    const [nombre, setNombre] = useState('');
    const [marcaId, setMarcaId] = useState('');
    const [departamento, setDepartamento] = useState('');
    const [provincia, setProvincia] = useState('');
    const [distrito, setDistrito] = useState('');
    const [direccion, setDireccion] = useState('');
    const [marcas, setMarcas] = useState<any[]>([]);
    const [loadingMarcas, setLoadingMarcas] = useState(true);
    const [saving, setSaving] = useState(false);

    // Geographic data
    const departments = getDepartmentNames();
    const [availableProvinces, setAvailableProvinces] = useState<string[]>([]);
    const [availableDistricts, setAvailableDistricts] = useState<string[]>([]);

    // Update provinces when department changes
    useEffect(() => {
        if (departamento) {
            const provinces = getProvincesByDepartment(departamento);
            setAvailableProvinces(provinces.map(p => p.name));
            setProvincia(''); // Reset provincia
            setDistrito(''); // Reset distrito
            setAvailableDistricts([]);
        } else {
            setAvailableProvinces([]);
            setProvincia('');
            setDistrito('');
            setAvailableDistricts([]);
        }
    }, [departamento]);

    // Update districts when province changes
    useEffect(() => {
        if (departamento && provincia) {
            const districts = getDistrictsByProvince(departamento, provincia);
            setAvailableDistricts(districts.map(d => d.name));
            setDistrito(''); // Reset distrito
        } else {
            setAvailableDistricts([]);
            setDistrito('');
        }
    }, [departamento, provincia]);

    useEffect(() => {
        if (show) {
            loadMarcas();
        }
    }, [show]);

    async function loadMarcas() {
        try {
            const marcasRef = collection(db, 'marcas');
            const q = query(marcasRef, where('holdingId', '==', holdingId));
            const snapshot = await getDocs(q);

            const loadedMarcas = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            setMarcas(loadedMarcas);

            if (loadedMarcas.length > 0) {
                setMarcaId(loadedMarcas[0].id);
            }
        } catch (error) {
            console.error('Error loading marcas:', error);
        } finally {
            setLoadingMarcas(false);
        }
    }

    if (!show) return null;

    async function handleSubmit() {
        if (!nombre || !marcaId || !departamento || !provincia || !distrito || !direccion) {
            alert('Por favor completa todos los campos obligatorios');
            return;
        }

        setSaving(true);

        try {
            // Check store limit
            const holdingRef = doc(db, 'holdings', holdingId);
            const holdingSnap = await getDoc(holdingRef);

            if (holdingSnap.exists()) {
                const config = holdingSnap.data().config;
                const maxStores = config?.maxStores || 5;

                const tiendasRef = collection(db, 'tiendas');
                const qLimit = query(tiendasRef, where('holdingId', '==', holdingId));
                const tiendasSnap = await getDocs(qLimit);

                if (tiendasSnap.size >= maxStores) {
                    alert(`❌ Límite de tiendas alcanzado (${maxStores}). Contacta a soporte para aumentar tu plan.`);
                    setSaving(false);
                    return;
                }
            }

            const selectedMarca = marcas.find(m => m.id === marcaId);

            // Generar código de tienda automático
            const marcaPrefix = selectedMarca?.nombre.substring(0, 3).toUpperCase() || 'TDA';
            const tiendasRef = collection(db, 'tiendas');
            const q = query(tiendasRef, where('marcaId', '==', marcaId)); // Sin orderBy para evitar índice
            const existingStores = await getDocs(q);
            const storeNumber = existingStores.size + 1;
            const codigo = `TDA-${marcaPrefix}-${String(storeNumber).padStart(3, '0')}`;

            const storeData = {
                codigo, // Código único de tienda
                nombre,
                marcaId,
                marcaNombre: selectedMarca?.nombre || '',
                holdingId,
                departamento,
                provincia,
                distrito,
                direccion,
                activa: true,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            };

            const docRef = await addDoc(tiendasRef, storeData);

            // Actualizar contador de tiendas en la marca
            const marcaRef = doc(db, 'marcas', marcaId);
            const marcaSnap = await getDoc(marcaRef);
            const currentCount = marcaSnap.data()?.tiendasActivas || 0;

            await updateDoc(marcaRef, {
                tiendasActivas: currentCount + 1
            });

            console.log('✅ Tienda creada en Firestore:', docRef.id);
            console.log('✅ Contador actualizado:', currentCount + 1);
            alert(`✅ Tienda "${nombre}" creada exitosamente!\nCódigo: ${codigo}`);

            onSave(storeData);

            // Reset form
            setNombre('');
            setDepartamento('');
            setProvincia('');
            setDistrito('');
            setDireccion('');
            setAvailableProvinces([]);
            setAvailableDistricts([]);
        } catch (error) {
            console.error('Error creando tienda:', error);
            alert('❌ Error creando tienda. Ver consola para detalles.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="border-b border-gray-200 px-6 py-4 sticky top-0 bg-white">
                    <h2 className="text-2xl font-bold text-gray-900">Crear Nueva Tienda</h2>
                    <p className="text-sm text-gray-600 mt-1">Agregar tienda con información de ubicación</p>
                </div>

                {/* Body */}
                <div className="px-6 py-6 space-y-6">
                    {loadingMarcas ? (
                        <p>Cargando marcas...</p>
                    ) : marcas.length === 0 ? (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                            <p className="text-amber-800">⚠️ Primero debes crear al menos una marca antes de crear tiendas.</p>
                        </div>
                    ) : (
                        <>
                            {/* Marca */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Marca *
                                </label>
                                <select
                                    value={marcaId}
                                    onChange={(e) => setMarcaId(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                                >
                                    {marcas.map(marca => (
                                        <option key={marca.id} value={marca.id}>
                                            {marca.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Nombre de Tienda */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Nombre de Tienda *
                                </label>
                                <input
                                    type="text"
                                    value={nombre}
                                    onChange={(e) => setNombre(e.target.value)}
                                    placeholder="Papa John's - San Isidro"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                                />
                            </div>

                            {/* Ubicación - Selectores Jerárquicos */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Departamento *
                                    </label>
                                    <select
                                        value={departamento}
                                        onChange={(e) => setDepartamento(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                                    >
                                        <option value="">Seleccionar...</option>
                                        {departments.map(dept => (
                                            <option key={dept} value={dept}>
                                                {dept}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Provincia *
                                    </label>
                                    <select
                                        value={provincia}
                                        onChange={(e) => setProvincia(e.target.value)}
                                        disabled={!departamento}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                    >
                                        <option value="">
                                            {departamento ? 'Seleccionar...' : 'Primero selecciona departamento'}
                                        </option>
                                        {availableProvinces.map(prov => (
                                            <option key={prov} value={prov}>
                                                {prov}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Distrito *
                                    </label>
                                    <select
                                        value={distrito}
                                        onChange={(e) => setDistrito(e.target.value)}
                                        disabled={!provincia}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                    >
                                        <option value="">
                                            {provincia ? 'Seleccionar...' : 'Primero selecciona provincia'}
                                        </option>
                                        {availableDistricts.map(dist => (
                                            <option key={dist} value={dist}>
                                                {dist}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Dirección */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Dirección Completa *
                                </label>
                                <textarea
                                    value={direccion}
                                    onChange={(e) => setDireccion(e.target.value)}
                                    placeholder="Av. Javier Prado 123, San Isidro"
                                    rows={3}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                                />
                            </div>

                            {/* Info */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="text-sm text-blue-900">
                                    <strong>📍 Uso futuro:</strong> Esta información de ubicación se usará para el bot de WhatsApp, que citará candidatos a entrevistas en zonas cercanas a su ubicación.
                                </p>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3 sticky bottom-0 bg-white">
                    <button
                        onClick={onCancel}
                        disabled={saving}
                        className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    {marcas.length > 0 && (
                        <button
                            onClick={handleSubmit}
                            disabled={saving}
                            className="px-6 py-2 gradient-bg text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                        >
                            {saving ? (
                                <>
                                    <span className="animate-spin">⏳</span> Guardando...
                                </>
                            ) : (
                                <>✓ Crear Tienda</>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
