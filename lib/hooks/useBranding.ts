import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface BrandingInfo {
    holdingName?: string;
    holdingLogo?: string;
    marcaName?: string;
    marcaLogo?: string;
}

/**
 * Hook para obtener información de branding (holding y marca) de Firestore
 */
export function useBranding(holdingId?: string, marcaId?: string): {
    branding: BrandingInfo;
    loading: boolean;
} {
    const [branding, setBranding] = useState<BrandingInfo>({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        async function loadBranding() {
            if (!holdingId && !marcaId) return;

            setLoading(true);
            const result: BrandingInfo = {};

            try {
                // Load holding info
                if (holdingId) {
                    const holdingRef = doc(db, 'holdings', holdingId);
                    const holdingDoc = await getDoc(holdingRef);
                    if (holdingDoc.exists()) {
                        const data = holdingDoc.data();
                        result.holdingName = data.nombre;
                        result.holdingLogo = data.logoUrl;
                    }
                }

                // Load marca info
                if (marcaId) {
                    const marcaRef = doc(db, 'marcas', marcaId);
                    const marcaDoc = await getDoc(marcaRef);
                    if (marcaDoc.exists()) {
                        const data = marcaDoc.data();
                        result.marcaName = data.nombre;
                        result.marcaLogo = data.logoUrl;
                    }
                }

                setBranding(result);
            } catch (error) {
                console.error('Error loading branding info:', error);
            } finally {
                setLoading(false);
            }
        }

        loadBranding();
    }, [holdingId, marcaId]);

    return { branding, loading };
}
