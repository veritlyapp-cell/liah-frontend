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
    creatorRole?: 'store_manager' | 'supervisor'; // For determining approval flow
}

export default function CreateRQModal({ isOpen, onClose, onSuccess, storeId, storeName, marcaId, marcaNombre, isLocked = false, creatorRole = 'store_manager' }: CreateRQModalProps) {
    const { user, claims } = useAuth();

    // Load job profiles for this marca
    const { profiles, loading: profilesLoading } = useJobProfiles({
        marcaId: marcaId,
        autoFetch: true
    });

    const [step, setStep] = useState(1);
    const [creating, setCreating] = useState(false);

    // Form state
    const [selectedPosicion, setSelectedPosicion] = useState('');
    const [selectedTurno, setSelectedTurno] = useState('');
    const [selectedModalidad, setSelectedModalidad] = useState<'Part Time 19' | 'Part Time 23' | 'Full Time'>('Part Time 23');
    const [numVacantes, setNumVacantes] = useState('1');
    const [motivo, setMotivo] = useState<'Reemplazo' | 'Necesidad de Venta' | ''>('');

    // Filter by categoria: store_manager can only see 'operativo', supervisor can see both
    const filteredProfiles = profiles.filter(p => {
        if (creatorRole === 'store_manager') {
            // Store managers can only request operativo positions (not gerencial like Asistente/Gerente)
            return !p.categoria || p.categoria === 'operativo';
        }
        // Supervisors can request all positions including gerencial
        return true;
    });

    // Obtener posiciones únicas y turnos/modalidades disponibles
    const uniquePositions = Array.from(new Set(filteredProfiles.map(p => p.posicion)));
    const selectedProfileData = selectedPosicion ? filteredProfiles.find(p => p.posicion === selectedPosicion) : null;

    const tenantId = claims?.tenant_id || 'ngr_holding';

    // Effect to handle auto-setting fields for Gerencial positions
    // IMPORTANT: This must be before any early return to avoid hooks order violation
    useEffect(() => {
        if (selectedProfileData?.categoria === 'gerencial') {
            if (selectedModalidad !== 'Full Time') {
                setSelectedModalidad('Full Time');
            }
            if (selectedTurno !== 'Administrativo') {
                setSelectedTurno('Administrativo');
            }
        }
    }, [selectedProfileData, selectedModalidad, selectedTurno]);

    // Early return AFTER all hooks
    if (!isOpen) return null;

    const handleNext = () => {
        if (step === 1 && !selectedPosicion) {
            alert('Seleccione un puesto');
            return;
        }
        setStep(2);
    };

    const handleBack = () => {
        setStep(1);
    };

    const handleCreate = async () => {
        // Base validation
        if (!selectedProfileData || !user || !selectedModalidad) {
            alert('Complete todos los campos requeridos');
            return;
        }

        // Turno is only required for operativo positions
        const isGerencial = selectedProfileData.categoria === 'gerencial';
        if (!isGerencial && !selectedTurno) {
            alert('Complete el campo de turno');
            return;
        }

        if (isLocked) {
            alert('❌ La creación de nuevos requerimientos está bloqueada por el administrador.');
            return;
        }

        const vacantes = parseInt(numVacantes);
        if (vacantes < 1 || vacantes > 20) {
            alert('El número de vacantes debe estar entre 1 y 20');
            return;
        }

        setCreating(true);

        try {
            // Crear perfil temporal con los datos seleccionados
            const customProfile = {
                ...selectedProfileData,
                turno: selectedTurno,
                modalidad: selectedModalidad,
                motivo: motivo  // Agregar motivo para métricas
            };

            console.log('[CreateRQ] marcaId:', marcaId); // DEBUG
            console.log('[CreateRQ] tenantId:', tenantId); // DEBUG

            await createRQInstances(
                customProfile,
                storeId,
                storeName,
                vacantes,
                tenantId,
                marcaId,
                selectedProfileData.marcaNombre || marcaNombre, // Use brand name from profile as fail-safe
                user.uid,
                user.email || '',
                creatorRole
            );

            alert(`✅ ${vacantes} instancia(s) de RQ creadas correctamente!\n\nEnviadas para aprobación.`);

            // Reset form
            setSelectedPosicion('');
            setSelectedTurno('');
            setSelectedModalidad('Part Time 23');
            setNumVacantes('1');
            setMotivo('');
            setStep(1);

            onSuccess();
            onClose();

        } catch (error) {
            console.error('Error creating RQ instances:', error);
            alert('Error al crear RQ. Por favor intenta de nuevo.');
        } finally {
            setCreating(false);
        }
    };

    const renderStep1 = () => {
        return (
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Seleccionar Puesto</h3>

                {profilesLoading ? (
                    <div className="text-center py-8 text-gray-500">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600 mx-auto mb-2"></div>
                        Cargando puestos...
                    </div>
                ) : uniquePositions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <p className="mb-2">📋 No hay puestos disponibles</p>
                        <p className="text-sm">Contacta al Admin para crear perfiles de posición</p>
                    </div>
                ) : (
                    <>
                        <p className="text-sm text-gray-600">
                            Selecciona el puesto que necesitas contratar:
                        </p>

                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {uniquePositions.map(posicion => {
                                const firstProfile = profiles.find(p => p.posicion === posicion);

                                return (
                                    <div
                                        key={posicion}
                                        onClick={() => setSelectedPosicion(posicion)}
                                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${selectedPosicion === posicion
                                            ? 'border-violet-500 bg-violet-50'
                                            : 'border-gray-200 hover:border-violet-300 hover:bg-gray-50'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="font-semibold text-gray-900 text-lg">{posicion}</h4>
                                                {firstProfile && (
                                                    <p className="text-sm text-gray-500 mt-1">
                                                        Salario base: S/ {firstProfile.salario}
                                                    </p>
                                                )}
                                            </div>
                                            {selectedPosicion === posicion && (
                                                <span className="text-violet-600 text-2xl">✓</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        );
    };

    const renderStep2 = () => (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Completar Detalles</h3>

            {selectedProfileData && (
                <>
                    {/* Resumen del puesto */}
                    <div className="glass-card rounded-xl p-4 bg-violet-50">
                        <h4 className="font-semibold text-gray-900 mb-2">📋 Puesto Seleccionado</h4>
                        <p className="text-lg font-bold text-violet-700">{selectedPosicion}</p>
                        <p className="text-sm text-gray-600 mt-1">Salario: S/ {selectedProfileData.salario}</p>
                    </div>

                    {/* Turno */}
                    {selectedProfileData.categoria !== 'gerencial' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Turno <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={selectedTurno}
                                onChange={(e) => setSelectedTurno(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
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
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Modalidad <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-2">
                            <button
                                onClick={() => selectedProfileData.categoria !== 'gerencial' && setSelectedModalidad('Part Time 19')}
                                className={`flex-1 py-3 px-3 rounded-lg border-2 font-medium transition-all text-sm ${selectedModalidad === 'Part Time 19'
                                    ? 'border-violet-500 bg-violet-50 text-violet-700'
                                    : 'border-gray-300 bg-white text-gray-700 hover:border-violet-300'
                                    } ${selectedProfileData.categoria === 'gerencial' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                disabled={selectedProfileData.categoria === 'gerencial'}
                            >
                                Part Time 19h
                            </button>
                            <button
                                onClick={() => selectedProfileData.categoria !== 'gerencial' && setSelectedModalidad('Part Time 23')}
                                className={`flex-1 py-3 px-3 rounded-lg border-2 font-medium transition-all text-sm ${selectedModalidad === 'Part Time 23'
                                    ? 'border-violet-500 bg-violet-50 text-violet-700'
                                    : 'border-gray-300 bg-white text-gray-700 hover:border-violet-300'
                                    } ${selectedProfileData.categoria === 'gerencial' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                disabled={selectedProfileData.categoria === 'gerencial'}
                            >
                                Part Time 23h
                            </button>
                            <button
                                onClick={() => setSelectedModalidad('Full Time')}
                                className={`flex-1 py-3 px-3 rounded-lg border-2 font-medium transition-all text-sm ${selectedModalidad === 'Full Time'
                                    ? 'border-violet-500 bg-violet-50 text-violet-700'
                                    : 'border-gray-300 bg-white text-gray-700 hover:border-violet-300'
                                    }`}
                            >
                                Full Time
                            </button>
                        </div>
                        {selectedProfileData.categoria === 'gerencial' && (
                            <p className="text-xs text-violet-600 mt-1 italic">
                                ✨ Puestos gerenciales son requeridos únicamente en modalidad Full Time.
                            </p>
                        )}
                    </div>

                    {/* Motivo */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Motivo del Requerimiento <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setMotivo('Reemplazo')}
                                className={`flex-1 py-3 px-4 rounded-lg border-2 font-medium transition-all ${motivo === 'Reemplazo'
                                    ? 'border-violet-500 bg-violet-50 text-violet-700'
                                    : 'border-gray-300 bg-white text-gray-700 hover:border-violet-300'
                                    }`}
                            >
                                Reemplazo
                            </button>
                            <button
                                onClick={() => setMotivo('Necesidad de Venta')}
                                className={`flex-1 py-3 px-4 rounded-lg border-2 font-medium transition-all ${motivo === 'Necesidad de Venta'
                                    ? 'border-violet-500 bg-violet-50 text-violet-700'
                                    : 'border-gray-300 bg-white text-gray-700 hover:border-violet-300'
                                    }`}
                            >
                                Nueva Vacante
                            </button>
                        </div>
                    </div>

                    {/* Número de Vacantes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            ¿Cuántas vacantes necesitas cubrir? <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                min="1"
                                max="20"
                                value={numVacantes}
                                onChange={(e) => setNumVacantes(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent pl-12 text-lg font-bold text-violet-700"
                            />
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl">
                                👥
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            Se generará un RQ individual por cada vacante solicitada. Máximo 20.
                        </p>
                    </div>

                </>
            )}
        </div>
    );



    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Crear Requerimiento</h2>
                        <p className="text-sm text-gray-500">Paso {step} de 2</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        disabled={creating}
                    >
                        ✕
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="px-6 py-3 bg-gray-50">
                    <div className="flex items-center gap-2">
                        {[1, 2].map(s => (
                            <div key={s} className="flex-1 flex items-center gap-2">
                                <div className={`w-full h-2 rounded-full ${s <= step ? 'bg-gradient-to-r from-violet-500 to-cyan-500' : 'bg-gray-200'}`}></div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-6">
                    {step === 1 && renderStep1()}
                    {step === 2 && renderStep2()}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
                    <button
                        onClick={step === 1 ? onClose : handleBack}
                        className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                        disabled={creating}
                    >
                        {step === 1 ? 'Cancelar' : '← Atrás'}
                    </button>
                    <button
                        onClick={step === 2 ? handleCreate : handleNext}
                        className="px-6 py-2 gradient-bg text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                        disabled={creating || (step === 1 && !selectedPosicion) || (step === 2 && (!selectedTurno && selectedProfileData?.categoria !== 'gerencial' || !selectedModalidad || !motivo || !numVacantes))}
                    >
                        {creating ? 'Creando...' : step === 2 ? 'Crear Requerimiento' : 'Siguiente →'}
                    </button>
                </div>
            </div>
        </div>
    );
}
