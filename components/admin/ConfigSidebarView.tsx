'use client';

import { useState } from 'react';
import RoleMatrixConfig from './RoleMatrixConfig';
import HoldingLogoUpload from './HoldingLogoUpload';
import AlertsConfigView from './AlertsConfigView';
import DocumentsConfigView from './DocumentsConfigView';
import ConfigurationView from '../ConfigurationView';
import ZoneManagement from './ZoneManagement';
import FinancialConfig from './FinancialConfig';
import HoldingOperationalConfig from './HoldingOperationalConfig';
import ApprovalFlowConfig from './ApprovalFlowConfig';

interface ConfigSidebarViewProps {
    holdingId: string;
}

type ConfigSection = 'identidad' | 'permisos' | 'zonas' | 'alertas' | 'documentos' | 'analitica' | 'flujos' | 'cuenta' | 'operaciones';

export default function ConfigSidebarView({ holdingId }: ConfigSidebarViewProps) {
    const [activeSection, setActiveSection] = useState<ConfigSection>('identidad');

    const sections = [
        { id: 'identidad', label: '✨ Marca Empleadora', desc: 'Portal de empleos y colores' },
        { id: 'permisos', label: '🔐 Matriz de Roles', desc: 'Control de accesos y permisos' },
        { id: 'zonas', label: '📍 Gestión de Zonas', desc: 'Agrupación de distritos regionales' },
        { id: 'alertas', label: '🔔 Centro de Alertas', desc: 'Canales y reglas de notificación' },
        { id: 'documentos', label: '📁 Documentación', desc: 'Requisitos y archivos' },
        { id: 'operaciones', label: '⚙️ Configuración SaaS', desc: 'Bloqueos y ajustes generales' },
        { id: 'analitica', label: '💰 Analítica Financiera', desc: 'Costos de rotación e impacto' },
        { id: 'flujos', label: '🔄 Flujos de Aprobación', desc: 'Gestiona los niveles de RQ' },
        { id: 'cuenta', label: '👤 Mi Cuenta', desc: 'Seguridad y perfil personal' },
    ];

    return (
        <div className="flex flex-col lg:flex-row gap-8 min-h-[600px] animate-fade-in">
            {/* Sidebar Navigation */}
            <aside className="w-full lg:w-72 space-y-2">
                <div className="mb-6 px-4">
                    <h2 className="text-xl font-black text-gray-900">Configuración</h2>
                    <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mt-1">Ecosistema LIAH</p>
                </div>

                {sections.map((section) => (
                    <button
                        key={section.id}
                        onClick={() => setActiveSection(section.id as ConfigSection)}
                        className={`w-full text-left px-4 py-4 rounded-2xl transition-all duration-300 group ${activeSection === section.id
                            ? 'bg-white shadow-xl border-l-4 border-violet-600 scale-[1.02]'
                            : 'hover:bg-white/50 text-gray-500'
                            }`}
                    >
                        <p className={`font-bold text-sm ${activeSection === section.id ? 'text-violet-700' : 'text-gray-700'}`}>
                            {section.label}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{section.desc}</p>
                    </button>
                ))}
            </aside>

            {/* Content Area */}
            <div className="flex-1 bg-white rounded-3xl shadow-xl border border-gray-100 p-8 min-h-[500px]">
                {activeSection === 'identidad' && (
                    <div className="space-y-6">
                        <div className="pb-4 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900">Identidad Corporativa</h3>
                            <p className="text-sm text-gray-500">Configura el logo y la apariencia de tu holding en la plataforma.</p>
                        </div>
                        <HoldingLogoUpload holdingId={holdingId} />
                    </div>
                )}

                {activeSection === 'permisos' && (
                    <div className="space-y-6">
                        <div className="pb-4 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900">Control de Accesos</h3>
                            <p className="text-sm text-gray-500">Define qué puede ver y hacer cada rol dentro de tu organización.</p>
                        </div>
                        <RoleMatrixConfig holdingId={holdingId} />
                    </div>
                )}

                {activeSection === 'zonas' && (
                    <div className="space-y-6">
                        <div className="pb-4 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900">Ubicaciones y Zonas</h3>
                            <p className="text-sm text-gray-500">Define grupos regionales de distritos para filtrar tus métricas.</p>
                        </div>
                        <ZoneManagement holdingId={holdingId} />
                    </div>
                )}

                {activeSection === 'alertas' && (
                    <div className="space-y-6">
                        <div className="pb-4 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900">Reglas de Notificación</h3>
                            <p className="text-sm text-gray-500">Configura las alertas de WhatsApp y Email para estados críticos.</p>
                        </div>
                        <AlertsConfigView holdingId={holdingId} />
                    </div>
                )}

                {activeSection === 'documentos' && (
                    <div className="space-y-6">
                        <div className="pb-4 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900">Configuración de Archivos</h3>
                            <p className="text-sm text-gray-500">Define los documentos obligatorios para los candidatos.</p>
                        </div>
                        <DocumentsConfigView holdingId={holdingId} />
                    </div>
                )}

                {activeSection === 'analitica' && (
                    <div className="space-y-6">
                        <div className="pb-4 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900">Analítica Financiera</h3>
                            <p className="text-sm text-gray-500">Configura los rubros de costo operativo para el cálculo de impacto de rotación.</p>
                        </div>
                        <FinancialConfig holdingId={holdingId} />
                    </div>
                )}

                {activeSection === 'flujos' && (
                    <div className="space-y-6">
                        <div className="pb-4 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900">Flujos de Aprobación</h3>
                            <p className="text-sm text-gray-500">Personaliza la jerarquía de aprobación para los nuevos requerimientos en tu holding.</p>
                        </div>
                        <ApprovalFlowConfig holdingId={holdingId} />
                    </div>
                )}

                {activeSection === 'operaciones' && (
                    <div className="space-y-6">
                        <div className="pb-4 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900">Configuración SaaS</h3>
                            <p className="text-sm text-gray-500">Gestión de bloqueos y parámetros operativos del holding.</p>
                        </div>
                        <HoldingOperationalConfig holdingId={holdingId} />
                    </div>
                )}

                {activeSection === 'cuenta' && (
                    <div className="space-y-6">
                        <div className="pb-4 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900">Seguridad de la Cuenta</h3>
                            <p className="text-sm text-gray-500">Cambia tu contraseña y gestiona tus sesiones activas.</p>
                        </div>
                        <ConfigurationView />
                    </div>
                )}
            </div>
        </div>
    );
}
