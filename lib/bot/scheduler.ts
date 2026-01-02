import { getCollections, getCollections as getCollectionsHelper } from './collections';
import { getFieldValue } from '../firebase-admin';
import Logger from './logger';
import CalendarService from './calendar-service';

class Scheduler {
    /**
     * Generate available time slots for interviews
     */
    static async generateTimeSlots(startDate = new Date(), daysAhead = 7) {
        const slots: any[] = [];
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);

        const interviewHours = [9, 10, 11, 14, 15, 16, 17];

        for (let day = 1; day <= daysAhead; day++) {
            const currentDate = new Date(start);
            currentDate.setDate(start.getDate() + day);

            if (currentDate.getDay() === 0) continue;

            for (const hour of interviewHours) {
                const slotTime = new Date(currentDate);
                slotTime.setHours(hour, 0, 0, 0);

                slots.push({
                    date: slotTime,
                    display: this.formatSlotDisplay(slotTime)
                });
            }
        }

        const calendarId = 'seleccion@ngr.com.pe';
        return await CalendarService.filterAvailableSlots(calendarId, slots);
    }

    private static formatSlotDisplay(date: Date) {
        const d = new Date(date);
        const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

        const dayName = days[d.getDay()];
        const day = d.getDate();
        const month = months[d.getMonth()];
        const hour = d.getHours();
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;

        return `${dayName} ${day} ${month} - ${displayHour}:00 ${ampm}`;
    }

    /**
     * Schedule an interview for a candidate
     */
    static async scheduleInterview(tenant_id: string, candidateId: string, interviewData: any) {
        try {
            const { tiendaId, vacanteId, fechaHora, direccion } = interviewData;
            Logger.info('📅 Scheduling interview', { candidateId, tiendaId, fechaHora });

            const collections = await getCollections();
            const candidateRef = collections.postulante(tenant_id, candidateId);
            const candidateDoc = await candidateRef.get();

            if (!candidateDoc.exists) {
                throw new Error('Candidate not found');
            }

            const candidateData = candidateDoc.data()!;
            let storeDetails = candidateData.candidateData?.selectedStore || {
                id: tiendaId,
                nombre: 'Tienda ' + tiendaId,
                marca: 'NGR'
            };

            const calendarId = 'seleccion@ngr.com.pe';
            const startTime = new Date(fechaHora);
            const endTime = new Date(startTime);
            endTime.setHours(startTime.getHours() + 1);

            const eventData = {
                summary: `Entrevista: ${candidateData.candidateData?.nombre || 'Candidato'}`,
                description: `Candidato: ${candidateData.candidateData?.nombre}\nDNI: ${candidateData.candidateData?.dni}\nTienda: ${storeDetails.nombre}`,
                start: { dateTime: startTime.toISOString() },
                end: { dateTime: endTime.toISOString() }
            };

            const calendarEvent = await CalendarService.createEvent(calendarId, eventData);
            const FieldValue = await getFieldValue();

            const application = {
                id: `app_${Date.now()}`,
                tiendaId: storeDetails.id,
                tiendaNombre: storeDetails.nombre,
                marcaNombre: storeDetails.marca || 'NGR',
                posicion: candidateData.candidateData?.selectedVacancy?.puesto || 'Puesto Generico',
                status: 'interview_scheduled',
                appliedAt: new Date(),
                source: 'bot_whatsapp'
            };

            await candidateRef.update({
                entrevista: {
                    tiendaId,
                    vacanteId,
                    fechaHora: startTime,
                    direccion,
                    calendarEventId: calendarEvent.id,
                    estado: 'programada',
                    confirmada: false,
                    programadaAt: new Date()
                },
                estado: 'entrevista_programada',
                applications: FieldValue.arrayUnion(application),
                updatedAt: new Date()
            });

            Logger.success('✅ Interview scheduled successfully');
            return {
                candidateId,
                fechaHora: startTime,
                direccion,
                estado: 'programada'
            };

        } catch (error) {
            Logger.error('❌ Error scheduling interview:', error);
            throw error;
        }
    }

    /**
     * Confirm interview attendance
     */
    static async confirmInterview(tenant_id: string, candidateId: string) {
        try {
            const collections = await getCollections();
            const candidateRef = collections.postulante(tenant_id, candidateId);

            await candidateRef.update({
                'entrevista.confirmada': true,
                'entrevista.confirmadaAt': new Date(),
                estado: 'entrevista_confirmada',
                updatedAt: new Date()
            });

            Logger.success(`✅ Interview confirmed for candidate: ${candidateId}`);
            return true;

        } catch (error) {
            Logger.error('❌ Error confirming interview:', error);
            throw error;
        }
    }
}

export default Scheduler;
