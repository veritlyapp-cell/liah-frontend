'use client';

import { useState } from 'react';

interface InviteCandidateModalProps {
    show: boolean;
    jobId: string;
    jobTitle: string;
    holdingId: string;
    onClose: () => void;
    onInvited: () => void;
}

export default function InviteCandidateModal({
    show,
    jobId,
    jobTitle,
    holdingId,
    onClose,
    onInvited
}: InviteCandidateModalProps) {
    const [nombre, setNombre] = useState('');
    const [email, setEmail] = useState('');
    const [telefono, setTelefono] = useState('');
    const [submitting, setSubmitting] = useState(false);

    if (!show) return null;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSubmitting(true);

        try {
            // 1. Send invitation via API
            const response = await fetch('/api/talent/send-invitation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nombre,
                    email,
                    telefono,
                    jobId,
                    jobTitle,
                    holdingId
                })
            });

            const data = await response.json();

            if (data.success) {
                alert('✅ Invitación enviada con éxito');
                onInvited();
                onClose();
                // Reset form
                setNombre('');
                setEmail('');
                setTelefono('');
            } else {
                alert('Error al enviar invitación: ' + data.error);
            }
        } catch (error) {
            console.error('Error inviting candidate:', error);
            alert('Error de conexión al enviar invitación');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-md mx-4 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-4">
                    <h2 className="text-xl font-bold text-white">📩 Invitar Candidato</h2>
                    <p className="text-violet-100 text-sm opacity-90">{jobTitle}</p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                        <input
                            required
                            type="text"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none transition-all"
                            placeholder="Ej: Juan Pérez"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
                        <input
                            required
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none transition-all"
                            placeholder="juan.perez@email.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono (WhatsApp)</label>
                        <input
                            type="tel"
                            value={telefono}
                            onChange={(e) => setTelefono(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none transition-all"
                            placeholder="+51 987 654 321"
                        />
                    </div>

                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <p className="text-xs text-blue-700 leading-relaxed">
                            💡 Se enviará un correo con un link personalizado para que el candidato complete su información y suba su CV.
                        </p>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-50 rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-6 py-2 bg-violet-600 text-white font-bold rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-all shadow-md shadow-violet-200"
                        >
                            {submitting ? 'Enviando...' : 'Enviar Invitación'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
