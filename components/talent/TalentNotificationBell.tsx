'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, onSnapshot, updateDoc, doc, Timestamp } from 'firebase/firestore';

interface TalentNotification {
    id: string;
    type: string;
    title: string;
    message: string;
    read: boolean;
    createdAt: any;
    data?: {
        link?: string;
    };
}

interface TalentNotificationBellProps {
    userEmail: string;
    holdingId: string;
}

export default function TalentNotificationBell({ userEmail, holdingId }: TalentNotificationBellProps) {
    const [notifications, setNotifications] = useState<TalentNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showDropdown, setShowDropdown] = useState(false);

    useEffect(() => {
        if (!userEmail || !holdingId) return;

        // Real-time listener for notifications
        const notificationsRef = collection(db, 'notifications');
        const q = query(
            notificationsRef,
            where('recipientEmail', '==', userEmail.toLowerCase()),
            where('holdingId', '==', holdingId),
            orderBy('createdAt', 'desc'),
            limit(20)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const loadedNotifications = snapshot.docs.map(d => ({
                id: d.id,
                ...d.data()
            })) as TalentNotification[];

            setNotifications(loadedNotifications);
            setUnreadCount(loadedNotifications.filter(n => !n.read).length);
        });

        return () => unsubscribe();
    }, [userEmail, holdingId]);

    async function markAsRead(notificationId: string) {
        try {
            await updateDoc(doc(db, 'notifications', notificationId), {
                read: true,
                readAt: Timestamp.now()
            });
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }

    async function markAllAsRead() {
        try {
            const unreadNotifications = notifications.filter(n => !n.read);
            await Promise.all(
                unreadNotifications.map(n =>
                    updateDoc(doc(db, 'notifications', n.id), {
                        read: true,
                        readAt: Timestamp.now()
                    })
                )
            );
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    }

    function handleNotificationClick(notification: TalentNotification) {
        markAsRead(notification.id);
        setShowDropdown(false);

        if (notification.data?.link) {
            window.location.href = notification.data.link;
        }
    }

    function getTimeAgo(timestamp: any): string {
        if (!timestamp) return '';

        const date = timestamp.seconds
            ? new Date(timestamp.seconds * 1000)
            : new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Ahora';
        if (diffMins < 60) return `${diffMins}m`;
        if (diffHours < 24) return `${diffHours}h`;
        if (diffDays < 7) return `${diffDays}d`;
        return date.toLocaleDateString();
    }

    function getNotificationIcon(type: string): string {
        const icons: Record<string, string> = {
            'stage_change': '🔄',
            'interview_scheduled': '📅',
            'new_application': '📩',
            'rq_approved': '✅',
            'rq_rejected': '❌',
            'reminder': '⏰'
        };
        return icons[type] || '📢';
    }

    return (
        <div className="relative">
            {/* Bell Button */}
            <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="relative p-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
                <span className="text-xl">🔔</span>
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {showDropdown && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowDropdown(false)}
                    />

                    {/* Notification Panel */}
                    <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
                            <h3 className="font-semibold text-gray-900">Notificaciones</h3>
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="text-sm text-violet-600 hover:text-violet-700"
                                >
                                    Marcar todas leídas
                                </button>
                            )}
                        </div>

                        {/* Notifications List */}
                        <div className="max-h-96 overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="py-12 text-center text-gray-500">
                                    <span className="text-4xl">📭</span>
                                    <p className="mt-2">No hay notificaciones</p>
                                </div>
                            ) : (
                                notifications.map(notification => (
                                    <div
                                        key={notification.id}
                                        onClick={() => handleNotificationClick(notification)}
                                        className={`px-4 py-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${!notification.read ? 'bg-violet-50' : ''
                                            }`}
                                    >
                                        <div className="flex gap-3">
                                            <span className="text-xl">
                                                {getNotificationIcon(notification.type)}
                                            </span>
                                            <div className="flex-1">
                                                <div className="flex items-start justify-between">
                                                    <p className="font-medium text-gray-900 text-sm">
                                                        {notification.title}
                                                    </p>
                                                    <span className="text-xs text-gray-400 shrink-0 ml-2">
                                                        {getTimeAgo(notification.createdAt)}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-600 mt-0.5">
                                                    {notification.message}
                                                </p>
                                            </div>
                                            {!notification.read && (
                                                <div className="w-2 h-2 bg-violet-500 rounded-full shrink-0 mt-2" />
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
