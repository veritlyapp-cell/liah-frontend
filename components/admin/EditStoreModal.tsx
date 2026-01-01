'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { getDepartmentNames, getProvincesByDepartment, getDistrictsByProvince } from '@/lib/data/peru-locations';

interface EditStoreModalProps {
    show: boolean;
    store: any | null;
    onCancel: () => void;
    onSave: () => void;
}

export default function EditStoreModal({ show, store, onCancel, onSave }: EditStoreModalProps) {
    const [nombre, setNombre] = useState('');
    const [departamento, setDepartamento] = useState('');
    const [provincia, setProvincia] = useState('');
    const [distrito, setDistrito] = useState('');
    const [direccion, setDireccion] = useState('');
    const [saving, setSaving] = useState(false);

    // Geographic data
    const departments = getDepartmentNames();
    const [availableProvinces, setAvailableProvinces] = useState<string[]>([]);
    const [availableDistricts, setAvailableDistricts] = useState<string[]>([]);

    // Load store data when modal opens
    useEffect(() => {
        if (show && store) {
            setNombre(store.nombre || '');
            setDepartamento(store.departamento || '');
            setProvincia(store.provincia || '');
            setDistrito(store.distrito || '');
            setDireccion(store.direccion || '');
        }
    }, [show, store]);

    // Update provinces when department changes
    useEffect(() => {
        if (departamento) {
            const provinces = getProvincesByDepartment(departamento);
            setAvailableProvinces(provinces.map(p => p.name));

            // Only reset if province doesn't exist in new list
            if (provincia && !provinces.find(p => p.name === provincia)) {
                setProvincia('');
                setDistrito('');
                setAvailableDistricts([]);
            }
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

            // Only reset if district doesn't exist in new list
            if (distrito && !districts.find(d => d.name === distrito)) {
                setDistrito('');
            }
        } else {
            setAvailableDistricts([]);
            if (provincia) {
                setDistrito('');
            }
        }
    }, [departamento, provincia]);

    if (!show || !store) return null;

    async function handleSubmit() {
        if (!nombre || !departamento || !provincia || !distrito || !direccion) {
            alert('Por favor completa todos los campos obligatorios');
            return;
        }

        setSaving(true);

        try {
            const storeRef = doc(db, 'tiendas', store.id);

            await updateDoc(storeRef, {
                nombre,
                departamento,
                provincia,
                distrito,
                direccion,
                updatedAt: Timestamp.now()
            });

            console.log('✅ Tienda actualizada en Firestore:', store.id);
            alert(`✅ Tienda "${nombre}" actualizada exitosamente!`);

            onSave();

            // Reset form
            setNombre('');
            setDepartamento('');
            setProvincia('');
            setDistrito('');
            setDireccion('');
            setAvailableProvinces([]);
            setAvailableDistricts([]);
        } catch (error) {
            console.error('Error actualizando tienda:', error);
            alert('❌ Error actualizando tienda. Ver consola para detalles.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="border-b border-gray-200 px-6 py-4 sticky top-0 bg-white">
                    <h2 className="text-2xl font-bold text-gray-900">Editar Tienda</h2>
                    <p className="text-sm text-gray-600 mt-1">Actualizar información de ubicación</p>
                </div>

                {/* Body */}
                <div className="px-6 py-6 space-y-6">
                    {/* Read-only info */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-blue-900">
                            <strong>Marca:</strong> {store.marcaNombre}
                        </p>
                        <p className="text-sm text-blue-900 mt-1">
                            <strong>Código:</strong> {store.codigo}
                        </p>
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
                            <>✓ Guardar Cambios</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
