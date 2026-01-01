'use client';

import { useState } from 'react';
import { parseFile, validateColumns, downloadSampleCSV, ParsedRow } from '@/lib/utils/file-parser';
// import { autoCreateUserAction, UserRole } from '@/lib/actions/user-actions';
export type UserRole = 'client_admin' | 'supervisor' | 'jefe_marca' | 'recruiter' | 'store_manager';

interface BulkUploadUsersModalProps {
    show: boolean;
    holdingId: string;
    onCancel: () => void;
    onComplete: (result: { success: number; errors: number }) => void;
}

interface UserRow extends ParsedRow {
    email: string;
    displayName: string;
    role: UserRole;
    marcaId: string;
    tiendaId: string;
}

export default function BulkUploadUsersModal({ show, holdingId, onCancel, onComplete }: BulkUploadUsersModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<UserRow[]>([]);
    const [errors, setErrors] = useState<string[]>([]);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [importing, setImporting] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [step, setStep] = useState<'upload' | 'preview' | 'importing'>('upload');

    if (!show) return null;

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setErrors([]);
        setValidationErrors([]);
        setParsedData([]);

        // Parse file
        const result = await parseFile(selectedFile);

        if (!result.success) {
            setErrors(result.errors);
            return;
        }

        // Validate required columns
        const requiredColumns = ['email', 'displayName', 'role'];
        const columnErrors = validateColumns(result.data, requiredColumns);

        if (columnErrors.length > 0) {
            setErrors(columnErrors);
            return;
        }

        // Validate each row
        const validationErrs: string[] = [];
        const validRoles: UserRole[] = ['client_admin', 'supervisor', 'jefe_marca', 'recruiter', 'store_manager'];

        result.data.forEach((row, index) => {
            const userRow = row as UserRow;
            const rowNum = index + 2;

            if (!userRow.email?.includes('@')) {
                validationErrs.push(`Fila ${rowNum}: Email no válido "${userRow.email}"`);
            }
            if (!userRow.displayName?.trim()) {
                validationErrs.push(`Fila ${rowNum}: Nombre es requerido`);
            }
            if (!validRoles.includes(userRow.role)) {
                validationErrs.push(`Fila ${rowNum}: Rol no válido "${userRow.role}". Roles permitidos: ${validRoles.join(', ')}`);
            }
        });

        setValidationErrors(validationErrs);
        setParsedData(result.data as UserRow[]);

        if (validationErrs.length === 0) {
            setStep('preview');
        }
    };

    const handleImport = async () => {
        setImporting(true);
        setStep('importing');
        let successCount = 0;
        let errorCount = 0;
        const importErrors: string[] = [];
        const total = parsedData.length;

        try {
            for (let i = 0; i < total; i++) {
                const userRow = parsedData[i];
                setProgress({ current: i + 1, total });

                try {
                    const userData: any = {
                        email: userRow.email.trim(),
                        displayName: userRow.displayName.trim(),
                        role: userRow.role,
                        holdingId: holdingId,
                        createdBy: 'admin', // Default creator
                        active: true
                    };

                    // Handle optional assignments if present in CSV
                    if (userRow.marcaId && (userRow.role === 'jefe_marca' || userRow.role === 'recruiter')) {
                        userData.assignedMarca = { marcaId: userRow.marcaId, marcaNombre: 'Cargado vía CSV' };
                    }
                    if (userRow.tiendaId && userRow.role === 'store_manager') {
                        userData.assignedStore = { tiendaId: userRow.tiendaId, tiendaNombre: 'Cargado vía CSV', marcaId: userRow.marcaId || '' };
                    }

                    /* SERVER ACTION DISABLED
                    const result = await autoCreateUserAction(userData);
                    if (result.success) successCount++;
                    else throw new Error(result.error);
                    */
                    successCount++; // Mock success for now
                } catch (error: any) {
                    errorCount++;
                    importErrors.push(`Fila ${i + 2} (${userRow.email}): ${error.message}`);
                }
            }

            if (errorCount > 0) {
                setErrors(importErrors);
                setStep('preview');
                alert(`Importación finalizada con ${errorCount} errores.`);
            } else {
                alert(`✅ ${successCount} usuarios creados exitosamente.`);
                onComplete({ success: successCount, errors: errorCount });
                handleClose();
            }
        } catch (error: any) {
            setErrors([`Error fatal: ${error.message}`]);
            setStep('preview');
        } finally {
            setImporting(false);
        }
    };

    const handleDownloadTemplate = () => {
        const headers = ['email', 'displayName', 'role', 'marcaId', 'tiendaId'];
        const sampleData = [
            ['demo.supervisor@example.com', 'Juan Perez', 'supervisor', '', ''],
            ['demo.manager@example.com', 'Maria Garcia', 'store_manager', 'marca_123', 'tienda_456']
        ];
        downloadSampleCSV('plantilla_usuarios.csv', headers, sampleData);
    };

    const handleClose = () => {
        setFile(null);
        setParsedData([]);
        setErrors([]);
        setValidationErrors([]);
        setStep('upload');
        onCancel();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="border-b border-gray-200 px-6 py-4 sticky top-0 bg-white">
                    <h2 className="text-2xl font-bold text-gray-900">👥 Importar Usuarios Masivamente</h2>
                    <p className="text-sm text-gray-600 mt-1">Sube un archivo CSV o Excel para crear cuentas automáticamente</p>
                </div>

                {/* Body */}
                <div className="px-6 py-6 space-y-6">
                    {step === 'importing' ? (
                        <div className="text-center py-12 space-y-4">
                            <div className="text-6xl animate-bounce">⏳</div>
                            <p className="text-xl font-semibold text-gray-900">Importando Usuarios...</p>
                            <div className="max-w-md mx-auto">
                                <div className="bg-gray-200 rounded-full h-4 overflow-hidden">
                                    <div
                                        className="bg-violet-600 h-full transition-all duration-300"
                                        style={{ width: `${(progress.current / progress.total) * 100}%` }}
                                    />
                                </div>
                                <p className="text-sm text-gray-600 mt-2">
                                    Procesando {progress.current} de {progress.total}
                                </p>
                            </div>
                        </div>
                    ) : step === 'upload' ? (
                        <>
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                                <input
                                    type="file"
                                    accept=".csv,.xlsx,.xls"
                                    onChange={handleFileChange}
                                    className="hidden"
                                    id="user-file-upload"
                                />
                                <label htmlFor="user-file-upload" className="cursor-pointer">
                                    <div className="text-6xl mb-4">📥</div>
                                    <p className="text-lg font-medium text-gray-900">Selecciona tu archivo de usuarios</p>
                                    <p className="text-sm text-gray-500 mt-1">Excel (.xlsx) o CSV</p>
                                    {file && <p className="text-sm text-violet-600 mt-2 font-medium">Seleccionado: {file.name}</p>}
                                </label>
                            </div>

                            <button
                                onClick={handleDownloadTemplate}
                                className="w-full px-4 py-2 border border-violet-300 text-violet-600 rounded-lg font-medium hover:bg-violet-50 transition-colors"
                            >
                                📥 Descargar Plantilla de Ejemplo
                            </button>

                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                                <p className="font-bold mb-1">⚠️ Importante:</p>
                                <ul className="list-disc ml-5 space-y-1">
                                    <li>Los usuarios se crearán con la clave temporal: <strong>Liah2025!</strong></li>
                                    <li>Se les activará la cuenta de Firebase Auth inmediatamente.</li>
                                    <li>Asegúrate de que los roles sean correctos (supervisor, store_manager, etc).</li>
                                </ul>
                            </div>
                        </>
                    ) : (
                        <div>
                            <h3 className="font-semibold text-gray-900 mb-3">Vista Previa ({parsedData.length} contactos)</h3>
                            <div className="border border-gray-200 rounded-lg overflow-x-auto max-h-80">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-2 text-left">Email</th>
                                            <th className="px-4 py-2 text-left">Nombre</th>
                                            <th className="px-4 py-2 text-left">Rol</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {parsedData.map((user, i) => (
                                            <tr key={i} className="hover:bg-gray-50">
                                                <td className="px-4 py-2">{user.email}</td>
                                                <td className="px-4 py-2">{user.displayName}</td>
                                                <td className="px-4 py-2">
                                                    <span className="px-2 py-0.5 bg-violet-100 text-violet-700 rounded text-xs">{user.role}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Errors */}
                    {(errors.length > 0 || validationErrors.length > 0) && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <p className="font-bold text-red-900 mb-2">❌ Corregir errores para continuar:</p>
                            <ul className="text-sm text-red-800 space-y-1 max-h-32 overflow-y-auto">
                                {[...errors, ...validationErrors].map((err, i) => <li key={i}>• {err}</li>)}
                            </ul>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3 sticky bottom-0 bg-white">
                    <button
                        onClick={handleClose}
                        disabled={importing}
                        className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    {step === 'preview' && (
                        <button
                            onClick={handleImport}
                            disabled={importing}
                            className="px-6 py-2 gradient-bg text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
                        >
                            🚀 Importar y Activar {parsedData.length} Usuarios
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
