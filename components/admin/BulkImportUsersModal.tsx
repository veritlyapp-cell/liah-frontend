'use client';

import { useState } from 'react';
import { parseCSV, downloadTemplate, type UserImportRow, type ParseResult } from '@/lib/utils/csv-parser';
import { parseFile as parseExcelFile } from '@/lib/utils/file-parser';
import { bulkCreateUsers, type BulkCreationResult } from '@/lib/firebase/bulk-user-creation';

interface BulkImportUsersModalProps {
    show: boolean;
    holdingId: string;
    createdBy: string;
    onCancel: () => void;
    onComplete: (result: BulkCreationResult) => void;
}

type Step = 'upload' | 'preview' | 'importing' | 'complete';

export default function BulkImportUsersModal({ show, holdingId, createdBy, onCancel, onComplete }: BulkImportUsersModalProps) {
    const [step, setStep] = useState<Step>('upload');
    const [file, setFile] = useState<File | null>(null);
    const [parseResult, setParseResult] = useState<ParseResult | null>(null);
    const [importing, setImporting] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [result, setResult] = useState<BulkCreationResult | null>(null);
    const [dragActive, setDragActive] = useState(false);

    if (!show) return null;

    const handleFileSelect = async (selectedFile: File) => {
        setFile(selectedFile);

        try {
            const isExcel = selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls');

            if (isExcel) {
                // Parse Excel file
                const excelResult = await parseExcelFile(selectedFile);
                if (excelResult.success && excelResult.data.length > 0) {
                    // Convert to UserImportRow format
                    const users: UserImportRow[] = excelResult.data.map((row: any) => ({
                        email: String(row.email || ''),
                        displayName: String(row.displayName || row.nombre || ''),
                        marca: String(row.marca || ''),
                        tienda: row.tienda ? String(row.tienda) : undefined,
                        role: String(row.role || row.rol || 'store_manager') as any
                    }));

                    setParseResult({
                        success: true,
                        data: users,
                        errors: [],
                        warnings: []
                    });
                    setStep('preview');
                } else {
                    setParseResult({
                        success: false,
                        data: [],
                        errors: [{ row: 0, field: 'file', message: excelResult.errors.join(', ') }],
                        warnings: []
                    });
                }
            } else {
                // Parse CSV file
                const reader = new FileReader();
                reader.onload = (e) => {
                    const content = e.target?.result as string;
                    const parsed = parseCSV(content);
                    setParseResult(parsed);
                    if (parsed.success || parsed.data.length > 0) {
                        setStep('preview');
                    }
                };
                reader.readAsText(selectedFile);
            }
        } catch (error) {
            console.error('Error parsing file:', error);
            alert('Error al leer el archivo');
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(false);

        const droppedFile = e.dataTransfer.files[0];
        const validExtensions = ['.csv', '.txt', '.xlsx', '.xls'];
        const isValid = validExtensions.some(ext => droppedFile.name.toLowerCase().endsWith(ext));

        if (droppedFile && isValid) {
            handleFileSelect(droppedFile);
        } else {
            alert('Por favor sube un archivo CSV o Excel (.xlsx, .xls)');
        }
    };

    const handleImport = async () => {
        if (!parseResult || parseResult.data.length === 0) return;

        setImporting(true);
        setStep('importing');

        try {
            const importResult = await bulkCreateUsers(
                parseResult.data,
                holdingId,
                createdBy,
                (current, total) => setProgress({ current, total })
            );

            setResult(importResult);
            setStep('complete');
        } catch (error) {
            console.error('Error importing users:', error);
            alert('Error durante la importación');
        } finally {
            setImporting(false);
        }
    };

    const handleClose = () => {
        if (result) {
            onComplete(result);
        }

        // Reset state
        setStep('upload');
        setFile(null);
        setParseResult(null);
        setResult(null);
        setProgress({ current: 0, total: 0 });
        onCancel();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="border-b border-gray-200 px-6 py-4">
                    <h2 className="text-2xl font-bold text-gray-900">📁 Importar Usuarios Masivamente</h2>
                    <p className="text-sm text-gray-600 mt-1">
                        {step === 'upload' && 'Sube un archivo CSV con los usuarios a crear'}
                        {step === 'preview' && `${parseResult?.data.length || 0} usuarios listos para importar`}
                        {step === 'importing' && 'Creando usuarios...'}
                        {step === 'complete' && 'Importación completada'}
                    </p>
                </div>

                {/* Body */}
                <div className="px-6 py-6">
                    {/* Step 1: Upload */}
                    {step === 'upload' && (
                        <div className="space-y-6">
                            <div
                                className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${dragActive ? 'border-violet-600 bg-violet-50' : 'border-gray-300 hover:border-gray-400'
                                    }`}
                                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                                onDragLeave={() => setDragActive(false)}
                                onDrop={handleDrop}
                            >
                                <div className="text-6xl mb-4">📁</div>
                                <p className="text-lg font-medium text-gray-900 mb-2">
                                    Arrastra tu archivo CSV aquí
                                </p>
                                <p className="text-sm text-gray-600 mb-4">
                                    CSV o Excel (.xlsx, .xls)
                                </p>
                                <input
                                    type="file"
                                    accept=".csv,.txt,.xlsx,.xls"
                                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                                    className="hidden"
                                    id="file-upload"
                                />
                                <label
                                    htmlFor="file-upload"
                                    className="inline-block px-6 py-3 bg-violet-600 text-white rounded-lg font-medium cursor-pointer hover:bg-violet-700 transition-colors"
                                >
                                    Seleccionar Archivo
                                </label>
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="text-sm text-blue-900 font-medium mb-2">
                                    📥 ¿No tienes un archivo CSV?
                                </p>
                                <button
                                    onClick={downloadTemplate}
                                    className="text-sm text-blue-700 hover:text-blue-800 font-medium underline"
                                >
                                    Descargar Template CSV
                                </button>
                            </div>

                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <p className="text-sm font-medium text-gray-900 mb-2">📋 Formato del CSV:</p>
                                <code className="text-xs text-gray-700 block">
                                    email,displayName,marca,tienda,role
                                </code>
                                <ul className="text-xs text-gray-600 mt-2 space-y-1">
                                    <li>• <strong>email:</strong> Email del usuario (requerido)</li>
                                    <li>• <strong>displayName:</strong> Nombre completo (requerido)</li>
                                    <li>• <strong>marca:</strong> Marca asignada (requerido)</li>
                                    <li>• <strong>tienda:</strong> Tienda asignada (opcional)</li>
                                    <li>• <strong>role:</strong> store_manager, recruiter, supervisor, jefe_marca</li>
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Preview */}
                    {step === 'preview' && parseResult && (
                        <div className="space-y-6">
                            {/* Errors */}
                            {parseResult.errors.length > 0 && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                    <p className="text-sm font-medium text-red-900 mb-2">
                                        ❌ {parseResult.errors.length} errores encontrados
                                    </p>
                                    <div className="max-h-40 overflow-y-auto space-y-1">
                                        {parseResult.errors.map((error, i) => (
                                            <p key={i} className="text-xs text-red-700">
                                                Línea {error.row}: {error.message} {error.value && `(${error.value})`}
                                            </p>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Warnings */}
                            {parseResult.warnings.length > 0 && (
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                    <p className="text-sm font-medium text-amber-900 mb-2">
                                        ⚠️ {parseResult.warnings.length} advertencias
                                    </p>
                                    <div className="max-h-32 overflow-y-auto space-y-1">
                                        {parseResult.warnings.map((warning, i) => (
                                            <p key={i} className="text-xs text-amber-700">
                                                Línea {warning.row}: {warning.message}
                                            </p>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Preview Table */}
                            {parseResult.data.length > 0 && (
                                <div>
                                    <p className="text-sm font-medium text-gray-900 mb-3">
                                        ✅ {parseResult.data.length} usuarios listos para crear
                                    </p>
                                    <div className="border border-gray-200 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                                        <table className="w-full">
                                            <thead className="bg-gray-50 sticky top-0">
                                                <tr>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Email</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Nombre</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Marca</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Tienda</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Role</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {parseResult.data.map((user, i) => (
                                                    <tr key={i} className="hover:bg-gray-50">
                                                        <td className="px-4 py-2 text-sm text-gray-900">{user.email}</td>
                                                        <td className="px-4 py-2 text-sm text-gray-900">{user.displayName}</td>
                                                        <td className="px-4 py-2 text-sm text-gray-600">{user.marca}</td>
                                                        <td className="px-4 py-2 text-sm text-gray-600">{user.tienda || '-'}</td>
                                                        <td className="px-4 py-2 text-sm">
                                                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                                                                {user.role}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Password Info */}
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <p className="text-sm font-medium text-green-900 mb-1">
                                    🔒 Password Temporal
                                </p>
                                <p className="text-sm text-green-800">
                                    Todos los usuarios se crearán con password: <code className="bg-green-100 px-2 py-0.5 rounded">NGR2024!Cambiar</code>
                                </p>
                                <p className="text-xs text-green-700 mt-1">
                                    Deberán cambiarla en el primer login
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Importing */}
                    {step === 'importing' && (
                        <div className="space-y-6 text-center py-8">
                            <div className="text-6xl mb-4 animate-pulse">⏳</div>
                            <p className="text-lg font-medium text-gray-900">
                                Creando usuarios...
                            </p>
                            <div className="max-w-md mx-auto">
                                <div className="bg-gray-200 rounded-full h-4 overflow-hidden">
                                    <div
                                        className="bg-violet-600 h-full transition-all duration-300"
                                        style={{ width: `${(progress.current / progress.total) * 100}%` }}
                                    />
                                </div>
                                <p className="text-sm text-gray-600 mt-2">
                                    {progress.current} de {progress.total} usuarios creados
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Complete */}
                    {step === 'complete' && result && (
                        <div className="space-y-6">
                            <div className="text-center py-6">
                                <div className="text-6xl mb-4">✅</div>
                                <p className="text-2xl font-bold text-gray-900 mb-2">
                                    Importación Completada
                                </p>
                                <div className="flex justify-center gap-8 mt-6">
                                    <div className="text-center">
                                        <p className="text-3xl font-bold text-green-600">{result.successCount}</p>
                                        <p className="text-sm text-gray-600">Exitosos</p>
                                    </div>
                                    {result.failCount > 0 && (
                                        <div className="text-center">
                                            <p className="text-3xl font-bold text-red-600">{result.failCount}</p>
                                            <p className="text-sm text-gray-600">Fallidos</p>
                                        </div>
                                    )}
                                    <div className="text-center">
                                        <p className="text-3xl font-bold text-gray-600">{result.totalUsers}</p>
                                        <p className="text-sm text-gray-600">Total</p>
                                    </div>
                                </div>
                            </div>

                            {/* Failed users */}
                            {result.failedUsers.length > 0 && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                    <p className="text-sm font-medium text-red-900 mb-3">
                                        Usuarios que fallaron:
                                    </p>
                                    <div className="max-h-40 overflow-y-auto space-y-2">
                                        {result.failedUsers.map((user, i) => (
                                            <div key={i} className="text-xs text-red-700">
                                                <strong>{user.email}</strong>: {user.error}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Next steps */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="text-sm font-medium text-blue-900 mb-2">
                                    📧 Siguientes pasos:
                                </p>
                                <ol className="text-sm text-blue-800 space-y-1 ml-4">
                                    <li>1. Comunica las credenciales a los usuarios creados</li>
                                    <li>2. Password temporal: <code className="bg-blue-100 px-1 rounded">NGR2024!Cambiar</code></li>
                                    <li>3. Deberán cambiarla en el primer login</li>
                                </ol>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
                    {step === 'upload' && (
                        <button
                            onClick={onCancel}
                            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
                        >
                            Cancelar
                        </button>
                    )}

                    {step === 'preview' && (
                        <>
                            <button
                                onClick={() => setStep('upload')}
                                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
                            >
                                ← Volver
                            </button>
                            <button
                                onClick={handleImport}
                                disabled={!parseResult?.success || parseResult.data.length === 0}
                                className="px-6 py-2 gradient-bg text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Importar {parseResult?.data.length || 0} Usuarios
                            </button>
                        </>
                    )}

                    {step === 'complete' && (
                        <button
                            onClick={handleClose}
                            className="px-6 py-2 gradient-bg text-white rounded-lg font-medium hover:opacity-90"
                        >
                            Cerrar
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
