'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function PendingUsersActivation() {
    const [pendingUsers, setPendingUsers] = useState<any[]>([]);
    const [holdings, setHoldings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedHolding, setSelectedHolding] = useState('all');

    useEffect(() => {
        loadData();
    }, [selectedHolding]);

    async function loadData() {
        try {
            // Load holdings for passwords
            const holdingsSnap = await getDocs(collection(db, 'holdings'));
            const holdingsData = holdingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setHoldings(holdingsData);

            // Load users
            const assignmentsRef = collection(db, 'userAssignments');
            let q;

            if (selectedHolding === 'all') {
                q = query(assignmentsRef, where('active', '==', true));
            } else {
                q = query(
                    assignmentsRef,
                    where('holdingId', '==', selectedHolding),
                    where('active', '==', true)
                );
            }

            const snapshot = await getDocs(q);
            const all = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Filter only pending (userId starts with "pending_")
            const pending = all.filter((user: any) =>
                user.userId && user.userId.toString().startsWith('pending_')
            );

            setPendingUsers(pending);
            console.log('✅ Usuarios pendientes:', pending.length);
        } catch (error) {
            console.error('Error loading pending users:', error);
        } finally {
            setLoading(false);
        }
    }

    function generateFirebaseJSON() {
        const users = pendingUsers.map(user => {
            const holding = holdings.find(h => h.id === user.holdingId);
            const tempPassword = holding?.config?.tempPassword || 'NGR2024!Cambiar';

            return {
                localId: user.userId.replace('pending_', ''), // Remove prefix
                email: user.email,
                emailVerified: false,
                passwordHash: Buffer.from(tempPassword).toString('base64'),
                salt: Buffer.from('').toString('base64'),
                createdAt: Date.now().toString(),
                lastLoginAt: Date.now().toString(),
                displayName: user.displayName
            };
        });

        const json = JSON.stringify({ users }, null, 2);

        // Download as file
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'firebase-users-import.json';
        a.click();
        URL.revokeObjectURL(url);

        alert(`✅ Archivo generado con ${users.length} usuarios`);
    }

    if (loading) {
        return (
            <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Cargando usuarios pendientes...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Activar Usuarios Pendientes</h2>
                    <p className="text-sm text-gray-600 mt-1">
                        Usuarios creados en Firestore que necesitan cuenta en Firebase Auth
                    </p>
                </div>

                {pendingUsers.length > 0 && (
                    <button
                        onClick={generateFirebaseJSON}
                        className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center gap-2"
                    >
                        📥 Generar Archivo de Importación
                    </button>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <div className="glass-card rounded-xl p-4">
                    <p className="text-sm text-gray-600 mb-1">Pendientes</p>
                    <p className="text-3xl font-bold text-amber-600">{pendingUsers.length}</p>
                </div>
                <div className="glass-card rounded-xl p-4">
                    <p className="text-sm text-gray-600 mb-1">Password Temporal</p>
                    <p className="text-lg font-mono text-violet-600">
                        {selectedHolding === 'all'
                            ? 'Según Holding'
                            : (holdings.find(h => h.id === selectedHolding)?.config?.tempPassword || 'NGR2024!Cambiar')}
                    </p>
                </div>
                <div className="glass-card rounded-xl p-4">
                    <p className="text-sm text-gray-600 mb-1">Método</p>
                    <p className="text-sm font-medium text-gray-900">Firebase CLI</p>
                </div>
            </div>

            {/* Instructions */}
            {pendingUsers.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                    <h3 className="font-bold text-blue-900 mb-3">📋 Instrucciones de Activación</h3>
                    <ol className="text-sm text-blue-800 space-y-2">
                        <li><strong>1.</strong> Click en "Generar Archivo de Importación"</li>
                        <li><strong>2.</strong> Se descargará <code className="bg-blue-100 px-1 rounded">firebase-users-import.json</code></li>
                        <li><strong>3.</strong> Abre terminal y ejecuta:
                            <pre className="bg-blue-100 p-2 rounded mt-1 text-xs overflow-x-auto">
                                firebase auth:import firebase-users-import.json --hash-algo=HMAC_SHA256 --hash-key=secret
                            </pre>
                        </li>
                        <li><strong>4.</strong> Los usuarios podrán hacer login con su email y el password configurado para su Holding.</li>
                        <li><strong>5.</strong> En primer login, se les forzará cambiar la contraseña</li>
                    </ol>
                </div>
            )}

            {/* Users List */}
            {pendingUsers.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">✅ No hay usuarios pendientes de activación</p>
                    <p className="text-sm text-gray-400 mt-1">Todos los usuarios importados ya tienen cuenta en Firebase Auth</p>
                </div>
            ) : (
                <div className="glass-card rounded-xl overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Holding</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {pendingUsers.map(user => (
                                <tr key={user.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-sm text-gray-900">{user.email}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900">{user.displayName}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        <span className="px-2 py-1 bg-violet-100 text-violet-700 rounded text-xs">
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{user.holdingId}</td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-medium">
                                            ⏳ Pendiente
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
