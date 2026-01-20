'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

interface PublishConfig {
    slogan: string;
    tono: 'formal' | 'amigable' | 'dinamico';
    instruccionesIA: string;
    beneficiosEstandar: string[];
    condicionesGenerales: string;
}

interface PublishConfigViewProps {
    holdingId: string;
}

export default function PublishConfigView({ holdingId }: PublishConfigViewProps) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [slogan, setSlogan] = useState('');
    const [tono, setTono] = useState<'formal' | 'amigable' | 'dinamico'>('amigable');
    const [instruccionesIA, setInstruccionesIA] = useState('');
    const [beneficiosEstandar, setBeneficiosEstandar] = useState<string[]>([]);
    const [newBeneficio, setNewBeneficio] = useState('');
    const [condicionesGenerales, setCondicionesGenerales] = useState('');

    useEffect(() => {
        loadConfig();
    }, [holdingId]);

    async function loadConfig() {
        setLoading(true);
        try {
            const holdingDoc = await getDoc(doc(db, 'holdings', holdingId));
            if (holdingDoc.exists()) {
                const data = holdingDoc.data();
                const config = data.publishConfig || {};

                setSlogan(config.slogan || '');
                setTono(config.tono || 'amigable');
                setInstruccionesIA(config.instruccionesIA || '');
                setBeneficiosEstandar(config.beneficiosEstandar || []);
                setCondicionesGenerales(config.condicionesGenerales || '');
            }
        } catch (error) {
            console.error('Error loading publish config:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        setSaving(true);
        try {
            await updateDoc(doc(db, 'holdings', holdingId), {
                publishConfig: {
                    slogan,
                    tono,
                    instruccionesIA,
                    beneficiosEstandar,
                    condicionesGenerales
                }
            });
            alert('✅ Configuración guardada exitosamente');
        } catch (error) {
            console.error('Error saving config:', error);
            alert('Error al guardar la configuración');
        } finally {
            setSaving(false);
        }
    }

    function addBeneficio() {
        if (newBeneficio.trim()) {
            setBeneficiosEstandar([...beneficiosEstandar, newBeneficio.trim()]);
            setNewBeneficio('');
        }
    }

    function removeBeneficio(index: number) {
        setBeneficiosEstandar(beneficiosEstandar.filter((_, i) => i !== index));
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Configuración de Publicación</h2>
                    <p className="text-gray-600">Define parámetros estándar para todas las publicaciones de empleo</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50"
                >
                    {saving ? '⏳ Guardando...' : '💾 Guardar Cambios'}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Branding Section */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        🏢 Branding de Empresa
                    </h3>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Slogan / Tagline
                        </label>
                        <input
                            type="text"
                            value={slogan}
                            onChange={(e) => setSlogan(e.target.value)}
                            placeholder="Ej: Tu gas de confianza"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 mt-1">Se incluirá en las publicaciones generadas con IA</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tono de Comunicación
                        </label>
                        <select
                            value={tono}
                            onChange={(e) => setTono(e.target.value as 'formal' | 'amigable' | 'dinamico')}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                        >
                            <option value="formal">Formal - Corporativo y profesional</option>
                            <option value="amigable">Amigable - Cercano y accesible</option>
                            <option value="dinamico">Dinámico - Energético y moderno</option>
                        </select>
                    </div>
                </div>

                {/* AI Instructions Section */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        🤖 Instrucciones para IA
                    </h3>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Instrucciones Adicionales
                        </label>
                        <textarea
                            value={instruccionesIA}
                            onChange={(e) => setInstruccionesIA(e.target.value)}
                            placeholder="Ej: Siempre mencionar nuestro compromiso con la seguridad y el medio ambiente..."
                            rows={4}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 mt-1">La IA seguirá estas instrucciones al generar descripciones</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Condiciones Generales
                        </label>
                        <textarea
                            value={condicionesGenerales}
                            onChange={(e) => setCondicionesGenerales(e.target.value)}
                            placeholder="Ej: Horario: Lunes a Viernes 8am-6pm. Dress code: Casual de negocios."
                            rows={3}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                        />
                    </div>
                </div>

                {/* Benefits Section */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 lg:col-span-2">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        🎁 Beneficios Estándar
                    </h3>
                    <p className="text-sm text-gray-600">
                        Estos beneficios se pre-cargarán en todas las publicaciones. El recruiter puede editarlos.
                    </p>

                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newBeneficio}
                            onChange={(e) => setNewBeneficio(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addBeneficio()}
                            placeholder="Agregar nuevo beneficio..."
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                        />
                        <button
                            onClick={addBeneficio}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                            + Agregar
                        </button>
                    </div>

                    {beneficiosEstandar.length === 0 ? (
                        <p className="text-gray-400 italic">No hay beneficios configurados</p>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {beneficiosEstandar.map((beneficio, index) => (
                                <div
                                    key={index}
                                    className="flex items-center gap-2 bg-green-50 text-green-800 px-3 py-1.5 rounded-full border border-green-200"
                                >
                                    <span>✓ {beneficio}</span>
                                    <button
                                        onClick={() => removeBeneficio(index)}
                                        className="text-green-600 hover:text-red-600"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Preview Section */}
            <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl border border-violet-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">👁️ Vista Previa del Estilo</h3>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <p className="text-gray-700">
                        <span className="font-medium">Ejemplo de publicación:</span>
                    </p>
                    <p className="mt-2 text-gray-600">
                        {slogan && <span className="italic">"{slogan}" </span>}
                        En nuestra empresa estamos en búsqueda de talento para unirse a nuestro equipo...
                    </p>
                    {beneficiosEstandar.length > 0 && (
                        <div className="mt-3">
                            <p className="text-sm font-medium text-gray-700">¿Qué ofrecemos?</p>
                            <ul className="text-sm text-gray-600 mt-1">
                                {beneficiosEstandar.slice(0, 3).map((b, i) => (
                                    <li key={i}>• {b}</li>
                                ))}
                                {beneficiosEstandar.length > 3 && (
                                    <li className="text-gray-400">...y {beneficiosEstandar.length - 3} más</li>
                                )}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
