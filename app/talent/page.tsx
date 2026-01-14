'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

/**
 * Liah Talent - Main Dashboard
 * Corporate Recruitment Platform
 */
export default function TalentDashboard() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('jobs');

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500" />
            </div>
        );
    }

    const tabs = [
        { id: 'jobs', label: 'Vacantes', icon: '📋' },
        { id: 'candidates', label: 'Candidatos', icon: '👥' },
        { id: 'pipeline', label: 'Pipeline', icon: '🎯' },
        { id: 'analytics', label: 'Analytics', icon: '📊' },
    ];

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/launcher">
                                <img src="/logos/liah-logo.png" alt="Liah" className="h-10" />
                            </Link>
                            <div className="h-6 w-px bg-gray-300" />
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">💼</span>
                                <span className="font-bold text-gray-900">Talent</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-600">{user?.email}</span>
                            <button
                                onClick={() => router.push('/launcher')}
                                className="px-4 py-2 text-sm bg-violet-100 text-violet-700 rounded-lg hover:bg-violet-200 transition-colors"
                            >
                                Cambiar Producto
                            </button>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex gap-1">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-5 py-3 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 ${activeTab === tab.id
                                        ? 'bg-slate-50 text-violet-600 border-t-2 border-x border-violet-500'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                    }`}
                            >
                                <span>{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-8">
                {activeTab === 'jobs' && (
                    <div>
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Vacantes</h1>
                                <p className="text-gray-600">Gestiona tus posiciones abiertas</p>
                            </div>
                            <button className="px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all">
                                + Nueva Vacante
                            </button>
                        </div>

                        {/* Empty State */}
                        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                            <div className="text-6xl mb-4">📋</div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">No hay vacantes aún</h3>
                            <p className="text-gray-600 mb-6">Crea tu primera vacante para empezar a reclutar</p>
                            <button className="px-6 py-3 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 transition-colors">
                                Crear Primera Vacante
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'candidates' && (
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-4">Candidatos</h1>
                        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                            <div className="text-6xl mb-4">👥</div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Sin candidatos</h3>
                            <p className="text-gray-600">Los candidatos aparecerán aquí cuando apliquen</p>
                        </div>
                    </div>
                )}

                {activeTab === 'pipeline' && (
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-4">Pipeline de Reclutamiento</h1>
                        <div className="grid grid-cols-5 gap-4">
                            {['Aplicados', 'Screening', 'Entrevista', 'Oferta', 'Contratado'].map((stage, i) => (
                                <div key={stage} className="bg-white rounded-xl border border-gray-200 p-4">
                                    <h3 className="font-semibold text-gray-700 mb-2 text-sm">{stage}</h3>
                                    <div className="text-3xl font-bold text-violet-600">0</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'analytics' && (
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-4">Analytics</h1>
                        <div className="grid grid-cols-4 gap-4">
                            {[
                                { label: 'Vacantes Activas', value: '0', icon: '📋' },
                                { label: 'Candidatos Totales', value: '0', icon: '👥' },
                                { label: 'En Proceso', value: '0', icon: '⏳' },
                                { label: 'Contratados', value: '0', icon: '✅' },
                            ].map(stat => (
                                <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-6">
                                    <div className="text-3xl mb-2">{stat.icon}</div>
                                    <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
                                    <div className="text-sm text-gray-600">{stat.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
