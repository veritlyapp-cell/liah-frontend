'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useMemo } from 'react';

export type TenantPlan = 'bot_only' | 'rq_only' | 'full_stack';

export interface TenantFeatures {
    // RQ Management
    rq_management: boolean;
    approval_workflow: boolean;
    job_profiles: boolean;

    // Bot & Candidates
    bot_integration: boolean;
    candidate_database: boolean;
    ai_evaluation: boolean;

    // Integration
    rq_candidate_linking: boolean;
    ingress_confirmation: boolean;
    advanced_analytics: boolean;

    // Trial Specific Special Permissions
    excel_export: boolean;
    candidate_selection: boolean;
}

const PLAN_FEATURES: Record<TenantPlan, TenantFeatures> = {
    bot_only: {
        rq_management: false,
        approval_workflow: false,
        job_profiles: false,
        bot_integration: true,
        candidate_database: true,
        ai_evaluation: true,
        rq_candidate_linking: false,
        ingress_confirmation: false,
        advanced_analytics: false,
        excel_export: false,
        candidate_selection: false,
    },
    rq_only: {
        rq_management: true,
        approval_workflow: true,
        job_profiles: true,
        bot_integration: false,
        candidate_database: false,
        ai_evaluation: false,
        rq_candidate_linking: false,
        ingress_confirmation: false,
        advanced_analytics: false,
        excel_export: true,
        candidate_selection: false,
    },
    full_stack: {
        rq_management: true,
        approval_workflow: true,
        job_profiles: true,
        bot_integration: true,
        candidate_database: true,
        ai_evaluation: true,
        rq_candidate_linking: true,
        ingress_confirmation: true,
        advanced_analytics: true,
        excel_export: true,
        candidate_selection: true,
    }
};

/**
 * Hook to check feature access based on current plan and trial status.
 */
export function useFeatures() {
    const { claims } = useAuth();

    // Default to bot_only if not specified or fallback
    const plan: TenantPlan = (claims?.plan as any) || 'full_stack';
    const isTrial = claims?.isTrial || false;
    const isExpired = claims?.trialStatus === 'expired';

    const features = useMemo(() => {
        // If trial is expired, block everything
        if (isExpired) {
            return Object.keys(PLAN_FEATURES.full_stack).reduce((acc, key) => {
                acc[key as keyof TenantFeatures] = false;
                return acc;
            }, {} as TenantFeatures);
        }

        // If active trial, we use full_stack base but can apply specific overrides
        if (isTrial) {
            return {
                ...PLAN_FEATURES.full_stack,
                // You can restrict specific high-value features here if needed
                advanced_analytics: false, // For example, block advanced analytics in trial
                bot_integration: true, // Allow bot in trial
                excel_export: true, // Specifically allowed by user
                candidate_selection: true, // Specifically allowed by user
            };
        }

        return PLAN_FEATURES[plan] || PLAN_FEATURES.full_stack;
    }, [plan, isTrial, isExpired]);

    const hasFeature = (feature: keyof TenantFeatures): boolean => {
        return !!features[feature];
    };

    return {
        plan,
        isTrial,
        isExpired,
        features,
        hasFeature
    };
}
