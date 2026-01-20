'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

type TriggerType = 'manual' | 'auto' | 'disabled';

interface EmailTemplate {
    subject: string;
    body: string;
    enabled: boolean;
    trigger: TriggerType;
    triggerStatus?: string;
}

interface EmailTemplates {
    cul_request: EmailTemplate;
    thank_you: EmailTemplate;
    start_date: EmailTemplate;
    interview_reminder: EmailTemplate;
    rejection: EmailTemplate;
}

// Candidate status options for auto-trigger
const STATUS_OPTIONS = [
    { value: 'new', label: 'Nueva postulación' },
    { value: 'reviewing', label: 'En revisión' },
    { value: 'documentsRequired', label: 'Documentos pendientes (CUL)' },
    { value: 'interviewed', label: 'Entrevistado' },
    { value: 'approved', label: 'Aprobado' },
    { value: 'hired', label: 'Contratado' },
    { value: 'rejected', label: 'Rechazado' }
];

const DEFAULT_TEMPLATES: EmailTemplates = {
    cul_request: {
        subject: '📄 Solicitud de Certificado Único Laboral (CUL) - {{HOLDING_NAME}}',
        body: `Estimado/a {{CANDIDATE_NAME}},

¡Felicidades! Has avanzado en nuestro proceso de selección para el puesto de {{JOB_TITLE}}.

Para continuar, necesitamos que nos envíes tu Certificado Único Laboral (CUL). Puedes obtenerlo en:
🔗 https://www.gob.pe/cul

Este documento es gratuito y puedes descargarlo en minutos.

Una vez que lo tengas, por favor responde a este correo adjuntando el archivo PDF.

¡Estamos emocionados de tenerte con nosotros!

Saludos,
Equipo de Recursos Humanos
{{HOLDING_NAME}}`,
        enabled: true,
        trigger: 'auto',
        triggerStatus: 'documentsRequired'
    },
    thank_you: {
        subject: '🙏 Gracias por tu postulación - {{HOLDING_NAME}}',
        body: `Estimado/a {{CANDIDATE_NAME}},

Hemos recibido tu postulación para el puesto de {{JOB_TITLE}}.

Nuestro equipo de reclutamiento está revisando tu perfil y nos comunicaremos contigo si avanzas a la siguiente etapa.

Te agradecemos por tu interés en formar parte de {{HOLDING_NAME}}.

Saludos cordiales,
Equipo de Recursos Humanos
{{HOLDING_NAME}}`,
        enabled: true,
        trigger: 'auto',
        triggerStatus: 'new'
    },
    start_date: {
        subject: '🎉 ¡Bienvenido/a al equipo! Fecha de inicio - {{HOLDING_NAME}}',
        body: `Estimado/a {{CANDIDATE_NAME}},

¡Es un placer darte la bienvenida a {{HOLDING_NAME}}!

Tu fecha de inicio es: {{START_DATE}}
Hora: {{START_TIME}}
Ubicación: {{LOCATION}}

Por favor, trae los siguientes documentos el día de tu incorporación:
• DNI original
• Certificado Único Laboral (CUL)
• Carnet de sanidad (si aplica)
• Fotocheck anterior (si aplica)

Si tienes alguna pregunta, no dudes en contactarnos.

¡Te esperamos!

Saludos,
Equipo de Recursos Humanos
{{HOLDING_NAME}}`,
        enabled: true,
        trigger: 'auto',
        triggerStatus: 'hired'
    },
    interview_reminder: {
        subject: '📅 Recordatorio de Entrevista - {{HOLDING_NAME}}',
        body: `Estimado/a {{CANDIDATE_NAME}},

Te recordamos que tienes una entrevista programada para el puesto de {{JOB_TITLE}}.

📅 Fecha: {{INTERVIEW_DATE}}
🕐 Hora: {{INTERVIEW_TIME}}
📍 Ubicación: {{LOCATION}}

Por favor, llega 10 minutos antes y trae tu DNI.

¡Mucho éxito!

Saludos,
Equipo de Recursos Humanos
{{HOLDING_NAME}}`,
        enabled: true,
        trigger: 'manual',
        triggerStatus: undefined
    },
    rejection: {
        subject: 'Actualización sobre tu postulación - {{HOLDING_NAME}}',
        body: `Estimado/a {{CANDIDATE_NAME}},

Agradecemos tu interés en el puesto de {{JOB_TITLE}} en {{HOLDING_NAME}}.

Después de una cuidadosa revisión, hemos decidido continuar con otros candidatos cuyo perfil se ajusta mejor a los requisitos actuales de la posición.

Te animamos a seguir postulando a futuras oportunidades en nuestra empresa.

Gracias por tu tiempo y mucho éxito en tu búsqueda laboral.

Saludos cordiales,
Equipo de Recursos Humanos
{{HOLDING_NAME}}`,
        enabled: true,
        trigger: 'auto',
        triggerStatus: 'rejected'
    }
};

