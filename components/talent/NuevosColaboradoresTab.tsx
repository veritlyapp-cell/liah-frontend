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
    status: string;
    createdAt: any;
}

export default function NuevosColaboradoresTab({ holdingId }: NuevosColaboradoresTabProps) {
    const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

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
        if (colaboradores.length === 0) {
            alert('No hay datos para exportar');
            return;
        }

        // CSV headers
        const headers = [
            'Apellidos',
            'Nombres',
            'Tipo Doc',
            'Número Doc',
            'Fecha Nacimiento',
            'Departamento',
            'Provincia',
            'Distrito',
            'Dirección',
            'Teléfono',
            'Email',
            'Banco',
            'Tipo Cuenta',
            'Número Cuenta',
            'CCI',
            'Contacto Emergencia',
            'Tel Emergencia',
            'Talla Uniforme',
            'Estado',
            'Fecha Registro'
        ];

        // CSV rows
        const rows = colaboradores.map(c => [
            c.apellidos || '',
            c.nombres || '',
            c.tipoDocumento || '',
            c.numeroDocumento || '',
            c.fechaNacimiento || '',
            c.departamento || '',
            c.provincia || '',
            c.distrito || '',
            c.direccion || '',
            c.telefono || '',
            c.email || '',
            c.banco || '',
            c.tipoCuenta || '',
            c.numeroCuenta || '',
            c.cci || '',
            c.contactoEmergenciaNombre || '',
            c.contactoEmergenciaTelefono || '',
            c.tallaUniforme || '',
            c.status || '',
            c.createdAt?.toDate?.()?.toLocaleDateString('es-PE') || ''
        ]);

        // Create CSV content
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        // Add BOM for Excel UTF-8 compatibility
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

        // Download
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
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
                return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">✓ Aprobado</span>;
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
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Documento</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ubicación</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contacto</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredColaboradores.map(c => (
                                    <tr key={c.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-gray-900">{c.apellidos}, {c.nombres}</div>
                                            <div className="text-xs text-gray-500">
                                                {c.fechaNacimiento && `Nac: ${c.fechaNacimiento}`}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm text-gray-900">{c.tipoDocumento}: {c.numeroDocumento}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm text-gray-900">{c.distrito}</div>
                                            <div className="text-xs text-gray-500">{c.provincia}, {c.departamento}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm text-gray-900">{c.telefono}</div>
                                            <div className="text-xs text-gray-500">{c.email}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            {getStatusBadge(c.status)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500">
                                            {c.createdAt?.toDate?.()?.toLocaleDateString('es-PE') || '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
