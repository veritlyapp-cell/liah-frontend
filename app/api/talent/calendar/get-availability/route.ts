import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function POST(req: Request) {
    try {
        const { requestId } = await req.json();

        if (!requestId) {
            return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
        }

        // 1. Get request details
        const requestDoc = await getDoc(doc(db, 'interview_booking_requests', requestId));
        if (!requestDoc.exists()) {
            return NextResponse.json({ error: 'Request not found' }, { status: 404 });
        }

        const requestData = requestDoc.data();
        const interviewerId = requestData.interviewerId;

        // 2. Check for calendar connection
        const connectionDoc = await getDoc(doc(db, 'calendar_connections', interviewerId));
        const connection = connectionDoc.exists() ? connectionDoc.data() : null;

        // 3. Generate baseline slots (9 AM to 6 PM)
        const slots = [];
        const today = new Date();

        for (let i = 1; i <= 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            date.setHours(0, 0, 0, 0);

            // Skip weekends
            if (date.getDay() === 0 || date.getDay() === 6) continue;

            const daySlots = [];
            for (let hour = 9; hour < 18; hour++) {
                const slotDate = new Date(date);
                slotDate.setHours(hour, 0, 0, 0);
                daySlots.push(slotDate.toISOString());

                const halfSlotDate = new Date(date);
                halfSlotDate.setHours(hour, 30, 0, 0);
                daySlots.push(halfSlotDate.toISOString());
            }
            slots.push({
                date: date.toISOString(),
                times: daySlots
            });
        }

        // 4. TODO: If calendar connected, filter out busy slots
        // For now, return all slots as 1-week baseline

        return NextResponse.json({
            success: true,
            slots,
            request: {
                candidateName: requestData.candidateName,
                jobTitle: requestData.jobTitle,
                interviewerName: requestData.interviewerName
            }
        });

    } catch (error: any) {
        console.error('Error getting availability:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
