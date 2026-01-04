'use client';

interface PriorityModalProps {
    isOpen: boolean;
    candidateName: string;
    onSelect: (priority: 'principal' | 'backup') => void;
    onClose: () => void;
}

export default function PriorityModal({ isOpen, candidateName, onSelect, onClose }: PriorityModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-violet-500 to-cyan-500">
                    <h2 className="text-xl font-bold text-white">Clasificar Candidato</h2>
                </div>

                {/* Content */}
                <div className="p-6">
                    <p className="text-gray-700 mb-6">
                        ¿Cómo clasificas a <strong>{candidateName}</strong> para este puesto?
                    </p>

                    <div className="space-y-3">
                        <button
                            onClick={() => onSelect('principal')}
                            className="w-full p-4 border-2 border-amber-300 bg-amber-50 rounded-xl hover:bg-amber-100 hover:border-amber-400 transition-all flex items-center gap-4"
                        >
                            <span className="text-3xl">⭐</span>
                            <div className="text-left">
                                <div className="font-bold text-amber-800">Principal</div>
                                <div className="text-sm text-amber-600">Primera opción para el puesto</div>
                            </div>
                        </button>

                        <button
                            onClick={() => onSelect('backup')}
                            className="w-full p-4 border-2 border-gray-300 bg-gray-50 rounded-xl hover:bg-gray-100 hover:border-gray-400 transition-all flex items-center gap-4"
                        >
                            <span className="text-3xl">📋</span>
                            <div className="text-left">
                                <div className="font-bold text-gray-700">Backup</div>
                                <div className="text-sm text-gray-500">Opción de respaldo</div>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                    <button
                        onClick={onClose}
                        className="w-full py-2 text-gray-600 hover:text-gray-800 font-medium"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
}
