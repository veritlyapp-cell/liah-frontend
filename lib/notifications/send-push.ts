import { getAdminFirestore } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';

interface PushPayload {
    title: string;
    body: string;
    url?: string;
    icon?: string;
}

/**
 * Sends a push notification to specific users based on their role and metadata
 */
export async function sendPushToUsers(userIds: string[], payload: PushPayload) {
    if (userIds.length === 0) return { success: true, message: 'No recipients' };

    try {
        const db = getAdminFirestore();
        const tokensRef = db.collection('push_tokens');

        // Fetch tokens for target users
        const snapshot = await tokensRef.where('userId', 'in', userIds).where('active', '==', true).get();
        const tokens = snapshot.docs.map(doc => doc.data().token);

        if (tokens.length === 0) {
            console.log('Push: No active tokens found for users:', userIds);
            return { success: true, message: 'No tokens found' };
        }

        const message: admin.messaging.MulticastMessage = {
            tokens,
            notification: {
                title: payload.title,
                body: payload.body,
            },
            data: {
                url: payload.url || '/',
            },
            webpush: {
                fcmOptions: {
                    link: payload.url || '/',
                },
                notification: {
                    icon: payload.icon || '/liah-icon.png',
                    badge: '/icons/badge-72x72.png',
                    vibrate: [200, 100, 200],
                }
            }
        };

        const response = await admin.messaging().sendEachForMulticast(message);
        console.log(`Push: Successfully sent ${response.successCount} messages. Failed: ${response.failureCount}`);

        return {
            success: true,
            sent: response.successCount,
            failed: response.failureCount
        };
    } catch (error) {
        console.error('Push Error:', error);
        return { success: false, error };
    }
}

/**
 * Find users by role and brand/store and send notifications
 */
export async function notifyRoleAction(params: {
    role: string;
    marcaId?: string;
    tiendaId?: string;
    payload: PushPayload;
}) {
    const db = getAdminFirestore();
    let query = db.collection('userAssignments').where('role', '==', params.role).where('active', '==', true);

    if (params.marcaId) {
        query = query.where('marcaId', '==', params.marcaId);
    }

    const snapshot = await query.get();
    const userIds = snapshot.docs.map(doc => doc.data().userId);

    // Ifienda filter (if needed, many roles are marka-wide but store-specific for some)
    let filteredIds = userIds;
    if (params.tiendaId) {
        // Some users have assignedStores array
        filteredIds = snapshot.docs
            .filter(doc => {
                const data = doc.data();
                if (data.tiendaId === params.tiendaId) return true;
                if (data.assignedStores?.some((s: any) => s.tiendaId === params.tiendaId)) return true;
                return false;
            })
            .map(doc => doc.data().userId);
    }

    return sendPushToUsers(filteredIds, params.payload);
}
