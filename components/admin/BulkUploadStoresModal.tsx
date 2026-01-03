'use client';

import { useState } from 'react';
import { parseFile, validateColumns, downloadSampleCSV, ParsedRow } from '@/lib/utils/file-parser';
import { db } from '@/lib/firebase';
import { collection, addDoc, Timestamp, query, where, getDocs } from 'firebase/firestore';
import { getDepartmentNames, getProvincesByDepartment, getDistrictsByProvince } from '@/lib/data/peru-locations';

interface BulkUploadStoresModalProps {
    show: boolean;
    holdingId: string;
    onCancel: () => void;
    onComplete: (result: { success: number; errors: number }) => void;
}

interface StoreRow extends ParsedRow {
    nombre: string;
    marca: string; // Nombre de la marca (se buscará el ID)
    departamento: string;
    provincia: string;
    distrito: string;
    direccion: string;
}

export default function BulkUploadStoresModal({ show, holdingId, onCancel, onComplete }: BulkUploadStoresModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<StoreRow[]>([]);
    const [errors, setErrors] = useState<string[]>([]);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [importing, setImporting] = useState(false);
    const [step, setStep] = useState<'upload' | 'preview'>('upload');

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

        // Validate required columns - now uses 'marca' name instead of 'marcaId'
        const requiredColumns = ['nombre', 'marca', 'departamento', 'provincia', 'distrito', 'direccion'];
        const columnErrors = validateColumns(result.data, requiredColumns);

        if (columnErrors.length > 0) {
            setErrors(columnErrors);
            return;
        }

        // Validate each row
        const validationErrs: string[] = [];
        const departments = getDepartmentNames();
        // const departments: string[] = [];

        result.data.forEach((row, index) => {
            const storeRow = row as StoreRow;
            const rowNum = index + 2; // +2 because index starts at 0 and we skip header

            // Validate required fields
            if (!storeRow.nombre?.trim()) {
                validationErrs.push(`Fila ${rowNum}: Nombre es requerido`);
            }
            if (!storeRow.marca?.trim()) {
                validationErrs.push(`Fila ${rowNum}: Marca es requerida`);
            }

            // Validate location
            if (!departments.includes(storeRow.departamento)) {
                validationErrs.push(`Fila ${rowNum}: Departamento "${storeRow.departamento}" no válido`);
            } else {
                const provinces = getProvincesByDepartment(storeRow.departamento);
                const provinceNames = provinces.map(p => p.name);

                if (!provinceNames.includes(storeRow.provincia)) {
                    validationErrs.push(`Fila ${rowNum}: Provincia "${storeRow.provincia}" no válida para ${storeRow.departamento}`);
                } else {
                    const districts = getDistrictsByProvince(storeRow.departamento, storeRow.provincia);
                    const districtNames = districts.map(d => d.name);

                    if (!districtNames.includes(storeRow.distrito)) {
                        validationErrs.push(`Fila ${rowNum}: Distrito "${storeRow.distrito}" no válido para ${storeRow.provincia}`);
                    }
                }
            }
        });

        setValidationErrors(validationErrs);
        setParsedData(result.data as StoreRow[]);

        if (validationErrs.length === 0) {
            setStep('preview');
        }
    };

    const handleImport = async () => {
        setImporting(true);
        let successCount = 0;
        let errorCount = 0;
        const importErrors: string[] = [];

        try {
            // First, load all marcas for this holding to create a name -> id map
            const marcasRef = collection(db, 'marcas');
            const marcasQuery = query(marcasRef, where('holdingId', '==', holdingId));
            const marcasSnapshot = await getDocs(marcasQuery);

            const marcaMap: Record<string, string> = {};
            marcasSnapshot.docs.forEach(doc => {
                const data = doc.data();
                const nombreLower = (data.nombre || '').toLowerCase().trim();
                marcaMap[nombreLower] = doc.id;
            });

            console.log('Marcas disponibles:', Object.keys(marcaMap));

            for (let i = 0; i < parsedData.length; i++) {
                const store = parsedData[i];
                const marcaNombre = (store.marca || '').toLowerCase().trim();
                const marcaId = marcaMap[marcaNombre];

                if (!marcaId) {
                    errorCount++;
                    importErrors.push(`Fila ${i + 2}: Marca "${store.marca}" no encontrada`);
                    continue;
                }

                try {
                    // Generate store code
                    const marcaPrefix = store.nombre.substring(0, 3).toUpperCase();
                    const tiendasRef = collection(db, 'tiendas');
                    const q = query(tiendasRef, where('marcaId', '==', marcaId));
                    const existingStores = await getDocs(q);
                    const storeNumber = existingStores.size + 1;
                    const codigo = `TDA-${marcaPrefix}-${String(storeNumber).padStart(3, '0')}`;

                    await addDoc(tiendasRef, {
                        codigo,
                        nombre: store.nombre,
                        marcaId: marcaId,
                        holdingId: holdingId,
                        departamento: store.departamento,
                        provincia: store.provincia,
                        distrito: store.distrito,
                        direccion: store.direccion,
                        activa: true,
                        createdAt: Timestamp.now(),
                        updatedAt: Timestamp.now()
                    });

                    successCount++;
                } catch (error) {
                    errorCount++;
                    importErrors.push(`Fila ${i + 2}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
                }
            }

            onComplete({ success: successCount, errors: errorCount });

            if (errorCount > 0) {
                setErrors(importErrors);
            } else {
                handleClose();
            }
        } catch (error) {
            setErrors([`Error general: ${error instanceof Error ? error.message : 'Error desconocido'}`]);
        } finally {
            setImporting(false);
        }
    };

    const handleDownloadTemplate = () => {
        const headers = ['nombre', 'marca', 'departamento', 'provincia', 'distrito', 'direccion'];
        const sampleData = [
            ['Papa Johns San Isidro', 'Papa Johns', 'Lima', 'Lima', 'San Isidro', 'Av. Camino Real 1050'],
            ['Bembos Miraflores', 'Bembos', 'Lima', 'Lima', 'Miraflores', 'Av. Larco 1234']
        ];
        downloadSampleCSV('plantilla_tiendas.csv', headers, sampleData);
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
                    <h2 className="text-2xl font-bold text-gray-900">Importar Tiendas Masivamente</h2>
                    <p className="text-sm text-gray-600 mt-1">Sube un archivo CSV o Excel con las tiendas</p>
                </div>

                {/* Body */}
                <div className="px-6 py-6 space-y-6">
                    {step === 'upload' && (
                        <>
                            {/* File Upload */}
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                                <input
                                    type="file"
                                    accept=".csv,.xlsx,.xls"
                                    onChange={handleFileChange}
                                    className="hidden"
                                    id="file-upload"
                                />
                                <label htmlFor="file-upload" className="cursor-pointer">
                                    <div className="text-6xl mb-4">📤</div>
                                    <p className="text-lg font-medium text-gray-900">Selecciona un archivo</p>
                                    <p className="text-sm text-gray-500 mt-1">CSV o Excel (.xlsx, .xls)</p>
                                    {file && (
                                        <p className="text-sm text-violet-600 mt-2 font-medium">
                                            Archivo: {file.name}
                                        </p>
                                    )}
                                </label>
                            </div>

                            {/* Download Template */}
                            <button
                                onClick={handleDownloadTemplate}
                                className="w-full px-4 py-2 border border-violet-300 text-violet-600 rounded-lg font-medium hover:bg-violet-50 transition-colors"
                            >
                                📥 Descargar Plantilla CSV
                            </button>

                            {/* Required Format */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="font-medium text-blue-900 mb-2">Formato Requerido:</p>
                                <code className="text-xs text-blue-800 block">
                                    nombre, marcaId, departamento, provincia, distrito, direccion
                                </code>
                            </div>

                            {/* Errors */}
                            {(errors.length > 0 || validationErrors.length > 0) && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                    <p className="font-medium text-red-900 mb-2">❌ Errores encontrados:</p>
                                    <ul className="text-sm text-red-800 space-y-1 max-h-40 overflow-y-auto">
                                        {[...errors, ...validationErrors].map((error, i) => (
                                            <li key={i}>• {error}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </>
                    )}

                    {step === 'preview' && (
                        <>
                            {/* Preview Table */}
                            <div>
                                <h3 className="font-semibold text-gray-900 mb-3">
                                    Preview - {parsedData.length} tiendas a importar
                                </h3>
                                <div className="border border-gray-200 rounded-lg overflow-x-auto max-h-96">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-2 text-left">#</th>
                                                <th className="px-4 py-2 text-left">Nombre</th>
                                                <th className="px-4 py-2 text-left">Marca ID</th>
                                                <th className="px-4 py-2 text-left">Ubicación</th>
                                                <th className="px-4 py-2 text-left">Dirección</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {parsedData.map((store, i) => (
                                                <tr key={i} className="hover:bg-gray-50">
                                                    <td className="px-4 py-2">{i + 1}</td>
                                                    <td className="px-4 py-2">{store.nombre}</td>
                                                    <td className="px-4 py-2 text-violet-600">{store.marcaId}</td>
                                                    <td className="px-4 py-2 text-xs">
                                                        {store.distrito}, {store.provincia}, {store.departamento}
                                                    </td>
                                                    <td className="px-4 py-2 text-xs truncate max-w-xs">{store.direccion}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <p className="text-green-900">
                                    ✅ Todas las validaciones pasaron. Listo para importar {parsedData.length} tiendas.
                                </p>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3 sticky bottom-0 bg-white">
                    <button
                        onClick={handleClose}
                        disabled={importing}
                        className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    {step === 'preview' && (
                        <button
                            onClick={handleImport}
                            disabled={importing || parsedData.length === 0}
                            className="px-6 py-2 gradient-bg text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                            {importing ? (
                                <>
                                    <span className="animate-spin">⏳</span> Importando...
                                </>
                            ) : (
                                <>✓ Importar {parsedData.length} Tiendas</>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
