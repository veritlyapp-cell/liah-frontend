import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, collection, serverTimestamp } from 'firebase/firestore';

/**
 * LIAH Activation Engine: Conversion Logic
 */

interface ConversionParams {
    hash: string;
    candidateId: string;
    isApto: boolean;
}

/**
 * Validates if a registration is part of an activation campaign
 * Requirement: State Registered is valid only if registration timestamp 
 * is after sms_sent_at.
 */
export async function validateRegistrationConversion(hash: string, registrationTimestamp: Date): Promise<boolean> {
    const trackingRef = doc(db, 'activation_tracking', hash);
    const trackingSnap = await getDoc(trackingRef);

    if (!trackingSnap.exists()) return false;

    const data = trackingSnap.data();
    const sentAt = data.sentAt?.toDate();

    if (sentAt && registrationTimestamp > sentAt) {
        // Mark as registered in tracking
        await updateDoc(trackingRef, {
            status: 'registered',
            registeredAt: serverTimestamp()
        });
        return true;
    }

    return false;
}

/**
 * Determines if a candidate should see the calendar based on KQ results
 */
export async function processKillerQuestionsAndRedirect(params: ConversionParams) {
    const { hash, candidateId, isApto } = params;

    if (isApto) {
        // Enable calendar access
        console.log(`[CONVERSION] Candidate ${candidateId} is APTO. Enabling calendar.`);

        // Update tracking status if hash is provided
        if (hash) {
            const trackingRef = doc(db, 'activation_tracking', hash);
            await updateDoc(trackingRef, {
                'metadata.isApto': true,
                'metadata.last_step': 'kq_passed'
            });
        }

        return { canSchedule: true, redirectTo: '/portal/agendar' };
    } else {
        console.log(`[CONVERSION] Candidate ${candidateId} is NO APTO.`);
        return { canSchedule: false, redirectTo: '/portal/feedback' };
    }
}
