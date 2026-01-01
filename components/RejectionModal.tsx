interface RejectionModalProps {
    show: boolean;
    selectedCount: number;
    reason: 'horario' | 'distancia' | 'fit_cultural' | 'otros';
    comments: string;
    onReasonChange: (reason: 'horario' | 'distancia' | 'fit_cultural' | 'otros') => void;
    onCommentsChange: (comments: string) => void;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function RejectionModal({
    show,
    selectedCount,
    reason,
    comments,
    onReasonChange,
    onCommentsChange,
    onConfirm,
    onCancel
}: RejectionModalProps) {
    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full animate-slide-up">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                    Motivo de Rechazo
                </h3>
                <p className="text-sm textgray-600 mb-6">
                    {selectedCount} candidato{selectedCount > 1 ? 's' : ''} seleccionado{selectedCount > 1 ? 's' : ''}
                </p>

                {/* Razones */}
                <div className="space-y-3 mb-6">
                    <label className="flex items-center gap-3 p-3 rounded-lg border-2 border-gray-200 cursor-pointer transition-colors hover:bg-gray-50">
                        <input
                            type="radio"
                            name="reason"
                            value="horario"
                            checked={reason === 'horario'}
                            onChange={() => onReasonChange('horario')}
                            className="w-4 h-4 text-violet-600"
                        />
                        <div className="flex items-center gap-2">
                            <span className="text-lg">⏰</span>
                            <span className="text-sm font-medium text-gray-900">Horario no compatible</span>
                        </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 rounded-lg border-2 border-gray-200 cursor-pointer transition-colors hover:bg-gray-50">
                        <input
                            type="radio"
                            name="reason"
                            value="distancia"
                            checked={reason === 'distancia'}
                            onChange={() => onReasonChange('distancia')}
                            className="w-4 h-4 text-violet-600"
                        />
                        <div className="flex items-center gap-2">
                            <span className="text-lg">📍</span>
                            <span className="text-sm font-medium text-gray-900">Distancia muy lejos</span>
                        </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 rounded-lg border-2 border-gray-200 cursor-pointer transition-colors hover:bg-gray-50">
                        <input
                            type="radio"
                            name="reason"
                            value="fit_cultural"
                            checked={reason === 'fit_cultural'}
                            onChange={() => onReasonChange('fit_cultural')}
                            className="w-4 h-4 text-violet-600"
                        />
                        <div className="flex items-center gap-2">
                            <span className="text-lg">👥</span>
                            <span className="text-sm font-medium text-gray-900">No encaja culturalmente</span>
                        </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 rounded-lg border-2 border-gray-200 cursor-pointer transition-colors hover:bg-gray-50">
                        <input
                            type="radio"
                            name="reason"
                            value="otros"
                            checked={reason === 'otros'}
                            onChange={() => onReasonChange('otros')}
                            className="w-4 h-4 text-violet-600"
                        />
                        <div className="flex items-center gap-2">
                            <span className="text-lg">📝</span>
                            <span className="text-sm font-medium text-gray-900">Otros</span>
                        </div>
                    </label>
                </div>

                {/* Comentarios */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Comentarios adicionales
                    </label>
                    <textarea
                        value={comments}
                        onChange={(e) => onCommentsChange(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                        placeholder="Describe el motivo con más detalle..."
                    />
                </div>

                {/* Botones */}
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
                    >
                        Confirmar Rechazo
                    </button>
                </div>
            </div>
        </div>
    );
}
