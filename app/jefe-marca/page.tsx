'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserAssignment } from '@/lib/firestore/user-assignments';
import type { UserAssignment } from '@/lib/firestore/user-assignments';
import MarcaStatsCards from '@/components/jefe-marca/MarcaStatsCards';
import DashboardHeader from '@/components/DashboardHeader';
import CandidatesListView from '@/components/CandidatesListView';
import ConfigurationView from '@/components/ConfigurationView';
import CompensacionesTab from '@/components/talent/CompensacionesTab';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { subscribeToAllRQs, type RQ } from '@/lib/firestore/rqs';
import { getStoresByMarca } from '@/lib/firestore/recruiter-queries';
import ApprovedRQSummary from '@/components/admin/ApprovedRQSummary';
import RQListView from '@/components/RQListView';
import InviteCandidateModal from '@/components/InviteCandidateModal';
import ReportarBajaModal from '@/components/talent/ReportarBajaModal';
import SupervisorCreateRQView from '@/components/supervisor/SupervisorCreateRQView';
import { X, Store, Building2 } from 'lucide-react';

export default function JefeMarcaDashboard() {
    const { user, claims, signOut } = useAuth();
    const [assignment, setAssignment] = useState<UserAssignment | null>(null);
    const [activeTab, setActiveTab] = useState<'home' | 'rqs' | 'create' | 'candidates' | 'compensaciones' | 'configuracion'>('home');
    const [loading, setLoading] = useState(true);
    const [allRQs, setAllRQs] = useState<RQ[]>([]);
    const [brandStores, setBrandStores] = useState<any[]>([]);
    const [quickAction, setQuickAction] = useState<{ type: 'invite' | 'baja', storeId?: string, storeName?: string, marcaId?: string, marcaNombre?: string } | null>(null);
    const [showStoreSelector, setShowStoreSelector] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        async function loadAssignment() {
            if (!user) return;

            try {
                const userAssignment = await getUserAssignment(user.uid);
                setAssignment(userAssignment);
                
                const mid = userAssignment?.assignedMarca?.marcaId || userAssignment?.assignedStores?.[0]?.marcaId;
                if (mid) {
                    const stores = await getStoresByMarca(mid);
                    setBrandStores(stores.map(s => ({
                        tiendaId: s.id,
                        tiendaNombre: s.nombre,
                        marcaId: s.marcaId,
                        marcaNombre: s.marcaNombre || userAssignment?.assignedMarca?.marcaNombre
                    })));
                }
            } catch (error) {
                console.error('Error loading assignment:', error);
            } finally {
                setLoading(false);
            }
        }

        loadAssignment();

        if (assignment?.holdingId && (assignment?.assignedMarca?.marcaId || assignment?.assignedStores?.[0]?.marcaId)) {
            const brandId = assignment.assignedMarca?.marcaId || assignment.assignedStores?.[0]?.marcaId;
            const unsubscribe = subscribeToAllRQs(assignment.holdingId, (loadedRQs) => {
                const filtered = loadedRQs.filter(rq => rq.marcaId === brandId);
                setAllRQs(filtered);
            });
            return () => unsubscribe();
        }
    }, [user, assignment?.holdingId, assignment?.assignedMarca?.marcaId, assignment?.assignedStores]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Cargando...</p>
                </div>
            </div>
        );
    }

    if (!assignment || assignment.role !== 'jefe_marca') {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Acceso Denegado</h2>
                    <p className="text-gray-600 mb-6">No tienes permisos de Jefe de Marca.</p>
                    <button
                        onClick={signOut}
                        className="w-full py-3 px-4 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700 transition-colors"
                    >
                        Cerrar Sesión
                    </button>
                </div>
            </div>
        );
    }

    const rawMarcaId = assignment.assignedMarca?.marcaId || assignment.assignedStores?.[0]?.marcaId || '';
    const rawMarcaNombre = assignment.assignedMarca?.marcaNombre || assignment.assignedStores?.[0]?.marcaNombre || brandStores[0]?.marcaNombre || '';

    const filteredStores = (brandStores || []).filter(s => 
        s.tiendaNombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.marcaNombre || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const sidebarItems = [
        { id: 'home', label: 'Inicio', icon: '🏠' },
        { id: 'rqs', label: 'Requerimientos', icon: '📋', badge: allRQs.filter(r => r.approvalStatus === 'pending').length || undefined },
        { id: 'create', label: 'Gestionar RQs', icon: '➕' },
        { id: 'candidates', label: 'Candidatos', icon: '👥' },
        { id: 'compensaciones', label: 'Compensas', icon: '📑' },
        { id: 'configuracion', label: 'Config', icon: '⚙️', hidden: true },
    ];

    return (
        <DashboardLayout
            items={sidebarItems}
            activeTab={activeTab}
            onTabChange={(id) => setActiveTab(id as any)}
            title="Dashboard Jefe de Marca"
            subtitle={`${assignment.displayName}`}
            holdingId={assignment.holdingId}
            marcaId={rawMarcaId}
            marcaName={rawMarcaNombre}
            onConfigClick={() => setActiveTab('configuracion')}
        >
            <div className="space-y-8 pb-20">
                {/* Global Quick Actions Bar */}
                <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 flex-shrink-0">
                            <span className="text-xl">⚡</span>
                        </div>
                        <div>
                            <p className="text-sm font-black text-gray-900 uppercase tracking-tight">Acciones Rápidas</p>
                            <p className="text-xs text-gray-500">Gestión de Marca</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 md:flex items-center gap-2 md:gap-3 w-full sm:w-auto">
                        <button
                            onClick={() => {
                                setQuickAction({ type: 'invite' });
                                setShowStoreSelector(true);
                            }}
                            className="px-4 py-2.5 bg-[#0f172a] text-white rounded-xl text-[10px] md:text-xs font-bold hover:bg-slate-800 transition-all shadow-lg flex items-center justify-center gap-2"
                        >
                            <span className="text-violet-400">➕</span> Invitar
                        </button>
                        <button
                            onClick={() => setActiveTab('create')}
                            className="px-4 py-2.5 bg-violet-600 text-white rounded-xl text-[10px] md:text-xs font-bold hover:bg-violet-700 transition-all shadow-lg flex items-center justify-center gap-2"
                        >
                            <span className="opacity-80">📋</span> Crear RQ
                        </button>
                        <button
                            onClick={() => {
                                setQuickAction({ type: 'baja' });
                                setShowStoreSelector(true);
                            }}
                            className="px-4 py-2.5 bg-[#ef4444] text-white rounded-xl text-[10px] md:text-xs font-bold hover:bg-red-600 transition-all shadow-lg flex items-center justify-center gap-2"
                        >
                            <span className="opacity-80">📤</span> Reportar Baja
                        </button>
                    </div>
                </div>

                {activeTab === 'home' && (
                    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Summary of Requirement Balance */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="flex-1 h-[2px] bg-slate-100"></span>
                                <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] whitespace-nowrap">
                                    Balance de Requerimientos de Marca
                                </h3>
                                <span className="flex-1 h-[2px] bg-slate-100"></span>
                            </div>
                            <ApprovedRQSummary 
                                rqs={allRQs} 
                                showTienda={true} 
                                showPending={true}
                            />
                        </div>

                        {/* Stats Cards */}
                        <MarcaStatsCards marcaId={rawMarcaId} />
                    </div>
                )}

                {/* Content Sections */}
                {activeTab !== 'home' && (
                    <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden animate-in fade-in duration-300">
                        <div className="p-4 md:p-8">
                            {activeTab === 'rqs' && (
                                <RQListView
                                    rqs={allRQs}
                                    userRole="jefe_marca"
                                    pendingCount={allRQs.filter(r => r.approvalStatus === 'pending').length}
                                    onApprove={async (id) => {
                                        const { bulkApproveRQs } = await import('@/lib/firestore/rq-approval');
                                        await bulkApproveRQs([id], user?.uid || '', assignment.displayName || '', 'jefe_marca');
                                    }}
                                    onBulkApprove={async (ids) => {
                                        const { bulkApproveRQs } = await import('@/lib/firestore/rq-approval');
                                        await bulkApproveRQs(ids, user?.uid || '', assignment.displayName || '', 'jefe_marca');
                                    }}
                                    onReject={async (id, reason) => {
                                        const { bulkRejectRQs } = await import('@/lib/firestore/rq-approval');
                                        await bulkRejectRQs([id], user?.uid || '', assignment.displayName || '', 'jefe_marca', reason || '');
                                    }}
                                    onBulkReject={async (ids, reason) => {
                                        const { bulkRejectRQs } = await import('@/lib/firestore/rq-approval');
                                        await bulkRejectRQs(ids, user?.uid || '', assignment.displayName || '', 'jefe_marca', reason || '');
                                    }}
                                />
                            )}
                            {activeTab === 'create' && (
                                <div className="max-w-4xl mx-auto">
                                    <SupervisorCreateRQView
                                        supervisorId={user?.uid || ''}
                                        supervisorName={assignment.displayName}
                                        assignedStores={brandStores}
                                        holdingId={assignment.holdingId}
                                    />
                                </div>
                            )}
                            {activeTab === 'candidates' && (
                                <div className="space-y-6">
                                    <CandidatesListView marcaId={rawMarcaId} />
                                </div>
                            )}
                            {activeTab === 'compensaciones' && (
                                <div className="bg-white rounded-2xl">
                                    <CompensacionesTab
                                        holdingId={assignment.holdingId}
                                        marcaId={rawMarcaId}
                                    />
                                </div>
                            )}
                            {activeTab === 'configuracion' && (
                                <div className="space-y-8">
                                    <ConfigurationView />
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Store Selection Modal for Quick Actions */}
            {showStoreSelector && (brandStores || []).length > 0 && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex gap-4 items-center">
                                <div className="w-12 h-12 bg-violet-50 rounded-2xl flex items-center justify-center text-violet-600">
                                    <Building2 size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black italic uppercase text-slate-900 tracking-tighter">
                                        Seleccionar Tienda
                                    </h2>
                                    <p className="text-xs font-bold text-slate-500">
                                        {quickAction?.type === 'invite' ? '¿A qué tienda quieres invitar?' : '¿En qué tienda quieres reportar la baja?'}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => { setShowStoreSelector(false); setSearchQuery(''); }} className="p-2 text-slate-300 hover:text-slate-900 transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Search Bar */}
                        <div className="px-8 pt-6">
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                                <input
                                    type="text"
                                    placeholder="Buscar tienda por nombre..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all font-medium"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="p-8 max-h-[50vh] overflow-auto">
                            <div className="grid gap-3">
                                {filteredStores.length > 0 ? (
                                    filteredStores.map(store => (
                                        <button
                                            key={store.tiendaId}
                                            onClick={() => {
                                                setQuickAction({
                                                    type: quickAction!.type,
                                                    storeId: store.tiendaId,
                                                    storeName: store.tiendaNombre,
                                                    marcaId: store.marcaId,
                                                    marcaNombre: store.marcaNombre || rawMarcaNombre
                                                });
                                                setShowStoreSelector(false);
                                                setSearchQuery('');
                                            }}
                                            className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 hover:border-violet-300 hover:bg-violet-50/30 transition-all text-left group"
                                        >
                                            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-violet-100 group-hover:text-violet-600 transition-colors">
                                                <Store size={20} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 group-hover:text-brand transition-colors">{store.tiendaNombre}</p>
                                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{store.marcaNombre || rawMarcaNombre}</p>
                                            </div>
                                        </button>
                                    ))
                                ) : (
                                    <div className="text-center py-12 text-slate-400">
                                        <p className="text-sm italic">No se encontraron tiendas para "{searchQuery}"</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Action Modals */}
            {quickAction?.type === 'invite' && quickAction.storeId && (
                <InviteCandidateModal
                    isOpen={true}
                    onClose={() => setQuickAction(null)}
                    storeId={quickAction.storeId}
                    storeName={quickAction.storeName!}
                    marcaId={quickAction.marcaId!}
                    marcaNombre={quickAction.marcaNombre!}
                    userRole="jefe_marca"
                />
            )}

            {quickAction?.type === 'baja' && quickAction.storeId && (
                <ReportarBajaModal
                    isOpen={true}
                    onClose={() => setQuickAction(null)}
                    storeId={quickAction.storeId}
                    storeName={quickAction.storeName!}
                    marcaId={quickAction.marcaId!}
                    marcaNombre={quickAction.marcaNombre!}
                    onSuccess={() => {
                        setQuickAction(null);
                        alert('✅ Baja reportada exitosamente');
                    }}
                />
            )}
        </DashboardLayout>
    );
}
