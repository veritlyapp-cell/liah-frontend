'use client';

import { useState, useEffect, use } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import CommercialProposalView from '@/components/admin/CommercialProposalView';
import { AlertCircle, Clock } from 'lucide-react';

interface DynamicProposalPageProps {
    params: Promise<{ id: string }>;
}

export default function DynamicProposalPage({ params }: DynamicProposalPageProps) {
    const { id } = use(params);
    const [proposal, setProposal] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;
        loadProposal();
    }, [id]);

    const loadProposal = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const docRef = doc(db, 'business_cases', id);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                setError('Propuesta no encontrada. Por favor verifica el enlace.');
                return;
            }

            const data = docSnap.data();

            // Check if proposal is active
            if (data.isActive === false) {
                setError('Esta propuesta comercial ya no está disponible o ha expirado. Por favor, comunícate con tu KAM de Liah.');
                return;
            }

            setProposal(data);
        } catch (err: any) {
            console.error('Error loading dynamic proposal:', err);
            setError('Ocurrió un error al cargar la propuesta comercial.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
                <div className="animate-spin w-10 h-10 border-4 border-violet-600 border-t-transparent rounded-full"></div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Cargando propuesta comercial...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl max-w-md w-full text-center space-y-6">
                    <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
                        <AlertCircle className="w-8 h-8" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-lg font-black text-gray-900 uppercase italic tracking-tight">Acceso Restringido</h2>
                        <p className="text-sm text-gray-500 font-medium leading-relaxed">
                            {error}
                        </p>
                    </div>
                    <div className="pt-2 border-t border-gray-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Liah by Relié Labs
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return <CommercialProposalView proposal={proposal} />;
}
