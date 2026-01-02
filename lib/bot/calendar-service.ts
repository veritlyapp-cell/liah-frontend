import Logger from './logger';

class CalendarService {
    /**
     * List events for a specific time range
     */
    static async listEvents(calendarId: string, timeMin: Date, timeMax: Date): Promise<any[]> {
        try {
            // Mock Implementation
            Logger.info(`📅 [MOCK CALENDAR] Listing events for ${calendarId} between ${timeMin} and ${timeMax}`);

            // Return some fake busy slots for testing overlap
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(10, 0, 0, 0);

            const eventEnd = new Date(tomorrow);
            eventEnd.setHours(11, 0, 0, 0);

            return [
                {
                    summary: 'Reunión de Equipo',
                    start: { dateTime: tomorrow.toISOString() },
                    end: { dateTime: eventEnd.toISOString() }
                }
            ];

        } catch (error) {
            Logger.error('❌ Error listing calendar events:', error);
            return [];
        }
    }

    /**
     * Create an event in the calendar
     */
    static async createEvent(calendarId: string, eventDetails: any): Promise<any> {
        try {
            const { summary, start, end } = eventDetails;
            Logger.info(`📅 [MOCK CALENDAR] Creating event in ${calendarId}:`, { summary, start, end });

            // Mock response
            return {
                id: 'mock_event_' + Date.now(),
                status: 'confirmed',
                htmlLink: 'https://calendar.google.com/mock-link',
                ...eventDetails
            };

        } catch (error) {
            Logger.error('❌ Error creating calendar event:', error);
            throw error;
        }
    }

    /**
     * Check availability
     */
    static async filterAvailableSlots(calendarId: string, potentialSlots: any[]): Promise<any[]> {
        const busyEvents = await this.listEvents(calendarId, new Date(), new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

        return potentialSlots.filter(slot => {
            const slotStart = new Date(slot.date);
            const slotEnd = new Date(slotStart);
            slotEnd.setHours(slotStart.getHours() + 1); // Assume 1 hour slots

            // Check collision
            const hasCollision = busyEvents.some(event => {
                const eventStart = new Date(event.start.dateTime);
                const eventEnd = new Date(event.end.dateTime);
                return (slotStart < eventEnd && slotEnd > eventStart);
            });

            return !hasCollision;
        });
    }
}

export default CalendarService;
