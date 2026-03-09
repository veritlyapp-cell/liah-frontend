import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
    try {
        const { email, rqId, holdingSlug } = await request.json();

        if (!email) {
            return NextResponse.json({ error: 'Email es requerido' }, { status: 400 });
        }

        const db = getAdminFirestore();

        // 1. Search for candidate by email
        const candSnapshot = await db.collection('candidates')
            .where('email', '==', email.toLowerCase().trim())
            .limit(1)
            .get();

        if (candSnapshot.empty) {
            return NextResponse.json({ found: false });
        }

        const candidateDoc = candSnapshot.docs[0];
        const candData = candidateDoc.data();
        const candidateId = candidateDoc.id;

        // 2. Check if has active session
        let hasSession = false;
        if (candData.portalSessionToken && candData.portalSessionExpiry) {
            const expiry = new Date(candData.portalSessionExpiry);
            if (expiry > new Date()) {
                hasSession = true;
            }
        }

        // 3. Check for active application in the same store
        let hasActiveApplicationInStore = false;
        if (rqId) {
            try {
                // Get target store from current RQ
                const rqDoc = await db.collection('rqs').doc(rqId).get();
                if (rqDoc.exists) {
                    const rqData = rqDoc.data();
                    const targetStoreId = rqData?.tiendaId;

                    if (targetStoreId || rqData?.tiendaNombre) {
                        // Check candidate's applications array
                        const applications = candData.applications || [];
                        const existingInStore = applications.find((app: any) =>
                            ((targetStoreId && app.tiendaId === targetStoreId) ||
                                (rqData.tiendaNombre && app.tiendaNombre === rqData.tiendaNombre)) &&
                            !['hired', 'rejected', 'withdrawn', 'discarded', 'withdrawn_portal'].includes(app.status)
                        );

                        if (existingInStore) {
                            hasActiveApplicationInStore = true;
                        }
                    }
                }
            } catch (e) {
                console.warn('[Lookup] Error checking active applications:', e);
            }
        }

        return NextResponse.json({
            found: true,
            hasSession,
            sessionToken: hasSession ? candData.portalSessionToken : null,
            hasActiveApplicationInStore,
            candidate: {
                id: candidateId,
                nombre: candData.nombre,
                apellidos: `${candData.apellidoPaterno || ''} ${candData.apellidoMaterno || ''}`.trim(),
                celular: candData.telefono || candData.celular || '',
                distrito: candData.distrito || '',
                departamento: candData.departamento || '',
                provincia: candData.provincia || '',
                email: candData.email
            }
        });

    } catch (error: any) {
        console.error('[Candidate Lookup] Error:', error);
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}
