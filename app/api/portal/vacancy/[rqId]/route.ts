import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';

const ACTIVE_STATUSES = ['recruiting', 'approved', 'active', 'published', 'activo', 'aprobado'];

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ rqId: string }> }
) {
    try {
        const { rqId } = await params;

        if (!rqId) {
            return NextResponse.json({ error: 'RQ ID requerido' }, { status: 400 });
        }

        const db = getAdminFirestore();

        // Get RQ document using Admin SDK
        const rqDoc = await db.collection('rqs').doc(rqId).get();

        if (!rqDoc.exists) {
            return NextResponse.json({ error: 'Vacante no encontrada' }, { status: 404 });
        }

        const data = rqDoc.data()!;

        // Check if still active (accept all valid statuses)
        if (!ACTIVE_STATUSES.includes(data.status) && !ACTIVE_STATUSES.includes(data.estado)) {
            console.log('[Vacancy API] RQ status not active:', data.status, data.estado);
            return NextResponse.json({ error: 'Esta vacante ya no está disponible' }, { status: 410 });
        }

        // Fetch RQ's killer questions - check subcollection first
        const kqSnap = await db.collection('rqs').doc(rqId).collection('killerQuestions').get();
        let killerQuestions = kqSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        // If subcollection empty, check if KQs are embedded in the document itself
        if (killerQuestions.length === 0 && data.killerQuestions && Array.isArray(data.killerQuestions)) {
            killerQuestions = data.killerQuestions;
        }

        // If still empty, look up the jobProfile by posicion name or jobProfileId
        if (killerQuestions.length === 0) {
            const jobProfileId = data.jobProfileId || data.perfilId || null;
            if (jobProfileId) {
                try {
                    // Try both collections for compatibility, but prioritize 'job_profiles'
                    let profileDoc = await db.collection('job_profiles').doc(jobProfileId).get();
                    if (!profileDoc.exists) {
                        profileDoc = await db.collection('jobProfiles').doc(jobProfileId).get();
                    }

                    if (profileDoc.exists) {
                        const profileData = profileDoc.data()!;
                        const profileKQs = profileData.killerQuestions
                            || profileData.requisitos?.killerQuestions
                            || [];
                        if (Array.isArray(profileKQs) && profileKQs.length > 0) {
                            killerQuestions = profileKQs.map((kq: any, i: number) => ({
                                id: kq.id || `kq_${i}`,
                                ...kq
                            }));
                        }
                    }
                } catch (e) {
                    console.warn('[Vacancy API] Could not load jobProfile KQs:', e);
                }
            } else {
                // Try matching by posicion name in jobProfiles
                try {
                    const posicion = data.puesto || data.posicion || data.posicionNombre || '';
                    const holdingId = data.tenantId || data.holdingId || '';
                    if (posicion && holdingId) {
                        // Check both collection names
                        let profilesSnap = await db.collection('job_profiles')
                            .where('holdingId', '==', holdingId)
                            .where('posicion', '==', posicion)
                            .limit(1).get();

                        if (profilesSnap.empty) {
                            profilesSnap = await db.collection('jobProfiles')
                                .where('holdingId', '==', holdingId)
                                .where('nombre', '==', posicion)
                                .limit(1).get();
                        }

                        if (!profilesSnap.empty) {
                            const profileData = profilesSnap.docs[0].data();
                            const profileKQs = profileData.killerQuestions
                                || profileData.requisitos?.killerQuestions
                                || [];
                            if (Array.isArray(profileKQs) && profileKQs.length > 0) {
                                killerQuestions = profileKQs.map((kq: any, i: number) => ({
                                    id: kq.id || `kq_${i}`,
                                    ...kq
                                }));
                            }
                        }
                    }
                } catch (e) {
                    console.warn('[Vacancy API] Could not match jobProfile by name:', e);
                }
            }
        }

        // Fetch holding info for branding
        let branding = {
            primaryColor: '#4F46E5',
            logoUrl: '',
            name: ''
        };

        const holdingId = data.tenantId || data.holdingId || '';
        if (holdingId) {
            try {
                // Try fetching by ID first
                const holdingDoc = await db.collection('holdings').doc(holdingId).get();
                if (holdingDoc.exists) {
                    const h = holdingDoc.data()!;
                    branding.primaryColor = h.config?.branding?.primaryColor || h.branding?.primaryColor || branding.primaryColor;
                    branding.logoUrl = h.logoUrl || '';
                    branding.name = h.nombre || '';
                } else {
                    // Try fetching by slug if ID failed (maybe holdingId was a slug)
                    const holdingSnap = await db.collection('holdings').where('slug', '==', holdingId.toLowerCase()).limit(1).get();
                    if (!holdingSnap.empty) {
                        const h = holdingSnap.docs[0].data();
                        branding.primaryColor = h.config?.branding?.primaryColor || h.branding?.primaryColor || branding.primaryColor;
                        branding.logoUrl = h.logoUrl || '';
                        branding.name = h.nombre || '';
                    }
                }
            } catch (e) {
                console.warn('[Vacancy API] Could not load branding:', e);
            }
        }

        // Fetch store address if available
        let storeAddress = data.storeAddress || data.direccionTienda || '';
        if (!storeAddress && data.tiendaId) {
            try {
                const tiendaDoc = await db.collection('tiendas').doc(data.tiendaId).get();
                if (tiendaDoc.exists) {
                    const t = tiendaDoc.data()!;
                    storeAddress = t.direccion || t.address || '';
                    // Also get slotInterval from store availability config
                    const slotInterval = t.availability?.slotInterval || 60;
                    return buildVacancyResponse(rqDoc.id, data, killerQuestions, storeAddress, slotInterval, branding);
                }
            } catch (e) { console.warn('[Vacancy API] Could not load store:', e); }
        }

        return buildVacancyResponse(rqDoc.id, data, killerQuestions, storeAddress, 60, branding);

    } catch (error: any) {
        console.error('[Vacancy API] Error:', error?.message || error);
        return NextResponse.json({ error: 'Error interno: ' + (error?.message || '') }, { status: 500 });
    }
}

function buildVacancyResponse(
    id: string,
    data: any,
    killerQuestions: any[],
    storeAddress: string,
    slotInterval: number,
    branding: any
) {
    return NextResponse.json({
        success: true,
        vacancy: {
            id,
            rqNumber: data.rqNumber || data.codigo || '',
            posicion: data.puesto || data.posicion || data.posicionNombre || data.title || '',
            modalidad: data.modalidad || 'Full Time',
            turno: data.turno || '',
            tiendaNombre: data.tiendaNombre || 'Sede Central',
            tiendaDistrito: data.tiendaDistrito || data.distrito || '',
            tiendaProvincia: data.tiendaProvincia || data.provincia || '',
            tiendaDepartamento: data.tiendaDepartamento || data.departamento || '',
            storeAddress,
            tiendaId: data.tiendaId || '',
            marcaNombre: data.marcaNombre || '',
            marcaId: data.marcaId || '',
            holdingId: data.tenantId || data.holdingId || '',
            holdingSlug: data.holdingSlug || '',
            branding,
            vacantes: data.vacantes || data.cantidadVacantes || 1,
            categoria: data.categoria || 'operativo',
            description: data.description || data.descripcion || '',
            killerQuestions,
            storeCoordinates: data.storeCoordinates || null,
            slotInterval   // minutes between interview slots
        }
    });
}
