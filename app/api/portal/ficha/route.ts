import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { FieldValue as AdminFieldValue } from 'firebase-admin/firestore';

/**
 * GET /api/portal/ficha?token=xxx&candidateId=xxx&rqId=xxx
 * Validate the ficha token and return pre-filled candidate + RQ data
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get('token');
        const candidateId = searchParams.get('candidateId');
        const rqId = searchParams.get('rqId');

        if (!token || !candidateId) {
            return NextResponse.json({ error: 'Token y candidateId son requeridos' }, { status: 400 });
        }

        const db = getAdminFirestore();

        // Fetch candidate
        const candidateDoc = await db.collection('candidates').doc(candidateId).get();
        if (!candidateDoc.exists) {
            return NextResponse.json({ error: 'Candidato no encontrado' }, { status: 404 });
        }

        const c = candidateDoc.data()!;

        // Validate ficha token
        if (c.fichaToken !== token) {
            return NextResponse.json({ error: 'Enlace inválido' }, { status: 401 });
        }

        // Check expiry
        if (c.fichaTokenExpiry) {
            const expiry = new Date(c.fichaTokenExpiry);
            if (new Date() > expiry) {
                return NextResponse.json({ error: 'Este enlace ha expirado. Contacta a selección.' }, { status: 401 });
            }
        }

        // Fetch RQ info if provided
        let rqData: any = {};
        if (rqId) {
            try {
                const rqDoc = await db.collection('rqs').doc(rqId).get();
                if (rqDoc.exists) rqData = rqDoc.data()!;
            } catch (e) { console.warn('Could not load RQ:', e); }
        }

        // Fetch brand config
        const holdingSlug = c.holdingSlug || rqData.tenantId || '';
        let branding: any = null;

        if (holdingSlug) {
            try {
                const holdingsSnap = await db.collection('holdings')
                    .where('slug', '==', holdingSlug.toLowerCase())
                    .limit(1).get();
                if (!holdingsSnap.empty) {
                    const h = holdingsSnap.docs[0].data();
                    const b = h.config?.branding || h.branding || {};
                    branding = {
                        primaryColor: b.primaryColor || '#4F46E5',
                        name: h.nombre || '',
                        logoUrl: h.logoUrl || ''
                    };
                }
            } catch (e) { console.warn('Could not load brand:', e); }
        }

        return NextResponse.json({
            success: true,
            candidate: {
                nombre: c.nombre || '',
                apellidoPaterno: c.apellidoPaterno || '',
                apellidoMaterno: c.apellidoMaterno || '',
                email: c.email || '',
                telefono: c.telefono || c.celular || '',
                dni: c.dni || '',
                fechaNacimiento: c.fechaNacimiento || '',
                estadoCivil: c.estadoCivil || '',
                gradoInstruccion: c.gradoInstruccion || '',
                banco: c.banco || '',
                numeroCuenta: c.numeroCuenta || '',
                emergenciaNombre: c.emergenciaNombre || '',
                emergenciaRelacion: c.emergenciaRelacion || '',
                emergenciaTelefono: c.emergenciaTelefono || '',
                departamento: c.departamento || 'Lima',
                provincia: c.provincia || 'Lima',
                distrito: c.distrito || '',
                direccion: c.direccion || '',
                cvUrl: c.cvUrl || '',
                culUrl: c.culUrl || ''
            },
            rq: {
                puesto: rqData.puesto || rqData.posicion || rqData.posicionNombre || '',
                tiendaNombre: rqData.tiendaNombre || '',
                tiendaDistrito: rqData.tiendaDistrito || rqData.distrito || '',
                marcaNombre: rqData.marcaNombre || ''
            },
            branding
        });

    } catch (error: any) {
        console.error('[Ficha GET] Error:', error?.message || error);
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}

/**
 * POST /api/portal/ficha
 * Save the completed ficha data and notify the recruiter
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            token,
            candidateId,
            rqId,
            // Fields to update
            fechaNacimiento,
            dni,
            estadoCivil,
            gradoInstruccion,
            banco,
            numeroCuenta,
            emergenciaNombre,
            emergenciaRelacion,
            emergenciaTelefono,
            departamento,
            provincia,
            distrito,
            direccion,
            culUrl,
            cvUrl
        } = body;

        if (!token || !candidateId) {
            return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
        }

        const db = getAdminFirestore();

        // Validate token
        const candidateDoc = await db.collection('candidates').doc(candidateId).get();
        if (!candidateDoc.exists) {
            return NextResponse.json({ error: 'Candidato no encontrado' }, { status: 404 });
        }
        const c = candidateDoc.data()!;
        if (c.fichaToken !== token) {
            return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
        }

        // Update candidate with all the collected data
        const updates: Record<string, any> = {
            fechaNacimiento: fechaNacimiento || c.fechaNacimiento || '',
            dni: dni || c.dni || '',
            estadoCivil: estadoCivil || c.estadoCivil || '',
            gradoInstruccion: gradoInstruccion || c.gradoInstruccion || '',
            banco: banco || c.banco || '',
            numeroCuenta: numeroCuenta || c.numeroCuenta || '',
            emergenciaNombre: emergenciaNombre || c.emergenciaNombre || '',
            emergenciaRelacion: emergenciaRelacion || c.emergenciaRelacion || '',
            emergenciaTelefono: emergenciaTelefono || c.emergenciaTelefono || '',
            departamento: departamento || c.departamento || '',
            provincia: provincia || c.provincia || '',
            distrito: distrito || c.distrito || '',
            direccion: direccion || c.direccion || '',
            fichaCompleted: true,
            fichaCompletedAt: AdminFieldValue.serverTimestamp(),
            updatedAt: AdminFieldValue.serverTimestamp()
        };

        if (culUrl) updates.culUrl = culUrl;
        if (cvUrl) updates.cvUrl = cvUrl;

        await db.collection('candidates').doc(candidateId).update(updates);

        // Also update in rq_applications for quick recruiter access
        if (rqId) {
            try {
                const appsSnap = await db.collection('rqs').doc(rqId)
                    .collection('applications')
                    .where('candidateId', '==', candidateId)
                    .limit(1).get();
                if (!appsSnap.empty) {
                    await appsSnap.docs[0].ref.update({
                        fichaCompleted: true,
                        fichaCompletedAt: AdminFieldValue.serverTimestamp(),
                        status: 'ficha_completed'
                    });
                }
            } catch (e) { console.warn('Could not update rq application:', e); }
        }

        // Notify recruiter via email
        try {
            const { Resend } = await import('resend');
            const resend = new Resend(process.env.RESEND_API_KEY);

            // Find recruiters for this holding
            const holdingSlug = c.holdingSlug || '';
            let recruiterEmails: string[] = [];

            if (holdingSlug) {
                const holdingsSnap = await db.collection('holdings')
                    .where('slug', '==', holdingSlug.toLowerCase()).limit(1).get();
                if (!holdingsSnap.empty) {
                    const holdingId = holdingsSnap.docs[0].id;
                    const usersSnap = await db.collection('userAssignments')
                        .where('holdingId', '==', holdingId)
                        .where('role', '==', 'recruiter')
                        .where('active', '==', true)
                        .limit(5).get();
                    recruiterEmails = usersSnap.docs
                        .map(d => d.data().email)
                        .filter(Boolean);
                }
            }

            if (recruiterEmails.length > 0) {
                const adminUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://getliah.com'}/reclutador/candidatos/${candidateId}`;
                await resend.emails.send({
                    from: 'LIAH Sistema <noreply@getliah.com>',
                    to: recruiterEmails[0],
                    subject: `📋 Ficha completada - ${c.nombre} ${c.apellidoPaterno}`,
                    html: `
                        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
                            <h2 style="color: #4F46E5;">Ficha de Candidato Completada</h2>
                            <p>El candidato <strong>${c.nombre} ${c.apellidoPaterno}</strong> completó su ficha.</p>
                            <div style="background: #F3F4F6; padding: 20px; border-radius: 12px; margin: 20px 0;">
                                <p><strong>Email:</strong> ${c.email}</p>
                                <p><strong>Teléfono:</strong> ${updates.telefono || c.telefono || ''}</p>
                                <p><strong>DNI:</strong> ${updates.dni}</p>
                                <p><strong>Distrito:</strong> ${updates.distrito}</p>
                            </div>
                            <a href="${adminUrl}" style="display: inline-block; background: #4F46E5; color: white; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: 700;">
                                Ver Candidato →
                            </a>
                        </div>
                    `
                });
            }
        } catch (emailError: any) {
            console.error('[Ficha POST] Notification email error:', emailError?.message);
        }

        return NextResponse.json({ success: true, message: 'Ficha guardada correctamente' });

    } catch (error: any) {
        console.error('[Ficha POST] Error:', error?.message || error);
        return NextResponse.json({ error: 'Error interno: ' + (error?.message || '') }, { status: 500 });
    }
}
