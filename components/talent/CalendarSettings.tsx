'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';

interface CalendarConnection {
    id: string;
    provider: 'google' | 'microsoft';
    email: string;
    connectedAt: any;
}

interface CalendarSettingsProps {
    userId: string;
    holdingId: string;
}

export default function CalendarSettings({ userId, holdingId }: CalendarSettingsProps) {
    const [connections, setConnections] = useState<CalendarConnection[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (userId) {
            loadConnections();
        }
    }, [userId]);

    async function loadConnections() {
        setLoading(true);
        try {
            const connectionDoc = await getDoc(doc(db, 'calendar_connections', userId));
            if (connectionDoc.exists()) {
                const data = connectionDoc.data();
                setConnections([{
                    id: connectionDoc.id,
                    provider: data.provider,
                    email: data.email,
                    connectedAt: data.connectedAt
                }]);
            } else {
                setConnections([]);
            }
        } catch (error) {
            console.error('Error loading connections:', error);
        } finally {
            setLoading(false);
        }
    }

    const connectGoogle = () => {
        window.location.href = `/api/calendar/google/auth?userId=${userId}&holdingId=${holdingId}`;
    };

    const connectMicrosoft = () => {
        window.location.href = `/api/calendar/microsoft/auth?userId=${userId}&holdingId=${holdingId}`;
    };

    const disconnect = async () => {
        if (!confirm('¿Estás seguro de desconectar tu calendario? No podrás agendar reuniones automáticamente.')) return;

        try {
            await deleteDoc(doc(db, 'calendar_connections', userId));
            loadConnections();
        } catch (error) {
            console.error('Error disconnecting:', error);
            alert('Error al desconectar');
        }
    };

    if (loading) return <div className="p-4 animate-pulse bg-gray-50 rounded-lg">Cargando conexiones...</div>;

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <span>📅</span> Conexión de Calendarios
                </h3>
                <p className="text-sm text-gray-500">
                    Conecta tu calendario institucional para agendar entrevistas directamente y crear links de Google Meet o Teams.
                </p>
            </div>

            <div className="p-6 space-y-6">
                {connections.length > 0 ? (
                    <div className="space-y-4">
                        {connections.map(con => (
                            <div key={con.id} className="flex items-center justify-between p-4 bg-violet-50 rounded-xl border border-violet-100">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-2xl shadow-sm border border-violet-100">
                                        {con.provider === 'google' ? '🎨' : '🟦'}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900 capitalize">{con.provider} Calendar</p>
                                        <p className="text-sm text-violet-600 font-medium">{con.email}</p>
                                        <p className="text-xs text-gray-400 mt-1">Conectado desde: {con.connectedAt?.toDate ? con.connectedAt.toDate().toLocaleDateString() : 'Recientemente'}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={disconnect}
                                    className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors"
                                >
                                    Desconectar
                                </button>
                            </div>
                        ))}
                        <div className="bg-blue-50 p-4 rounded-lg flex gap-3 items-start">
                            <span className="text-blue-600 mt-0.5">ℹ️</span>
                            <p className="text-xs text-blue-800 leading-relaxed">
                                <strong>Nota:</strong> Solo puedes tener un calendario principal conectado a la vez. Al agendar una entrevista, se usará este calendario para crear el evento y enviar las invitaciones.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                        <button
                            onClick={connectGoogle}
                            className="flex flex-col items-center gap-4 p-6 border-2 border-gray-100 rounded-2xl hover:border-violet-500 hover:bg-violet-50 transition-all group lg:flex-row lg:text-left"
                        >
                            <div className="w-14 h-14 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                                🎨
                            </div>
                            <div>
                                <p className="font-bold text-gray-900">Google Calendar</p>
                                <p className="text-xs text-gray-500">Google Workspace & Gmail</p>
                            </div>
                        </button>

                        <button
                            onClick={connectMicrosoft}
                            className="flex flex-col items-center gap-4 p-6 border-2 border-gray-100 rounded-2xl hover:border-blue-500 hover:bg-blue-50 transition-all group lg:flex-row lg:text-left"
                        >
                            <div className="w-14 h-14 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                                🟦
                            </div>
                            <div>
                                <p className="font-bold text-gray-900">Office 365 / Outlook</p>
                                <p className="text-xs text-gray-500">Microsoft Business & Personal</p>
                            </div>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