const TEMPLATE_LABELS: Record<keyof EmailTemplates, { label: string; description: string; icon: string; defaultStatus?: string }> = {
    cul_request: {
        label: 'Solicitud de CUL',
        description: 'Para pedir el Certificado Único Laboral',
        icon: '📄',
        defaultStatus: 'documentsRequired'
    },
    thank_you: {
        label: 'Agradecimiento',
        description: 'Confirmación de postulación recibida',
        icon: '🙏',
        defaultStatus: 'new'
    },
    start_date: {
        label: 'Fecha de Ingreso (Onboarding)',
        description: 'Bienvenida con fecha y documentos. Calcula Time to Fill.',
        icon: '🎉',
        defaultStatus: 'hired'
    },
    interview_reminder: {
        label: 'Recordatorio de Entrevista',
        description: 'Antes de una entrevista programada',
        icon: '📅',
        defaultStatus: undefined
    },
    rejection: {
        label: 'Rechazo',
        description: 'Cuando el candidato no es seleccionado',
        icon: '✉️',
        defaultStatus: 'rejected'
    }
};

const TRIGGER_OPTIONS = [
    { value: 'auto' as TriggerType, label: '🤖 Automático', description: 'Se envía al cambiar estado' },
    { value: 'manual' as TriggerType, label: '👆 Manual', description: 'El reclutador decide' },
    { value: 'disabled' as TriggerType, label: '⏸️ Desactivado', description: 'No se envía' }
];

interface Props {
    holdingId: string;
}

