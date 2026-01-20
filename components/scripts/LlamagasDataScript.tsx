/**
 * Script para aislar datos de Llamagas
 * Este script verifica y asegura que Llamagas tenga su propia estructura organizacional
 * 
 * USO: 
 * 1. Agregar este componente temporalmente a una página
 * 2. Hacer clic en "Ejecutar Script"
 * 3. Remover después de ejecutar
 */

'use client';

import { useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';

const LLAMAGAS_HOLDING_ID = 'llamagas';

// Estructura organizacional ejemplo para Llamagas
const LLAMAGAS_STRUCTURE = {
    gerencias: [
        { nombre: 'Gerencia General' },
        { nombre: 'Gerencia de Operaciones' },
        { nombre: 'Gerencia Comercial' },
        { nombre: 'Gerencia de Finanzas' },
        { nombre: 'Gerencia de Recursos Humanos' },
    ],
    areas: [
        { nombre: 'Dirección', gerencia: 'Gerencia General' },
        { nombre: 'Distribución', gerencia: 'Gerencia de Operaciones' },
        { nombre: 'Logística', gerencia: 'Gerencia de Operaciones' },
        { nombre: 'Mantenimiento', gerencia: 'Gerencia de Operaciones' },
        { nombre: 'Ventas', gerencia: 'Gerencia Comercial' },
        { nombre: 'Marketing', gerencia: 'Gerencia Comercial' },
        { nombre: 'Contabilidad', gerencia: 'Gerencia de Finanzas' },
        { nombre: 'Tesorería', gerencia: 'Gerencia de Finanzas' },
        { nombre: 'Selección y Reclutamiento', gerencia: 'Gerencia de Recursos Humanos' },
        { nombre: 'Capacitación', gerencia: 'Gerencia de Recursos Humanos' },
        { nombre: 'Bienestar', gerencia: 'Gerencia de Recursos Humanos' },
    ],
    puestos: [
        { nombre: 'Gerente General', area: 'Dirección' },
        { nombre: 'Asistente de Gerencia', area: 'Dirección' },
        { nombre: 'Jefe de Distribución', area: 'Distribución' },
        { nombre: 'Conductor Repartidor', area: 'Distribución' },
        { nombre: 'Auxiliar de Reparto', area: 'Distribución' },
        { nombre: 'Jefe de Logística', area: 'Logística' },
        { nombre: 'Almacenero', area: 'Logística' },
        { nombre: 'Técnico de Mantenimiento', area: 'Mantenimiento' },
        { nombre: 'Supervisor de Ventas', area: 'Ventas' },
        { nombre: 'Vendedor', area: 'Ventas' },
        { nombre: 'Analista de Marketing', area: 'Marketing' },
        { nombre: 'Contador', area: 'Contabilidad' },
        { nombre: 'Tesorero', area: 'Tesorería' },
        { nombre: 'Analista de Selección', area: 'Selección y Reclutamiento' },
        { nombre: 'Capacitador', area: 'Capacitación' },
        { nombre: 'Asistente de Bienestar', area: 'Bienestar' },
    ]
};

export default function LlamagasDataScript() {
    const [loading, setLoading] = useState(false);
    const [log, setLog] = useState<string[]>([]);

    function addLog(msg: string) {
        setLog(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);
    }

    async function runScript() {
        setLoading(true);
        setLog([]);
        addLog('🚀 Iniciando script de aislamiento de datos para Llamagas...');

        try {
            // 1. Check existing data
            addLog('📊 Verificando datos existentes para Llamagas...');

            const gerenciasRef = collection(db, 'gerencias');
            const existingGerencias = await getDocs(query(gerenciasRef, where('holdingId', '==', LLAMAGAS_HOLDING_ID)));
            addLog(`   Gerencias existentes: ${existingGerencias.size}`);

            const areasRef = collection(db, 'areas');
            const existingAreas = await getDocs(query(areasRef, where('holdingId', '==', LLAMAGAS_HOLDING_ID)));
            addLog(`   Áreas existentes: ${existingAreas.size}`);

            const puestosRef = collection(db, 'puestos');
            const existingPuestos = await getDocs(query(puestosRef, where('holdingId', '==', LLAMAGAS_HOLDING_ID)));
            addLog(`   Puestos existentes: ${existingPuestos.size}`);

            // 2. Create Gerencias
            addLog('🏢 Creando Gerencias...');
            const gerenciaIds: Record<string, string> = {};

            for (const g of LLAMAGAS_STRUCTURE.gerencias) {
                // Check if already exists
                const existing = existingGerencias.docs.find(d => d.data().nombre === g.nombre);
                if (existing) {
                    gerenciaIds[g.nombre] = existing.id;
                    addLog(`   ✓ Gerencia "${g.nombre}" ya existe`);
                } else {
                    const docRef = await addDoc(gerenciasRef, {
                        nombre: g.nombre,
                        holdingId: LLAMAGAS_HOLDING_ID,
                        createdAt: Timestamp.now()
                    });
                    gerenciaIds[g.nombre] = docRef.id;
                    addLog(`   ➕ Gerencia "${g.nombre}" creada`);
                }
            }

            // 3. Create Areas
            addLog('📁 Creando Áreas...');
            const areaIds: Record<string, string> = {};

            for (const a of LLAMAGAS_STRUCTURE.areas) {
                const gerenciaId = gerenciaIds[a.gerencia];
                const existing = existingAreas.docs.find(d => d.data().nombre === a.nombre);
                if (existing) {
                    areaIds[a.nombre] = existing.id;
                    addLog(`   ✓ Área "${a.nombre}" ya existe`);
                } else {
                    const docRef = await addDoc(areasRef, {
                        nombre: a.nombre,
                        gerenciaId,
                        gerenciaNombre: a.gerencia,
                        holdingId: LLAMAGAS_HOLDING_ID,
                        createdAt: Timestamp.now()
                    });
                    areaIds[a.nombre] = docRef.id;
                    addLog(`   ➕ Área "${a.nombre}" creada`);
                }
            }

            // 4. Create Puestos
            addLog('👔 Creando Puestos...');

            for (const p of LLAMAGAS_STRUCTURE.puestos) {
                const area = LLAMAGAS_STRUCTURE.areas.find(a => a.nombre === p.area);
                const areaId = areaIds[p.area];
                const gerenciaId = area ? gerenciaIds[area.gerencia] : '';

                const existing = existingPuestos.docs.find(d => d.data().nombre === p.nombre);
                if (existing) {
                    addLog(`   ✓ Puesto "${p.nombre}" ya existe`);
                } else {
                    await addDoc(puestosRef, {
                        nombre: p.nombre,
                        areaId,
                        areaNombre: p.area,
                        gerenciaId,
                        gerenciaNombre: area?.gerencia || '',
                        holdingId: LLAMAGAS_HOLDING_ID,
                        createdAt: Timestamp.now()
                    });
                    addLog(`   ➕ Puesto "${p.nombre}" creado`);
                }
            }

            addLog('✅ ¡Script completado exitosamente!');
            addLog(`   Total Gerencias: ${Object.keys(gerenciaIds).length}`);
            addLog(`   Total Áreas: ${Object.keys(areaIds).length}`);
            addLog(`   Total Puestos: ${LLAMAGAS_STRUCTURE.puestos.length}`);

        } catch (error: any) {
            addLog(`❌ Error: ${error.message}`);
            console.error('Script error:', error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">🔧 Script de Datos - Llamagas</h1>
            <p className="text-gray-600 mb-6">
                Este script crea la estructura organizacional para Llamagas (gerencias, áreas, puestos).
            </p>

            <button
                onClick={runScript}
                disabled={loading}
                className="px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 mb-6"
            >
                {loading ? '⏳ Ejecutando...' : '🚀 Ejecutar Script'}
            </button>

            {log.length > 0 && (
                <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
                    {log.map((line, i) => (
                        <div key={i}>{line}</div>
                    ))}
                </div>
            )}
        </div>
    );
}
