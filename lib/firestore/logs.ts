import { db } from '../firebase';
import { collection, addDoc, Timestamp, query, where, orderBy, limit, getDocs } from 'firebase/firestore';

export interface AuditLog {
    id?: string;
    userId: string;
    userEmail: string;
    userName: string;
    holdingId: string;
    marcaId?: string;
    action: 'login' | 'logout' | 'create_rq' | 'approve_candidate' | 'reject_candidate' | 'update_config' | 'export_data';
    details?: string;
    metadata?: Record<string, unknown>;
    timestamp: Timestamp;
}

/**
 * Log a user action to Firestore
 */
export async function logAction(
    log: Omit<AuditLog, 'timestamp'>
): Promise<string> {
    try {
        const logsRef = collection(db, 'audit_logs');
        
        // Remove undefined fields to avoid Firebase errors
        const cleanLog = Object.fromEntries(
            Object.entries(log).filter(([_, v]) => v !== undefined)
        );

        const docRef = await addDoc(logsRef, {
            ...cleanLog,
            timestamp: Timestamp.now()
        });
        return docRef.id;
    } catch (error) {
        console.error('Error logging action:', error);
        return '';
    }
}

/**
 * Get recent logs for a holding
 */
export async function getHoldingLogs(
    holdingId: string,
    limitCount: number = 50
): Promise<AuditLog[]> {
    try {
        const logsRef = collection(db, 'audit_logs');
        const q = query(
            logsRef,
            where('holdingId', '==', holdingId),
            orderBy('timestamp', 'desc'),
            limit(limitCount)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLog));
    } catch (error) {
        console.error('Error fetching logs:', error);
        return [];
    }
}

/**
 * Get login statistics per brand for a holding
 */
export async function getLoginStatsByBrand(holdingId: string): Promise<Record<string, number>> {
    try {
        const logsRef = collection(db, 'audit_logs');
        const q = query(
            logsRef,
            where('holdingId', '==', holdingId),
            where('action', '==', 'login')
        );
        const snapshot = await getDocs(q);
        
        const stats: Record<string, number> = {};
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            const brandId = data.marcaId || 'General';
            stats[brandId] = (stats[brandId] || 0) + 1;
        });
        
        return stats;
    } catch (error) {
        console.error('Error fetching login stats:', error);
        return {};
    }
}
