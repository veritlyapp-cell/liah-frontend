import { NextRequest, NextResponse } from 'next/server';
import { notifyRoleAction, sendPushToUsers } from '@/lib/notifications/send-push';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { type, data } = body;

        switch (type) {
            case 'RQ_PENDING_SUPERVISOR':
                await notifyRoleAction({
                    role: 'supervisor',
                    marcaId: data.marcaId,
                    tiendaId: data.tiendaId,
                    payload: {
                        title: '📋 Nuevo RQ Pendiente',
                        body: `Se ha creado un RQ para ${data.posicion} en ${data.tiendaNombre}. Requiere tu aprobación.`,
                        url: '/supervisor'
                    }
                });
                break;

            case 'RQ_PENDING_JEFE_MARCA':
                await notifyRoleAction({
                    role: 'jefe_marca',
                    marcaId: data.marcaId,
                    payload: {
                        title: '⚡ RQ Pendiente de Aprobación Final',
                        body: `El RQ para ${data.posicion} en ${data.tiendaNombre} ha sido aprobado por el supervisor y espera tu validación.`,
                        url: '/jefe-marca'
                    }
                });
                break;

            case 'RQ_APPROVED':
                // Notify the initiator or recruiters
                await notifyRoleAction({
                    role: 'recruiter',
                    marcaId: data.marcaId,
                    payload: {
                        title: '✅ Requerimiento Activo',
                        body: `El RQ para ${data.posicion} en ${data.tiendaNombre} ha sido aprobado. ¡Puedes empezar a buscar candidatos!`,
                        url: '/recruiter'
                    }
                });
                break;

            case 'CANDIDATE_REGISTERED':
                await notifyRoleAction({
                    role: 'recruiter',
                    marcaId: data.marcaId,
                    payload: {
                        title: '👥 Nuevo Candidato Registrado',
                        body: `${data.candidateName} se ha registrado para la marca ${data.marcaNombre}.`,
                        url: '/recruiter'
                    }
                });
                break;

            case 'CUL_VALIDATED':
                // Notify Store Manager
                await notifyRoleAction({
                    role: 'store_manager',
                    tiendaId: data.tiendaId,
                    payload: {
                        title: '🎯 Candidato Listo para Entrevista',
                        body: `El candidato ${data.candidateName} ha sido validado por Reclutamiento. Agenda su entrevista.`,
                        url: '/store-manager'
                    }
                });
                break;

            default:
                return NextResponse.json({ error: 'Invalid notification type' }, { status: 400 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('API Notification Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
