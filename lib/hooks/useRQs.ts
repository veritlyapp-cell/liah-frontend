import { useState, useEffect, useMemo } from 'react';
import {
    subscribeToRQsByMarca,
    subscribeToRQsByStore,
    subscribeToAllRQs,
    getRQsPendingForUser,
    approveRQ,
    rejectRQ,
    requestDeletion,
    deleteRQ,
    startRecruitment,
    closeRQ,
    type RQ
} from '@/lib/firestore/rqs';
import { useAuth } from '@/contexts/AuthContext';
import { useApprovalConfig } from './useApprovalConfig';

interface UseRQsOptions {
    scope: 'store' | 'marca' | 'all'; // alcance de los RQs a obtener
    storeId?: string; // requerido si scope es 'store'
    marcaId?: string; // requerido si scope es 'marca'
}

export function useRQs(options: UseRQsOptions) {
    const { user, claims } = useAuth();
    const { getUserApprovalLevels } = useApprovalConfig(options.marcaId);
    const [rqs, setRQs] = useState<RQ[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const tenantId = claims?.tenant_id || '';
    const userRole = claims?.role || '';

    useEffect(() => {
        setLoading(true);

        let unsubscribe: () => void;

        if (options.scope === 'store' && options.storeId) {
            console.log(`[useRQs] 📡 Subscribing to RQs for Store: ${options.storeId}`);
            unsubscribe = subscribeToRQsByStore(options.storeId, (newRQs) => {
                console.log(`[useRQs] 📥 Received ${newRQs.length} RQs for Store`);
                // Filter out gerencial RQs for Store Managers
                let filteredRQs = newRQs.filter(rq => rq.status !== 'cancelled' || rq.approvalStatus === 'rejected');

                if (userRole === 'store_manager') {
                    filteredRQs = filteredRQs.filter(rq => !rq.categoria || rq.categoria === 'operativo');
                    console.log(`[useRQs] 🧹 Filtered to ${filteredRQs.length} RQs for Store Manager`);
                }

                setRQs(filteredRQs);
                setLoading(false);
            });
        } else if (options.scope === 'marca' && options.marcaId) {
            console.log(`[useRQs] 📡 Subscribing to RQs for Marca: ${options.marcaId}`);
            unsubscribe = subscribeToRQsByMarca(options.marcaId, (newRQs) => {
                console.log(`[useRQs] 📥 Received ${newRQs.length} RQs for Marca`);
                setRQs(newRQs.filter(rq => rq.status !== 'cancelled' || rq.approvalStatus === 'rejected'));
                setLoading(false);
            });
        } else if (options.scope === 'all' && tenantId) {
            console.log(`[useRQs] 📡 Subscribing to all RQs for Tenant: ${tenantId}`);
            unsubscribe = subscribeToAllRQs(tenantId, (newRQs) => {
                console.log(`[useRQs] 📥 Received ${newRQs.length} total RQs`);
                setRQs(newRQs.filter(rq => rq.status !== 'cancelled' || rq.approvalStatus === 'rejected'));
                setLoading(false);
            });
        } else {
            console.log('[useRQs] ⚠️ No valid scope/ID provided for subscription');
            setLoading(false);
            return;
        }

        return () => unsubscribe();
    }, [options.scope, options.storeId, options.marcaId, tenantId]);

    /**
     * RQs pendientes de aprobación del usuario actual
     */
    const pendingForCurrentUser = useMemo(() => {
        const userLevels = getUserApprovalLevels();
        return rqs.filter(rq =>
            userLevels.includes(rq.currentApprovalLevel) &&
            rq.approvalStatus === 'pending'
        );
    }, [rqs, getUserApprovalLevels]);

    /**
     * RQs con alerta de 7+ días sin cubrir
     */
    const alertUnfilled = useMemo(() => {
        return rqs.filter(rq => rq.alert_unfilled);
    }, [rqs]);

    /**
     * RQs aprobados listos para reclutamiento
     */
    const approvedRQs = useMemo(() => {
        return rqs.filter(rq => rq.approvalStatus === 'approved' && (rq.status === 'active' || !rq.status));
    }, [rqs]);

    /**
     * RQs en reclutamiento
     */
    const inRecruitment = useMemo(() => {
        return rqs.filter(rq => rq.status === 'active' && rq.approvalStatus === 'approved');
    }, [rqs]);

    /**
     * RQs finalizados
     */
    const finalized = useMemo(() => {
        return rqs.filter(rq => rq.status === 'closed' || rq.status === 'filled');
    }, [rqs]);

    /**
     * Solicitudes de eliminación pendientes
     */
    const deletionRequests = useMemo(() => {
        return rqs.filter(rq => rq.deletion_requested && !rq.deletion_approved);
    }, [rqs]);

    /**
     * Calcular estadísticas para dashboards
     */
    const stats = useMemo(() => {
        return {
            total: rqs.filter(rq => rq.status !== 'cancelled').length,
            pending: rqs.filter(rq => rq.approvalStatus === 'pending').length,
            approved: rqs.filter(rq => rq.approvalStatus === 'approved').length,
            recruiting: rqs.filter(rq => rq.status === 'active' && rq.approvalStatus === 'approved').length,
            unfilled: rqs.filter(rq => rq.alert_unfilled).length,
            rejected: rqs.filter(rq => rq.approvalStatus === 'rejected').length
        };
    }, [rqs]);

    /**
     * Filtrar por estado
     */
    const filterByEstado = (estadoValue: string): RQ[] => {
        // Legacy support while we transition everything to status/approvalStatus
        return rqs.filter(rq => (rq as any).estado === estadoValue || rq.status === estadoValue || rq.approvalStatus === estadoValue);
    };

    /**
     * Filtrar por tienda
     */
    const filterByTienda = (tiendaId: string): RQ[] => {
        return rqs.filter(rq => rq.tiendaId === tiendaId);
    };

    /**
     * Filtrar por posición
     */
    const filterByPosicion = (posicion: string): RQ[] => {
        return rqs.filter(rq =>
            rq.posicion.toLowerCase().includes(posicion.toLowerCase())
        );
    };

    /**
     * Aprobar un RQ
     */
    const approve = async (rqId: string) => {
        if (!user || !claims?.tenant_id) {
            throw new Error('Usuario no autenticado');
        }

        try {
            await approveRQ(rqId, user.uid, user.email || '', claims.tenant_id);
        } catch (err: any) {
            setError(err.message);
            throw err;
        }
    };

    /**
     * Rechazar un RQ
     */
    const reject = async (rqId: string, reason: string) => {
        if (!user) {
            throw new Error('Usuario no autenticado');
        }

        try {
            await rejectRQ(rqId, user.uid, user.email || '', reason);
        } catch (err: any) {
            setError(err.message);
            throw err;
        }
    };

    /**
     * Solicitar eliminación
     */
    const requestDelete = async (rqId: string, reason: string) => {
        if (!user) {
            throw new Error('Usuario no autenticado');
        }

        try {
            await requestDeletion(rqId, user.uid, reason);
        } catch (err: any) {
            setError(err.message);
            throw err;
        }
    };

    /**
     * Eliminar RQ (directo)
     */
    const deleteDirectly = async (rqId: string, reason: string) => {
        if (!user) {
            throw new Error('Usuario no autenticado');
        }

        try {
            await deleteRQ(rqId, user.uid, reason);
        } catch (err: any) {
            setError(err.message);
            throw err;
        }
    };

    /**
     * Iniciar reclutamiento
     */
    const startRecruiting = async (rqId: string) => {
        try {
            await startRecruitment(rqId);
        } catch (err: any) {
            setError(err.message);
            throw err;
        }
    };

    /**
     * Finalizar RQ
     */
    const finalize = async (rqId: string) => {
        try {
            await closeRQ(rqId);
        } catch (err: any) {
            setError(err.message);
            throw err;
        }
    };

    return {
        rqs,
        loading,
        error,
        // Filtros/Vistas
        pendingForCurrentUser,
        alertUnfilled,
        approvedRQs,
        inRecruitment,
        finalized,
        deletionRequests,
        stats,
        filterByEstado,
        filterByTienda,
        filterByPosicion,
        // Acciones
        approve,
        reject,
        requestDelete,
        deleteDirectly,
        startRecruiting,
        finalize
    };
}

