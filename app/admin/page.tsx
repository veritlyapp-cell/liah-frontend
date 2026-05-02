'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import DashboardHeader from '@/components/DashboardHeader';
import { useFeatures } from '@/hooks/useFeatures';
import UserManagementView from '@/components/admin/UserManagementView';
import CreateBrandModal from '@/components/admin/CreateBrandModal';
import EditBrandModal from '@/components/admin/EditBrandModal';
import CreateStoreModal from '@/components/admin/CreateStoreModal';
import EditStoreModal from '@/components/admin/EditStoreModal';
import BulkUploadStoresModal from '@/components/admin/BulkUploadStoresModal';
import ConfigurationView from '@/components/ConfigurationView';
import HoldingLogoUpload from '@/components/admin/HoldingLogoUpload';
import JobProfilesManagement from '@/components/admin/JobProfilesManagement';
import RQTrackingView from '@/components/admin/RQTrackingView';
import AdminCandidatesView from '@/components/admin/AdminCandidatesView';
import CandidateBaseView from '@/components/admin/CandidateBaseView';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Users, ClipboardList, Briefcase, BarChart3, Wallet, Settings, MapPin, FileText, Building2, Upload, Plus, Pencil, Trash2, Map as MapIcon } from 'lucide-react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { db, auth } from '@/lib/firebase';
import { collection, onSnapshot, query, where, doc, deleteDoc, updateDoc, getDoc, getDocs } from 'firebase/firestore';
import { subscribeToAllRQs, type RQ } from '@/lib/firestore/rqs';
import ApprovedRQSummary from '@/components/admin/ApprovedRQSummary';
import UnifiedAnalytics from '@/components/admin/UnifiedAnalytics';
import ConfigSidebarView from '@/components/admin/ConfigSidebarView';
import CompensacionesTab from '@/components/talent/CompensacionesTab';
import SidebarNav from '@/components/SidebarNav';
import ZonesManager from '@/components/admin/ZonesManager';
import CandidateActivationPanel from '@/components/recruiter/CandidateActivationPanel';

// Redundant mock data removed to fix lint warning

