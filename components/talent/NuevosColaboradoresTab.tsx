'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';

interface NuevosColaboradoresTabProps {
    holdingId: string;
}

interface Colaborador {
    id: string;
    apellidos: string;
    nombres: string;
    tipoDocumento: string;
    numeroDocumento: string;
    fechaNacimiento: string;
    departamento: string;
    provincia: string;
    distrito: string;
    direccion: string;
    telefono: string;
    email: string;
    banco?: string;
    tipoCuenta?: string;
    numeroCuenta?: string;
    cci?: string;
    contactoEmergenciaNombre?: string;
    contactoEmergenciaTelefono?: string;
    tallaUniforme?: string;
    nivelEducativo?: string;
    status: string;
    createdAt: any;
    puesto?: string;
    area?: string;
    gerencia?: string;
    fechaIngreso?: any;
    jefeInmediatoId?: string;
    onboardingLink?: string;
    applicationId?: string;
}

export default function NuevosColaboradoresTab({ holdingId }: NuevosColaboradoresTabProps) {
    const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedColaborador, setSelectedColaborador] = useState<Colaborador | null>(null);

    useEffect(() => {
        if (!holdingId) {
            setLoading(false);
            return;
        }

        const colaboradoresRef = collection(db, 'nuevos_colaboradores');
        const q = query(
            colaboradoresRef,
            where('holdingId', '==', holdingId),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Colaborador[];
            setColaboradores(data);
            setLoading(false);
        }, (error) => {
            console.error('Error loading colaboradores:', error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [holdingId]);

    // Fetch missing application data on demand when viewing details
    useEffect(() => {
        const fetchMissingData = async () => {
            if (selectedColaborador && !selectedColaborador.puesto && selectedColaborador.applicationId) {
                try {
                    const { doc, getDoc } = await import('firebase/firestore');
                    const appDoc = await getDoc(doc(db, 'talent_applications', selectedColaborador.applicationId));
                    if (appDoc.exists()) {
                        const appData = appDoc.data();
                        setSelectedColaborador(prev => prev ? {
                            ...prev,
                            puesto: appData.jobTitle || appData.jobTitulo || 'Sin especificar',
                            area: appData.area || '',
                            gerencia: appData.gerencia || '',
                            jefeInmediatoId: appData.hiringManagerId || '',
                            fechaIngreso: appData.joiningDate || prev.fechaIngreso
                        } : null);
                    }
                } catch (err) {
                    console.error('Error fetching missing application data:', err);
                }
            }
        };
        fetchMissingData();
    }, [selectedColaborador?.id]); // Only run when ID changes

    const filteredColaboradores = colaboradores.filter(c => {
        const term = searchTerm.toLowerCase();
        return (
            c.nombres?.toLowerCase().includes(term) ||
            c.apellidos?.toLowerCase().includes(term) ||
            c.numeroDocumento?.includes(term) ||
            c.email?.toLowerCase().includes(term)
        );
    });

    const exportToExcel = () => {
        // ... (Keep existing export logic, maybe update headers later if needed, but for now focus on UI)
        if (colaboradores.length === 0) {
            alert('No hay datos para exportar');
            return;
        }

        // CSV headers
        const headers = [
            'Apellidos', 'Nombres', 'Tipo Doc', 'Número Doc', 'Fecha Nacimiento',
            'Departamento', 'Provincia', 'Distrito', 'Dirección', 'Teléfono', 'Email',
            'Puesto', 'Área', 'Gerencia', 'Fecha Ingreso', 'Jefe Inmediato', // New
            'Banco', 'Tipo Cuenta', 'Número Cuenta', 'CCI',
            'Contacto Emergencia', 'Tel Emergencia', 'Talla Uniforme',
            'Estado', 'Fecha Registro'
        ];

        // CSV rows
        const rows = colaboradores.map(c => [
            c.apellidos || '', c.nombres || '', c.tipoDocumento || '', c.numeroDocumento || '', c.fechaNacimiento || '',
            c.departamento || '', c.provincia || '', c.distrito || '', c.direccion || '', c.telefono || '', c.email || '',
            c.puesto || '', c.area || '', c.gerencia || '', c.fechaIngreso ? new Date(c.fechaIngreso.seconds * 1000).toLocaleDateString() : '', c.jefeInmediatoId || '',
            c.banco || '', c.tipoCuenta || '', c.numeroCuenta || '', c.cci || '',
            c.contactoEmergenciaNombre || '', c.contactoEmergenciaTelefono || '', c.tallaUniforme || '',
            c.status || '', c.createdAt?.toDate?.()?.toLocaleDateString('es-PE') || ''
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob); // ... same as before
        link.setAttribute('href', url);
        link.setAttribute('download', `nuevos_colaboradores_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pendiente_revision':
                return <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">⏳ Pendiente</span>;
            case 'aprobado':
            case 'validado':
                return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">✓ Validado</span>;
            case 'rechazado':
                return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">✗ Rechazado</span>;
            default:
                return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">{status}</span>;
        }
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
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">🎉 Nuevos Colaboradores</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Información de nuevos ingresos desde el formulario de onboarding
                    </p>
                </div>
                <button
                    onClick={exportToExcel}
                    disabled={colaboradores.length === 0}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    📊 Exportar Excel
                </button>
            </div>

            {/* Search */}
            <div>
                <input
                    type="text"
                    placeholder="Buscar por nombre, documento o email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-violet-50 rounded-xl p-4">
                    <p className="text-sm text-gray-600">Total Registros</p>
                    <p className="text-2xl font-bold text-violet-600">{colaboradores.length}</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-4">
                    <p className="text-sm text-gray-600">Pendientes</p>
                    <p className="text-2xl font-bold text-amber-600">
                        {colaboradores.filter(c => c.status === 'pendiente_revision').length}
                    </p>
                </div>
                <div className="bg-green-50 rounded-xl p-4">
                    <p className="text-sm text-gray-600">Aprobados</p>
                    <p className="text-2xl font-bold text-green-600">
                        {colaboradores.filter(c => c.status === 'aprobado').length}
                    </p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4">
                    <p className="text-sm text-gray-600">Este mes</p>
                    <p className="text-2xl font-bold text-blue-600">
                        {colaboradores.filter(c => {
                            const date = c.createdAt?.toDate?.();
                            if (!date) return false;
                            const now = new Date();
                            return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                        }).length}
                    </p>
                </div>
            </div>

            {/* Table */}
            {filteredColaboradores.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl">
                    <div className="text-5xl mb-4">📋</div>
                    <p className="text-gray-600">
                        {searchTerm ? 'No se encontraron resultados' : 'No hay nuevos colaboradores registrados'}
                    </p>
                    <p className="text-sm text-gray-400 mt-2">
                        Los nuevos ingresos aparecerán aquí cuando completen el formulario de bienvenida.
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Colaborador</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Puesto / Área</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ingreso</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contacto</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredColaboradores.map(c => (
                                    <tr key={c.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-gray-900">{c.apellidos}, {c.nombres}</div>
                                            <div className="text-xs text-gray-500">
                                                {c.tipoDocumento}: {c.numeroDocumento}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm text-gray-900 font-medium">{c.puesto || 'Sin puesto'}</div>
                                            <div className="text-xs text-gray-500">
                                                {c.area ? `${c.area} ${c.gerencia ? `(${c.gerencia})` : ''}` : 'Área no asignada'}
                                            </div>
                                            {c.jefeInmediatoId && <div className="text-xs text-violet-600 mt-1">Jefe: {c.jefeInmediatoId}</div>}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm text-gray-900">
                                                {c.fechaIngreso && typeof c.fechaIngreso.toDate === 'function'
                                                    ? c.fechaIngreso.toDate().toLocaleDateString('es-PE')
                                                    : 'Por definir'}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm text-gray-900">{c.telefono}</div>
                                            <div className="text-xs text-gray-500">{c.email}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            {getStatusBadge(c.status)}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => setSelectedColaborador(c)}
                                                className="text-violet-600 hover:text-violet-800 text-sm font-medium hover:underline"
                                            >
                                                Ver Ficha
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* View Modal */}
            {selectedColaborador && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Ficha de Ingreso</h3>
                                <p className="text-sm text-gray-500">{selectedColaborador.apellidos}, {selectedColaborador.nombres}</p>
                            </div>
                            <button
                                onClick={() => setSelectedColaborador(null)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                ❌
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Status Bar */}
                            <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
                                <div>
                                    <span className="text-sm text-gray-500 block">Estado</span>
                                    {getStatusBadge(selectedColaborador.status)}
                                </div>
                                <div>
                                    <span className="text-sm text-gray-500 block">Fecha Registro</span>
                                    <span className="font-medium">
                                        {selectedColaborador.createdAt?.toDate?.()?.toLocaleString('es-PE')}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-sm text-gray-500 block">Nivel Educativo</span>
                                    <span className="font-medium">
                                        {selectedColaborador.nivelEducativo || 'No especificado'}
                                    </span>
                                </div>
                                <a
                                    href={`/onboarding/${selectedColaborador.id}`} // Assuming ID is same as application or we saved link
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-4 py-2 bg-violet-100 text-violet-700 rounded-lg text-sm font-medium hover:bg-violet-200"
                                >
                                    🔗 Abrir Formulario
                                </a>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Personal Info */}
                                <div className="space-y-4">
                                    <h4 className="font-semibold text-gray-900 border-b pb-2">Datos Personales</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs text-gray-500">Documento</label>
                                            <p className="font-medium">{selectedColaborador.tipoDocumento} {selectedColaborador.numeroDocumento}</p>
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500">Nacimiento</label>
                                            <p className="font-medium">{selectedColaborador.fechaNacimiento}</p>
                                        </div>
                                        <div className="col-span-2">
                                            <label className="text-xs text-gray-500">Dirección</label>
                                            <p className="font-medium">{selectedColaborador.direccion}</p>
                                            <p className="text-sm text-gray-600">{selectedColaborador.distrito}, {selectedColaborador.provincia}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Job Info */}
                                <div className="space-y-4">
                                    <h4 className="font-semibold text-gray-900 border-b pb-2">Información del Puesto</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <label className="text-xs text-gray-500">Puesto</label>
                                            <p className="font-medium text-lg text-violet-700">{selectedColaborador.puesto || 'No definido'}</p>
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500">Área / Gerencia</label>
                                            <p className="font-medium">{selectedColaborador.area || '-'}</p>
                                            <p className="text-sm text-gray-500">{selectedColaborador.gerencia}</p>
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500">Fecha Ingreso</label>
                                            <p className="font-medium">
                                                {selectedColaborador.fechaIngreso && typeof selectedColaborador.fechaIngreso.toDate === 'function'
                                                    ? selectedColaborador.fechaIngreso.toDate().toLocaleDateString('es-PE')
                                                    : '-'}
                                            </p>
                                        </div>
                                        <div className="col-span-2">
                                            <label className="text-xs text-gray-500">Jefe Inmediato</label>
                                            <p className="font-medium">{selectedColaborador.jefeInmediatoId || '-'}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Bank Info */}
                                <div className="space-y-4">
                                    <h4 className="font-semibold text-gray-900 border-b pb-2">Datos Bancarios</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs text-gray-500">Banco</label>
                                            <p className="font-medium">{selectedColaborador.banco}</p>
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500">Tipo Cuenta</label>
                                            <p className="font-medium">{selectedColaborador.tipoCuenta || 'Ahorros'}</p>
                                        </div>
                                        <div className="col-span-2">
                                            <label className="text-xs text-gray-500">Número Cuenta</label>
                                            <p className="font-medium">{selectedColaborador.numeroCuenta}</p>
                                        </div>
                                        <div className="col-span-2">
                                            <label className="text-xs text-gray-500">CCI</label>
                                            <p className="font-medium">{selectedColaborador.cci}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Emergency Contact */}
                                <div className="space-y-4">
                                    <h4 className="font-semibold text-gray-900 border-b pb-2">Contacto Emergencia</h4>
                                    <div>
                                        <label className="text-xs text-gray-500">Nombre</label>
                                        <p className="font-medium">{selectedColaborador.contactoEmergenciaNombre}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500">Teléfono</label>
                                        <p className="font-medium">{selectedColaborador.contactoEmergenciaTelefono}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                            <div className="flex gap-3">
                                {selectedColaborador.status === 'pendiente_revision' && (
                                    <>
                                        <button
                                            onClick={async () => {
                                                if (!confirm('¿Marcar este colaborador como Validado para planilla?')) return;
                                                const { updateDoc, doc: fireDoc } = await import('firebase/firestore');
                                                await updateDoc(fireDoc(db, 'nuevos_colaboradores', selectedColaborador.id), {
                                                    status: 'validado',
                                                    validatedAt: new Date()
                                                });
                                                setSelectedColaborador(prev => prev ? { ...prev, status: 'validado' } : null);
                                            }}
                                            className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
                                        >
                                            ✅ Validar para Planilla
                                        </button>
                                        <button
                                            onClick={async () => {
                                                if (!confirm('¿Rechazar este colaborador?')) return;
                                                const { updateDoc, doc: fireDoc } = await import('firebase/firestore');
                                                await updateDoc(fireDoc(db, 'nuevos_colaboradores', selectedColaborador.id), {
                                                    status: 'rechazado'
                                                });
                                                setSelectedColaborador(prev => prev ? { ...prev, status: 'rechazado' } : null);
                                            }}
                                            className="px-6 py-2 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200"
                                        >
                                            ❌ Rechazar
                                        </button>
                                    </>
                                )}
                            </div>
                            <button
                                onClick={() => setSelectedColaborador(null)}
                                className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
