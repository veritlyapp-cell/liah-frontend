'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import {
    collection, query, where, getDocs, addDoc, updateDoc, deleteDoc,
    doc, Timestamp, orderBy
} from 'firebase/firestore';

interface Gerencia {
    id: string;
    nombre: string;
    jefeEmail?: string;
    holdingId: string;
}

interface Area {
    id: string;
    nombre: string;
    gerenciaId: string;
    gerenciaNombre?: string;
    jefeEmail?: string;
    holdingId: string;
}

interface Puesto {
    id: string;
    nombre: string;
    areaId: string;
    areaNombre?: string;
    gerenciaId: string;
    gerenciaNombre?: string;
    perfilBase?: string;
    holdingId: string;
}

interface OrgStructureProps {
    holdingId: string;
}

export default function OrgStructure({ holdingId }: OrgStructureProps) {
    const [activeTab, setActiveTab] = useState<'gerencias' | 'areas' | 'puestos'>('gerencias');
    const [loading, setLoading] = useState(true);

    // Data
    const [gerencias, setGerencias] = useState<Gerencia[]>([]);
    const [areas, setAreas] = useState<Area[]>([]);
    const [puestos, setPuestos] = useState<Puesto[]>([]);

    // Create modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);

    // Form fields
    const [formNombre, setFormNombre] = useState('');
    const [formJefeEmail, setFormJefeEmail] = useState('');
    const [formGerenciaId, setFormGerenciaId] = useState('');
    const [formAreaId, setFormAreaId] = useState('');
    const [formPerfilBase, setFormPerfilBase] = useState('');

    // Bulk upload
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [bulkData, setBulkData] = useState<any[]>([]);
    const [bulkUploading, setBulkUploading] = useState(false);

    useEffect(() => {
        loadData();
    }, [holdingId]);

    async function loadData() {
        setLoading(true);
        try {
            // Load Gerencias
            const gerenciasRef = collection(db, 'gerencias');
            const gQuery = query(gerenciasRef, where('holdingId', '==', holdingId));
            const gSnap = await getDocs(gQuery);
            const loadedGerencias = gSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Gerencia[];
            setGerencias(loadedGerencias);

            // Load Areas
            const areasRef = collection(db, 'areas');
            const aQuery = query(areasRef, where('holdingId', '==', holdingId));
            const aSnap = await getDocs(aQuery);
            const loadedAreas = aSnap.docs.map(d => {
                const data = d.data();
                const gerencia = loadedGerencias.find(g => g.id === data.gerenciaId);
                return {
                    id: d.id,
                    ...data,
                    gerenciaNombre: gerencia?.nombre
                };
            }) as Area[];
            setAreas(loadedAreas);

            // Load Puestos
            const puestosRef = collection(db, 'puestos');
            const pQuery = query(puestosRef, where('holdingId', '==', holdingId));
            const pSnap = await getDocs(pQuery);
            const loadedPuestos = pSnap.docs.map(d => {
                const data = d.data();
                const area = loadedAreas.find(a => a.id === data.areaId);
                const gerencia = loadedGerencias.find(g => g.id === data.gerenciaId);
                return {
                    id: d.id,
                    ...data,
                    areaNombre: area?.nombre,
                    gerenciaNombre: gerencia?.nombre
                };
            }) as Puesto[];
            setPuestos(loadedPuestos);

        } catch (error) {
            console.error('Error loading org structure:', error);
        } finally {
            setLoading(false);
        }
    }

    function resetForm() {
        setFormNombre('');
        setFormJefeEmail('');
        setFormGerenciaId('');
        setFormAreaId('');
        setFormPerfilBase('');
        setEditingItem(null);
    }

    function openCreate() {
        resetForm();
        setShowCreateModal(true);
    }

    function openEdit(item: any) {
        setEditingItem(item);
        setFormNombre(item.nombre);
        setFormJefeEmail(item.jefeEmail || '');
        setFormGerenciaId(item.gerenciaId || '');
        setFormAreaId(item.areaId || '');
        setFormPerfilBase(item.perfilBase || '');
        setShowCreateModal(true);
    }

    async function handleSave() {
        if (!formNombre.trim()) {
            alert('El nombre es requerido');
            return;
        }

        try {
            if (activeTab === 'gerencias') {
                const data = {
                    nombre: formNombre,
                    jefeEmail: formJefeEmail || null,
                    holdingId,
                    updatedAt: Timestamp.now()
                };

                if (editingItem) {
                    await updateDoc(doc(db, 'gerencias', editingItem.id), data);
                } else {
                    await addDoc(collection(db, 'gerencias'), { ...data, createdAt: Timestamp.now() });
                }
            } else if (activeTab === 'areas') {
                if (!formGerenciaId) {
                    alert('Selecciona una gerencia');
                    return;
                }
                const data = {
                    nombre: formNombre,
                    gerenciaId: formGerenciaId,
                    jefeEmail: formJefeEmail || null,
                    holdingId,
                    updatedAt: Timestamp.now()
                };

                if (editingItem) {
                    await updateDoc(doc(db, 'areas', editingItem.id), data);
                } else {
                    await addDoc(collection(db, 'areas'), { ...data, createdAt: Timestamp.now() });
                }
            } else if (activeTab === 'puestos') {
                if (!formAreaId) {
                    alert('Selecciona un área');
                    return;
                }
                const selectedArea = areas.find(a => a.id === formAreaId);
                const data = {
                    nombre: formNombre,
                    areaId: formAreaId,
                    gerenciaId: selectedArea?.gerenciaId || '',
                    perfilBase: formPerfilBase || null,
                    holdingId,
                    updatedAt: Timestamp.now()
                };

                if (editingItem) {
                    await updateDoc(doc(db, 'puestos', editingItem.id), data);
                } else {
                    await addDoc(collection(db, 'puestos'), { ...data, createdAt: Timestamp.now() });
                }
            }

            setShowCreateModal(false);
            resetForm();
            loadData();
            alert('✅ Guardado exitosamente');
        } catch (error) {
            console.error('Error saving:', error);
            alert('Error al guardar');
        }
    }

    async function handleDelete(id: string, collectionName: string) {
        if (!confirm('¿Estás seguro de eliminar este elemento?')) return;

        try {
            await deleteDoc(doc(db, collectionName, id));
            loadData();
        } catch (error) {
            console.error('Error deleting:', error);
            alert('Error al eliminar');
        }
    }

    // CSV parsing
    function parseCSV(text: string): any[] {
        const lines = text.trim().split('\n');
        if (lines.length < 2) return [];

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            const obj: any = {};
            headers.forEach((h, idx) => {
                obj[h] = values[idx] || '';
            });
            if (obj.nombre) data.push(obj);
        }
        return data;
    }

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            const parsed = parseCSV(text);
            setBulkData(parsed);
        };
        reader.readAsText(file);
    }

    async function handleBulkUpload() {
        if (bulkData.length === 0) {
            alert('No hay datos para importar');
            return;
        }

        setBulkUploading(true);
        try {
            let successCount = 0;

            for (const item of bulkData) {
                const data: any = {
                    nombre: item.nombre,
                    holdingId,
                    createdAt: Timestamp.now(),
                    updatedAt: Timestamp.now()
                };

                if (activeTab === 'gerencias') {
                    await addDoc(collection(db, 'gerencias'), data);
                } else if (activeTab === 'areas') {
                    // Find gerencia by name
                    const gerencia = gerencias.find(g =>
                        g.nombre.toLowerCase() === item.gerencia?.toLowerCase()
                    );
                    if (gerencia) {
                        data.gerenciaId = gerencia.id;
                        await addDoc(collection(db, 'areas'), data);
                    }
                } else if (activeTab === 'puestos') {
                    // Find area by name
                    const area = areas.find(a =>
                        a.nombre.toLowerCase() === item.area?.toLowerCase()
                    );
                    if (area) {
                        data.areaId = area.id;
                        data.gerenciaId = area.gerenciaId;
                        data.perfilBase = item.perfil || null;
                        await addDoc(collection(db, 'puestos'), data);
                    }
                }
                successCount++;
            }

            alert(`✅ ${successCount} registros importados`);
            setShowBulkModal(false);
            setBulkData([]);
            loadData();
        } catch (error) {
            console.error('Error bulk uploading:', error);
            alert('Error al importar');
        } finally {
            setBulkUploading(false);
        }
    }

    function downloadTemplate() {
        let csv = '';
        if (activeTab === 'gerencias') {
            csv = 'nombre\nOperaciones\nComercial\nTI';
        } else if (activeTab === 'areas') {
            csv = 'nombre,gerencia\nPrevención,Operaciones\nMarketing,Comercial';
        } else {
            csv = 'nombre,area,perfil\nSupervisor Seguridad,Prevención,Descripción del puesto...';
        }

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `template_${activeTab}.csv`;
        a.click();
    }

    const tabs = [
        { id: 'gerencias', label: 'Gerencias', icon: '🏢', count: gerencias.length },
        { id: 'areas', label: 'Áreas', icon: '📁', count: areas.length },
        { id: 'puestos', label: 'Puestos', icon: '💼', count: puestos.length },
    ];

    const getModalTitle = () => {
        const action = editingItem ? 'Editar' : 'Nueva';
        if (activeTab === 'gerencias') return `${action} Gerencia`;
        if (activeTab === 'areas') return `${action} Área`;
        return `${action} Puesto`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with tabs */}
            <div className="flex items-center justify-between">
                <div className="flex gap-2">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${activeTab === tab.id
                                ? 'bg-violet-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            <span>{tab.icon}</span>
                            <span>{tab.label}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === tab.id ? 'bg-white/20' : 'bg-gray-300'
                                }`}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => { setBulkData([]); setShowBulkModal(true); }}
                        className="px-4 py-2 border border-violet-600 text-violet-600 rounded-lg font-medium hover:bg-violet-50 transition-colors"
                    >
                        📤 Carga Masiva
                    </button>
                    <button
                        onClick={openCreate}
                        className="px-4 py-2 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 transition-colors"
                    >
                        + Agregar
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Gerencias Tab */}
                {activeTab === 'gerencias' && (
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jefe</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Áreas</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {gerencias.length === 0 ? (
                                <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">No hay gerencias</td></tr>
                            ) : gerencias.map((g) => (
                                <tr key={g.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900">{g.nombre}</td>
                                    <td className="px-6 py-4 text-gray-600">{g.jefeEmail || '-'}</td>
                                    <td className="px-6 py-4 text-gray-600">{areas.filter(a => a.gerenciaId === g.id).length}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => openEdit(g)} className="text-violet-600 hover:text-violet-800 mr-3">Editar</button>
                                        <button onClick={() => handleDelete(g.id, 'gerencias')} className="text-red-600 hover:text-red-800">Eliminar</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {/* Areas Tab */}
                {activeTab === 'areas' && (
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gerencia</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jefe</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Puestos</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {areas.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No hay áreas</td></tr>
                            ) : areas.map((a) => (
                                <tr key={a.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900">{a.nombre}</td>
                                    <td className="px-6 py-4 text-gray-600">{a.gerenciaNombre || '-'}</td>
                                    <td className="px-6 py-4 text-gray-600">{a.jefeEmail || '-'}</td>
                                    <td className="px-6 py-4 text-gray-600">{puestos.filter(p => p.areaId === a.id).length}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => openEdit(a)} className="text-violet-600 hover:text-violet-800 mr-3">Editar</button>
                                        <button onClick={() => handleDelete(a.id, 'areas')} className="text-red-600 hover:text-red-800">Eliminar</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {/* Puestos Tab */}
                {activeTab === 'puestos' && (
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Área</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gerencia</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Perfil</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {puestos.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No hay puestos</td></tr>
                            ) : puestos.map((p) => (
                                <tr key={p.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900">{p.nombre}</td>
                                    <td className="px-6 py-4 text-gray-600">{p.areaNombre || '-'}</td>
                                    <td className="px-6 py-4 text-gray-600">{p.gerenciaNombre || '-'}</td>
                                    <td className="px-6 py-4">
                                        {p.perfilBase ? (
                                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">✓ Con perfil</span>
                                        ) : (
                                            <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-full text-xs">Sin perfil</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => openEdit(p)} className="text-violet-600 hover:text-violet-800 mr-3">Editar</button>
                                        <button onClick={() => handleDelete(p.id, 'puestos')} className="text-red-600 hover:text-red-800">Eliminar</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Create/Edit Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full">
                        <div className="border-b border-gray-200 px-6 py-4">
                            <h3 className="text-lg font-semibold text-gray-900">{getModalTitle()}</h3>
                        </div>
                        <div className="px-6 py-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                                <input
                                    type="text"
                                    value={formNombre}
                                    onChange={(e) => setFormNombre(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                                    placeholder={activeTab === 'gerencias' ? 'Ej: Operaciones' : activeTab === 'areas' ? 'Ej: Prevención' : 'Ej: Supervisor Seguridad'}
                                />
                            </div>

                            {activeTab === 'areas' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Gerencia *</label>
                                    <select
                                        value={formGerenciaId}
                                        onChange={(e) => setFormGerenciaId(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                                    >
                                        <option value="">Seleccionar gerencia...</option>
                                        {gerencias.map(g => (
                                            <option key={g.id} value={g.id}>{g.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {activeTab === 'puestos' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Área *</label>
                                        <select
                                            value={formAreaId}
                                            onChange={(e) => setFormAreaId(e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                                        >
                                            <option value="">Seleccionar área...</option>
                                            {areas.map(a => (
                                                <option key={a.id} value={a.id}>{a.nombre} ({a.gerenciaNombre})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Perfil Base (JD)</label>
                                        <textarea
                                            value={formPerfilBase}
                                            onChange={(e) => setFormPerfilBase(e.target.value)}
                                            rows={4}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                                            placeholder="Descripción del puesto, requisitos, etc..."
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Este perfil se usará como base al crear RQs para este puesto</p>
                                    </div>
                                </>
                            )}

                            {/* Email del jefe se configura después en gestión de usuarios */}
                        </div>
                        <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
                            <button
                                onClick={() => { setShowCreateModal(false); resetForm(); }}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
                            >
                                {editingItem ? 'Actualizar' : 'Crear'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Upload Modal */}
            {showBulkModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
                        <div className="border-b border-gray-200 px-6 py-4">
                            <h3 className="text-lg font-semibold text-gray-900">
                                📤 Carga Masiva de {activeTab === 'gerencias' ? 'Gerencias' : activeTab === 'areas' ? 'Áreas' : 'Puestos'}
                            </h3>
                        </div>
                        <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={downloadTemplate}
                                    className="text-sm text-violet-600 hover:underline"
                                >
                                    📥 Descargar Template CSV
                                </button>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Sube tu archivo CSV
                                </label>
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFileChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                />
                            </div>

                            {bulkData.length > 0 && (
                                <div>
                                    <p className="text-sm font-medium text-gray-700 mb-2">
                                        Vista previa ({bulkData.length} registros)
                                    </p>
                                    <div className="border rounded-lg overflow-x-auto max-h-48">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    {Object.keys(bulkData[0]).map(key => (
                                                        <th key={key} className="px-3 py-2 text-left font-medium text-gray-600">
                                                            {key}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {bulkData.slice(0, 5).map((row, idx) => (
                                                    <tr key={idx}>
                                                        {Object.values(row).map((val, vidx) => (
                                                            <td key={vidx} className="px-3 py-2 text-gray-900">
                                                                {String(val).substring(0, 30)}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    {bulkData.length > 5 && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            ... y {bulkData.length - 5} más
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
                            <button
                                onClick={() => { setShowBulkModal(false); setBulkData([]); }}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleBulkUpload}
                                disabled={bulkData.length === 0 || bulkUploading}
                                className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50"
                            >
                                {bulkUploading ? '⏳ Importando...' : `Importar ${bulkData.length} registros`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
