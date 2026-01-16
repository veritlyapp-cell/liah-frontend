'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import {
    collection, query, where, getDocs, addDoc, updateDoc, deleteDoc,
    doc, Timestamp
} from 'firebase/firestore';

interface TalentUser {
    id: string;
    email: string;
    nombre: string;
    rol: 'admin' | 'jefe_reclutamiento' | 'recruiter' | 'hiring_manager' | 'approver';
    nivelAprobacion?: number;
    puestoId?: string;
    puestoNombre?: string;
    gerenciaId?: string;
    gerenciaNombre?: string;
    areaId?: string;
    areaNombre?: string;
    holdingId: string;
    activo: boolean;
}

interface Gerencia {
    id: string;
    nombre: string;
}

interface Area {
    id: string;
    nombre: string;
    gerenciaId: string;
}

interface Puesto {
    id: string;
    nombre: string;
    areaId: string;
    gerenciaId: string;
}

interface TalentUsersProps {
    holdingId: string;
}

const ROLES = [
    { id: 'admin', label: 'Administrador', icon: '👑', description: 'Acceso total + configuración' },
    { id: 'jefe_reclutamiento', label: 'Jefe de Reclutamiento', icon: '🎯', description: 'Aprueba final + asigna recruiters' },
    { id: 'recruiter', label: 'Recruiter', icon: '🔍', description: 'Publica vacantes + gestiona candidatos' },
    { id: 'hiring_manager', label: 'Hiring Manager', icon: '📝', description: 'Crea RQs + revisa candidatos' },
    { id: 'approver', label: 'Aprobador', icon: '✅', description: 'Aprueba RQs según nivel' },
];

