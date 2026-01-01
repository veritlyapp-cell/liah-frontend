'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface JobProfile {
    id: string;
    posicion: string;
    descripcion: string;
    salario: number;
    marcaId: string;
    marcaNombre: string;
    isActive: boolean;
    createdAt?: any;
    updatedAt?: any;
}

interface Marca {
    id: string;
    nombre: string;
}

interface JobProfilesManagementProps {
    holdingId: string;
    marcas: Marca[];
}

export default function JobProfilesManagement({ holdingId, marcas }: JobProfilesManagementProps) {
    const [profiles, setProfiles] = useState<JobProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMarca, setSelectedMarca] = useState<string>('all');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingProfile, setEditingProfile] = useState<JobProfile | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        posicion: '',
        descripcion: '',
        salario: 0,
        marcaId: '',
        marcaNombre: ''
    });

    useEffect(() => {
        loadProfiles();
    }, [marcas]);

    async function loadProfiles() {
        if (marcas.length === 0) {
            setLoading(false);
            return;
        }

        try {
            const profilesRef = collection(db, 'job_profiles');
            const marcaIds = marcas.map(m => m.id).slice(0, 10);

            const q = query(
                profilesRef,
                where('marcaId', 'in', marcaIds)
            );

            const snapshot = await getDocs(q);
            const loadedProfiles = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as JobProfile));

            setProfiles(loadedProfiles);
        } catch (error) {
            console.error('Error loading profiles:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        if (!formData.posicion || !formData.marcaId) {
            alert('Por favor completa los campos requeridos');
            return;
        }

        try {
            const marca = marcas.find(m => m.id === formData.marcaId);
            const profileData = {
                ...formData,
                marcaNombre: marca?.nombre || '',
                isActive: true,
                updatedAt: Timestamp.now()
            };

            if (editingProfile) {
                // Update existing
                const docRef = doc(db, 'job_profiles', editingProfile.id);
                await updateDoc(docRef, profileData);
            } else {
                // Create new
                await addDoc(collection(db, 'job_profiles'), {
                    ...profileData,
                    createdAt: Timestamp.now()
                });
            }

            setShowCreateModal(false);
            setEditingProfile(null);
            resetForm();
            loadProfiles();
        } catch (error) {
            console.error('Error saving profile:', error);
            alert('Error al guardar el perfil');
        }
    }

    async function handleDelete(profileId: string) {
        if (!confirm('¿Estás seguro de eliminar este perfil?')) return;

        try {
            await deleteDoc(doc(db, 'job_profiles', profileId));
            loadProfiles();
        } catch (error) {
            console.error('Error deleting profile:', error);
            alert('Error al eliminar el perfil');
        }
    }

    function resetForm() {
        setFormData({
            posicion: '',
            descripcion: '',
            salario: 0,
            marcaId: marcas[0]?.id || '',
            marcaNombre: marcas[0]?.nombre || ''
        });
    }

    function openEditModal(profile: JobProfile) {
        setEditingProfile(profile);
        setFormData({
            posicion: profile.posicion,
            descripcion: profile.descripcion || '',
            salario: profile.salario,
            marcaId: profile.marcaId,
            marcaNombre: profile.marcaNombre
        });
        setShowCreateModal(true);
    }

    function openCreateModal() {
        setEditingProfile(null);
        resetForm();
        setShowCreateModal(true);
    }

    // Filter profiles by marca
    const filteredProfiles = selectedMarca === 'all'
        ? profiles
        : profiles.filter(p => p.marcaId === selectedMarca);

    if (loading) {
        return (
            <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Cargando perfiles...</p>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Perfiles de Puesto</h2>
                    <p className="text-sm text-gray-500">Gestiona las posiciones disponibles por marca</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors flex items-center gap-2"
                >
                    <span>➕</span> Nuevo Perfil
                </button>
            </div>

            {/* Filter by Marca */}
            <div className="mb-6">
                <select
                    value={selectedMarca}
                    onChange={(e) => setSelectedMarca(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-violet-500 focus:border-violet-500"
                >
                    <option value="all">Todas las marcas ({marcas.length})</option>
                    {marcas.map(marca => (
                        <option key={marca.id} value={marca.id}>{marca.nombre}</option>
                    ))}
                </select>
            </div>

            {/* Profiles Table */}
            {filteredProfiles.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <p className="text-gray-500 text-lg">📋 No hay perfiles de puesto</p>
                    <p className="text-gray-400 text-sm mt-2">Crea tu primer perfil para comenzar</p>
                </div>
            ) : (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Posición</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Marca</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salario</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredProfiles.map(profile => (
                                <tr key={profile.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{profile.posicion}</div>
                                        <div className="text-sm text-gray-500">{profile.descripcion?.slice(0, 50) || ''}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {profile.marcaNombre}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        S/ {profile.salario?.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 text-xs rounded-full ${profile.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                            {profile.isActive ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => openEditModal(profile)}
                                            className="text-violet-600 hover:text-violet-900 mr-3"
                                        >
                                            Editar
                                        </button>
                                        <button
                                            onClick={() => handleDelete(profile.id)}
                                            className="text-red-600 hover:text-red-900"
                                        >
                                            Eliminar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create/Edit Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">
                            {editingProfile ? 'Editar Perfil' : 'Nuevo Perfil de Puesto'}
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Marca *</label>
                                <select
                                    value={formData.marcaId}
                                    onChange={(e) => setFormData({ ...formData, marcaId: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-violet-500 focus:border-violet-500"
                                >
                                    <option value="">Selecciona una marca</option>
                                    {marcas.map(marca => (
                                        <option key={marca.id} value={marca.id}>{marca.nombre}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Posición *</label>
                                <input
                                    type="text"
                                    value={formData.posicion}
                                    onChange={(e) => setFormData({ ...formData, posicion: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-violet-500 focus:border-violet-500"
                                    placeholder="Ej: Cocinero/a"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                                <textarea
                                    value={formData.descripcion}
                                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-violet-500 focus:border-violet-500"
                                    rows={2}
                                    placeholder="Descripción del puesto..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Salario (S/)</label>
                                <input
                                    type="number"
                                    value={formData.salario}
                                    onChange={(e) => setFormData({ ...formData, salario: Number(e.target.value) })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-violet-500 focus:border-violet-500"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => {
                                    setShowCreateModal(false);
                                    setEditingProfile(null);
                                }}
                                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                            >
                                {editingProfile ? 'Guardar Cambios' : 'Crear Perfil'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
