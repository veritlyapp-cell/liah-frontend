'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function EmpleosRedirect() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const holdingSlug = searchParams.get('holding') || 'ngr';
        router.replace(`/empleos/${holdingSlug}`);
    }, [searchParams, router]);

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' }}>
            <div className="animate-spin" style={{ width: 40, height: 40, border: '4px solid #333', borderTopColor: '#FF6B35', borderRadius: '50%' }} />
        </div>
    );
}

export default function EmpleosPage() {
    return (
        <Suspense fallback={null}>
            <EmpleosRedirect />
        </Suspense>
    );
}
