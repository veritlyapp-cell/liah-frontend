'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface PendingItem {
    id: string;
    type: 'rq_approval' | 'candidate_validation' | 'ingreso_pending';
    title: string;
    subtitle: string;
    timestamp?: Date;
    link?: string;
}

interface NotificationBellProps {
    marcaId?: string;
    storeId?: string;
    storeIds?: string[];
}

export default function NotificationBell({ marcaId, storeId, storeIds }: NotificationBellProps) {
    const { user, claims } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
    const [loading, setLoading] = useState(true);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const role = claims?.role;

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Load pending items based on role
    useEffect(() => {
        if (!user || !role) return;

        loadPendingItems();

        // Refresh every 2 minutes
        const interval = setInterval(loadPendingItems, 120000);
        return () => clearInterval(interval);
    }, [user, role, marcaId, storeId, storeIds]);

    async function loadPendingItems() {
        setLoading(true);
        try {
            const items: PendingItem[] = [];

            // Based on role, load different pending items
            if (role === 'jefe_marca' && marcaId) {
                // RQs pending approval for Jefe de Marca
                const rqsRef = collection(db, 'rqs');
                const rqQuery = query(
                    rqsRef,
                    where('marcaId', '==', marcaId),
                    where('approvalStatus', '==', 'pending'),
                    where('currentApprovalLevel', '==', 3) // Level 3 = Jefe Marca
                );
                const rqSnapshot = await getDocs(rqQuery);
                rqSnapshot.docs.forEach(doc => {
                    const data = doc.data();
                    items.push({
                        id: doc.id,
                        type: 'rq_approval',
                        title: `RQ por aprobar: ${data.posicion}`,
                        subtitle: `${data.tiendaNombre} - ${data.vacantes} vacante(s)`,
                        timestamp: data.createdAt?.toDate?.()
                    });
                });
            }

            if (role === 'supervisor' && storeIds && storeIds.length > 0) {
                // RQs pending at supervisor level
                const rqsRef = collection(db, 'rqs');
                // Can't query with 'in' + multiple conditions, so query all and filter
                const allRQsSnapshot = await getDocs(rqsRef);
                allRQsSnapshot.docs.forEach(doc => {
                    const data = doc.data();
                    if (
                        storeIds.includes(data.tiendaId) &&
                        data.approvalStatus === 'pending' &&
                        data.currentApprovalLevel === 2
                    ) {
                        items.push({
                            id: doc.id,
                            type: 'rq_approval',
                            title: `RQ por aprobar: ${data.posicion}`,
                            subtitle: `${data.tiendaNombre}`,
                            timestamp: data.createdAt?.toDate?.()
                        });
                    }
                });
            }

            if ((role === 'recruiter' || role === 'brand_recruiter') && marcaId) {
                // Candidates pending CUL validation
                const candidatesRef = collection(db, 'candidates');
                const candidateSnapshot = await getDocs(candidatesRef);
                candidateSnapshot.docs.forEach(doc => {
                    const data = doc.data();
                    const hasApprovedApp = data.applications?.some((app: any) =>
                        app.marcaId === marcaId && app.status === 'approved'
                    );
                    if (hasApprovedApp && (!data.culStatus || data.culStatus === 'pending')) {
                        items.push({
                            id: doc.id,
                            type: 'candidate_validation',
                            title: `Validar CUL: ${data.nombre} ${data.apellidoPaterno}`,
                            subtitle: `DNI: ${data.dni}`,
                            timestamp: data.createdAt?.toDate?.()
                        });
                    }
                });
            }

            if (role === 'store_manager' && storeId) {
                // Candidates pending ingreso confirmation
                const candidatesRef = collection(db, 'candidates');
                const candidateSnapshot = await getDocs(candidatesRef);
                candidateSnapshot.docs.forEach(doc => {
                    const data = doc.data();
                    const storeApp = data.applications?.find((app: any) =>
                        app.tiendaId === storeId && app.status === 'approved'
                    );
                    // Selected by recruiter but not yet confirmed ingreso
                    if (storeApp && data.selectionStatus === 'selected' && !data.hiredAt) {
                        items.push({
                            id: doc.id,
                            type: 'ingreso_pending',
                            title: `Confirmar ingreso: ${data.nombre} ${data.apellidoPaterno}`,
                            subtitle: storeApp.posicion || 'Candidato seleccionado',
                            timestamp: data.selectedAt?.toDate?.()
                        });
                    }
                });
            }

            setPendingItems(items);
        } catch (error) {
            console.error('Error loading pending items:', error);
        } finally {
            setLoading(false);
        }
    }

    const totalPending = pendingItems.length;

    // Group items by type
    const rqItems = pendingItems.filter(i => i.type === 'rq_approval');
    const validationItems = pendingItems.filter(i => i.type === 'candidate_validation');
    const ingresoItems = pendingItems.filter(i => i.type === 'ingreso_pending');

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Notificaciones"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>

                {/* Badge */}
                {totalPending > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 animate-pulse">
                        {totalPending > 99 ? '99+' : totalPending}
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50 max-h-[70vh] overflow-hidden">
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-xl">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-gray-900">Pendientes</h3>
                            <span className="text-sm text-gray-500">{totalPending} items</span>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="overflow-y-auto max-h-[50vh]">
                        {loading ? (
                            <div className="px-4 py-8 text-center text-gray-500">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-600 mx-auto mb-2"></div>
                                Cargando...
                            </div>
                        ) : totalPending === 0 ? (
                            <div className="px-4 py-8 text-center">
                                <div className="text-4xl mb-2">✅</div>
                                <p className="text-gray-500">¡No hay pendientes!</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {/* RQ Approvals Section */}
                                {rqItems.length > 0 && (
                                    <div>
                                        <div className="px-4 py-2 bg-amber-50 text-amber-800 text-xs font-medium uppercase">
                                            📋 RQs por aprobar ({rqItems.length})
                                        </div>
                                        {rqItems.slice(0, 5).map(item => (
                                            <div key={item.id} className="px-4 py-3 hover:bg-gray-50 cursor-pointer">
                                                <p className="text-sm font-medium text-gray-900">{item.title}</p>
                                                <p className="text-xs text-gray-500">{item.subtitle}</p>
                                            </div>
                                        ))}
                                        {rqItems.length > 5 && (
                                            <div className="px-4 py-2 text-xs text-gray-500 text-center">
                                                +{rqItems.length - 5} más...
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Candidate Validation Section */}
                                {validationItems.length > 0 && (
                                    <div>
                                        <div className="px-4 py-2 bg-blue-50 text-blue-800 text-xs font-medium uppercase">
                                            📄 CUL por validar ({validationItems.length})
                                        </div>
                                        {validationItems.slice(0, 5).map(item => (
                                            <div key={item.id} className="px-4 py-3 hover:bg-gray-50 cursor-pointer">
                                                <p className="text-sm font-medium text-gray-900">{item.title}</p>
                                                <p className="text-xs text-gray-500">{item.subtitle}</p>
                                            </div>
                                        ))}
                                        {validationItems.length > 5 && (
                                            <div className="px-4 py-2 text-xs text-gray-500 text-center">
                                                +{validationItems.length - 5} más...
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Ingreso Pending Section */}
                                {ingresoItems.length > 0 && (
                                    <div>
                                        <div className="px-4 py-2 bg-green-50 text-green-800 text-xs font-medium uppercase">
                                            ✅ Confirmar ingreso ({ingresoItems.length})
                                        </div>
                                        {ingresoItems.slice(0, 5).map(item => (
                                            <div key={item.id} className="px-4 py-3 hover:bg-gray-50 cursor-pointer">
                                                <p className="text-sm font-medium text-gray-900">{item.title}</p>
                                                <p className="text-xs text-gray-500">{item.subtitle}</p>
                                            </div>
                                        ))}
                                        {ingresoItems.length > 5 && (
                                            <div className="px-4 py-2 text-xs text-gray-500 text-center">
                                                +{ingresoItems.length - 5} más...
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {totalPending > 0 && (
                        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                            <button
                                onClick={() => {
                                    loadPendingItems();
                                    setIsOpen(false);
                                }}
                                className="w-full text-center text-sm text-violet-600 hover:text-violet-700 font-medium"
                            >
                                🔄 Actualizar
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
