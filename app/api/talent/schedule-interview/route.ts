import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const tiendaId = searchParams.get('tiendaId');

        if (!tiendaId) {
            return NextResponse.json({ error: 'Falta tiendaId' }, { status: 400 });
        }

        // 1. Fetch Store Data
        const db = getAdminFirestore();
        const storeDoc = await db.collection('tiendas').doc(tiendaId).get();
        if (!storeDoc.exists) {
            return NextResponse.json({ error: 'Tienda no encontrada' }, { status: 404 });
        }

        const storeData = storeDoc.data();
        let availability = storeData?.availability;

        // Fallback or Missing availability
        if (!availability || Object.keys(availability).length === 0) {
            // Default mock slots to prevent blocking the flow
            availability = {
                Lunes: [{ start: "09:00", end: "11:00" }, { start: "15:00", end: "17:00" }],
                Miércoles: [{ start: "10:00", end: "12:00" }],
                Viernes: [{ start: "14:00", end: "17:00" }]
            };
        }

        // 2. Generate future dates matching those days
        const daysMap = {
            'Domingo': 0, 'Lunes': 1, 'Martes': 2, 'Miércoles': 3, 'Jueves': 4, 'Viernes': 5, 'Sábado': 6
        };

        const availableSlots = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Scan the next 7 days
        for (let i = 1; i <= 7; i++) {
            const dateToCheck = new Date(today);
            dateToCheck.setDate(today.getDate() + i);
            const dayOfWeekNum = dateToCheck.getDay();

            // Find matching configured day name
            const matchingDayName = Object.keys(availability).find(dayName => daysMap[dayName as keyof typeof daysMap] === dayOfWeekNum);

            if (matchingDayName && availability[matchingDayName].length > 0) {
                // Formatting Date as string "YYYY-MM-DD"
                const dateStr = dateToCheck.toISOString().split('T')[0];

                // Add all slots for this day individually
                for (const slot of availability[matchingDayName]) {
                    // Create multiple 30-min interview slots within the range (e.g. 14:00-16:00 -> 14:00, 14:30, 15:00, 15:30)
                    const [startH, startM] = slot.start.split(':').map(Number);
                    const [endH, endM] = slot.end.split(':').map(Number);

                    let currentMin = startH * 60 + startM;
                    const endMin = endH * 60 + endM;

                    while (currentMin < endMin) {
                        const h = Math.floor(currentMin / 60);
                        const m = currentMin % 60;
                        const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

                        // Parse AM/PM purely for friendly display
                        const ampm = h >= 12 ? 'PM' : 'AM';
                        const displayHour = h > 12 ? h - 12 : (h === 0 ? 12 : h);

                        // "Día N de Mes - H:MM AM/PM"
                        const displayStr = `${matchingDayName} ${dateToCheck.getDate()} - ${displayHour}:${m.toString().padStart(2, '0')} ${ampm}`;

                        availableSlots.push({
                            iso: `${dateStr}T${timeStr}:00.000Z`,
                            display: displayStr
                        });

                        // Add 30 minutes
                        currentMin += 30;

                        // Limit to 6 slots max per day to not overload UI
                        if (availableSlots.filter(s => s.iso.startsWith(dateStr)).length >= 6) break;
                    }
                }
            }
        }

        return NextResponse.json({ slots: availableSlots });
    } catch (e: any) {
        console.error('Error fetching time slots:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
