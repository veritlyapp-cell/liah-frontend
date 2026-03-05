'use client';

import { useFeatures, TenantFeatures } from '@/hooks/useFeatures';
import { ReactNode } from 'react';

interface FeatureGateProps {
    feature: keyof TenantFeatures;
    children: ReactNode;
    fallback?: ReactNode;
}

/**
 * Component to conditionally render children based on feature access.
 * Useful for hiding buttons, tabs, or entire sections for trial/restricted plans.
 */
export default function FeatureGate({ feature, children, fallback = null }: FeatureGateProps) {
    const { hasFeature } = useFeatures();

    if (hasFeature(feature)) {
        return <>{children}</>;
    }

    return <>{fallback}</>;
}
