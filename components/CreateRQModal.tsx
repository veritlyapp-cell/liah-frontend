import { useState, useEffect } from 'react';
import { createRQInstances } from '@/lib/firestore/rqs';
import { useAuth } from '@/contexts/AuthContext';
import { useJobProfiles } from '@/lib/hooks/useJobProfiles';

interface CreateRQModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    storeId: string;
    storeName: string;
    marcaId: string;
    marcaNombre: string;
    isLocked?: boolean;
    creatorRole?: 'store_manager' | 'supervisor';
}

export default function CreateRQModal({ isOpen, onClose, onSuccess, storeId, storeName, marcaId, marcaNombre, isLocked = false, creatorRole = 'store_manager' }: CreateRQModalProps) {
    const { user, claims } = useAuth();

    const { profiles, loading: profilesLoading } = useJobProfiles({
        marcaId: marcaId,
        autoFetch: true
    });

    const [creating, setCreating] = useState(false);

    // Form state
    const [selectedPosicion, setSelectedPosicion] = useState('');
    const [selectedTurno, setSelectedTurno] = useState('');
    const [selectedModalidad, setSelectedModalidad] = useState<'Part Time 19' | 'Part Time 23' | 'Full Time'>('Part Time 23');
    const [numVacantes, setNumVacantes] = useState(1);
    const [motivo, setMotivo] = useState<'Reemplazo' | 'Necesidad de Venta' | ''>('');
    const [personasReemplazadas, setPersonasReemplazadas] = useState<string[]>(['']);

    // Filter profiles by role
    const filteredProfiles = profiles.filter(p => {
        if (creatorRole === 'store_manager') {
            return !p.categoria || p.categoria === 'operativo';
        }
        return true;
    });

    const uniquePositions = Array.from(new Set(filteredProfiles.map(p => p.posicion))).sort();
    const selectedProfileData = selectedPosicion ? filteredProfiles.find(p => p.posicion === selectedPosicion) : null;
    const tenantId = claims?.holdingId || claims?.tenant_id || (user as any)?.holdingId || 'ngr_holding';

    // Auto-set fields for Gerencial positions
    useEffect(() => {
        if (selectedProfileData?.categoria === 'gerencial') {
            if (selectedModalidad !== 'Full Time') setSelectedModalidad('Full Time');
            if (selectedTurno !== 'Administrativo') setSelectedTurno('Administrativo');
        }
    }, [selectedProfileData]);

    // Sync personasReemplazadas array length with numVacantes
    useEffect(() => {
        if (motivo === 'Reemplazo') {
            setPersonasReemplazadas(prev => {
                const next = [...prev];
                while (next.length < numVacantes) next.push('');
                return next.slice(0, numVacantes);
            });
        }
    }, [numVacantes, motivo]);

    // Reset when motivo changes
    useEffect(() => {
        if (motivo !== 'Reemplazo') {
            setPersonasReemplazadas(['']);
        } else {
            setPersonasReemplazadas(Array(numVacantes).fill(''));
        }
    }, [motivo]);

    if (!isOpen) return null;

    const isGerencial = selectedProfileData?.categoria === 'gerencial';

    const canSubmit =
        selectedPosicion &&
        selectedModalidad &&
        motivo &&
        numVacantes >= 1 &&
        (isGerencial || selectedTurno) &&
        (motivo !== 'Reemplazo' || personasReemplazadas.every(n => n.trim().length > 0));

    const handleCreate = async () => {
        if (!selectedProfileData || !user || !selectedModalidad || !motivo) {
            alert('Complete todos los campos requeridos');
            return;
        }
        if (!isGerencial && !selectedTurno) {
            alert('Selecciona un turno');
            return;
        }
        if (isLocked) {
            alert('❌ La creación de nuevos requerimientos está bloqueada por el administrador.');
            return;
        }
        if (numVacantes < 1 || numVacantes > 20) {
            alert('El número de vacantes debe estar entre 1 y 20');
            return;
        }
        if (motivo === 'Reemplazo' && personasReemplazadas.some(n => !n.trim())) {
            alert('Por favor, completa los nombres de todas las personas a reemplazar');
            return;
        }

        setCreating(true);
        try {
            const customProfile = {
                ...selectedProfileData,
                turno: selectedTurno,
                modalidad: selectedModalidad,
                motivo,
                personasReemplazadas: motivo === 'Reemplazo' ? personasReemplazadas : undefined
            };

            await createRQInstances(
                customProfile,
                storeId,
                storeName,
                numVacantes,
                tenantId,
                marcaId,
                selectedProfileData.marcaNombre || marcaNombre,
                user.uid,
                user.email || '',
                creatorRole
            );

            alert(`✅ ${numVacantes} instancia(s) de RQ creadas correctamente!\n\nEnviadas para aprobación.`);

            // Reset form
            setSelectedPosicion('');
            setSelectedTurno('');
            setSelectedModalidad('Part Time 23');
            setNumVacantes(1);
            setMotivo('');
            setPersonasReemplazadas(['']);

            onSuccess();
            onClose();

        } catch (error: any) {
            console.error('❌ [CreateRQModal] Error:', error);
            alert(`🚨 Error al crear RQ:\n\n${error.message || 'Error desconocido'}`);
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[92vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Crear Requerimiento</h2>
                        <p className="text-sm text-gray-500">{storeName}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors text-xl" disabled={creating}>✕</button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                    {profilesLoading ? (
                        <div className="text-center py-10 text-gray-500">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600 mx-auto mb-2" />
                            Cargando puestos...
                        </div>
                    ) : (
                        <>
                            {/* Puesto */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Puesto <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={selectedPosicion}
                                    onChange={e => { setSelectedPosicion(e.target.value); setSelectedTurno(''); }}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white"
                                >
                                    <option value="">Seleccionar puesto...</option>
                                    {uniquePositions.map(p => (
                                        <option key={p} value={p}>{p}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Turno */}
                            {selectedPosicion && !isGerencial && (
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Turno <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={selectedTurno}
                                        onChange={e => setSelectedTurno(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white"
                                    >
                                        <option value="">Seleccionar turno...</option>
                                        <option value="Mañana">Mañana</option>
                                        <option value="Tarde">Tarde</option>
                                        <option value="Noche">Noche</option>
                                        <option value="Rotativo">Rotativo</option>
                                    </select>
                                </div>
                            )}

                            {/* Modalidad */}
                            {selectedPosicion && (
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Modalidad <span className="text-red-500">*</span>
                                    </label>
                                    <div className="flex gap-2">
                                        {(['Part Time 19', 'Part Time 23', 'Full Time'] as const).map(m => (
                                            <button
                                                key={m}
                                                onClick={() => !isGerencial && setSelectedModalidad(m)}
                                                disabled={isGerencial && m !== 'Full Time'}
                                                className={`flex-1 py-2.5 px-2 rounded-lg border-2 font-medium transition-all text-sm ${
                                                    selectedModalidad === m
                                                        ? 'border-violet-500 bg-violet-50 text-violet-700'
                                                        : 'border-gray-300 bg-white text-gray-600 hover:border-violet-300'
                                                } ${isGerencial && m !== 'Full Time' ? 'opacity-40 cursor-not-allowed' : ''}`}
                                            >
                                                {m === 'Part Time 19' ? 'PT 19h' : m === 'Part Time 23' ? 'PT 23h' : 'Full Time'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Motivo */}
                            {selectedPosicion && (
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Motivo del Requerimiento <span className="text-red-500">*</span>
                                    </label>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setMotivo('Reemplazo')}
                                            className={`flex-1 py-3 px-4 rounded-lg border-2 font-medium transition-all text-sm ${
                                                motivo === 'Reemplazo'
                                                    ? 'border-amber-500 bg-amber-50 text-amber-700'
                                                    : 'border-gray-300 bg-white text-gray-700 hover:border-amber-300'
                                            }`}
                                        >
                                            🔄 Reemplazo
                                        </button>
                                        <button
                                            onClick={() => setMotivo('Necesidad de Venta')}
                                            className={`flex-1 py-3 px-4 rounded-lg border-2 font-medium transition-all text-sm ${
                                                motivo === 'Necesidad de Venta'
                                                    ? 'border-violet-500 bg-violet-50 text-violet-700'
                                                    : 'border-gray-300 bg-white text-gray-700 hover:border-violet-300'
                                            }`}
                                        >
                                            ✨ Nueva Vacante
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Cantidad */}
                            {selectedPosicion && motivo && (
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Cantidad de Vacantes <span className="text-red-500">*</span>
                                    </label>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => setNumVacantes(v => Math.max(1, v - 1))}
                                            className="w-10 h-10 rounded-full border-2 border-gray-300 text-gray-600 font-bold text-lg hover:border-violet-400 hover:text-violet-600 transition-all flex items-center justify-center"
                                        >−</button>
                                        <span className="text-2xl font-black text-violet-700 w-8 text-center">{numVacantes}</span>
                                        <button
                                            onClick={() => setNumVacantes(v => Math.min(20, v + 1))}
                                            className="w-10 h-10 rounded-full border-2 border-gray-300 text-gray-600 font-bold text-lg hover:border-violet-400 hover:text-violet-600 transition-all flex items-center justify-center"
                                        >+</button>
                                        <span className="text-xs text-gray-400 ml-1">vacante(s) · máx. 20</span>
                                    </div>
                                </div>
                            )}

                            {/* Personas a reemplazar — dynamic inputs */}
                            {motivo === 'Reemplazo' && (
                                <div className="space-y-3">
                                    <label className="block text-sm font-semibold text-gray-700">
                                        Nombre(s) de persona(s) a reemplazar <span className="text-red-500">*</span>
                                    </label>
                                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
                                        {Array.from({ length: numVacantes }).map((_, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-amber-600 w-6 flex-shrink-0">#{i + 1}</span>
                                                <input
                                                    type="text"
                                                    value={personasReemplazadas[i] || ''}
                                                    onChange={e => {
                                                        const next = [...personasReemplazadas];
                                                        next[i] = e.target.value;
                                                        setPersonasReemplazadas(next);
                                                    }}
                                                    placeholder={`Nombre completo de persona ${i + 1}`}
                                                    className="flex-1 px-3 py-2 text-sm border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-transparent bg-white placeholder-gray-400"
                                                />
                                            </div>
                                        ))}
                                        <p className="text-xs text-amber-600 mt-2 italic">
                                            Esta información queda registrada como sustento del reemplazo.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Summary */}
                            {selectedProfileData && motivo && (
                                <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-1 border border-gray-200">
                                    <p className="font-semibold text-gray-800">{selectedPosicion}</p>
                                    <p className="text-gray-500">{selectedModalidad} · {isGerencial ? 'Administrativo' : selectedTurno || '—'} · S/ {selectedProfileData.salario}</p>
                                    <p className="text-gray-500">{motivo === 'Reemplazo' ? '🔄 Reemplazo' : '✨ Nueva Vacante'} · {numVacantes} vacante(s)</p>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 flex justify-between flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                        disabled={creating}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleCreate}
                        disabled={creating || !canSubmit}
                        className="px-6 py-2.5 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {creating ? (
                            <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Creando...</>
                        ) : (
                            <>📋 Crear Requerimiento</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
