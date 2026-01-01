'use client';

import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Marca {
    id: string;
    nombre: string;
}

const DEFAULT_PROFILES = [
    {
        posicion: 'Cocinero/a',
        descripcion: 'Preparación de alimentos según estándares de la marca',
        salario: 1200,
        modalidad: 'Full Time',
        turno: 'Mañana',
        beneficios: ['Propinas', 'Comida', 'Seguro'],
        requisitos: {
            edadMin: 18,
            edadMax: 45,
            experiencia: { requerida: true, meses: 6 },
            disponibilidad: { horarios: ['mañana'], dias: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'] },
            distanciaMax: 10
        },
        assignedStores: [],
        isActive: true
    },
    {
        posicion: 'Cajero/a',
        descripcion: 'Atención al cliente y manejo de caja',
        salario: 1100,
        modalidad: 'Part Time',
        turno: 'Tarde',
        beneficios: ['Propinas', 'Comida', 'Seguro'],
        requisitos: {
            edadMin: 18,
            edadMax: 35,
            experiencia: { requerida: false, meses: 0 },
            disponibilidad: { horarios: ['tarde'], dias: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'] },
            distanciaMax: 10
        },
        assignedStores: [],
        isActive: true
    },
    {
        posicion: 'Delivery',
        descripcion: 'Entrega de pedidos a domicilio',
        salario: 1000,
        modalidad: 'Part Time',
        turno: 'Noche',
        beneficios: ['Propinas', 'Comida', 'Seguro', 'Combustible'],
        requisitos: {
            edadMin: 18,
            edadMax: 40,
            experiencia: { requerida: false, meses: 0 },
            disponibilidad: { horarios: ['noche'], dias: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'] },
            distanciaMax: 15
        },
        assignedStores: [],
        isActive: true
    },
    {
        posicion: 'Shift Leader',
        descripcion: 'Supervisión de turno y apoyo al equipo',
        salario: 1500,
        modalidad: 'Full Time',
        turno: 'Todos',
        beneficios: ['Propinas', 'Comida', 'Seguro', 'Bono por desempeño'],
        requisitos: {
            edadMin: 21,
            edadMax: 45,
            experiencia: { requerida: true, meses: 12 },
            disponibilidad: { horarios: ['mañana', 'tarde', 'noche'], dias: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'] },
            distanciaMax: 20
        },
        assignedStores: [],
        isActive: true
    }
];

export default function SetupPage() {
    const [status, setStatus] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [marcas, setMarcas] = useState<Marca[]>([]);
    const [selectedMarca, setSelectedMarca] = useState<Marca | null>(null);
    const [loadingMarcas, setLoadingMarcas] = useState(true);

    // Load brands from Firestore
    useEffect(() => {
        async function loadMarcas() {
            try {
                const snapshot = await getDocs(collection(db, 'marcas'));
                const marcasList = snapshot.docs.map(doc => ({
                    id: doc.id,
                    nombre: doc.data().nombre || doc.id
                }));
                setMarcas(marcasList);
                if (marcasList.length > 0) {
                    setSelectedMarca(marcasList[0]);
                }
            } catch (error) {
                console.error('Error loading marcas:', error);
            } finally {
                setLoadingMarcas(false);
            }
        }
        loadMarcas();
    }, []);

    async function createProfiles() {
        if (!selectedMarca) {
            alert('Selecciona una marca primero');
            return;
        }

        setLoading(true);
        setStatus(`Creating job profiles for ${selectedMarca.nombre}...`);

        try {
            const profilesRef = collection(db, 'job_profiles');
            const now = Timestamp.now();

            for (const profile of DEFAULT_PROFILES) {
                await addDoc(profilesRef, {
                    ...profile,
                    marcaId: selectedMarca.id,
                    marcaNombre: selectedMarca.nombre,
                    createdAt: now,
                    updatedAt: now
                });
                setStatus(prev => prev + `\n✅ Created: ${profile.posicion}`);
            }

            setStatus(prev => prev + `\n\n🎉 Done! Created ${DEFAULT_PROFILES.length} profiles for ${selectedMarca.nombre}`);
        } catch (error: any) {
            setStatus(prev => prev + `\n❌ Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
                <h1 className="text-2xl font-bold mb-6">🔧 Setup Job Profiles</h1>

                {/* Brand Selector */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Selecciona la Marca:
                    </label>
                    {loadingMarcas ? (
                        <p className="text-gray-500">Cargando marcas...</p>
                    ) : (
                        <select
                            value={selectedMarca?.id || ''}
                            onChange={(e) => {
                                const marca = marcas.find(m => m.id === e.target.value);
                                setSelectedMarca(marca || null);
                            }}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-violet-500 focus:border-violet-500"
                        >
                            {marcas.map(marca => (
                                <option key={marca.id} value={marca.id}>
                                    {marca.nombre} (ID: {marca.id})
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                <div className="mb-6">
                    <h2 className="font-semibold mb-2">Profiles to create:</h2>
                    <ul className="list-disc list-inside text-gray-600">
                        {DEFAULT_PROFILES.map(p => (
                            <li key={p.posicion}>{p.posicion} - S/{p.salario}</li>
                        ))}
                    </ul>
                </div>

                <button
                    onClick={createProfiles}
                    disabled={loading || !selectedMarca}
                    className="w-full px-6 py-3 bg-violet-600 text-white font-semibold rounded-lg hover:bg-violet-700 disabled:opacity-50"
                >
                    {loading ? 'Creating...' : `Create Job Profiles for ${selectedMarca?.nombre || '...'}`}
                </button>

                {status && (
                    <pre className="mt-6 p-4 bg-gray-900 text-green-400 rounded-lg text-sm whitespace-pre-wrap">
                        {status}
                    </pre>
                )}
            </div>
        </div>
    );
}
