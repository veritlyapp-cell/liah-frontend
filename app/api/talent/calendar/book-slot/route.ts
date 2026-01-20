import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, addDoc, collection, Timestamp } from 'firebase/firestore';
import { notifyInterviewScheduled } from '@/lib/notifications/notification-service';

export async function POST(req: Request) {
    try {
        const { requestId, startTime, duration } = await req.json();

        if (!requestId || !startTime) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Get request details
        const requestRef = doc(db, 'interview_booking_requests', requestId);
        const requestSnapshot = await getDoc(requestRef);

        if (!requestSnapshot.exists()) {
            return NextResponse.json({ error: 'Request not found' }, { status: 404 });
        }

        const requestData = requestSnapshot.data();
        if (requestData.status !== 'pending') {
            return NextResponse.json({ error: 'Esta solicitud ya ha sido procesada o ha expirado' }, { status: 400 });
        }

        const startDateTime = new Date(startTime);
        const endDateTime = new Date(startDateTime.getTime() + (duration || 60) * 60000);

        // 2. Create interview record
        const interviewRef = await addDoc(collection(db, 'interviews'), {
            candidateId: requestData.candidateId,
            candidateName: requestData.candidateName,
            candidateEmail: requestData.candidateEmail,
            jobId: requestData.jobId,
            jobTitle: requestData.jobTitle,
            holdingId: requestData.holdingId,
            interviewerId: requestData.interviewerId,
            interviewerName: requestData.interviewerName,
            interviewerEmail: requestData.interviewerEmail,
            scheduledAt: Timestamp.fromDate(startDateTime),
            duration: duration || 60,
            status: 'scheduled',
            createdAt: Timestamp.now(),
            bookingRequestId: requestId
        });

        // 3. Update application status
        // We'd need to find the application ID. For now, we'll just proceed with the interview record.
        // In a full implementation, we'd update the application's funnelStage to 'interview'

        // 4. Update booking request
        await updateDoc(requestRef, {
            status: 'completed',
            bookedAt: Timestamp.now(),
            interviewId: interviewRef.id,
            finalStartTime: startTime
        });

        // 5. Check if calendar is connected to create event
        const connectionDoc = await getDoc(doc(db, 'calendar_connections', requestData.interviewerId));
        if (connectionDoc.exists() && connectionDoc.data().provider === 'google') {
            try {
                await fetch(`${new URL(req.url).origin}/api/calendar/google/create-event`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: requestData.interviewerId,
                        title: `Entrevista (Agendada por Candidato): ${requestData.candidateName}`,
                        description: `Entrevista para el puesto: ${requestData.jobTitle}\n\nAgendada vía link de autogestión.`,
                        startTime: startDateTime.toISOString(),
                        endTime: endDateTime.toISOString(),
                        attendees: [
                            { email: requestData.candidateEmail, name: requestData.candidateName },
                            { email: requestData.interviewerEmail, name: requestData.interviewerName }
                        ]
                    })
                });
            } catch (calError) {
                console.error('Failed to create calendar event:', calError);
            }
        }

        // 6. Notify candidate
        try {
            await notifyInterviewScheduled(
                requestData.holdingId,
                requestData.candidateEmail,
                requestData.candidateName,
                requestData.jobTitle,
                startDateTime,
                requestData.interviewerName
            );
        } catch (notifyError) {
            console.error('Failed to notify candidate:', notifyError);
        }

        return NextResponse.json({ success: true, interviewId: interviewRef.id });

    } catch (error: any) {
        console.error('Error booking slot:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
