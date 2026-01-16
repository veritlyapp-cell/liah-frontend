/**
 * Calendar Integration Utilities
 * Handles creating calendar invite links for Google Calendar and Outlook
 */

export interface CalendarEvent {
    title: string;
    description: string;
    startTime: Date;
    endTime: Date;
    location?: string;
    attendees?: string[];
}

/**
 * Generate Google Calendar invite URL
 */
export function generateGoogleCalendarUrl(event: CalendarEvent): string {
    const formatDate = (date: Date) => date.toISOString().replace(/-|:|\.\d{3}/g, '');

    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: event.title,
        details: event.description,
        dates: `${formatDate(event.startTime)}/${formatDate(event.endTime)}`,
    });

    if (event.location) {
        params.append('location', event.location);
    }

    if (event.attendees && event.attendees.length > 0) {
        params.append('add', event.attendees.join(','));
    }

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generate Outlook/Office 365 calendar invite URL
 */
export function generateOutlookCalendarUrl(event: CalendarEvent): string {
    const formatDate = (date: Date) => date.toISOString();

    const params = new URLSearchParams({
        path: '/calendar/action/compose',
        rru: 'addevent',
        subject: event.title,
        body: event.description,
        startdt: formatDate(event.startTime),
        enddt: formatDate(event.endTime),
    });

    if (event.location) {
        params.append('location', event.location);
    }

    return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/**
 * Generate Office 365 (Work/School) calendar invite URL
 */
export function generateOffice365CalendarUrl(event: CalendarEvent): string {
    const formatDate = (date: Date) => date.toISOString();

    const params = new URLSearchParams({
        path: '/calendar/action/compose',
        rru: 'addevent',
        subject: event.title,
        body: event.description,
        startdt: formatDate(event.startTime),
        enddt: formatDate(event.endTime),
    });

    if (event.location) {
        params.append('location', event.location);
    }

    return `https://outlook.office.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/**
 * Generate ICS file content for download
 */
export function generateICSContent(event: CalendarEvent): string {
    const formatDate = (date: Date) => {
        return date.toISOString().replace(/-|:|\.\d{3}/g, '').slice(0, -1);
    };

    const uid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@liah.pe`;

    let ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//LIAH//Talent//ES
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${formatDate(new Date())}Z
DTSTART:${formatDate(event.startTime)}Z
DTEND:${formatDate(event.endTime)}Z
SUMMARY:${event.title}
DESCRIPTION:${event.description.replace(/\n/g, '\\n')}`;

    if (event.location) {
        ics += `\nLOCATION:${event.location}`;
    }

    if (event.attendees && event.attendees.length > 0) {
        event.attendees.forEach(email => {
            ics += `\nATTENDEE:mailto:${email}`;
        });
    }

    ics += `\nEND:VEVENT\nEND:VCALENDAR`;

    return ics;
}

/**
 * Download ICS file
 */
export function downloadICS(event: CalendarEvent, filename: string = 'entrevista.ics') {
    const icsContent = generateICSContent(event);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Create interview calendar event
 */
export function createInterviewEvent(
    candidateName: string,
    jobTitle: string,
    interviewerName: string,
    startTime: Date,
    durationMinutes: number = 60,
    meetingLink?: string,
    candidateEmail?: string,
    interviewerEmail?: string
): CalendarEvent {
    const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

    let description = `Entrevista para el puesto: ${jobTitle}\n\n`;
    description += `Candidato: ${candidateName}\n`;
    description += `Entrevistador: ${interviewerName}\n`;

    if (meetingLink) {
        description += `\nLink de reunión: ${meetingLink}`;
    }

    const attendees: string[] = [];
    if (candidateEmail) attendees.push(candidateEmail);
    if (interviewerEmail) attendees.push(interviewerEmail);

    return {
        title: `Entrevista: ${candidateName} - ${jobTitle}`,
        description,
        startTime,
        endTime,
        location: meetingLink || 'Por confirmar',
        attendees
    };
}