export default function EmailTemplatesConfig({ holdingId }: Props) {
    const [templates, setTemplates] = useState<EmailTemplates>(DEFAULT_TEMPLATES);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<keyof EmailTemplates | null>(null);
    const [editSubject, setEditSubject] = useState('');
    const [editBody, setEditBody] = useState('');
    const [editTrigger, setEditTrigger] = useState<TriggerType>('manual');
    const [editTriggerStatus, setEditTriggerStatus] = useState<string | undefined>(undefined);

    useEffect(() => {
        loadTemplates();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [holdingId]);

    async function loadTemplates() {
        setLoading(true);
        try {
            const docRef = doc(db, 'holdings', holdingId, 'config', 'email_templates');
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data() as Partial<EmailTemplates>;
                // Merge with defaults to ensure all fields exist
                const merged: EmailTemplates = {
                    cul_request: { ...DEFAULT_TEMPLATES.cul_request, ...data.cul_request },
                    thank_you: { ...DEFAULT_TEMPLATES.thank_you, ...data.thank_you },
                    start_date: { ...DEFAULT_TEMPLATES.start_date, ...data.start_date },
                    interview_reminder: { ...DEFAULT_TEMPLATES.interview_reminder, ...data.interview_reminder },
                    rejection: { ...DEFAULT_TEMPLATES.rejection, ...data.rejection }
                };
                setTemplates(merged);
            }
        } catch (error) {
            console.error('Error loading templates:', error);
        }
        setLoading(false);
    }

    async function saveTemplates(newTemplates: EmailTemplates) {
        setSaving(true);
        try {
            const docRef = doc(db, 'holdings', holdingId, 'config', 'email_templates');
            await setDoc(docRef, newTemplates, { merge: true });
            setTemplates(newTemplates);
        } catch (error) {
            console.error('Error saving templates:', error);
            alert('❌ Error al guardar');
        }
        setSaving(false);
    }

    function openEditor(key: keyof EmailTemplates) {
        setEditingTemplate(key);
        setEditSubject(templates[key].subject);
        setEditBody(templates[key].body);
        setEditTrigger(templates[key].trigger || 'manual');
        setEditTriggerStatus(templates[key].triggerStatus);
    }

    function saveCurrentEdit() {
        if (!editingTemplate) return;

        const newTemplates = {
            ...templates,
            [editingTemplate]: {
                ...templates[editingTemplate],
                subject: editSubject,
                body: editBody,
                trigger: editTrigger,
                triggerStatus: editTrigger === 'auto' ? editTriggerStatus : undefined,
                enabled: editTrigger !== 'disabled'
            }
        };
        saveTemplates(newTemplates);
        setEditingTemplate(null);
        alert('✅ Plantilla guardada');
    }

    function getTriggerLabel(template: EmailTemplate): string {
        if (template.trigger === 'auto' && template.triggerStatus) {
            const status = STATUS_OPTIONS.find(s => s.value === template.triggerStatus);
            return `🤖 Auto: ${status?.label || template.triggerStatus}`;
        } else if (template.trigger === 'manual') {
            return '👆 Manual';
        } else {
            return '⏸️ Desactivado';
        }
    }

    if (loading) {
        return (
            <div className="glass-card rounded-xl p-6">
                <div className="animate-pulse flex items-center gap-4">
                    <div className="w-8 h-8 bg-gray-200 rounded"></div>
                    <div className="h-6 bg-gray-200 rounded w-48"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="glass-card rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">✉️</span>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Plantillas de Correo</h3>
                        <p className="text-sm text-gray-500">Configura cuándo y qué correos se envían</p>
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                {(Object.keys(TEMPLATE_LABELS) as Array<keyof EmailTemplates>).map(key => (
                    <div
                        key={key}
                        className={`flex items-center justify-between p-4 rounded-lg transition-colors cursor-pointer hover:bg-gray-100 ${templates[key].trigger === 'disabled' ? 'bg-gray-100 opacity-60' : 'bg-gray-50'
                            }`}
                        onClick={() => openEditor(key)}
                    >
                        <div className="flex items-center gap-4">
                            <span className="text-2xl">{TEMPLATE_LABELS[key].icon}</span>
                            <div>
                                <h4 className="font-medium text-gray-900">{TEMPLATE_LABELS[key].label}</h4>
                                <p className="text-sm text-gray-500">{TEMPLATE_LABELS[key].description}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${templates[key].trigger === 'auto' ? 'bg-green-100 text-green-700' :
                                    templates[key].trigger === 'manual' ? 'bg-blue-100 text-blue-700' :
                                        'bg-gray-200 text-gray-600'
                                }`}>
                                {getTriggerLabel(templates[key])}
                            </span>
                            <button className="px-3 py-1 text-violet-600 hover:bg-violet-50 rounded-lg text-sm font-medium">
                                ✏️
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
                <h4 className="font-medium text-amber-900 mb-2">💡 Time to Fill</h4>
                <p className="text-sm text-amber-700">
                    Cuando un candidato pasa a <strong>Contratado</strong> y se envía el correo de onboarding,
                    el sistema calculará automáticamente el Time to Fill (días desde aprobación del RQ hasta contratación).
                </p>
            </div>

            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Variables disponibles:</h4>
                <div className="flex flex-wrap gap-2">
                    {['{{CANDIDATE_NAME}}', '{{JOB_TITLE}}', '{{HOLDING_NAME}}', '{{START_DATE}}', '{{START_TIME}}', '{{LOCATION}}', '{{INTERVIEW_DATE}}', '{{INTERVIEW_TIME}}'].map(v => (
                        <code key={v} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">{v}</code>
                    ))}
                </div>
            </div>

            {/* Editor Modal */}
            {editingTemplate && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200">
                            <h3 className="text-xl font-bold text-gray-900">
                                {TEMPLATE_LABELS[editingTemplate].icon} {TEMPLATE_LABELS[editingTemplate].label}
                            </h3>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Trigger Configuration */}
                            <div className="bg-gray-50 rounded-lg p-4">
                                <label className="block text-sm font-semibold text-gray-700 mb-3">
                                    ¿Cuándo enviar este correo?
                                </label>
                                <div className="grid grid-cols-3 gap-3">
                                    {TRIGGER_OPTIONS.map(opt => (
                                        <button
                                            key={opt.value}
                                            onClick={() => {
                                                setEditTrigger(opt.value);
                                                if (opt.value === 'auto' && !editTriggerStatus) {
                                                    setEditTriggerStatus(TEMPLATE_LABELS[editingTemplate].defaultStatus);
                                                }
                                            }}
                                            className={`p-3 rounded-lg border-2 text-left transition-all ${editTrigger === opt.value
                                                    ? 'border-violet-500 bg-violet-50'
                                                    : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            <span className="text-lg">{opt.label.split(' ')[0]}</span>
                                            <p className="text-xs text-gray-600 mt-1">{opt.description}</p>
                                        </button>
                                    ))}
                                </div>

                                {editTrigger === 'auto' && (
                                    <div className="mt-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Enviar cuando el estado cambie a:
                                        </label>
                                        <select
                                            value={editTriggerStatus || ''}
                                            onChange={(e) => setEditTriggerStatus(e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                                        >
                                            <option value="">Selecciona un estado...</option>
                                            {STATUS_OPTIONS.map(s => (
                                                <option key={s.value} value={s.value}>{s.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Asunto del correo
                                </label>
                                <input
                                    type="text"
                                    value={editSubject}
                                    onChange={(e) => setEditSubject(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                                    placeholder="Asunto del correo..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Cuerpo del mensaje
                                </label>
                                <textarea
                                    value={editBody}
                                    onChange={(e) => setEditBody(e.target.value)}
                                    rows={10}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 font-mono text-sm"
                                    placeholder="Contenido del correo..."
                                />
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                            <button
                                onClick={() => setEditingTemplate(null)}
                                className="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={saveCurrentEdit}
                                disabled={saving || (editTrigger === 'auto' && !editTriggerStatus)}
                                className="px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50"
                            >
                                {saving ? 'Guardando...' : '💾 Guardar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
