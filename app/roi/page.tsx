'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import CommercialProposalView from '@/components/admin/CommercialProposalView';

function ROIPageContent() {
    const searchParams = useSearchParams();

    // Map query parameters (including legacy parameters) to the new Proposal structure
    const client = searchParams.get('client') || 'Empresa Invitada';
    const currency = searchParams.get('currency') || 'PEN';
    const stores = parseInt(searchParams.get('stores') || '50', 10);
    const hires = parseInt(searchParams.get('hires') || '100', 10);
    
    const pilotDuration = searchParams.get('pilotDuration') || '30 a 60 días';
    const pilotCost = searchParams.get('pilotCost') || 'Bonificado (S/ 0.00)';
    
    // Setup and Onboarding mapping
    const setupFromParam = parseFloat(searchParams.get('setup') || '3000');
    const setupListPrice = parseFloat(searchParams.get('setupListPrice') || String(setupFromParam * 2 || 6000));
    const setupFinalPrice = parseFloat(searchParams.get('setupFinalPrice') || String(setupFromParam || 3000));
    
    // Landing Page mapping
    const landingListPrice = parseFloat(searchParams.get('landingListPrice') || '2500');
    const landingFinalPrice = parseFloat(searchParams.get('landingFinalPrice') || '0');

    // Subscription pricing mapping
    const feeFromParam = parseFloat(searchParams.get('fee') || '499'); // legacy fee
    const baseFeePerStore = parseFloat(searchParams.get('baseFeePerStore') || String(stores > 0 ? (feeFromParam * 0.6) / stores : 10));
    const variableFeePerHire = parseFloat(searchParams.get('variableFeePerHire') || String(hires > 0 ? (feeFromParam * 0.4) / hires : 2.5));

    const annualDiscount = parseFloat(searchParams.get('annualDiscount') || '20');
    const annualFinalPriceParam = searchParams.get('annualFinalPrice');
    const annualFinalPrice = annualFinalPriceParam ? parseFloat(annualFinalPriceParam) : undefined;
    const growthClause = parseFloat(searchParams.get('growthClause') || '10');

    const meetingNotes = searchParams.get('meetingNotes') || '';
    const executiveSummary = searchParams.get('executiveSummary') || `Implementación de Liah, asistente de inteligencia artificial para la automatización del reclutamiento masivo en las ${stores} sedes de ${client}. La solución optimiza todo el embudo de selección, desde la captación hasta el ingreso de candidatos, gestionando un flujo proyectado de más de ${hires * 12} ingresos anuales.`;

    const signName = searchParams.get('signName') || 'Oscar Quevedo';
    const signRole = searchParams.get('signRole') || 'Gerente General';
    const signCompany = searchParams.get('signCompany') || 'Relié Labs';
    const signRuc = searchParams.get('signRuc') || '20615357848';

    const proposal = {
        client,
        currency,
        stores,
        hires,
        pilotDuration,
        pilotCost,
        setupListPrice,
        setupFinalPrice,
        landingListPrice,
        landingFinalPrice,
        baseFeePerStore,
        variableFeePerHire,
        annualDiscount,
        annualFinalPrice,
        growthClause,
        meetingNotes,
        executiveSummary,
        signName,
        signRole,
        signCompany,
        signRuc
    };

    return <CommercialProposalView proposal={proposal} />;
}

export default function ROIPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin w-10 h-10 border-4 border-violet-600 border-t-transparent rounded-full"></div>
            </div>
        }>
            <ROIPageContent />
        </Suspense>
    );
}
