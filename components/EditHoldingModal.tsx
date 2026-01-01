import { useState, useEffect } from 'react';

interface EditHoldingModalProps {
    show: boolean;
    holding: {
        id: string;
        nombre: string;
        plan: 'bot_only' | 'rq_only' | 'full_stack';
        marcas: number;
        usuarios: number;
        activo: boolean;
    } | null;
    onCancel: () => void;
    onSave: (holding: any) => void;
}

export default function EditHoldingModal({ show, holding, onCancel, onSave }: EditHoldingModalProps) {
    // IMPORTANTE: Los hooks deben ejecutarse SIEMPRE, antes del early return
    const [plan, setPlan] = useState<'bot_only' | 'rq_only' | 'full_stack'>('bot_only');
    const [limiteWhatsApp, setLimiteWhatsApp] = useState(1000);
    const [limiteGemini, setLimiteGemini] = useState(500);
    const [maxUsuarios, setMaxUsuarios] = useState(2);
    const [activo, setActivo] = useState(true);
    const [precioMensual, setPrecioMensual] = useState(99);
    const [tempPassword, setTempPassword] = useState('NGR2024!Cambiar');

    // Dynamic Documents
    const [requiredDocuments, setRequiredDocuments] = useState<any[]>([]);

    // Approval Matrix
    const [approvalLevels, setApprovalLevels] = useState<any[]>([]);

    // Actualizar valores cuando cambia el holding
    useEffect(() => {
        if (holding) {
            // Cargar config personalizada primero
            const config = (holding as any).config;

            setPlan(holding.plan);
            setActivo(holding.activo);
            setMaxUsuarios(config?.maxUsuarios || holding.usuarios);
            setLimiteWhatsApp(config?.limiteWhatsApp || (holding.plan === 'bot_only' ? 1000 : holding.plan === 'full_stack' ? 10000 : 0));
            setLimiteGemini(config?.limiteGemini || (holding.plan === 'bot_only' ? 500 : holding.plan === 'full_stack' ? 5000 : 0));
            setPrecioMensual(config?.precioMensual || (holding.plan === 'bot_only' ? 99 : holding.plan === 'rq_only' ? 199 : 499));
            setTempPassword(config?.tempPassword || 'NGR2024!Cambiar');
            setRequiredDocuments(config?.requiredDocuments || [
                { id: 'cul', name: 'Certificado Único Laboral (CUL)', active: true }
            ]);
            setApprovalLevels(config?.approvalLevels || [
                { level: 1, name: 'Store Manager', role: 'store_manager' },
                { level: 2, name: 'Jefe de Marca', role: 'jefe_marca' }
            ]);
        }
    }, [holding]);

    // Early return DESPUÉS de los hooks
    if (!show || !holding) return null;

    const handleSave = () => {
        onSave({
            ...holding,
            plan,
            activo,
            config: {
                limiteWhatsApp,
                limiteGemini,
                maxUsuarios,
                precioMensual,
                tempPassword,
                requiredDocuments,
                approvalLevels
            }
        });
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slide-up">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">Editar Holding</h3>
                        <p className="text-sm text-gray-600 mt-1">{holding.nombre}</p>
                    </div>
                    <button
                        onClick={onCancel}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Plan Selection */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">Plan Activo</label>
                    <div className="grid grid-cols-3 gap-3">
                        <button
                            onClick={() => setPlan('bot_only')}
                            className={`p-4 rounded-lg border-2 transition-all ${plan === 'bot_only'
                                ? 'border-violet-500 bg-violet-50'
                                : 'border-gray-200 hover:border-gray-300'
                                }`}
                        >
                            <p className="font-semibold text-gray-900">Bot Only</p>
                            <p className="text-xs text-gray-500 mt-1">$99/mes</p>
                        </button>
                        <button
                            onClick={() => setPlan('rq_only')}
                            className={`p-4 rounded-lg border-2 transition-all ${plan === 'rq_only'
                                ? 'border-violet-500 bg-violet-50'
                                : 'border-gray-200 hover:border-gray-300'
                                }`}
                        >
                            <p className="font-semibold text-gray-900">RQ Only</p>
                            <p className="text-xs text-gray-500 mt-1">$199/mes</p>
                        </button>
                        <button
                            onClick={() => setPlan('full_stack')}
                            className={`p-4 rounded-lg border-2 transition-all ${plan === 'full_stack'
                                ? 'border-violet-500 bg-violet-50'
                                : 'border-gray-200 hover:border-gray-300'
                                }`}
                        >
                            <p className="font-semibold text-gray-900">Full Stack</p>
                            <p className="text-xs text-gray-500 mt-1">$499/mes</p>
                        </button>
                    </div>
                </div>

                {/* Límites Personalizados */}
                <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-4">Límites Personalizados</h4>
                    <div className="grid grid-cols-2 gap-4">
                        {(plan === 'bot_only' || plan === 'full_stack') && (
                            <>
                                <div>
                                    <label className="block text-sm text-gray-600 mb-2">WhatsApp (msg/mes)</label>
                                    <input
                                        type="number"
                                        value={limiteWhatsApp}
                                        onChange={(e) => setLimiteWhatsApp(parseInt(e.target.value))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-600 mb-2">Gemini API (calls/mes)</label>
                                    <input
                                        type="number"
                                        value={limiteGemini}
                                        onChange={(e) => setLimiteGemini(parseInt(e.target.value))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                                    />
                                </div>
                            </>
                        )}
                        <div>
                            <label className="block text-sm text-gray-600 mb-2">Máximo Usuarios</label>
                            <input
                                type="number"
                                value={maxUsuarios}
                                onChange={(e) => setMaxUsuarios(parseInt(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-600 mb-2">Precio Mensual ($)</label>
                            <input
                                type="number"
                                value={precioMensual}
                                onChange={(e) => setPrecioMensual(parseInt(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Configuración de Documentos */}
                <div className="mb-8 border-t pt-6">
                    <h4 className="text-md font-bold text-gray-900 mb-4">📄 Documentos Requeridos</h4>
                    <div className="space-y-3">
                        {requiredDocuments.map((doc, idx) => (
                            <div key={idx} className="flex items-center gap-4 bg-gray-50 p-3 rounded-lg">
                                <input
                                    type="text"
                                    value={doc.name}
                                    onChange={(e) => {
                                        const newDocs = [...requiredDocuments];
                                        newDocs[idx].name = e.target.value;
                                        setRequiredDocuments(newDocs);
                                    }}
                                    className="flex-1 px-3 py-1 border border-gray-300 rounded-md text-sm"
                                    placeholder="Nombre del documento..."
                                />
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500">{doc.active ? 'Activo' : 'Inactivo'}</span>
                                    <button
                                        onClick={() => {
                                            const newDocs = [...requiredDocuments];
                                            newDocs[idx].active = !newDocs[idx].active;
                                            setRequiredDocuments(newDocs);
                                        }}
                                        className={`w-10 h-5 rounded-full transition-colors relative ${doc.active ? 'bg-violet-600' : 'bg-gray-300'}`}
                                    >
                                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${doc.active ? 'right-1' : 'left-1'}`} />
                                    </button>
                                </div>
                                <button
                                    onClick={() => setRequiredDocuments(requiredDocuments.filter((_, i) => i !== idx))}
                                    className="text-red-500 hover:text-red-700"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                        <button
                            onClick={() => setRequiredDocuments([...requiredDocuments, { id: `doc_${Date.now()}`, name: '', active: true }])}
                            className="text-sm text-violet-600 font-medium hover:text-violet-700 mt-2"
                        >
                            + Agregar Documento
                        </button>
                    </div>
                </div>

                {/* Matriz de Aprobación */}
                <div className="mb-8 border-t pt-6">
                    <h4 className="text-md font-bold text-gray-900 mb-4">⚖️ Matriz de Aprobación</h4>
                    <div className="space-y-3">
                        {approvalLevels.map((lvl, idx) => (
                            <div key={idx} className="flex items-center gap-4 bg-violet-50 p-3 rounded-lg border border-violet-100">
                                <div className="w-8 h-8 rounded-full bg-violet-600 text-white flex items-center justify-center font-bold text-sm">
                                    {lvl.level}
                                </div>
                                <input
                                    type="text"
                                    value={lvl.name}
                                    onChange={(e) => {
                                        const newLvls = [...approvalLevels];
                                        newLvls[idx].name = e.target.value;
                                        setApprovalLevels(newLvls);
                                    }}
                                    className="flex-1 px-3 py-1 border border-violet-200 rounded-md text-sm"
                                    placeholder="Nombre del cargo (ej. Supervisor)"
                                />
                                <select
                                    value={lvl.role}
                                    onChange={(e) => {
                                        const newLvls = [...approvalLevels];
                                        newLvls[idx].role = e.target.value;
                                        setApprovalLevels(newLvls);
                                    }}
                                    className="px-3 py-1 border border-violet-200 rounded-md text-sm bg-white"
                                >
                                    <option value="store_manager">Store Manager</option>
                                    <option value="supervisor">Supervisor</option>
                                    <option value="jefe_marca">Jefe de Marca</option>
                                    <option value="recruiter">Recruiter</option>
                                    <option value="holding_admin">Holding Admin</option>
                                </select>
                                <button
                                    onClick={() => {
                                        const filtered = approvalLevels.filter((_, i) => i !== idx);
                                        // Re-leveling
                                        setApprovalLevels(filtered.map((l, i) => ({ ...l, level: i + 1 })));
                                    }}
                                    className="text-red-500 hover:text-red-700"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                        <button
                            onClick={() => setApprovalLevels([...approvalLevels, { level: approvalLevels.length + 1, name: '', role: 'supervisor' }])}
                            className="text-sm text-violet-600 font-medium hover:text-violet-700 mt-2"
                        >
                            + Agregar Nivel de Aprobación
                        </button>
                    </div>
                </div>

                {/* Password Temporal y Estado */}
                <div className="mb-8 border-t pt-6 grid grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">🔑 Password Temporal para Activación</label>
                        <input
                            type="text"
                            value={tempPassword}
                            onChange={(e) => setTempPassword(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 font-mono"
                        />
                    </div>
                    <div className="flex items-center">
                        <label className="flex items-center gap-3 cursor-pointer mt-6">
                            <input
                                type="checkbox"
                                checked={activo}
                                onChange={(e) => setActivo(e.target.checked)}
                                className="w-5 h-5 text-violet-600 rounded border-gray-300 focus:ring-violet-500"
                            />
                            <div>
                                <p className="font-medium text-gray-900">Holding Activo</p>
                                <p className="text-sm text-gray-500">Permite acceso al sistema</p>
                            </div>
                        </label>
                    </div>
                </div>

                {/* Resumen */}
                <div className="bg-violet-50 rounded-lg p-4 mb-6">
                    <h4 className="font-medium text-violet-900 mb-2">Resumen de Cambios</h4>
                    <div className="space-y-1 text-sm text-violet-700">
                        <p>• Plan: <span className="font-semibold">{
                            plan === 'bot_only' ? 'Bot Only' :
                                plan === 'rq_only' ? 'RQ Only' : 'Full Stack'
                        }</span></p>
                        {(plan === 'bot_only' || plan === 'full_stack') && (
                            <>
                                <p>• WhatsApp: <span className="font-semibold">{limiteWhatsApp.toLocaleString()} msg/mes</span></p>
                                <p>• Gemini: <span className="font-semibold">{limiteGemini.toLocaleString()} calls/mes</span></p>
                            </>
                        )}
                        <p>• Usuarios: <span className="font-semibold">{maxUsuarios}</span></p>
                        <p>• Precio: <span className="font-semibold">${precioMensual}/mes</span></p>
                        <p>• Estado: <span className={`font-semibold ${activo ? 'text-green-600' : 'text-red-600'}`}>
                            {activo ? 'Activo' : 'Inactivo'}
                        </span></p>
                    </div>
                </div>

                {/* Botones */}
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex-1 px-4 py-2.5 gradient-bg text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
                    >
                        Guardar Cambios
                    </button>
                </div>
            </div>
        </div>
    );
}
