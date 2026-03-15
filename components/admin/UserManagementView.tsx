'use client';

import { useState, useEffect } from 'react';
import { getAllUserAssignments } from '@/lib/firestore/user-assignment-actions';
import type { UserAssignment } from '@/lib/firestore/user-assignments';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import CreateUserModal from './CreateUserModal';
import EditUserModal from './EditUserModal';
import BulkImportUsersModal from './BulkImportUsersModal';
import { Building2, Settings, Users, Key, Smartphone, Mail, Plus, Upload, Trash2, Pencil, Search, Filter } from 'lucide-react';

interface UserManagementViewProps {
    holdingId?: string;
}

export default function UserManagementView({ holdingId = 'ngr' }: UserManagementViewProps) {
    const { claims, user: authUser } = useAuth();
    const [assignments, setAssignments] = useState<UserAssignment[]>([]);
    const [marcas, setMarcas] = useState<{ id: string, nombre: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showBulkImportModal, setShowBulkImportModal] = useState(false);
    const [editingUser, setEditingUser] = useState<UserAssignment | null>(null);
    const [filterRole, setFilterRole] = useState<string>('all');
    const [filterMarca, setFilterMarca] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setLoading(true);
        await Promise.all([
            loadAssignments(),
            loadMarcas()
        ]);
        setLoading(false);
    }

    async function loadMarcas() {
        try {
            const marcasRef = collection(db, 'marcas');
            const q = query(marcasRef, where('holdingId', 'in', [holdingId, 'ngr']));
            const snapshot = await getDocs(q);
            const loadedMarcas = snapshot.docs.map(doc => ({
                id: doc.id,
                nombre: doc.data().nombre
            }));
            setMarcas(loadedMarcas);
        } catch (error) {
            console.error('Error loading marcas:', error);
        }
    }

    async function loadAssignments() {
        try {
            const data = await getAllUserAssignments();
            const normalizeHoldingId = (id: string | null | undefined): string => {
                if (!id) return '';
                return id.toLowerCase().replace('holding-', '').replace('holding_', '');
            };
            const normalizedHoldingId = normalizeHoldingId(holdingId);

            const filtered = data.filter(user => {
                const userHolding = normalizeHoldingId(user.holdingId);
                const isSuperAdmin = claims?.role === 'super_admin';
                if (isSuperAdmin) return userHolding === normalizedHoldingId;
                return userHolding === normalizedHoldingId && user.role !== 'super_admin';
            });

            filtered.sort((a, b) => {
                const aTime = a.createdAt?.toMillis?.() || 0;
                const bTime = b.createdAt?.toMillis?.() || 0;
                return bTime - aTime;
            });

            setAssignments(filtered);
        } catch (error) {
            console.error('Error loading assignments:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleDeleteUser(userId: string, email: string, displayName: string) {
        const confirmed = confirm(`¿Eliminar usuario ${displayName} permanentemente?`);
        if (!confirmed) return;

        try {
            const currentUser = auth.currentUser;
            if (!currentUser) return;
            const idToken = await currentUser.getIdToken();

            const response = await fetch('/api/admin/delete-user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({ userId, email })
            });

            if (!response.ok) throw new Error('Error al eliminar usuario');
            alert('✅ Usuario eliminado correctamente');
            loadAssignments();
        } catch (error: any) {
            alert(error.message || 'Error al eliminar usuario');
        }
    }

    const getUserMarcaId = (user: UserAssignment): string | null => {
        if (user.marcaId) return user.marcaId;
        if (user.assignedMarca?.marcaId) return user.assignedMarca.marcaId;
        if (user.assignedStore?.marcaId) return user.assignedStore.marcaId;
        if (user.assignedStores?.[0]?.marcaId) return user.assignedStores[0].marcaId;
        if (user.assignedMarcas?.[0]?.marcaId) return user.assignedMarcas[0].marcaId;
        return null;
    };

    async function handleResetPassword(userId: string, email: string) {
        const newPass = prompt(`Establecer nueva contraseña para ${email}:`, 'Liah2026!');
        if (!newPass) return;

        try {
            const currentUser = auth.currentUser;
            if (!currentUser) return;
            const idToken = await currentUser.getIdToken();

            const response = await fetch('/api/admin/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({ userId, email, newPassword: newPass })
            });

            if (!response.ok) throw new Error('Error');
            alert(`✅ Contraseña restablecida.\nNueva: ${newPass}`);
        } catch (error: any) {
            alert('Error al restablecer contraseña');
        }
    }

    const filteredAssignments = assignments.filter(a => {
        const roleMatch = filterRole === 'all' || a.role === filterRole;
        const marcaMatch = filterMarca === 'all' || getUserMarcaId(a) === filterMarca;
        const searchMatch = !searchTerm ||
            a.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.email?.toLowerCase().includes(searchTerm.toLowerCase());
        return roleMatch && marcaMatch && searchMatch;
    });

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'client_admin': return 'soft-badge-brand';
            case 'jefe_marca': return 'soft-badge-emerald';
            case 'supervisor': return 'soft-badge-slate';
            case 'recruiter': return 'soft-badge-brand';
            default: return 'soft-badge-slate';
        }
    };

    const getRoleLabel = (role: string) => {
        const labels: Record<string, string> = {
            client_admin: 'Admin Empresa',
            supervisor: 'Supervisor',
            jefe_marca: 'Jefe de Marca',
            recruiter: 'Recruiter',
            store_manager: 'Gerente Tienda',
            compensaciones: 'Compensaciones'
        };
        return labels[role] || role;
    };

    if (loading) {
        return (
            <div className="text-center py-32 white-label-card">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand mx-auto"></div>
                <p className="mt-6 text-label animate-pulse tracking-widest uppercase">Sincronizando equipo...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header & Controls */}
            <div className="flex flex-col gap-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-title-dashboard flex items-center gap-3">
                            <span className="w-12 h-12 rounded-2xl bg-brand/10 flex items-center justify-center text-brand">
                                <Users size={24} />
                            </span>
                            Gestión de Equipo
                        </h2>
                        <p className="text-sm text-slate-500 mt-1 ml-15">Administra los accesos y roles de tu organización.</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowBulkImportModal(true)}
                            className="h-12 px-6 bg-slate-100 text-slate-700 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all flex items-center gap-2"
                        >
                            <Upload size={16} />
                            <span className="hidden sm:inline">Importación Masiva</span>
                        </button>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="h-12 px-6 bg-brand text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:opacity-90 transition-all shadow-xl shadow-brand/20 flex items-center gap-2"
                        >
                            <Plus size={16} strokeWidth={3} />
                            <span className="hidden sm:inline">Nuevo Miembro</span>
                        </button>
                    </div>
                </div>

                {/* Advanced Filters */}
                <div className="white-label-card p-4 flex flex-wrap items-center gap-4">
                    <div className="flex-1 min-w-[200px] relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o correo..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full h-12 pl-12 pr-4 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-brand/20 transition-all"
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative group">
                            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <select
                                value={filterRole}
                                onChange={(e) => setFilterRole(e.target.value)}
                                className="h-12 pl-10 pr-10 bg-white border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-brand/20 appearance-none min-w-[180px]"
                            >
                                <option value="all">Filtro por Rol</option>
                                <option value="supervisor">Supervisores</option>
                                <option value="jefe_marca">Jefes de Marca</option>
                                <option value="recruiter">Recruiters</option>
                                <option value="store_manager">Gerentes</option>
                                <option value="compensaciones">Compensaciones</option>
                            </select>
                        </div>

                        <select
                            value={filterMarca}
                            onChange={(e) => setFilterMarca(e.target.value)}
                            className="h-12 px-6 bg-white border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-brand/20 appearance-none min-w-[180px]"
                        >
                            <option value="all">Todas las Marcas</option>
                            {marcas.map(m => (
                                <option key={m.id} value={m.id}>{m.nombre}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* User Grid */}
            {filteredAssignments.length === 0 ? (
                <div className="white-label-card py-24 text-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <Search size={32} className="text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">No se encontraron miembros</h3>
                    <p className="text-slate-500 max-w-xs mx-auto text-sm">Ajusta los filtros o intenta con una búsqueda diferente.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredAssignments.map(assignment => (
                        <div key={assignment.id} className="white-label-card p-6 group hover:translate-y-[-4px] transition-all duration-300">
                            <div className="flex items-start justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 font-black text-xl group-hover:bg-brand group-hover:text-white transition-all shadow-sm">
                                        {assignment.displayName?.[0]}
                                    </div>
                                    <div className="flex flex-col">
                                        <h3 className="font-bold text-slate-900 group-hover:text-brand transition-colors truncate max-w-[160px]">
                                            {assignment.displayName}
                                        </h3>
                                        <span className="text-[10px] text-slate-400 font-medium tracking-tight truncate max-w-[160px]">
                                            {assignment.email}
                                        </span>
                                    </div>
                                </div>
                                <span className={getRoleBadge(assignment.role)}>
                                    {getRoleLabel(assignment.role)}
                                </span>
                            </div>

                            <div className="space-y-4 mb-8">
                                <div className="flex flex-col gap-2.5">
                                    <div className="flex items-center gap-2.5 text-xs text-slate-500 bg-slate-50/50 p-3 rounded-xl border border-slate-100/50">
                                        <Building2 size={14} className="text-slate-400" />
                                        <span className="font-medium truncate">
                                            {assignment.role === 'store_manager'
                                                ? assignment.assignedStore?.tiendaNombre
                                                : marcas.find(m => m.id === getUserMarcaId(assignment))?.nombre || 'Acceso Corporativo'}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2.5 text-[10px] text-slate-400 font-black uppercase tracking-widest pl-3">
                                        <Smartphone size={12} />
                                        <span>Mobile Access Enabled</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => setEditingUser(assignment)}
                                    className="flex-1 h-11 bg-slate-50 text-slate-600 rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-brand/10 hover:text-brand transition-all flex items-center justify-center gap-2"
                                >
                                    <Pencil size={14} />
                                    Editar
                                </button>
                                <button
                                    onClick={() => handleResetPassword(assignment.userId, assignment.email)}
                                    className="h-11 w-11 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center hover:bg-amber-100 transition-all"
                                    title="Reset Password"
                                >
                                    <Key size={16} />
                                </button>
                                <button
                                    onClick={() => handleDeleteUser(assignment.userId, assignment.email, assignment.displayName)}
                                    className="h-11 w-11 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center hover:bg-rose-100 transition-all"
                                    title="Delete User"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modals */}
            {showCreateModal && (
                <CreateUserModal
                    holdingId={holdingId}
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={() => {
                        setShowCreateModal(false);
                        loadAssignments();
                    }}
                />
            )}

            {editingUser && (
                <EditUserModal
                    user={editingUser}
                    holdingId={holdingId}
                    onClose={() => setEditingUser(null)}
                    onSuccess={() => {
                        setEditingUser(null);
                        loadAssignments();
                    }}
                />
            )}

            <BulkImportUsersModal
                show={showBulkImportModal}
                holdingId={holdingId}
                createdBy={authUser?.email || 'admin@liah.ai'}
                onCancel={() => setShowBulkImportModal(false)}
                onComplete={() => {
                    setShowBulkImportModal(false);
                    loadAssignments();
                }}
            />
        </div>
    );
}
