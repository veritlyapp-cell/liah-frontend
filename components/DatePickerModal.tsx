'use client';

import { useState } from 'react';

interface DatePickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (date: Date) => void;
    title: string;
    candidateName: string;
}

export default function DatePickerModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    candidateName
}: DatePickerModalProps) {
    const [selectedDate, setSelectedDate] = useState(() => {
        // Default to today
        const today = new Date();
        return today.toISOString().split('T')[0];
    });

    if (!isOpen) return null;

    const handleConfirm = () => {
        const date = new Date(selectedDate);
        onConfirm(date);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                        Candidato: <span className="font-medium text-gray-900">{candidateName}</span>
                    </p>
                </div>

                {/* Body */}
                <div className="px-6 py-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Fecha de ingreso
                    </label>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg"
                        autoFocus
                    />
                    <p className="text-xs text-gray-500 mt-2">
                        Selecciona la fecha efectiva en la que el candidato comenzará a trabajar
                    </p>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 rounded-b-xl flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Confirmar Ingreso
                    </button>
                </div>
            </div>
        </div>
    );
}