export default function AdminDashboard() {
    const { user, claims, loading } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'marcas' | 'usuarios' | 'tiendas' | 'perfiles' | 'configuracion' | 'rqs' | 'candidatos' | 'analitica' | 'compensaciones' | 'zonas' | 'activacion' | 'base_candidatos'>('marcas');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [brands, setBrands] = useState<any[]>([]);
    const [candidateCounts, setCandidateCounts] = useState<Record<string, number>>({});
    const [interviewCounts, setInterviewCounts] = useState<Record<string, number>>({});
    const [rqCounts, setRqCounts] = useState<Record<string, number>>({});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [rawStores, setRawStores] = useState<any[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [stores, setStores] = useState<any[]>([]);
    const [loadingBrands, setLoadingBrands] = useState(true);
    const [loadingStores, setLoadingStores] = useState(true);
    const [showCreateBrandModal, setShowCreateBrandModal] = useState(false);
    const [showCreateStoreModal, setShowCreateStoreModal] = useState(false);
    const [showEditStoreModal, setShowEditStoreModal] = useState(false);
    const [showBulkStoreModal, setShowBulkStoreModal] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [selectedStore, setSelectedStore] = useState<any | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [selectedBrand, setSelectedBrand] = useState<any | null>(null);
    const [showEditBrandModal, setShowEditBrandModal] = useState(false);
    const [holdingId, setHoldingId] = useState<string>('');

    const [storeCounts, setStoreCounts] = useState<Record<string, number>>({});
    const [holdingInfo, setHoldingInfo] = useState<{ nombre: string; plan: string; logo?: string; isTrial?: boolean; hasExitAnalytics?: boolean; color?: string } | null>(null);
    const [allRQs, setAllRQs] = useState<RQ[]>([]);

    const { hasFeature, isTrial } = useFeatures();

    // Impersonation support for Super Admins
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            const impersonatedHoldingId = urlParams.get('holdingId');

            if (impersonatedHoldingId && claims?.role === 'super_admin') {
                console.log('🛡️ Super Admin Impersonation:', impersonatedHoldingId);
                setHoldingId(impersonatedHoldingId);
            }
        }
    }, [claims]);

    useEffect(() => {
        const allowedRoles = ['client_admin', 'admin', 'gerente', 'super_admin'];
        if (!loading && user) {
            const role = claims?.role || '';
            if (['recruiter', 'brand_recruiter', 'jefe_zonal', 'hrbp'].includes(role)) {
                router.push('/recruiter');
                return;
            }
            if (!allowedRoles.includes(role) && role !== 'compensaciones') {
                router.push('/login');
            }
        } else if (!loading && !user) {
            router.push('/login');
        }
    }, [user, claims, loading, router]);

    // Load user's holdingId and holding info
    useEffect(() => {
        async function loadUserHolding() {
            if (!user) return;
            try {
                let foundHoldingId: string | null = null;

                // First try user_assignments
                const { getUserAssignment } = await import('@/lib/firestore/user-assignments');
                const assignment = await getUserAssignment(user.uid);
                if (assignment?.holdingId) {
                    foundHoldingId = assignment.holdingId;
                }

                // If not found, try talent_users (for users who are talent admins)
                if (!foundHoldingId && user.email) {
                    const talentUsersRef = collection(db, 'talent_users');
                    const q = query(talentUsersRef, where('email', '==', user.email.toLowerCase()));
                    const snap = await getDocs(q);
                    if (!snap.empty) {
                        const talentUser = snap.docs[0].data();
                        if (talentUser.holdingId) {
                            foundHoldingId = talentUser.holdingId;
                        }
                    }
                }

                if (foundHoldingId) {
                    // Only set holdingId if not already set by impersonation
                    setHoldingId(prev => {
                        if (prev && claims?.role === 'super_admin') return prev;
                        return foundHoldingId;
                    });

                    // NGR Specific Redirect: If they only have flow/RQs, go straight there
                    if ((foundHoldingId === 'ngr' || foundHoldingId === 'ktJgslYzcGSD2hIPnvvLk') && claims?.role !== 'compensaciones') {
                        setActiveTab('rqs');
                    } else if (claims?.role === 'compensaciones') {
                        setActiveTab('compensaciones');
                    }

                    const holdingDoc = await getDoc(doc(db, 'holdings', foundHoldingId));
                    if (holdingDoc.exists()) {
                        const data = holdingDoc.data();
                        setHoldingInfo({
                            nombre: data.nombre || foundHoldingId,
                            plan: data.plan || 'full_stack',
                            logo: data.logoUrl || data.logo,
                            isTrial: data.isTrial,
                            color: data.color || '#7c3aed'
                        });
                    } else {
                        setHoldingInfo({
                            nombre: foundHoldingId,
                            plan: 'full_stack',
                            logo: undefined
                        });
                    }
                }
            } catch (error) {
                console.error('Error loading user holding:', error);
            }
        }
        loadUserHolding();
    }, [user, claims]); // Added claims to dependencies to re-run after role is available

    // Load brands from Firestore
    useEffect(() => {
        if (!user || !holdingId) return;

        const marcasRef = collection(db, 'marcas');
        const q = query(marcasRef, where('holdingId', '==', holdingId));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const loadedBrands = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setBrands(loadedBrands);
            setLoadingBrands(false);
        }, (error) => {
            console.error('Error cargando marcas:', error);
            setLoadingBrands(false);
        });

        return () => unsubscribe();
    }, [user, holdingId]);

    // Aggregate Candidate and Interview counts per brand
    useEffect(() => {
        if (!user || !holdingId) return;

        const candidatesRef = collection(db, 'candidates');
        const q = query(candidatesRef, where('holdingId', '==', holdingId));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const cCounts: Record<string, number> = {};
            const iCounts: Record<string, number> = {};

            snapshot.docs.forEach(doc => {
                const data = doc.data();
                // Brand ID can be at top level OR inside the first assignment
                const marcaId = data.marcaId || (data.assignments && data.assignments.length > 0 ? data.assignments[0].marcaId : null);

                if (marcaId) {
                    cCounts[marcaId] = (cCounts[marcaId] || 0) + 1;
                    if (data.status === 'interview_scheduled' || data.status === 'hired' || data.selectionStatus === 'selected') {
                        iCounts[marcaId] = (iCounts[marcaId] || 0) + 1;
                    }
                }
            });

            setCandidateCounts(cCounts);
            setInterviewCounts(iCounts);
        });

        return () => unsubscribe();
    }, [user, holdingId]);

    // Aggregate RQ counts per brand
    useEffect(() => {
        if (!user || !holdingId) return;

        return subscribeToAllRQs(holdingId, (loadedRQs) => {
            setAllRQs(loadedRQs);
            
            // Calculate counts for brands
            const countMap: Record<string, number> = {};
            loadedRQs.forEach(rq => {
                const marcaId = rq.marcaId;
                if (marcaId) {
                    countMap[marcaId] = (countMap[marcaId] || 0) + 1;
                }
            });
            setRqCounts(countMap);
        });
    }, [user, holdingId]);

    // Load stores from Firestore
    useEffect(() => {
        if (!user || !holdingId) return;

        const tiendasRef = collection(db, 'tiendas');
        const q = query(tiendasRef, where('holdingId', '==', holdingId));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const loadedStores = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as any[];

            // Enrich marcaNombre from brands if missing in Firestore document
            const brandMap: Record<string, string> = {};
            brands.forEach((b: any) => { if (b.id) brandMap[b.id] = b.nombre; });
            const enriched = loadedStores.map(s => ({
                ...s,
                marcaNombre: s.marcaNombre || brandMap[s.marcaId] || ''
            }));

            setRawStores(loadedStores as any[]);
            setLoadingStores(false);
        }, (error) => {
            console.error('Error cargando tiendas:', error);
            setLoadingStores(false);
        });

        return () => unsubscribe();
    }, [user, holdingId]);

    // Enrich rawStores with marcaNombre from brands whenever either changes
    useEffect(() => {
        if (rawStores.length === 0) return;
        const brandMap: Record<string, string> = {};
        brands.forEach((b: any) => { if (b.id) brandMap[b.id] = b.nombre; });
        setStores(rawStores.map(s => ({
            ...s,
            marcaNombre: s.marcaNombre || brandMap[s.marcaId] || ''
        })));
    }, [rawStores, brands]);

    // Count stores per brand
    useEffect(() => {
        if (!user || !holdingId) return;

        const tiendasRef = collection(db, 'tiendas');
        const q = query(tiendasRef, where('holdingId', '==', holdingId));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const counts: Record<string, number> = {};
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                const marcaId = data.marcaId;
                if (marcaId) {
                    counts[marcaId] = (counts[marcaId] || 0) + 1;
                }
            });
            setStoreCounts(counts);
        }, (error) => {
            console.error('Error contando tiendas:', error);
        });

        return () => unsubscribe();
    }, [user, holdingId]);

    async function handleDeleteStore(storeId: string, storeName: string, marcaId: string) {
        try {
            await deleteDoc(doc(db, 'tiendas', storeId));
            const marcaRef = doc(db, 'marcas', marcaId);
            const marcaSnap = await getDoc(marcaRef);
            const currentCount = marcaSnap.data()?.tiendasActivas || 0;

            if (currentCount > 0) {
                await updateDoc(marcaRef, { tiendasActivas: currentCount - 1 });
            }
            alert(`✅ Tienda "${storeName}" eliminada exitosamente`);
        } catch (error) {
            console.error('Error eliminando tienda:', error);
        }
    }

    const sidebarItems = [
        { id: 'marcas', label: 'Marcas', icon: <Building2 />, hidden: claims?.role === 'compensaciones' },
        { id: 'tiendas', label: 'Tiendas', icon: <MapPin />, hidden: claims?.role === 'compensaciones' },
        { id: 'zonas', label: 'Zonas', icon: <MapIcon />, hidden: claims?.role === 'compensaciones' },
        { id: 'usuarios', label: 'Usuarios', icon: <Users />, hidden: claims?.role === 'compensaciones' },
        { id: 'rqs', label: 'RQs', icon: <ClipboardList />, hidden: claims?.role === 'compensaciones' || !hasFeature('rq_management') },
        { id: 'candidatos', label: 'Candidatos', icon: <Users />, hidden: claims?.role === 'compensaciones' },
        { id: 'base_candidatos', label: 'Base Maestra', icon: <FileText />, hidden: claims?.role === 'compensaciones' },
        { id: 'activacion', label: 'Exportar / SMS', icon: <Upload />, hidden: claims?.role === 'compensaciones' },
        { id: 'perfiles', label: 'Perfiles', icon: <Briefcase />, hidden: claims?.role === 'compensaciones' },
        { id: 'analitica', label: 'Analítica', icon: <BarChart3 />, hidden: claims?.role === 'compensaciones' || !hasFeature('advanced_analytics') },
        { id: 'compensaciones', label: 'Compensaciones', icon: <Wallet /> },
        { id: 'configuracion', label: 'Configuración', icon: <Settings />, hidden: true },
    ];

    if (loading || !user) return null;

    return (
        <DashboardLayout
            items={sidebarItems}
            activeTab={activeTab}
            onTabChange={(id) => setActiveTab(id as any)}
            title={activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            subtitle={`${user?.displayName || user?.email?.split('@')[0] || 'Admin'} • Admin Empresa`}
            holdingId={holdingId}
            holdingName={holdingInfo?.nombre}
            holdingLogo={holdingInfo?.logo}
            holdingSubtitle={`${holdingInfo?.plan || 'Standard'} Plan`}
            onConfigClick={() => setActiveTab('configuracion')}
            brandColor={holdingInfo?.color}
        >


            {
                activeTab === 'marcas' && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-8"
                    >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-title-dashboard flex items-center gap-3">
                                    <span className="w-12 h-12 rounded-2xl bg-brand/10 flex items-center justify-center text-brand">
                                        <Building2 size={24} />
                                    </span>
                                    Gestión de Marcas
                                </h2>
                                <p className="text-sm text-slate-500 mt-1 ml-15">Configura la identidad y parámetros de tus marcas.</p>
                            </div>
                            <button
                                onClick={() => setShowCreateBrandModal(true)}
                                className="h-12 px-6 bg-brand text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:opacity-90 transition-all shadow-xl shadow-brand/20 flex items-center gap-2"
                            >
                                <Plus size={16} strokeWidth={3} />
                                <span className="hidden sm:inline">Nueva Marca</span>
                            </button>
                        </div>

                        {/* Approved RQs Summary - Dashboard Requirement */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 mb-1">
                                <span className="flex-1 h-[2px] bg-slate-100"></span>
                                <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] whitespace-nowrap">
                                    Resumen Consolidado de Aprobados
                                </h3>
                                <span className="flex-1 h-[2px] bg-slate-100"></span>
                            </div>
                            <ApprovedRQSummary 
                                rqs={allRQs} 
                                showMarca={true} 
                                showTienda={true} 
                            />
                        </div>

                        {loadingBrands ? (
                            <div className="text-center py-32 white-label-card">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand mx-auto"></div>
                                <p className="mt-6 text-label animate-pulse">Sincronizando identidades...</p>
                            </div>
                        ) : brands.length === 0 ? (
                            <div className="text-center py-32 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
                                <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                                    <Building2 size={32} className="text-slate-300" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 mb-2">No hay marcas configuradas</h3>
                                <p className="text-slate-500 max-w-xs mx-auto text-sm leading-relaxed">
                                    Comienza definiendo tu primera marca para organizar tus tiendas y candidatos.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {brands.map(brand => (
                                    <div key={brand.id} className="white-label-card p-6 group hover:translate-y-[-4px] transition-all duration-300">
                                        <div className="flex items-start justify-between mb-8">
                                            <div className="flex items-center gap-4">
                                                <div className="w-16 h-16 rounded-[1.5rem] bg-slate-50 border border-slate-100 p-2 flex items-center justify-center group-hover:bg-white group-hover:border-brand/20 transition-all shadow-sm">
                                                    {brand.logoUrl ? (
                                                        <img src={brand.logoUrl} alt={brand.nombre} className="w-full h-full object-contain" />
                                                    ) : (
                                                        <span className="text-2xl font-black text-slate-300 group-hover:text-brand transition-colors uppercase italic">{brand.nombre.charAt(0)}</span>
                                                    )}
                                                </div>
                                                <div className="flex flex-col">
                                                    <h3 className="text-lg font-black text-slate-900 group-hover:text-brand transition-colors uppercase italic tracking-tight">{brand.nombre}</h3>
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">Estatus Corporativo</span>
                                                </div>
                                            </div>
                                            <span className={brand.activa ? 'soft-badge-emerald' : 'soft-badge-slate'}>
                                                {brand.activa ? 'Activa' : 'Inactiva'}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-3 gap-4 mb-8">
                                            <div className="flex flex-col items-center p-3 bg-slate-50/50 rounded-2xl border border-slate-100/50 group-hover:bg-white group-hover:border-brand/10 transition-colors">
                                                <span className="text-xl font-black italic tracking-tighter text-violet-600">
                                                    {candidateCounts[brand.id] || 0}
                                                </span>
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Talento</span>
                                            </div>
                                            <div className="flex flex-col items-center p-3 bg-slate-50/50 rounded-2xl border border-slate-100/50 group-hover:bg-white group-hover:border-brand/10 transition-colors">
                                                <span className="text-xl font-black italic tracking-tighter text-cyan-500">
                                                    {storeCounts[brand.id] || 0}
                                                </span>
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Tiendas</span>
                                            </div>
                                            <div className="flex flex-col items-center p-3 bg-slate-50/50 rounded-2xl border border-slate-100/50 group-hover:bg-white group-hover:border-brand/10 transition-colors">
                                                <span className="text-xl font-black italic tracking-tighter text-amber-500">
                                                    {rqCounts[brand.id] || 0}
                                                </span>
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">RQs</span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => { setSelectedBrand(brand); setShowEditBrandModal(true); }}
                                            className="w-full h-12 bg-slate-50 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-brand hover:text-white transition-all shadow-sm flex items-center justify-center gap-2 group/btn"
                                        >
                                            <Settings size={14} className="group-hover/btn:rotate-12 transition-transform" />
                                            Gestionar Marca
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )
            }

            {activeTab === 'tiendas' && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-8"
                >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-title-dashboard flex items-center gap-3">
                                <span className="w-12 h-12 rounded-2xl bg-brand/10 flex items-center justify-center text-brand">
                                    <Building2 size={24} />
                                </span>
                                Gestión de Tiendas
                            </h2>
                            <p className="text-sm text-slate-500 mt-1 ml-15">Administra tus unidades de negocio y ubicaciones.</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowBulkStoreModal(true)}
                                className="h-12 px-6 bg-emerald-50 text-emerald-700 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-emerald-100 transition-all border border-emerald-100 flex items-center gap-2"
                            >
                                <Upload size={16} />
                                <span className="hidden sm:inline">Importar</span>
                            </button>
                            <button
                                onClick={() => setShowCreateStoreModal(true)}
                                className="h-12 px-6 bg-brand text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:opacity-90 transition-all shadow-xl shadow-brand/20 flex items-center gap-2"
                            >
                                <Plus size={16} strokeWidth={3} />
                                <span className="hidden sm:inline">Nueva Tienda</span>
                            </button>
                        </div>
                    </div>

                    {loadingStores ? (
                        <div className="text-center py-32 white-label-card">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand mx-auto"></div>
                            <p className="mt-6 text-label animate-pulse">Sincronizando unidades...</p>
                        </div>
                    ) : stores.length === 0 ? (
                        <div className="text-center py-32 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
                            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                                <Building2 size={32} className="text-slate-300" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">No hay tiendas registradas</h3>
                            <p className="text-slate-500 max-w-xs mx-auto text-sm leading-relaxed">
                                Comienza agregando tu primera unidad de negocio manualmente o mediante carga masiva.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table View */}
                            <div className="hidden md:block white-label-card overflow-hidden">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-slate-50/50 border-b border-slate-100">
                                            <th className="px-8 py-5 text-left text-label">Referencia</th>
                                            <th className="px-8 py-5 text-left text-label">Unidad de Negocio</th>
                                            <th className="px-8 py-5 text-left text-label">Marca</th>
                                            <th className="px-8 py-5 text-left text-label">Ubicación</th>
                                            <th className="px-8 py-5 text-left text-label">Estatus</th>
                                            <th className="px-8 py-5 text-right text-label">Gestión</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {stores.map(store => (
                                            <tr key={store.id} className="hover:bg-slate-50/30 transition-colors group">
                                                <td className="px-8 py-6">
                                                    <span className="text-xs font-black px-2.5 py-1 bg-slate-100 text-slate-500 rounded-lg group-hover:bg-brand group-hover:text-white transition-all">
                                                        {store.codigo || 'S/C'}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-900 group-hover:text-brand transition-colors">{store.nombre}</span>
                                                        <span className="text-[10px] text-slate-400 font-medium">Retail Store</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <span className="soft-badge-slate">{store.marcaNombre}</span>
                                                </td>
                                                <td className="px-8 py-6 text-sm text-slate-500 font-medium">
                                                    {store.distrito}, {store.provincia}
                                                </td>
                                                <td className="px-8 py-6">
                                                    <span className={store.activa ? 'soft-badge-emerald' : 'soft-badge-slate'}>
                                                        {store.activa ? <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> : null}
                                                        {store.activa ? 'Activa' : 'Inactiva'}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => { setSelectedStore(store); setShowEditStoreModal(true); }}
                                                            className="p-2.5 bg-slate-50 text-slate-400 hover:text-brand hover:bg-brand/10 rounded-xl transition-all border border-transparent hover:border-brand/10"
                                                        >
                                                            <Pencil size={18} />
                                                        </button>
                                                        <button
                                                            onClick={async () => { if (confirm(`¿Eliminar tienda "${store.nombre}"?`)) await handleDeleteStore(store.id, store.nombre, store.marcaId); }}
                                                            className="p-2.5 bg-slate-50 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-100"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Grid View */}
                            <div className="md:hidden grid grid-cols-1 gap-4">
                                {stores.map(store => (
                                    <div key={store.id} className="white-label-card p-6 flex flex-col gap-4">
                                        <div className="flex justify-between items-start">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase">{store.codigo || 'S/C'}</span>
                                                <h3 className="font-bold text-slate-900">{store.nombre}</h3>
                                            </div>
                                            <span className={store.activa ? 'soft-badge-emerald' : 'soft-badge-slate'}>
                                                {store.activa ? 'Activa' : 'Inactiva'}
                                            </span>
                                        </div>

                                        <div className="flex flex-col gap-2 py-3 border-y border-slate-50">
                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                <span className="font-black uppercase tracking-widest text-[9px] text-slate-400 w-12">Marca:</span>
                                                <span className="font-bold text-slate-700">{store.marcaNombre}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                <span className="font-black uppercase tracking-widest text-[9px] text-slate-400 w-12">Ubic:</span>
                                                <span className="font-medium">{store.distrito}, {store.provincia}</span>
                                            </div>
                                        </div>

                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => { setSelectedStore(store); setShowEditStoreModal(true); }}
                                                className="flex-1 min-h-[44px] bg-slate-50 text-slate-600 rounded-xl font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-2"
                                            >
                                                <Pencil size={14} />
                                                Editar
                                            </button>
                                            <button
                                                onClick={async () => { if (confirm(`¿Eliminar tienda "${store.nombre}"?`)) await handleDeleteStore(store.id, store.nombre, store.marcaId); }}
                                                className="flex-1 min-h-[44px] bg-rose-50 text-rose-600 rounded-xl font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-2"
                                            >
                                                <Trash2 size={14} />
                                                Borrar
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </motion.div>
            )}

            {activeTab === 'usuarios' && <UserManagementView holdingId={holdingId} />}
            {activeTab === 'rqs' && hasFeature('rq_management') && <RQTrackingView holdingId={holdingId} marcas={brands.map(b => ({ id: b.id, nombre: b.nombre }))} />}
            {activeTab === 'candidatos' && <AdminCandidatesView holdingId={holdingId} marcas={brands.map(b => ({ id: b.id, nombre: b.nombre }))} tiendas={stores.map(s => ({ id: s.id, nombre: s.nombre, marcaId: s.marcaId }))} />}
            {activeTab === 'base_candidatos' && <CandidateBaseView holdingId={holdingId} />}
            {activeTab === 'activacion' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                    <CandidateActivationPanel />
                </div>
            )}
            {activeTab === 'perfiles' && <JobProfilesManagement holdingId={holdingId} marcas={brands.map(b => ({ id: b.id, nombre: b.nombre }))} />}

            {
                activeTab === 'analitica' && (
                    <UnifiedAnalytics
                        holdingId={holdingId}
                        marcas={brands.map(b => ({ id: b.id, nombre: b.nombre }))}
                        hasExitAnalytics={holdingInfo?.hasExitAnalytics !== false}
                    />
                )
            }

            {
                activeTab === 'compensaciones' && (
                    <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
                        <CompensacionesTab holdingId={holdingId} />
                    </div>
                )
            }

            {activeTab === 'zonas' && <ZonesManager holdingId={holdingId} />}
            {activeTab === 'configuracion' && <ConfigSidebarView holdingId={holdingId} />}

            <CreateBrandModal show={showCreateBrandModal} holdingId={holdingId} onCancel={() => setShowCreateBrandModal(false)} onSave={() => setShowCreateBrandModal(false)} />
            <CreateStoreModal show={showCreateStoreModal} holdingId={holdingId} onCancel={() => setShowCreateStoreModal(false)} onSave={() => setShowCreateStoreModal(false)} />
            <EditStoreModal show={showEditStoreModal} store={selectedStore} onCancel={() => { setShowEditStoreModal(false); setSelectedStore(null); }} onSave={() => { setShowEditStoreModal(false); setSelectedStore(null); }} />
            {showEditBrandModal && selectedBrand && <EditBrandModal brand={selectedBrand} onClose={() => { setShowEditBrandModal(false); setSelectedBrand(null); }} onSave={() => { setShowEditBrandModal(false); setSelectedBrand(null); }} />}
            <BulkUploadStoresModal show={showBulkStoreModal} holdingId={holdingId} onCancel={() => setShowBulkStoreModal(false)} onComplete={(result) => { setShowBulkStoreModal(false); alert(`Importación completada: ${result.success} exitos`); }} />
        </DashboardLayout>
    );
}
