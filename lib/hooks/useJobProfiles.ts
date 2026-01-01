import { useState, useEffect } from 'react';
import {
    getJobProfilesByStore,
    getJobProfilesByMarca,
    subscribeToJobProfiles,
    type JobProfile
} from '@/lib/firestore/job-profiles';
import { useAuth } from '@/contexts/AuthContext';

interface UseJobProfilesOptions {
    storeId?: string;
    marcaId?: string;
    autoFetch?: boolean;
}

export function useJobProfiles(options: UseJobProfilesOptions = {}) {
    const { claims } = useAuth();
    const [profiles, setProfiles] = useState<JobProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const {
        storeId,
        marcaId = claims?.entity_id || '',
        autoFetch = true
    } = options;

    useEffect(() => {
        if (!marcaId || !autoFetch) {
            setLoading(false);
            return;
        }

        setLoading(true);

        // Suscribirse a perfiles en tiempo real
        const unsubscribe = subscribeToJobProfiles(
            marcaId,
            (newProfiles) => {
                setProfiles(newProfiles);
                setLoading(false);
                setError(null);
            },
            storeId
        );

        return () => unsubscribe();
    }, [marcaId, storeId, autoFetch]);

    /**
     * Filtrar perfiles por posición
     */
    const filterByPosition = (posicion: string): JobProfile[] => {
        return profiles.filter(p =>
            p.posicion.toLowerCase().includes(posicion.toLowerCase())
        );
    };

    /**
     * Filtrar perfiles por modalidad
     */
    const filterByModalidad = (modalidad: string): JobProfile[] => {
        return profiles.filter(p => p.modalidad === modalidad);
    };

    /**
     * Filtrar perfiles por turno
     */
    const filterByTurno = (turno: string): JobProfile[] => {
        return profiles.filter(p => p.turno === turno);
    };

    /**
     * Obtener perfil por ID
     */
    const getProfileById = (id: string): JobProfile | undefined => {
        return profiles.find(p => p.id === id);
    };

    /**
     * Obtener modalidades únicas
     */
    const getUniqueModalidades = (): string[] => {
        return Array.from(new Set(profiles.map(p => p.modalidad)));
    };

    /**
     * Obtener turnos únicos
     */
    const getUniqueTurnos = (): string[] => {
        return Array.from(new Set(profiles.map(p => p.turno)));
    };

    /**
     * Obtener posiciones únicas
     */
    const getUniquePosiciones = (): string[] => {
        return Array.from(new Set(profiles.map(p => p.posicion)));
    };

    return {
        profiles,
        loading,
        error,
        filterByPosition,
        filterByModalidad,
        filterByTurno,
        getProfileById,
        getUniqueModalidades,
        getUniqueTurnos,
        getUniquePosiciones
    };
}
