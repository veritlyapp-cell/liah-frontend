'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface JobProfile {
    id: string;
    posicion: string;
    descripcion: string;
    salario: number;
    marcaId: string; // Primary marca (backwards compatibility)
    marcaIds?: string[]; // Multiple marcas
    marcaNombre: string;
    categoria: 'operativo' | 'gerencial';
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
        marcaId: '', // Default primary marca
        marcaIds: [] as string[], // Selected marcas
        categoria: 'operativo' as 'operativo' | 'gerencial'
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
            // Query by brands in holding
            const brandIds = marcas.map(m => m.id).slice(0, 10);

            const q = query(
                profilesRef,
                where('marcaId', 'in', brandIds)
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
        if (!formData.posicion || formData.marcaIds.length === 0) {
            alert('Por favor completa los campos requeridos (Posición y al menos una Marca)');
            return;
        }

        try {
            // Use the first selected marca as the primary marcaId for backwards compatibility
            const primaryMarcaId = formData.marcaIds[0];
            const primaryMarca = marcas.find(m => m.id === primaryMarcaId);

            const profileData = {
                ...formData,
                marcaId: primaryMarcaId,
                marcaNombre: primaryMarca?.nombre || '',
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
                    requisitos: {
                        edadMin: 18,
                        edadMax: 65,
                        experiencia: { requerida: false, meses: 0 },
                        disponibilidad: { horarios: ['mañana', 'tarde'], dias: ['lunes', 'sábado'] },
                        distanciaMax: 10
                    },
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
            marcaIds: [],
            categoria: 'operativo'
        });
    }

    function openEditModal(profile: JobProfile) {
        setEditingProfile(profile);
        setFormData({
            posicion: profile.posicion,
            descripcion: profile.descripcion || '',
            salario: profile.salario,
            marcaId: profile.marcaId,
            marcaIds: profile.marcaIds || [profile.marcaId],
            categoria: profile.categoria || 'operativo'
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
        : profiles.filter(p => p.marcaId === selectedMarca || p.marcaIds?.includes(selectedMarca));

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
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Posición</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Marca(s)</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salario</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredProfiles.map(profile => (
                                <tr key={profile.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-bold text-gray-900">{profile.posicion}</div>
                                        <div className="text-xs text-gray-500 truncate max-w-[200px]">{profile.descripcion || ''}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                                        <div className="flex flex-wrap gap-1">
                                            {profile.marcaIds && profile.marcaIds.length > 0 ? (
                                                profile.marcaIds.map(mid => {
                                                    const m = marcas.find(brand => brand.id === mid);
                                                    return m ? (
                                                        <span key={mid} className="bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                                                            {m.nombre}
                                                        </span>
                                                    ) : null;
                                                })
                                            ) : (
                                                <span className="bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                                                    {profile.marcaNombre}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                        S/ {profile.salario?.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md border ${profile.categoria === 'gerencial' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                            {profile.categoria === 'gerencial' ? '👔 Gerencial' : '🏪 Operativo'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 text-xs rounded-full ${profile.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                            {profile.isActive ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => openEditModal(profile)}
                                            className="text-violet-600 hover:text-violet-900 mr-3 px-2 py-1 hover:bg-violet-50 rounded"
                                        >
                                            Editar
                                        </button>
                                        <button
                                            onClick={() => handleDelete(profile.id)}
                                            className="text-red-600 hover:text-red-900 px-2 py-1 hover:bg-red-50 rounded"
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
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-gray-100">
                            <h3 className="text-xl font-bold text-gray-900 text-center">
                                {editingProfile ? 'Editar Perfil' : 'Nuevo Perfil de Puesto'}
                            </h3>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Marcas disponibles *</label>
                                <div className="grid grid-cols-2 gap-2 p-3 border border-gray-200 rounded-xl bg-gray-50/50">
                                    {marcas.map(marca => (
                                        <label key={marca.id} className={`flex items-center gap-2 cursor-pointer p-2 rounded-lg transition-all ${formData.marcaIds.includes(marca.id) ? 'bg-white shadow-sm ring-1 ring-violet-200' : 'bg-transparent hover:bg-white'}`}>
                                            <input
                                                type="checkbox"
                                                checked={formData.marcaIds.includes(marca.id)}
                                                onChange={(e) => {
                                                    const newMarcaIds = e.target.checked
                                                        ? [...formData.marcaIds, marca.id]
                                                        : formData.marcaIds.filter(id => id !== marca.id);
                                                    setFormData({ ...formData, marcaIds: newMarcaIds });
                                                }}
                                                className="rounded-md text-violet-600 focus:ring-violet-500 border-gray-300 h-4 w-4"
                                            />
                                            <span className={`text-xs font-medium ${formData.marcaIds.includes(marca.id) ? 'text-violet-700' : 'text-gray-600'}`}>{marca.nombre}</span>
                                        </label>
                                    ))}
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1">Selecciona todas las marcas donde este puesto esté disponible</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Categoría del Puesto *</label>
                                <div className="flex gap-4">
                                    <label className={`flex-1 flex flex-col items-center justify-center gap-2 p-4 border-2 rounded-2xl cursor-pointer transition-all ${formData.categoria === 'operativo' ? 'border-violet-600 bg-violet-50 text-violet-700 scale-[1.02] shadow-md' : 'border-gray-100 bg-white text-gray-400 hover:border-gray-200 hover:bg-gray-50'}`}>
                                        <input
                                            type="radio"
                                            name="categoria"
                                            checked={formData.categoria === 'operativo'}
                                            onChange={() => setFormData({ ...formData, categoria: 'operativo' })}
                                            className="hidden"
                                        />
                                        <div className="text-3xl mb-1">🏪</div>
                                        <div className="text-xs font-black uppercase tracking-widest">Operativo</div>
                                        <p className="text-[9px] text-center opacity-70">Para tiendas (SM)</p>
                                    </label>
                                    <label className={`flex-1 flex flex-col items-center justify-center gap-2 p-4 border-2 rounded-2xl cursor-pointer transition-all ${formData.categoria === 'gerencial' ? 'border-amber-500 bg-amber-50 text-amber-700 scale-[1.02] shadow-md' : 'border-gray-100 bg-white text-gray-400 hover:border-gray-200 hover:bg-gray-50'}`}>
                                        <input
                                            type="radio"
                                            name="categoria"
                                            checked={formData.categoria === 'gerencial'}
                                            onChange={() => setFormData({ ...formData, categoria: 'gerencial' })}
                                            className="hidden"
                                        />
                                        <div className="text-3xl mb-1">👔</div>
                                        <div className="text-xs font-black uppercase tracking-widest">Gerencial</div>
                                        <p className="text-[9px] text-center opacity-70">Para Supervisors</p>
                                    </label>
                                </div>
                            </div>

                            <div className="pt-2 border-t border-gray-100">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Nombre de la Posición *</label>
                                <input
                                    type="text"
                                    value={formData.posicion}
                                    onChange={(e) => setFormData({ ...formData, posicion: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm placeholder:text-gray-300"
                                    placeholder="Ej: Gerente de Tienda"
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Salario Estimado (S/)</label>
                                    <input
                                        type="number"
                                        value={formData.salario}
                                        onChange={(e) => setFormData({ ...formData, salario: Number(e.target.value) })}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Descripción o Perfil</label>
                                <textarea
                                    value={formData.descripcion}
                                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm min-h-[100px] placeholder:text-gray-300"
                                    placeholder="Resume los requisitos o funciones principales..."
                                />
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-3">
                            <button
                                onClick={() => {
                                    setShowCreateModal(false);
                                    setEditingProfile(null);
                                }}
                                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-white transition-all font-medium text-sm"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                className="flex-2 px-8 py-3 bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-all font-bold text-sm shadow-lg shadow-violet-200"
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
