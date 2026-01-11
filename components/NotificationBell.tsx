'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface PendingItem {
    id: string;
    type: 'rq_approval' | 'candidate_validation' | 'ingreso_pending' | 'remaining_slots';
    title: string;
    subtitle: string;
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
    const [pendingCount, setPendingCount] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);
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

    // Quick count on mount (lightweight query for badge only)
    useEffect(() => {
        if (!user || !role) return;
        loadQuickCount();
    }, [user, role, marcaId, storeId, storeIds]);

    // Load quick count for badge (using indexed queries where possible)
    async function loadQuickCount() {
        try {
            let count = 0;

            // RQ approval counts (these are efficient - using indexed fields)
            if (role === 'jefe_marca' && marcaId) {
                const rqQuery = query(
                    collection(db, 'rqs'),
                    where('marcaId', '==', marcaId),
                    where('approvalStatus', '==', 'pending'),
                    where('currentApprovalLevel', '==', 3),
                    limit(20)
                );
                const snap = await getDocs(rqQuery);
                count += snap.size;
            }

            if (role === 'supervisor' && marcaId) {
                const rqQuery = query(
                    collection(db, 'rqs'),
                    where('marcaId', '==', marcaId),
                    where('approvalStatus', '==', 'pending'),
                    where('currentApprovalLevel', '==', 2),
                    limit(20)
                );
                const snap = await getDocs(rqQuery);
                count += snap.size;
            }

            // For recruiter/store_manager - use indexed culStatus/selectionStatus queries
            if ((role === 'recruiter' || role === 'brand_recruiter') && marcaId) {
                // Query candidates with pending CUL - requires index on culStatus
                const culQuery = query(
                    collection(db, 'candidates'),
                    where('culStatus', '==', 'pending'),
                    limit(50)
                );
                const snap = await getDocs(culQuery);
                // Filter by marca in memory (cheaper than no index)
                const marcaCandidates = snap.docs.filter(doc => {
                    const data = doc.data();
                    return data.applications?.some((app: any) =>
                        app.marcaId === marcaId && app.status === 'approved'
                    );
                });
                count += marcaCandidates.length;
            }

            if (role === 'store_manager' && storeId) {
                // Query selected candidates - requires index on selectionStatus
                const selectedQuery = query(
                    collection(db, 'candidates'),
                    where('selectionStatus', '==', 'selected'),
                    limit(50)
                );
                const snap = await getDocs(selectedQuery);
                // Filter by store in memory
                const storeCandidates = snap.docs.filter(doc => {
                    const data = doc.data();
                    return !data.hiredAt && data.applications?.some((app: any) =>
                        app.tiendaId === storeId && app.status === 'approved'
                    );
                });
                count += storeCandidates.length;
            }

            setPendingCount(count);
        } catch (error) {
            console.error('Error loading pending count:', error);
            setPendingCount(0);
        }
    }

    // Full load when dropdown opens (lazy loading)
    const loadPendingItems = useCallback(async () => {
        if (loading) return;
        setLoading(true);

        try {
            const items: PendingItem[] = [];

            if (role === 'jefe_marca' && marcaId) {
                const rqQuery = query(
                    collection(db, 'rqs'),
                    where('marcaId', '==', marcaId),
                    where('approvalStatus', '==', 'pending'),
                    where('currentApprovalLevel', '==', 3),
                    limit(10)
                );
                const snap = await getDocs(rqQuery);
                snap.docs.forEach(doc => {
                    const data = doc.data();
                    items.push({
                        id: doc.id,
                        type: 'rq_approval',
                        title: `RQ: ${data.posicion}`,
                        subtitle: data.tiendaNombre
                    });
                });
            }

            if (role === 'supervisor' && marcaId) {
                const rqQuery = query(
                    collection(db, 'rqs'),
                    where('marcaId', '==', marcaId),
                    where('approvalStatus', '==', 'pending'),
                    where('currentApprovalLevel', '==', 2),
                    limit(10)
                );
                const snap = await getDocs(rqQuery);
                snap.docs.forEach(doc => {
                    const data = doc.data();
                    if (!storeIds || storeIds.includes(data.tiendaId)) {
                        items.push({
                            id: doc.id,
                            type: 'rq_approval',
                            title: `RQ: ${data.posicion}`,
                            subtitle: data.tiendaNombre
                        });
                    }
                });
            }

            if ((role === 'recruiter' || role === 'brand_recruiter') && marcaId) {
                const culQuery = query(
                    collection(db, 'candidates'),
                    where('culStatus', '==', 'pending'),
                    limit(20)
                );
                const snap = await getDocs(culQuery);
                snap.docs.forEach(doc => {
                    const data = doc.data();
                    const hasApprovedApp = data.applications?.some((app: any) =>
                        app.marcaId === marcaId && app.status === 'approved'
                    );
                    if (hasApprovedApp) {
                        items.push({
                            id: doc.id,
                            type: 'candidate_validation',
                            title: `CUL: ${data.nombre} ${data.apellidoPaterno}`,
                            subtitle: `DNI: ${data.dni}`
                        });
                    }
                });
            }

            if ((role === 'recruiter' || role === 'brand_recruiter') && marcaId) {
                // ... (candidates logic remains same)

                // ADDED: RQs with remaining slots
                const rqsRef = collection(db, 'rqs');
                const rqQuery = query(
                    rqsRef,
                    where('marcaId', '==', marcaId),
                    where('status', '==', 'recruiting'),
                    limit(15)
                );
                const rqSnap = await getDocs(rqQuery);
                rqSnap.docs.forEach(doc => {
                    const data = doc.data();
                    const filled = data.filledSlots || 0;
                    const total = data.vacantes || 0;
                    if (filled < total) {
                        items.push({
                            id: doc.id,
                            type: 'remaining_slots',
                            title: `RQ abierto: ${data.posicion}`,
                            subtitle: `${data.tiendaNombre} - ${total - filled} vacantes rest.`
                        });
                    }
                });
            }

            if (role === 'store_manager' && storeId) {
                const selectedQuery = query(
                    collection(db, 'candidates'),
                    where('selectionStatus', '==', 'selected'),
                    limit(20)
                );
                const snap = await getDocs(selectedQuery);
                snap.docs.forEach(doc => {
                    const data = doc.data();
                    const storeApp = data.applications?.find((app: any) =>
                        app.tiendaId === storeId && app.status === 'approved'
                    );
                    if (storeApp && !data.hiredAt) {
                        items.push({
                            id: doc.id,
                            type: 'ingreso_pending',
                            title: `Ingreso: ${data.nombre} ${data.apellidoPaterno}`,
                            subtitle: storeApp.posicion || 'Seleccionado'
                        });
                    }
                });
            }

            setPendingItems(items);
            setPendingCount(items.length);
            setHasLoaded(true);
        } catch (error) {
            console.error('Error loading pending items:', error);
        } finally {
            setLoading(false);
        }
    }, [role, marcaId, storeId, storeIds, loading]);

    // Load items when dropdown opens
    useEffect(() => {
        if (isOpen && !hasLoaded) {
            loadPendingItems();
        }
    }, [isOpen, hasLoaded, loadPendingItems]);

    const rqItems = pendingItems.filter(i => i.type === 'rq_approval');
    const validationItems = pendingItems.filter(i => i.type === 'candidate_validation');
    const ingresoItems = pendingItems.filter(i => i.type === 'ingreso_pending');
    const slotItems = pendingItems.filter(i => i.type === 'remaining_slots');

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Notificaciones"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>

                {pendingCount !== null && pendingCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                        {pendingCount > 99 ? '99+' : pendingCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                        <h3 className="font-semibold text-gray-900 text-sm">Pendientes</h3>
                        <button
                            onClick={() => { setHasLoaded(false); loadPendingItems(); }}
                            className="text-xs text-violet-600 hover:text-violet-700"
                        >
                            🔄
                        </button>
                    </div>

                    <div className="max-h-[300px] overflow-y-auto">
                        {loading ? (
                            <div className="px-4 py-6 text-center text-gray-500 text-sm">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-violet-600 mx-auto mb-2"></div>
                                Cargando...
                            </div>
                        ) : pendingItems.length === 0 ? (
                            <div className="px-4 py-6 text-center">
                                <div className="text-3xl mb-1">✅</div>
                                <p className="text-gray-500 text-sm">¡Sin pendientes!</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {rqItems.length > 0 && (
                                    <div>
                                        <div className="px-3 py-1.5 bg-amber-50 text-amber-700 text-xs font-medium">
                                            📋 RQs ({rqItems.length})
                                        </div>
                                        {rqItems.slice(0, 5).map(item => (
                                            <div key={item.id} className="px-3 py-2 hover:bg-gray-50 cursor-pointer">
                                                <p className="text-sm font-medium text-gray-900">{item.title}</p>
                                                <p className="text-xs text-gray-500">{item.subtitle}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {validationItems.length > 0 && (
                                    <div>
                                        <div className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium">
                                            📄 CUL ({validationItems.length})
                                        </div>
                                        {validationItems.slice(0, 5).map(item => (
                                            <div key={item.id} className="px-3 py-2 hover:bg-gray-50 cursor-pointer">
                                                <p className="text-sm font-medium text-gray-900">{item.title}</p>
                                                <p className="text-xs text-gray-500">{item.subtitle}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {ingresoItems.length > 0 && (
                                    <div>
                                        <div className="px-3 py-1.5 bg-green-50 text-green-700 text-xs font-medium">
                                            ✅ Ingreso ({ingresoItems.length})
                                        </div>
                                        {ingresoItems.slice(0, 5).map(item => (
                                            <div key={item.id} className="px-3 py-2 hover:bg-gray-50 cursor-pointer">
                                                <p className="text-sm font-medium text-gray-900">{item.title}</p>
                                                <p className="text-xs text-gray-500">{item.subtitle}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {/* Remaining Slots Section */}
                                {slotItems.length > 0 && (
                                    <div>
                                        <div className="px-3 py-1.5 bg-purple-50 text-purple-700 text-xs font-medium">
                                            🔥 Vacantes abiertas ({slotItems.length})
                                        </div>
                                        {slotItems.slice(0, 5).map(item => (
                                            <div key={item.id} className="px-3 py-2 hover:bg-gray-50 cursor-pointer">
                                                <p className="text-sm font-medium text-gray-900">{item.title}</p>
                                                <p className="text-xs text-gray-500">{item.subtitle}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
