'use client';

import { useState, useEffect } from 'react';
import { getAllUserAssignments, deactivateUser } from '@/lib/firestore/user-assignment-actions';
import type { UserAssignment } from '@/lib/firestore/user-assignments';
import CreateUserModal from './CreateUserModal';
import EditUserModal from './EditUserModal';
import BulkImportUsersModal from './BulkImportUsersModal';

interface UserManagementViewProps {
    holdingId?: string;
}

export default function UserManagementView({ holdingId = 'ngr' }: UserManagementViewProps) {
    const [assignments, setAssignments] = useState<UserAssignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showBulkImportModal, setShowBulkImportModal] = useState(false);
    const [editingUser, setEditingUser] = useState<UserAssignment | null>(null);
    const [filterRole, setFilterRole] = useState<string>('all');

    useEffect(() => {
        loadAssignments();
    }, []);

    async function loadAssignments() {
        try {
            const data = await getAllUserAssignments();

            // Normalize holdingId for comparison (supports 'ngr', 'holding-ngr', etc.)
            const normalizeHoldingId = (id: string | null | undefined): string => {
                if (!id) return '';
                return id.toLowerCase().replace('holding-', '').replace('holding_', '');
            };

            const normalizedHoldingId = normalizeHoldingId(holdingId);

            // Filter: only users from this holding AND exclude super_admin
            const filtered = data.filter(user => {
                const userHolding = normalizeHoldingId(user.holdingId);
                return userHolding === normalizedHoldingId && user.role !== 'super_admin';
            });

            // Sort by most recent first
            filtered.sort((a, b) => {
                const aTime = a.createdAt?.toMillis?.() || 0;
                const bTime = b.createdAt?.toMillis?.() || 0;
                return bTime - aTime;
            });

            setAssignments(filtered);
            console.log(`✅ Usuarios cargados para holding ${holdingId} (normalized: ${normalizedHoldingId}):`, filtered.length);
        } catch (error) {
            console.error('Error loading assignments:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleDeactivate(userId: string, displayName: string) {
        const confirmed = confirm(`¿Desactivar usuario ${displayName}?`);
        if (!confirmed) return;

        try {
            await deactivateUser(userId);
            alert('Usuario desactivado');
            loadAssignments();
        } catch (error) {
            console.error('Error deactivating user:', error);
            alert('Error al desactivar usuario');
        }
    }

    const filteredAssignments = filterRole === 'all'
        ? assignments
        : assignments.filter(a => a.role === filterRole);

    const getRoleLabel = (role: string) => {
        const labels: Record<string, string> = {
            client_admin: '👨‍💼 Administrador',
            supervisor: '👔 Supervisor',
            jefe_marca: '🎯 Jefe de Marca',
            recruiter: '🔍 Recruiter',
            store_manager: '🏪 Store Manager'
        };
        return labels[role] || role;
    };

    if (loading) {
        return (
            <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Cargando usuarios...</p>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h2>

                    {/* Role Filter */}
                    <select
                        value={filterRole}
                        onChange={(e) => setFilterRole(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-violet-500 focus:border-violet-500"
                    >
                        <option value="all">Todos los roles ({assignments.length})</option>
                        <option value="supervisor">Supervisores</option>
                        <option value="jefe_marca">Jefes de Marca</option>
                        <option value="recruiter">Recruiters</option>
                        <option value="store_manager">Store Managers</option>
                    </select>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => setShowBulkImportModal(true)}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center gap-2"
                    >
                        📁 Importar Masivo
                    </button>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-6 py-2 bg-violet-600 text-white rounded-lg font-semibold hover:bg-violet-700 transition-colors"
                    >
                        ➕ Crear Usuario
                    </button>
                </div>
            </div>

            {/* Users List */}
            {filteredAssignments.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">No hay usuarios asignados</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredAssignments.map(assignment => (
                        <div key={assignment.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="font-semibold text-gray-900">{assignment.displayName}</h3>
                                    <p className="text-sm text-gray-500">{assignment.email}</p>
                                </div>
                                <span className="text-2xl">{getRoleLabel(assignment.role).split(' ')[0]}</span>
                            </div>

                            <div className="mb-4">
                                <p className="text-sm font-medium text-gray-700 mb-2">
                                    {getRoleLabel(assignment.role)}
                                </p>

                                {/* Assigned Stores (Supervisor) */}
                                {assignment.role === 'supervisor' && assignment.assignedStores && (
                                    <div className="text-sm text-gray-600">
                                        <p className="font-medium">🏪 Tiendas asignadas: {assignment.assignedStores.length}</p>
                                        <ul className="mt-1 space-y-1">
                                            {assignment.assignedStores.slice(0, 3).map(store => (
                                                <li key={store.tiendaId} className="text-xs">
                                                    • {store.tiendaNombre}
                                                </li>
                                            ))}
                                            {assignment.assignedStores.length > 3 && (
                                                <li className="text-xs text-gray-400">
                                                    + {assignment.assignedStores.length - 3} más
                                                </li>
                                            )}
                                        </ul>
                                    </div>
                                )}

                                {/* Assigned Marca(s) (Jefe de Marca / Recruiter) */}
                                {(assignment.role === 'jefe_marca' || assignment.role === 'recruiter') && (
                                    <div className="text-sm text-gray-600">
                                        {assignment.assignedMarcas && assignment.assignedMarcas.length > 0 ? (
                                            <>
                                                <p className="font-medium">🏢 Marcas: {assignment.assignedMarcas.length}</p>
                                                <ul className="mt-1 space-y-0.5">
                                                    {assignment.assignedMarcas.slice(0, 3).map(marca => (
                                                        <li key={marca.marcaId} className="text-xs">
                                                            • {marca.marcaNombre || marca.marcaId}
                                                        </li>
                                                    ))}
                                                    {assignment.assignedMarcas.length > 3 && (
                                                        <li className="text-xs text-gray-400">
                                                            + {assignment.assignedMarcas.length - 3} más
                                                        </li>
                                                    )}
                                                </ul>
                                            </>
                                        ) : assignment.assignedMarca ? (
                                            <p>🏢 Marca: <span className="font-medium">{assignment.assignedMarca.marcaNombre || assignment.assignedMarca.marcaId}</span></p>
                                        ) : (
                                            <p className="text-gray-400 italic">Sin marca asignada</p>
                                        )}
                                    </div>
                                )}

                                {/* Assigned Store (Store Manager) */}
                                {assignment.role === 'store_manager' && assignment.assignedStore && (
                                    <div className="text-sm text-gray-600">
                                        <p>🏪 Tienda: <span className="font-medium">{assignment.assignedStore.tiendaNombre}</span></p>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => setEditingUser(assignment)}
                                    className="flex-1 px-4 py-2 text-sm text-violet-600 border border-violet-300 rounded-lg hover:bg-violet-50 transition-colors"
                                >
                                    ✏️ Editar
                                </button>
                                <button
                                    onClick={() => handleDeactivate(assignment.userId, assignment.displayName)}
                                    className="flex-1 px-4 py-2 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                                >
                                    🗑️ Eliminar
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create User Modal */}
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

            {/* Edit User Modal */}
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

            {/* Bulk Import Modal */}
            <BulkImportUsersModal
                show={showBulkImportModal}
                holdingId="ngr"
                createdBy="admin@ngr.pe"
                onCancel={() => setShowBulkImportModal(false)}
                onComplete={(result) => {
                    setShowBulkImportModal(false);
                    loadAssignments();
                    alert(`Importación completada: ${result.successCount}/${result.totalUsers} usuarios creados`);
                }}
            />
        </div>
    );
}
