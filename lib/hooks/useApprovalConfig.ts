import { useState, useEffect } from 'react';
import {
    getApprovalConfig,
    subscribeToApprovalConfig,
    validateApprover,
    type ApprovalConfig,
    type ApprovalLevel
} from '@/lib/firestore/approval-config';
import { useAuth } from '@/contexts/AuthContext';

export function useApprovalConfig(marcaId?: string) {
    const { claims } = useAuth();
    const [config, setConfig] = useState<ApprovalConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const holdingId = claims?.tenant_id || '';

    useEffect(() => {
        if (!holdingId) {
            setLoading(false);
            return;
        }

        setLoading(true);

        // Suscribirse a cambios en tiempo real
        const unsubscribe = subscribeToApprovalConfig(
            holdingId,
            (newConfig) => {
                setConfig(newConfig);
                setLoading(false);
                setError(null);
            },
            marcaId
        );

        return () => unsubscribe();
    }, [holdingId, marcaId]);

    /**
     * Determinar si el usuario actual puede aprobar en un nivel específico
     */
    const canApproveAtLevel = async (level: number): Promise<boolean> => {
        if (!claims?.role || !holdingId) return false;

        try {
            return await validateApprover(holdingId, level, claims.role, marcaId);
        } catch (error) {
            console.error('Error validating approver:', error);
            return false;
        }
    };

    /**
     * Obtener niveles donde el usuario puede aprobar
     */
    const getUserApprovalLevels = (): number[] => {
        if (!config || !claims?.role) return [];

        return config.levels
            .filter(level => level.approvers.includes(claims.role!))
            .map(level => level.level);
    };

    /**
     * Obtener información de un nivel específico
     */
    const getLevelInfo = (level: number): ApprovalLevel | null => {
        if (!config) return null;
        return config.levels.find(l => l.level === level) || null;
    };

    return {
        config,
        loading,
        error,
        canApproveAtLevel,
        getUserApprovalLevels,
        getLevelInfo,
        totalLevels: config?.levels.length || 0
    };
}