export default function TalentUsers({ holdingId }: TalentUsersProps) {
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<TalentUser[]>([]);
    const [gerencias, setGerencias] = useState<Gerencia[]>([]);
    const [areas, setAreas] = useState<Area[]>([]);
    const [puestos, setPuestos] = useState<Puesto[]>([]);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState<TalentUser | null>(null);

    // Form fields
    const [formEmail, setFormEmail] = useState('');
    const [formNombre, setFormNombre] = useState('');
    const [formRol, setFormRol] = useState<string>('hiring_manager');
    const [formNivel, setFormNivel] = useState(1);
    const [formPuestoId, setFormPuestoId] = useState('');

    useEffect(() => {
        loadData();
    }, [holdingId]);

    async function loadData() {
        setLoading(true);
        try {
            // Load users
            const usersRef = collection(db, 'talent_users');
            const uQuery = query(usersRef, where('holdingId', '==', holdingId));
            const uSnap = await getDocs(uQuery);
            const loadedUsers = uSnap.docs.map(d => ({ id: d.id, ...d.data() })) as TalentUser[];
            setUsers(loadedUsers);

            // Load gerencias
            const gerenciasRef = collection(db, 'gerencias');
            const gQuery = query(gerenciasRef, where('holdingId', '==', holdingId));
            const gSnap = await getDocs(gQuery);
            const loadedGerencias = gSnap.docs.map(d => ({ id: d.id, nombre: d.data().nombre }));
            setGerencias(loadedGerencias);

            // Load areas
            const areasRef = collection(db, 'areas');
            const aQuery = query(areasRef, where('holdingId', '==', holdingId));
            const aSnap = await getDocs(aQuery);
            const loadedAreas = aSnap.docs.map(d => ({
                id: d.id,
                nombre: d.data().nombre,
                gerenciaId: d.data().gerenciaId
            }));
            setAreas(loadedAreas);

            // Load puestos
            const puestosRef = collection(db, 'puestos');
            const pQuery = query(puestosRef, where('holdingId', '==', holdingId));
            const pSnap = await getDocs(pQuery);
            const loadedPuestos = pSnap.docs.map(d => ({
                id: d.id,
                nombre: d.data().nombre,
                areaId: d.data().areaId,
                gerenciaId: d.data().gerenciaId
            }));
            setPuestos(loadedPuestos);

        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    }

    function resetForm() {
        setFormEmail('');
        setFormNombre('');
        setFormRol('hiring_manager');
        setFormNivel(1);
        setFormPuestoId('');
        setEditingUser(null);
    }

    function openCreate() {
        resetForm();
        setShowModal(true);
    }

    function openEdit(user: TalentUser) {
        setEditingUser(user);
        setFormEmail(user.email);
        setFormNombre(user.nombre);
        setFormRol(user.rol);
        setFormNivel(user.nivelAprobacion || 1);
        setFormPuestoId(user.puestoId || '');
        setShowModal(true);
    }

    async function handleSave() {
        if (!formEmail.trim() || !formNombre.trim()) {
            alert('Email y nombre son requeridos');
            return;
        }

        try {
            const puesto = puestos.find(p => p.id === formPuestoId);
            const area = puesto ? areas.find(a => a.id === puesto.areaId) : null;
            const gerencia = puesto ? gerencias.find(g => g.id === puesto.gerenciaId) : null;

            const userData = {
                email: formEmail.toLowerCase().trim(),
                nombre: formNombre.trim(),
                rol: formRol,
                nivelAprobacion: formRol === 'approver' ? formNivel : null,
                puestoId: formPuestoId || null,
                puestoNombre: puesto?.nombre || null,
                areaId: puesto?.areaId || null,
                areaNombre: area?.nombre || null,
                gerenciaId: puesto?.gerenciaId || null,
                gerenciaNombre: gerencia?.nombre || null,
                holdingId,
                activo: true,
                updatedAt: Timestamp.now()
            };

            if (editingUser) {
                await updateDoc(doc(db, 'talent_users', editingUser.id), userData);
            } else {
                await addDoc(collection(db, 'talent_users'), {
                    ...userData,
                    createdAt: Timestamp.now()
                });
            }

            setShowModal(false);
            resetForm();
            loadData();
            alert('✅ Usuario guardado');
        } catch (error) {
            console.error('Error saving user:', error);
            alert('Error al guardar');
        }
    }

    async function toggleActive(user: TalentUser) {
        try {
            await updateDoc(doc(db, 'talent_users', user.id), {
                activo: !user.activo,
                updatedAt: Timestamp.now()
            });
            loadData();
        } catch (error) {
            console.error('Error toggling user:', error);
        }
    }

    async function handleDelete(user: TalentUser) {
        if (!confirm(`¿Eliminar a ${user.nombre}?`)) return;
        try {
            await deleteDoc(doc(db, 'talent_users', user.id));
            loadData();
        } catch (error) {
            console.error('Error deleting user:', error);
        }
    }

    const getRolInfo = (rol: string) => ROLES.find(r => r.id === rol) || ROLES[3];

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Usuarios Talent</h2>
                    <p className="text-gray-600">Gestiona roles y permisos de aprobación</p>
                </div>
                <button
                    onClick={openCreate}
                    className="px-4 py-2 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 transition-colors"
                >
                    + Agregar Usuario
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-5 gap-4">
                {ROLES.map(role => {
                    const count = users.filter(u => u.rol === role.id && u.activo).length;
                    return (
                        <div key={role.id} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                            <div className="text-2xl mb-1">{role.icon}</div>
                            <div className="text-2xl font-bold text-gray-900">{count}</div>
                            <div className="text-xs text-gray-500">{role.label}</div>
                        </div>
                    );
                })}
            </div>

            {/* Users List */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Área / Gerencia</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nivel</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {users.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                    <div className="text-4xl mb-2">👥</div>
                                    No hay usuarios. Agrega el primero.
                                </td>
                            </tr>
                        ) : users.map(user => {
                            const roleInfo = getRolInfo(user.rol);
                            return (
                                <tr key={user.id} className={`hover:bg-gray-50 ${!user.activo ? 'opacity-50' : ''}`}>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-900">{user.nombre}</div>
                                        <div className="text-sm text-gray-500">{user.email}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-violet-100 text-violet-700 rounded-full text-sm">
                                            {roleInfo.icon} {roleInfo.label}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">
                                        {user.areaNombre || user.gerenciaNombre || '-'}
                                    </td>
                                    <td className="px-6 py-4">
                                        {user.rol === 'approver' && user.nivelAprobacion ? (
                                            <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
                                                Nivel {user.nivelAprobacion}
                                            </span>
                                        ) : '-'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => toggleActive(user)}
                                            className={`px-2 py-1 rounded-full text-xs font-medium ${user.activo
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-gray-100 text-gray-500'
                                                }`}
                                        >
                                            {user.activo ? '✓ Activo' : 'Inactivo'}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => openEdit(user)}
                                            className="text-violet-600 hover:text-violet-800 mr-3"
                                        >
                                            Editar
                                        </button>
                                        <button
                                            onClick={() => handleDelete(user)}
                                            className="text-red-600 hover:text-red-800"
                                        >
                                            Eliminar
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full">
                        <div className="border-b border-gray-200 px-6 py-4">
                            <h3 className="text-lg font-semibold text-gray-900">
                                {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
                            </h3>
                        </div>
                        <div className="px-6 py-4 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                                    <input
                                        type="text"
                                        value={formNombre}
                                        onChange={(e) => setFormNombre(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                                        placeholder="Juan Pérez"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                                    <input
                                        type="email"
                                        value={formEmail}
                                        onChange={(e) => setFormEmail(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                                        placeholder="juan@empresa.com"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Rol *</label>
                                <div className="grid grid-cols-1 gap-2">
                                    {ROLES.map(role => (
                                        <button
                                            key={role.id}
                                            type="button"
                                            onClick={() => setFormRol(role.id)}
                                            className={`text-left p-3 rounded-lg border transition-colors ${formRol === role.id
                                                ? 'border-violet-500 bg-violet-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span>{role.icon}</span>
                                                <span className="font-medium text-gray-900">{role.label}</span>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">{role.description}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {formRol === 'approver' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nivel de Aprobación</label>
                                    <select
                                        value={formNivel}
                                        onChange={(e) => setFormNivel(parseInt(e.target.value))}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                                    >
                                        <option value={1}>Nivel 1 - Jefe Inmediato</option>
                                        <option value={2}>Nivel 2 - Gerencia</option>
                                        <option value={3}>Nivel 3 - Dirección</option>
                                    </select>
                                </div>
                            )}

                            {(formRol === 'hiring_manager' || formRol === 'approver') && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Puesto *</label>
                                    <select
                                        value={formPuestoId}
                                        onChange={(e) => setFormPuestoId(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                                    >
                                        <option value="">Seleccionar puesto...</option>
                                        {puestos.map(p => {
                                            const area = areas.find(a => a.id === p.areaId);
                                            return (
                                                <option key={p.id} value={p.id}>
                                                    {p.nombre} ({area?.nombre || 'Sin área'})
                                                </option>
                                            );
                                        })}
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">
                                        El puesto determina automáticamente el área y gerencia del usuario
                                    </p>
                                </div>
                            )}
                        </div>
                        <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
                            <button
                                onClick={() => { setShowModal(false); resetForm(); }}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
                            >
                                {editingUser ? 'Actualizar' : 'Crear Usuario'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
