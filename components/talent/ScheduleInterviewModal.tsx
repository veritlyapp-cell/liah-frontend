'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, addDoc, collection, Timestamp } from 'firebase/firestore';
import {
    generateGoogleCalendarUrl,
    generateOutlookCalendarUrl,
    generateOffice365CalendarUrl,
    createInterviewEvent,
    downloadICS
} from '@/lib/calendar/calendar-utils';

interface ScheduleInterviewModalProps {
    show: boolean;
    candidateId: string;
    candidateName: string;
    candidateEmail: string;
    jobId: string;
    jobTitle: string;
    holdingId: string;
    userId: string;
    userEmail: string;
    onClose: () => void;
    onScheduled: () => void;
}

export default function ScheduleInterviewModal({
    show,
    candidateId,
    candidateName,
    candidateEmail,
    jobId,
    jobTitle,
    holdingId,
    userId,
    userEmail,
    onClose,
    onScheduled
}: ScheduleInterviewModalProps) {
    const [date, setDate] = useState('');
    const [time, setTime] = useState('10:00');
    const [duration, setDuration] = useState(60);
    const [interviewerName, setInterviewerName] = useState('');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [hasGoogleCalendar, setHasGoogleCalendar] = useState(false);
    const [showCalendarOptions, setShowCalendarOptions] = useState(false);

    useEffect(() => {
        if (show) {
            checkCalendarConnection();
            // Set default date to tomorrow
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            setDate(tomorrow.toISOString().split('T')[0]);
        }
    }, [show, userId]);

    async function checkCalendarConnection() {
        try {
            const connectionDoc = await getDoc(doc(db, 'calendar_connections', userId));
            setHasGoogleCalendar(connectionDoc.exists() && connectionDoc.data().provider === 'google');
        } catch (error) {
            console.error('Error checking calendar:', error);
        }
    }

    function getInterviewDateTime(): Date {
        const [year, month, day] = date.split('-').map(Number);
        const [hours, minutes] = time.split(':').map(Number);
        return new Date(year, month - 1, day, hours, minutes);
    }

    async function saveInterview() {
        setSaving(true);
        try {
            const startTime = getInterviewDateTime();
            const endTime = new Date(startTime.getTime() + duration * 60000);

            // Save interview to Firestore
            await addDoc(collection(db, 'interviews'), {
                candidateId,
                candidateName,
                candidateEmail,
                jobId,
                jobTitle,
                holdingId,
                interviewerName: interviewerName || userEmail,
                interviewerEmail: userEmail,
                scheduledAt: Timestamp.fromDate(startTime),
                duration,
                notes,
                status: 'scheduled',
                createdAt: Timestamp.now(),
                createdBy: userId
            });

            // If Google Calendar is connected, create event
            if (hasGoogleCalendar) {
                try {
                    const response = await fetch('/api/calendar/google/create-event', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            userId,
                            title: `Entrevista: ${candidateName} - ${jobTitle}`,
                            description: `Entrevista para el puesto: ${jobTitle}\n\nCandidato: ${candidateName}\nEmail: ${candidateEmail}\n\n${notes}`,
                            startTime: startTime.toISOString(),
                            endTime: endTime.toISOString(),
                            attendees: [
                                { email: candidateEmail, name: candidateName },
                                { email: userEmail, name: interviewerName }
                            ]
                        })
                    });

                    if (response.ok) {
                        const result = await response.json();
                        console.log('Calendar event created:', result);
                        alert(`✅ Entrevista agendada!\n\nSe envió invitación a ${candidateEmail}`);
                    }
                } catch (calError) {
                    console.error('Calendar event error:', calError);
                }
            } else {
                // Show calendar options
                setShowCalendarOptions(true);
                return;
            }

            onScheduled();
            onClose();
        } catch (error) {
            console.error('Error scheduling interview:', error);
            alert('Error al agendar entrevista');
        } finally {
            setSaving(false);
        }
    }

    function openCalendarLink(type: 'google' | 'outlook' | 'office365' | 'ics') {
        const event = createInterviewEvent(
            candidateName,
            jobTitle,
            interviewerName || userEmail,
            getInterviewDateTime(),
            duration,
            undefined,
            candidateEmail,
            userEmail
        );

        switch (type) {
            case 'google':
                window.open(generateGoogleCalendarUrl(event), '_blank');
                break;
            case 'outlook':
                window.open(generateOutlookCalendarUrl(event), '_blank');
                break;
            case 'office365':
                window.open(generateOffice365CalendarUrl(event), '_blank');
                break;
            case 'ics':
                downloadICS(event, `entrevista_${candidateName.replace(/\s+/g, '_')}.ics`);
                break;
        }

        onScheduled();
        onClose();
    }

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-2xl w-full max-w-lg mx-4 overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-4">
                    <h2 className="text-xl font-bold text-white">📅 Agendar Entrevista</h2>
                    <p className="text-violet-100 text-sm">{candidateName} - {jobTitle}</p>
                </div>

                {!showCalendarOptions ? (
                    <div className="p-6 space-y-4">
                        {/* Date & Time */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Hora</label>
                                <input
                                    type="time"
                                    value={time}
                                    onChange={(e) => setTime(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                                />
                            </div>
                        </div>

                        {/* Duration */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Duración</label>
                            <select
                                value={duration}
                                onChange={(e) => setDuration(Number(e.target.value))}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                            >
                                <option value={30}>30 minutos</option>
                                <option value={45}>45 minutos</option>
                                <option value={60}>1 hora</option>
                                <option value={90}>1 hora 30 min</option>
                                <option value={120}>2 horas</option>
                            </select>
                        </div>

                        {/* Interviewer */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Entrevistador</label>
                            <input
                                type="text"
                                value={interviewerName}
                                onChange={(e) => setInterviewerName(e.target.value)}
                                placeholder={userEmail}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                            />
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={2}
                                placeholder="Temas a tratar, preparación requerida..."
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                            />
                        </div>

                        {/* Calendar Status */}
                        {hasGoogleCalendar ? (
                            <div className="bg-green-50 rounded-lg p-3 flex items-center gap-2">
                                <span className="text-green-600">✅</span>
                                <span className="text-sm text-green-700">Google Calendar conectado - Se creará evento automáticamente</span>
                            </div>
                        ) : (
                            <div className="bg-amber-50 rounded-lg p-3 flex items-center gap-2">
                                <span className="text-amber-600">⚠️</span>
                                <span className="text-sm text-amber-700">Calendario no conectado - Se mostrarán opciones para agregar manualmente</span>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={saveInterview}
                                disabled={saving || !date}
                                className="px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 flex items-center gap-2"
                            >
                                {saving ? '⏳ Guardando...' : '📅 Agendar Entrevista'}
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Calendar Options */
                    <div className="p-6 space-y-4">
                        <p className="text-gray-600 text-center">Selecciona cómo agregar la entrevista a tu calendario:</p>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => openCalendarLink('google')}
                                className="flex items-center justify-center gap-2 p-4 border-2 border-gray-200 rounded-xl hover:border-violet-500 hover:bg-violet-50 transition-colors"
                            >
                                <span className="text-2xl">📅</span>
                                <span className="font-medium">Google Calendar</span>
                            </button>

                            <button
                                onClick={() => openCalendarLink('outlook')}
                                className="flex items-center justify-center gap-2 p-4 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-colors"
                            >
                                <span className="text-2xl">📧</span>
                                <span className="font-medium">Outlook.com</span>
                            </button>

                            <button
                                onClick={() => openCalendarLink('office365')}
                                className="flex items-center justify-center gap-2 p-4 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-colors"
                            >
                                <span className="text-2xl">💼</span>
                                <span className="font-medium">Office 365</span>
                            </button>

                            <button
                                onClick={() => openCalendarLink('ics')}
                                className="flex items-center justify-center gap-2 p-4 border-2 border-gray-200 rounded-xl hover:border-gray-500 hover:bg-gray-50 transition-colors"
                            >
                                <span className="text-2xl">📥</span>
                                <span className="font-medium">Descargar .ICS</span>
                            </button>
                        </div>

                        <p className="text-xs text-gray-500 text-center">
                            La entrevista ya fue guardada. Agrega el evento a tu calendario para recibir recordatorios.
                        </p>

                        <button
                            onClick={onClose}
                            className="w-full py-2 text-gray-500 hover:text-gray-700"
                        >
                            Cerrar
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
