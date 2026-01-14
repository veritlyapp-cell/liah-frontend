'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { calculateDistanceKm, getMaxDistanceForTurno, formatDistance } from '@/lib/geo/distance-utils';
import type { Coordinates } from '@/lib/geo/distance-utils';

interface Vacancy {
    posicion: string;
    turno: string;
    modalidad: string;
    marcaNombre: string;
    marcaId: string;
    tiendaNombre: string;
    tiendaDistrito: string;
    tiendaId: string;
    rqIds: string[];
    totalVacantes: number;
    storeCoordinates?: Coordinates;
    distanceKm?: number;
}

interface Candidate {
    id: string;
    nombre: string;
    distrito: string;
    coordinates?: Coordinates;
}

function VacantesContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const holdingSlug = searchParams.get('holding') || 'ngr';

    const [loading, setLoading] = useState(true);
    const [candidate, setCandidate] = useState<Candidate | null>(null);
    const [nearVacancies, setNearVacancies] = useState<Vacancy[]>([]);
    const [farVacancies, setFarVacancies] = useState<Vacancy[]>([]);
    const [showFar, setShowFar] = useState(false);

    useEffect(() => {
        async function loadData() {
            const token = searchParams.get('token');
            if (!token) {
                router.push(`/empleos/postular?holding=${holdingSlug}`);
                return;
            }

            try {
                // Validate session
                const sessionRes = await fetch('/api/portal/validate-session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token })
                });

                if (!sessionRes.ok) {
                    router.push(`/empleos/postular?holding=${holdingSlug}`);
                    return;
                }

                const sessionData = await sessionRes.json();
                setCandidate(sessionData.candidate);

                // Get vacancies
                const vacRes = await fetch('/api/portal/vacancies-aggregated');
                const vacData = await vacRes.json();

                // Calculate distances and categorize
                const candidateCoords = sessionData.candidate.coordinates;
                const near: Vacancy[] = [];
                const far: Vacancy[] = [];

                for (const vacancy of vacData.vacancies || []) {
                    if (candidateCoords && vacancy.storeCoordinates) {
                        const distanceKm = calculateDistanceKm(candidateCoords, vacancy.storeCoordinates);
                        const maxDistance = getMaxDistanceForTurno(vacancy.turno || 'Mañana');

                        const vacancyWithDist = {
                            ...vacancy,
                            distanceKm: Math.round(distanceKm * 10) / 10
                        };

                        if (distanceKm <= maxDistance) {
                            near.push(vacancyWithDist);
                        } else {
                            far.push(vacancyWithDist);
                        }
                    } else {
                        far.push(vacancy);
                    }
                }

                // Sort by distance
                near.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
                far.sort((a, b) => (a.distanceKm || Infinity) - (b.distanceKm || Infinity));

                setNearVacancies(near);
                setFarVacancies(far);

            } catch (error) {
                console.error('Error:', error);
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, [searchParams, holdingSlug, router]);

    function handleApply(vacancy: Vacancy) {
        const token = searchParams.get('token');
        router.push(`/empleos/aplicar/${vacancy.rqIds[0]}?holding=${holdingSlug}&token=${token}`);
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin w-12 h-12 border-4 border-gray-700 border-t-violet-400 rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-400">Buscando vacantes cerca de ti...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900">
            {/* Header */}
            <div className="bg-gradient-to-r from-violet-600 to-cyan-500 py-6 px-4">
                <div className="max-w-4xl mx-auto">
                    <button
                        onClick={() => router.push(`/empleos?holding=${holdingSlug}`)}
                        className="text-white/70 hover:text-white text-sm mb-2"
                    >
                        ← Volver al inicio
                    </button>
                    <h1 className="text-2xl font-bold text-white">Vacantes para ti</h1>
                    <p className="text-white/80">
                        Hola, {candidate?.nombre} • 📍 {candidate?.distrito}
                    </p>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Near Vacancies */}
                {nearVacancies.length > 0 && (
                    <div className="mb-10">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-2xl">🎯</span>
                            <h2 className="text-xl font-bold text-white">Cerca de ti</h2>
                            <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
                                {nearVacancies.length} vacantes
                            </span>
                        </div>

                        <div className="space-y-4">
                            {nearVacancies.map((vacancy, idx) => (
                                <VacancyCard
                                    key={`near-${idx}`}
                                    vacancy={vacancy}
                                    onApply={() => handleApply(vacancy)}
                                    isNear={true}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* No near vacancies */}
                {nearVacancies.length === 0 && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 text-center mb-8">
                        <span className="text-4xl mb-4 block">🔍</span>
                        <h3 className="text-lg font-semibold text-amber-400 mb-2">
                            No hay vacantes en tu zona
                        </h3>
                        <p className="text-amber-300/70 text-sm">
                            Pero puedes postular a otras ubicaciones
                        </p>
                    </div>
                )}

                {/* Far Vacancies */}
                {farVacancies.length > 0 && (
                    <div>
                        <button
                            onClick={() => setShowFar(!showFar)}
                            className="flex items-center gap-2 text-violet-400 hover:text-violet-300 font-medium mb-4"
                        >
                            <span>{showFar ? '▼' : '►'}</span>
                            Ver otras vacantes ({farVacancies.length})
                        </button>

                        {showFar && (
                            <div className="space-y-4">
                                <p className="text-gray-500 text-sm">
                                    Estas vacantes están más lejos. Si postulas, tu perfil será revisado.
                                </p>
                                {farVacancies.map((vacancy, idx) => (
                                    <VacancyCard
                                        key={`far-${idx}`}
                                        vacancy={vacancy}
                                        onApply={() => handleApply(vacancy)}
                                        isNear={false}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Empty */}
                {nearVacancies.length === 0 && farVacancies.length === 0 && (
                    <div className="text-center py-16">
                        <span className="text-6xl mb-4 block">📭</span>
                        <h3 className="text-xl font-semibold text-gray-400">
                            No hay vacantes disponibles
                        </h3>
                    </div>
                )}
            </div>
        </div>
    );
}

function VacancyCard({
    vacancy,
    onApply,
    isNear
}: {
    vacancy: Vacancy;
    onApply: () => void;
    isNear: boolean;
}) {
    const maxDistance = getMaxDistanceForTurno(vacancy.turno || 'Mañana');
    const isNightShift = ['Noche', 'Rotativo'].includes(vacancy.turno || '');

    return (
        <div className={`bg-gray-800 rounded-xl p-4 border ${isNear ? 'border-green-500/30' : 'border-gray-700'}`}>
            <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-white">{vacancy.posicion}</h3>
                        {isNear && (
                            <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                                ¡Cerca!
                            </span>
                        )}
                        {isNightShift && (
                            <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 text-xs rounded-full">
                                🌙 {vacancy.turno}
                            </span>
                        )}
                    </div>

                    <p className="text-violet-400 font-medium text-sm">{vacancy.marcaNombre}</p>
                    <p className="text-gray-400 text-sm">
                        📍 {vacancy.tiendaNombre} • {vacancy.tiendaDistrito}
                    </p>

                    <div className="flex gap-2 mt-2 flex-wrap">
                        <span className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded">
                            {vacancy.modalidad}
                        </span>
                        <span className="px-2 py-1 bg-violet-500/20 text-violet-400 text-xs rounded font-medium">
                            {vacancy.totalVacantes} vacante{vacancy.totalVacantes !== 1 ? 's' : ''}
                        </span>
                    </div>

                    {vacancy.distanceKm !== undefined && (
                        <p className={`text-xs mt-2 ${vacancy.distanceKm <= maxDistance ? 'text-green-400' : 'text-amber-400'}`}>
                            📏 {formatDistance(vacancy.distanceKm)}
                            {vacancy.distanceKm > maxDistance && (
                                <span className="text-gray-500"> (máx. {maxDistance}km para {vacancy.turno})</span>
                            )}
                        </p>
                    )}
                </div>

                <button
                    onClick={onApply}
                    className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap ${isNear
                        ? 'bg-gradient-to-r from-violet-500 to-cyan-500 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                >
                    Postular
                </button>
            </div>
        </div>
    );
}

export default function VacantesPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="animate-spin w-12 h-12 border-4 border-gray-700 border-t-violet-400 rounded-full"></div>
            </div>
        }>
            <VacantesContent />
        </Suspense>
    );
}
