'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

interface CostItem {
    id: string;
    label: string;
    amount: number;
}

interface FinancialConfigProps {
    holdingId: string;
}

export default function FinancialConfig({ holdingId }: FinancialConfigProps) {
    const [costItems, setCostItems] = useState<CostItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // New item state
    const [newLabel, setNewLabel] = useState('');
    const [newAmount, setNewAmount] = useState<number>(0);

    useEffect(() => {
        const loadConfig = async () => {
            if (!holdingId) return;
            try {
                const docRef = doc(db, 'holdings', holdingId);
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    const data = snap.data();
                    setCostItems(data.settings?.costItems || [
                        { id: 'default_rep', label: 'Costo Reposición Promedio', amount: data.settings?.costoReposicionPromedio || 700 }
                    ]);
                }
            } catch (error) {
                console.error('Error loading financial config:', error);
            } finally {
                setLoading(false);
            }
        };
        loadConfig();
    }, [holdingId]);

    const handleAddCost = () => {
        if (!newLabel || newAmount <= 0) return;
        const newItem: CostItem = {
            id: Date.now().toString(),
            label: newLabel,
            amount: newAmount
        };
        setCostItems([...costItems, newItem]);
        setNewLabel('');
        setNewAmount(0);
    };

    const handleRemoveCost = (id: string) => {
        setCostItems(costItems.filter(item => item.id !== id));
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            const docRef = doc(db, 'holdings', holdingId);
            await updateDoc(docRef, {
                'settings.costItems': costItems,
                // Also update the legacy field for backward compatibility with existing calculations
                'settings.costoReposicionPromedio': costItems.reduce((acc, item) => acc + item.amount, 0)
            });
            setMessage({ type: 'success', text: '✅ Configuración financiera guardada' });
        } catch (error) {
            console.error('Error saving financial config:', error);
            setMessage({ type: 'error', text: 'Error al guardar la configuración' });
        } finally {
            setSaving(false);
        }
    };

    const totalCost = costItems.reduce((acc, item) => acc + item.amount, 0);

    if (loading) return <div className="animate-pulse h-40 bg-gray-100 rounded-xl" />;

    return (
        <div className="space-y-6">
            <div className="bg-violet-50 p-4 rounded-xl border border-violet-100 mb-6">
                <p className="text-sm text-violet-800 font-medium">
                    💡 Estos costos se sumarán para calcular el "Capital Hundido" (Sunk Cost) en la analítica de rotación.
                </p>
            </div>

            <div className="space-y-4">
                {costItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm transition-all hover:border-violet-200">
                        <div className="flex-1">
                            <p className="font-bold text-gray-900">{item.label}</p>
                            <p className="text-xs text-gray-400 font-mono uppercase tracking-tighter">RUBRO OPERATIVO</p>
                        </div>
                        <div className="text-right">
                            <p className="text-lg font-black text-gray-900">S/ {item.amount.toLocaleString()}</p>
                        </div>
                        <button
                            onClick={() => handleRemoveCost(item.id)}
                            className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                        >
                            🗑️
                        </button>
                    </div>
                ))}

                {/* New Item Form */}
                <div className="bg-gray-50 p-4 rounded-xl border border-dashed border-gray-300 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input
                        type="text"
                        placeholder="Ej: Costo de Uniforme"
                        value={newLabel}
                        onChange={(e) => setNewLabel(e.target.value)}
                        className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-violet-500"
                    />
                    <div className="flex items-center gap-2">
                        <span className="text-gray-400 font-bold">S/</span>
                        <input
                            type="number"
                            placeholder="0.00"
                            value={newAmount || ''}
                            onChange={(e) => setNewAmount(parseFloat(e.target.value) || 0)}
                            className="w-full px-4 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-violet-500"
                        />
                    </div>
                    <button
                        onClick={handleAddCost}
                        disabled={!newLabel || newAmount <= 0}
                        className="px-4 py-2 bg-violet-600 text-white rounded-lg font-bold hover:bg-violet-700 disabled:opacity-50 transition-all"
                    >
                        + Agregar Rubro
                    </button>
                </div>
            </div>

            {/* Resume / Total */}
            <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
                <div>
                    <h4 className="text-gray-500 text-xs font-bold uppercase">Impacto Total por Baja</h4>
                    <p className="text-3xl font-black text-violet-700">S/ {totalCost.toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-4">
                    {message && (
                        <p className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                            {message.text}
                        </p>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 disabled:opacity-50 transition-all shadow-lg active:scale-95"
                    >
                        {saving ? 'Guardando...' : 'Guardar Configuración'}
                    </button>
                </div>
            </div>
        </div>
    );
}
