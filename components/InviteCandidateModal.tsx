'use client';

import { useState, useEffect } from 'react';
import { createInvitation } from '@/lib/firestore/invitations';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { RQ } from '@/lib/firestore/rqs';

interface InviteCandidateModalProps {
    isOpen: boolean;
    onClose: () => void;
    storeId: string;
    storeName: string;
    marcaId: string;
    marcaNombre: string;
    initialRQId?: string;
    userRole?: string;
    // NEW: Branding props
    holdingName?: string;
    holdingLogo?: string;
    marcaLogo?: string;
}

export default function InviteCandidateModal({
    isOpen,
    onClose,
    storeId,
    storeName,
    marcaId,
    marcaNombre,
    initialRQId,
    userRole,
    holdingName,
    holdingLogo,
    marcaLogo
}: InviteCandidateModalProps) {

    const { user, claims } = useAuth();
    // Extract branding from props or claims
    const effectiveHoldingName = holdingName || (claims as any)?.holding_name || 'la empresa';
    const effectiveHoldingLogo = holdingLogo || (claims as any)?.holding_logo;
    const effectiveMarcaLogo = marcaLogo;

    const [email, setEmail] = useState('');
    const [selectedRQ, setSelectedRQ] = useState<string>('');
    const [approvedRQs, setApprovedRQs] = useState<RQ[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingRQs, setLoadingRQs] = useState(false);
    const [generatedLink, setGeneratedLink] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadApprovedRQs();
        }
    }, [isOpen]);

    useEffect(() => {
        if (initialRQId) {
            setSelectedRQ(initialRQId);
        }
    }, [initialRQId, approvedRQs]);

    async function loadApprovedRQs() {
        setLoadingRQs(true);
        try {
            const rqsRef = collection(db, 'rqs');
            const q = query(
                rqsRef,
                where('tiendaId', '==', storeId),
                where('approvalStatus', '==', 'approved')
            );
            const snapshot = await getDocs(q);

            const rqs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as RQ));

            // Additional client-side filter for active RQs only
            let activeApprovedRQs = rqs.filter(rq => rq.status === 'active');

            // NEW: Filter by category for Store Managers
            if (userRole === 'store_manager') {
                activeApprovedRQs = activeApprovedRQs.filter(rq => rq.categoria !== 'gerencial');
            }

            setApprovedRQs(activeApprovedRQs);
        } catch (error) {
            console.error('Error loading RQs:', error);
        } finally {
            setLoadingRQs(false);
        }
    }

    if (!isOpen) return null;

    const handleGenerate = async () => {
        if (!email || !user || !selectedRQ) {
            alert('Selecciona un RQ e ingresa un email válido');
            return;
        }

        // Validar email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            alert('Ingresa un email válido');
            return;
        }

        const rq = approvedRQs.find(r => r.id === selectedRQ);
        if (!rq) return;

        setLoading(true);

        try {
            const { link } = await createInvitation({
                candidateEmail: email,
                marcaId,
                marcaNombre,
                tiendaId: storeId,
                tiendaNombre: storeName,
                rqId: rq.id,
                rqNumber: rq.rqNumber,
                posicion: rq.posicion,  // Pasar nombre de la posición
                modalidad: rq.modalidad || 'Full Time',  // Pasar modalidad
                sentBy: user.uid,
                sentByEmail: user.email || '',
                source: 'manual_recruiter'
            });

            setGeneratedLink(link);

            // Enviar email automáticamente
            try {
                await fetch('/api/send-invitation-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        candidateEmail: email,
                        invitationLink: link,
                        posicion: rq.posicion,
                        tiendaNombre: storeName,
                        marcaId: marcaId,
                        marcaNombre: marcaNombre,
                        modalidad: rq.modalidad,
                        turno: rq.turno,
                        // NEW: Branding
                        holdingName: effectiveHoldingName,
                        holdingLogo: effectiveHoldingLogo,
                        marcaLogo: effectiveMarcaLogo
                    })
                });
            } catch (emailError) {
                console.error('Error auto-sending email:', emailError);
                // No bloqueamos el flujo si falla el email, ya que el link se generó
            }

        } catch (error) {
            console.error('Error creating invitation:', error);
            alert('Error al generar invitación');
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(generatedLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleClose = () => {
        setEmail('');
        setSelectedRQ('');
        setGeneratedLink('');
        setCopied(false);
        onClose();
    };

    const selectedRQData = approvedRQs.find(r => r.id === selectedRQ);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold gradient-primary">
                        Invitar Candidato
                    </h2>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600 text-2xl"
                    >
                        ✕
                    </button>
                </div>

                {!generatedLink ? (
                    <>
                        <div className="mb-6">
                            <p className="text-gray-600 mb-4">
                                Invita un candidato para una posición específica
                            </p>

                            {/* Selector de RQ */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Posición / RQ <span className="text-red-500">*</span>
                                </label>
                                {loadingRQs ? (
                                    <p className="text-sm text-gray-500">Cargando posiciones...</p>
                                ) : approvedRQs.length === 0 ? (
                                    <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
                                        <p className="text-sm text-yellow-800">
                                            No hay RQs aprobados disponibles en tu tienda.
                                        </p>
                                    </div>
                                ) : (
                                    <select
                                        value={selectedRQ}
                                        onChange={(e) => setSelectedRQ(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                                    >
                                        <option value="">Seleccionar posición...</option>
                                        {approvedRQs.map(rq => (
                                            <option key={rq.id} value={rq.id}>
                                                {rq.rqNumber} - {rq.posicion} ({rq.modalidad}, {rq.turno})
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {selectedRQData && (
                                <div className="bg-violet-50 rounded-lg p-4 mb-4">
                                    <p className="text-xs text-violet-600 font-mono mb-1">
                                        {selectedRQData.rqNumber}
                                    </p>
                                    <p className="text-sm text-violet-900 font-semibold">
                                        {selectedRQData.posicion}
                                    </p>
                                    <p className="text-xs text-violet-700">
                                        {selectedRQData.modalidad} • {selectedRQData.turno}
                                    </p>
                                    <p className="text-xs text-violet-600 mt-1">
                                        {storeName}
                                    </p>
                                </div>
                            )}

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Email del Candidato <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="candidato@email.com"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                                    disabled={!selectedRQ}
                                />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={handleClose}
                                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleGenerate}
                                disabled={loading || !email || !selectedRQ || approvedRQs.length === 0}
                                className="flex-1 gradient-bg text-white px-4 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Generando...' : 'Generar Invitación'}
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="mb-6">
                            <div className="text-center mb-4">
                                <div className="text-5xl mb-3">✅</div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">
                                    ¡Invitación Creada!
                                </h3>
                                <p className="text-sm text-gray-600">
                                    Enviada a: <strong>{email}</strong>
                                </p>
                            </div>

                            {selectedRQData && (
                                <div className="bg-violet-50 rounded-lg p-4 mb-4">
                                    <p className="text-xs text-violet-600 font-mono mb-1">
                                        {selectedRQData.rqNumber}
                                    </p>
                                    <p className="text-sm text-violet-900 font-semibold">
                                        {selectedRQData.posicion}
                                    </p>
                                    <p className="text-xs text-violet-700">
                                        {selectedRQData.modalidad} • {selectedRQData.turno} • {storeName}
                                    </p>
                                </div>
                            )}

                            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-4">
                                <p className="text-sm text-yellow-800">
                                    ⏱ <strong>Este link expira en 48 horas</strong>
                                </p>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-4 mb-4">
                                <p className="text-xs text-gray-500 mb-2">Link de invitación:</p>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={generatedLink}
                                        readOnly
                                        className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded text-sm font-mono"
                                    />
                                    <button
                                        onClick={handleCopy}
                                        className="px-4 py-2 bg-violet-600 text-white rounded hover:bg-violet-700 text-sm font-medium whitespace-nowrap"
                                    >
                                        {copied ? '✓ Copiado' : 'Copiar'}
                                    </button>
                                </div>
                            </div>

                            <div className="bg-blue-50 rounded-lg p-4 mb-4">
                                <p className="text-xs text-blue-900 font-semibold mb-2">
                                    📧 Envía este mensaje al candidato:
                                </p>
                                <div className="bg-white rounded p-3 text-sm text-gray-700">
                                    <p>Hola,</p>
                                    <p className="my-2">
                                        Te invitamos a postular para <strong>{selectedRQData?.posicion}</strong> ({selectedRQData?.modalidad}, {selectedRQData?.turno}) en <strong>{storeName}</strong>.
                                    </p>
                                    <p className="my-2">
                                        Completa tu postulación aquí:<br />
                                        <a href={generatedLink} className="text-violet-600 underline break-all">
                                            {generatedLink}
                                        </a>
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        ⏱ Este link expira en 48 horas.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleClose}
                            className="w-full gradient-bg text-white px-4 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
                        >
                            Cerrar
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
