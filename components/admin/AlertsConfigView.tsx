'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';

interface AlertsConfigProps {
    holdingId: string;
}

interface AlertsSettings {
    rqAlertsEnabled: boolean;
    rqAlertDays: number;
    emailNotifications: boolean;
}

export default function AlertsConfigView({ holdingId }: AlertsConfigProps) {
    const [settings, setSettings] = useState<AlertsSettings>({
        rqAlertsEnabled: true,
        rqAlertDays: 7,
        emailNotifications: true
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Load current settings
    useEffect(() => {
        async function loadSettings() {
            if (!holdingId) return;

            try {
                const holdingDoc = await getDoc(doc(db, 'holdings', holdingId));
                if (holdingDoc.exists()) {
                    const data = holdingDoc.data();
                    setSettings({
                        rqAlertsEnabled: data.rqAlertsEnabled ?? true,
                        rqAlertDays: data.rqAlertDays ?? 7,
                        emailNotifications: data.rqEmailNotifications ?? true
                    });
                }
            } catch (error) {
                console.error('Error loading alerts settings:', error);
            } finally {
                setLoading(false);
            }
        }
        loadSettings();
    }, [holdingId]);

    // Save settings
    async function handleSave() {
        if (!holdingId) return;

        setSaving(true);
        try {
            const holdingRef = doc(db, 'holdings', holdingId);
            const holdingDoc = await getDoc(holdingRef);

            const updateData = {
                rqAlertsEnabled: settings.rqAlertsEnabled,
                rqAlertDays: settings.rqAlertDays,
                rqEmailNotifications: settings.emailNotifications,
                updatedAt: new Date()
            };

            if (holdingDoc.exists()) {
                await updateDoc(holdingRef, updateData);
            } else {
                await setDoc(holdingRef, {
                    ...updateData,
                    createdAt: new Date()
                });
            }

            alert('✅ Configuración de alertas guardada');
        } catch (error) {
            console.error('Error saving alerts settings:', error);
            alert('❌ Error guardando configuración');
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div className="glass-card rounded-xl p-6">
                <div className="animate-pulse">
                    <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3 mb-6"></div>
                    <div className="space-y-4">
                        <div className="h-12 bg-gray-200 rounded"></div>
                        <div className="h-12 bg-gray-200 rounded"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="glass-card rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
                <span className="text-2xl">🔔</span>
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">Alertas de RQs sin Cubrir</h3>
                    <p className="text-sm text-gray-500">
                        Configura las alertas automáticas para posiciones que llevan mucho tiempo abiertas
                    </p>
                </div>
            </div>

            <div className="space-y-6">
                {/* Toggle para activar/desactivar alertas */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                        <p className="font-medium text-gray-900">Activar alertas de RQs</p>
                        <p className="text-sm text-gray-500">
                            Recibe alertas cuando un RQ lleve mucho tiempo sin cubrirse
                        </p>
                    </div>
                    <button
                        onClick={() => setSettings(s => ({ ...s, rqAlertsEnabled: !s.rqAlertsEnabled }))}
                        className={`relative w-14 h-7 rounded-full transition-colors ${settings.rqAlertsEnabled ? 'bg-violet-600' : 'bg-gray-300'
                            }`}
                    >
                        <span
                            className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.rqAlertsEnabled ? 'translate-x-7' : 'translate-x-1'
                                }`}
                        />
                    </button>
                </div>

                {/* Días para la alerta */}
                {settings.rqAlertsEnabled && (
                    <>
                        <div className="p-4 border border-gray-200 rounded-lg">
                            <label className="block font-medium text-gray-900 mb-2">
                                Días para activar alerta
                            </label>
                            <p className="text-sm text-gray-500 mb-3">
                                Se mostrará una alerta cuando un RQ lleve este número de días sin cubrirse
                            </p>
                            <div className="flex items-center gap-4">
                                <input
                                    type="range"
                                    min="3"
                                    max="30"
                                    value={settings.rqAlertDays}
                                    onChange={(e) => setSettings(s => ({ ...s, rqAlertDays: parseInt(e.target.value) }))}
                                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
                                />
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min="3"
                                        max="30"
                                        value={settings.rqAlertDays}
                                        onChange={(e) => setSettings(s => ({ ...s, rqAlertDays: parseInt(e.target.value) || 7 }))}
                                        className="w-16 px-3 py-2 border border-gray-300 rounded-lg text-center font-semibold"
                                    />
                                    <span className="text-gray-600">días</span>
                                </div>
                            </div>

                            {/* Preview */}
                            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                                <span className="text-red-600 animate-pulse">🚨</span>
                                <span className="text-sm text-red-700">
                                    +{settings.rqAlertDays} días sin cubrir
                                </span>
                            </div>
                        </div>

                        {/* Notificaciones por email */}
                        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                            <div>
                                <p className="font-medium text-gray-900">Notificaciones por email</p>
                                <p className="text-sm text-gray-500">
                                    Enviar email a los recruiters cuando se active una alerta
                                </p>
                            </div>
                            <button
                                onClick={() => setSettings(s => ({ ...s, emailNotifications: !s.emailNotifications }))}
                                className={`relative w-14 h-7 rounded-full transition-colors ${settings.emailNotifications ? 'bg-violet-600' : 'bg-gray-300'
                                    }`}
                            >
                                <span
                                    className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.emailNotifications ? 'translate-x-7' : 'translate-x-1'
                                        }`}
                                />
                            </button>
                        </div>
                    </>
                )}

                {/* Botón guardar */}
                <div className="flex justify-end pt-4 border-t border-gray-200">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2 bg-gradient-to-r from-violet-600 to-cyan-500 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-2"
                    >
                        {saving ? (
                            <>
                                <span className="animate-spin">⏳</span>
                                Guardando...
                            </>
                        ) : (
                            <>
                                💾 Guardar Configuración
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
