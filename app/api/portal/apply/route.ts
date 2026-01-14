import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, arrayUnion, Timestamp, collection, addDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
    try {
        const {
            candidateId,
            rqId,
            kqAnswers,
            kqResults,
            kqPassed,
            isGeoMatch,
            matchScore,
            flow,
            sessionToken
        } = await request.json();

        if (!candidateId || !rqId) {
            return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
        }

        // Validate session
        const candidateDoc = await getDoc(doc(db, 'candidates', candidateId));
        if (!candidateDoc.exists()) {
            return NextResponse.json({ error: 'Candidato no encontrado' }, { status: 404 });
        }

        const candidateData = candidateDoc.data();
        if (candidateData.portalSessionToken !== sessionToken) {
            return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });
        }

        // Get RQ data
        const rqDoc = await getDoc(doc(db, 'rqs', rqId));
        if (!rqDoc.exists()) {
            return NextResponse.json({ error: 'Vacante no encontrada' }, { status: 404 });
        }

        const rqData = rqDoc.data();

        // Create application
        const applicationId = uuidv4();
        const application = {
            id: applicationId,
            rqId,
            rqNumber: rqData.rqNumber || '',
            posicion: rqData.posicion || '',
            modalidad: rqData.modalidad || 'Full Time',
            marcaId: rqData.marcaId || '',
            marcaNombre: rqData.marcaNombre || '',
            tiendaId: rqData.tiendaId || '',
            tiendaNombre: rqData.tiendaNombre || '',
            appliedAt: Timestamp.now(),
            source: 'portal_publico',
            categoria: rqData.categoria || 'operativo',

            // KQ & Flow data
            kqAnswers,
            kqResults,
            kqPassed,
            isGeoMatch,
            matchScore,
            flow, // 'A' or 'B'

            // Status based on flow
            status: flow === 'A' ? 'pending_schedule' : 'in_review',

            // For FLUJO B, goes to rescue inbox
            inRescueInbox: flow === 'B'
        };

        // Add application to candidate
        await updateDoc(doc(db, 'candidates', candidateId), {
            applications: arrayUnion(application),
            updatedAt: Timestamp.now()
        });

        // If FLUJO B, also create entry in rescue inbox collection for easy querying
        if (flow === 'B') {
            const rescueRef = collection(db, 'rescue_inbox');
            await addDoc(rescueRef, {
                candidateId,
                applicationId,
                rqId,
                rqNumber: rqData.rqNumber || '',
                posicion: rqData.posicion || '',
                marcaId: rqData.marcaId || '',
                marcaNombre: rqData.marcaNombre || '',
                tiendaId: rqData.tiendaId || '',
                tiendaNombre: rqData.tiendaNombre || '',
                candidateName: `${candidateData.nombre} ${candidateData.apellidoPaterno}`,
                candidateEmail: candidateData.email,
                candidateDistrito: candidateData.distrito,
                matchScore,
                kqPassed,
                status: 'pending_review',
                createdAt: Timestamp.now(),
                // Rejection reason tracking
                rejectionReasons: {
                    geoMismatch: !isGeoMatch,
                    kqFailed: !kqPassed,
                    failedKQs: Object.entries(kqResults || {})
                        .filter(([, v]: [string, any]) => !v.passed)
                        .map(([k]) => k)
                }
            });
        }

        console.log('[Portal Apply]', {
            candidateId,
            rqId,
            flow,
            applicationId
        });

        return NextResponse.json({
            success: true,
            applicationId,
            flow
        });

    } catch (error) {
        console.error('Error applying:', error);
        return NextResponse.json({ error: 'Error al postular' }, { status: 500 });
    }
}
