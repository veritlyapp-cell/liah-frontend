import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export function useRQCreationStatus(holdingId?: string | null) {
    const [status, setStatus] = useState<'allowed' | 'blocked' | 'scheduled_closed'>('allowed');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!holdingId) {
            setLoading(false);
            return;
        }

        const unsubscribe = onSnapshot(doc(db, 'holdings', holdingId), (docSnap) => {
            setLoading(false);
            if (!docSnap.exists()) return;

            const data = docSnap.data();
            const mode = data.rqCreationMode || (data.blockRQCreation ? 'blocked' : 'free');
            
            if (mode === 'blocked') {
                setStatus('blocked');
                setMessage('La creación de requerimientos está bloqueada temporalmente por Operaciones.');
            } else if (mode === 'scheduled' && data.rqSchedule) {
                const schedule = data.rqSchedule;
                const now = new Date();
                
                const currentDay = now.getDay();
                const currentHourStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
                
                const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
                const scheduleText = `Horario permitido: de ${daysOfWeek[schedule.startDay]} ${schedule.startTime} a ${daysOfWeek[schedule.endDay]} ${schedule.endTime}`;

                let isWithin = false;
                
                // Re-align days so startDay is 0
                const shiftDay = (day: number, start: number) => (day - start + 7) % 7;
                
                const shiftedCurrent = shiftDay(currentDay, schedule.startDay);
                const shiftedEnd = shiftDay(schedule.endDay, schedule.startDay);
                
                if (shiftedCurrent === 0) {
                    // On start day
                    if (currentHourStr >= schedule.startTime) {
                        if (shiftedEnd === 0 && currentHourStr > schedule.endTime) isWithin = false; // same day, passed end time
                        else isWithin = true;
                    }
                } else if (shiftedCurrent > 0 && shiftedCurrent < shiftedEnd) {
                    // In between days
                    isWithin = true;
                } else if (shiftedCurrent === shiftedEnd) {
                    // On end day
                    if (currentHourStr <= schedule.endTime) isWithin = true;
                }
                
                if (isWithin) {
                    setStatus('allowed');
                    setMessage(`Cierre de RQs programado para el ${daysOfWeek[schedule.endDay]} a las ${schedule.endTime}`);
                } else {
                    setStatus('scheduled_closed');
                    setMessage(`Fuera de horario de carga. ${scheduleText}`);
                }
            } else {
                setStatus('allowed');
                setMessage('');
            }
        });

        return () => unsubscribe();
    }, [holdingId]);

    return { status, message, loading };
}
