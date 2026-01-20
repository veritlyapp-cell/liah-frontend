'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, addDoc, Timestamp } from 'firebase/firestore';
import OnboardingForm, { OnboardingData } from '@/components/talent/OnboardingForm';

/**
 * Public Onboarding Page
 * Accessed via /onboarding/[token]
 * Token is the candidate's ID or a generated invite token
 */
export default function OnboardingPage() {
    const params = useParams();
    const token = params.token as string;

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [candidateData, setCandidateData] = useState<any>(null);
    const [holdingData, setHoldingData] = useState<any>(null);

    useEffect(() => {
        async function loadInviteData() {
            if (!token) {
                setError('Token no válido');
                setLoading(false);
                return;
            }

            try {
                // Try to find the candidate/invite by token
                // First, check if it's a direct candidate ID
                const candidateRef = doc(db, 'candidates', token);
                const candidateSnap = await getDoc(candidateRef);

                if (candidateSnap.exists()) {
                    const data = candidateSnap.data();
                    setCandidateData({
                        id: candidateSnap.id,
                        ...data
                    });

                    // Load holding info
                    if (data.holdingId) {
                        const holdingRef = doc(db, 'holdings', data.holdingId);
                        const holdingSnap = await getDoc(holdingRef);
                        if (holdingSnap.exists()) {
                            setHoldingData({
                                id: holdingSnap.id,
                                ...holdingSnap.data()
                            });
                        }
                    }
                } else {
                    // Try onboarding_invites collection
                    const inviteRef = doc(db, 'onboarding_invites', token);
                    const inviteSnap = await getDoc(inviteRef);

                    if (inviteSnap.exists()) {
                        const inviteData = inviteSnap.data();
                        setCandidateData({
                            id: inviteSnap.id,
                            email: inviteData.email,
                            nombre: inviteData.nombre,
                            holdingId: inviteData.holdingId,
                            rqId: inviteData.rqId,
                        });

                        // Load holding info
                        if (inviteData.holdingId) {
                            const holdingRef = doc(db, 'holdings', inviteData.holdingId);
                            const holdingSnap = await getDoc(holdingRef);
                            if (holdingSnap.exists()) {
                                setHoldingData({
                                    id: holdingSnap.id,
                                    ...holdingSnap.data()
                                });
                            }
                        }
                    } else {
                        setError('Invitación no encontrada o expirada');
                    }
                }
            } catch (err) {
                console.error('Error loading onboarding data:', err);
                setError('Error al cargar los datos');
            } finally {
                setLoading(false);
            }
        }

        loadInviteData();
    }, [token]);

    const handleSubmit = async (formData: OnboardingData) => {
        if (!candidateData?.holdingId) {
            throw new Error('No se pudo identificar la empresa');
        }

        // Save to nuevos_colaboradores collection
        const colaboradorData = {
            ...formData,
            holdingId: candidateData.holdingId,
            candidateId: candidateData.id,
            rqId: candidateData.rqId || null,
            source: 'onboarding_form',
            createdAt: Timestamp.now(),
            status: 'pendiente_revision',
        };

        await addDoc(collection(db, 'nuevos_colaboradores'), colaboradorData);
        console.log('✅ Nuevo colaborador registrado:', colaboradorData);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto" />
                    <p className="text-gray-600 mt-4">Cargando...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
                    <div className="text-6xl mb-4">❌</div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
                    <p className="text-gray-600">{error}</p>
                    <p className="text-sm text-gray-400 mt-4">
                        Si crees que esto es un error, contacta al equipo de Recursos Humanos.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <OnboardingForm
            candidatoEmail={candidateData?.email || ''}
            candidatoNombre={candidateData?.nombre || ''}
            holdingId={candidateData?.holdingId || ''}
            holdingNombre={holdingData?.nombre || ''}
            onSubmit={handleSubmit}
        />
    );
}
