'use client';

import { X, Building2, Store } from 'lucide-react';
import BulkCreateRQTable from './BulkCreateRQTable';

interface BulkCreateRQModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    storeId: string;
    storeName: string;
    marcaId: string;
    marcaNombre: string;
    creatorRole: 'store_manager' | 'supervisor';
}

export default function BulkCreateRQModal({
    isOpen,
    onClose,
    onSuccess,
    storeId,
    storeName,
    marcaId,
    marcaNombre,
    creatorRole
}: BulkCreateRQModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex gap-4 items-center">
                        <div className="w-12 h-12 bg-violet-50 rounded-2xl flex items-center justify-center text-violet-600">
                            <Building2 size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black italic uppercase text-slate-900 tracking-tighter">
                                Carga Masiva de Requerimientos
                            </h2>
                            <div className="flex items-center gap-2 mt-0.5">
                                <Store size={14} className="text-slate-400" />
                                <span className="text-xs font-bold text-slate-500">{marcaNombre} / {storeName}</span>
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 text-slate-300 hover:text-slate-900 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden px-10 py-8">
                    <BulkCreateRQTable 
                        storeId={storeId}
                        storeName={storeName}
                        marcaId={marcaId}
                        marcaNombre={marcaNombre}
                        onSuccess={onSuccess}
                        onClose={onClose}
                        creatorRole={creatorRole}
                    />
                </div>
            </div>
        </div>
    );
}
