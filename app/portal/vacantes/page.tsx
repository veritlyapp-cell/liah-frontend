'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { calculateDistanceKm, getMaxDistanceForTurno, formatDistance, getDistanceCategory } from '@/lib/geo/distance-utils';
import type { Coordinates } from '@/lib/geo/distance-utils';

interface Vacancy {
    posicion: string;
    turno: string;
    modalidad: string;
    marcaNombre: string;
    tiendaNombre: string;
    tiendaDistrito: string;
    tiendaId: string;
    rqIds: string[];
    totalVacantes: number;
    storeCoordinates?: Coordinates;
    distanceKm?: number;
    distanceCategory?: 'perfect' | 'acceptable' | 'far';
}

interface CandidateSession {
    id: string;
    nombre: string;
    distrito: string;
    email: string;
    coordinates?: Coordinates;
}

function VacantesContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [candidate, setCandidate] = useState<CandidateSession | null>(null);
    const [vacancies, setVacancies] = useState<{
        near: Vacancy[];
        acceptable: Vacancy[];
        far: Vacancy[];
    }>({ near: [], acceptable: [], far: [] });
    const [showFar, setShowFar] = useState(false);

    useEffect(() => {
        async function loadData() {
            const token = searchParams.get('token');
            if (!token) {
                router.push('/portal');
                return;
            }

            try {
                // Validate session and get candidate data
                const sessionRes = await fetch('/api/portal/validate-session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token })
                });

                if (!sessionRes.ok) {
                    router.push('/portal');
                    return;
                }

                const sessionData = await sessionRes.json();
                setCandidate(sessionData.candidate);

                // Get aggregated vacancies
                const vacanciesRes = await fetch('/api/portal/vacancies-aggregated');
                const vacanciesData = await vacanciesRes.json();

                // Calculate distance for each vacancy and categorize
                const candidateCoords = sessionData.candidate.coordinates;

                if (candidateCoords) {
                    const categorized = categorizeByDistance(
                        vacanciesData.vacancies || [],
                        candidateCoords
                    );
                    setVacancies(categorized);
                } else {
                    // No coordinates - put all in 'far' for now
                    setVacancies({
                        near: [],
                        acceptable: [],
                        far: vacanciesData.vacancies || []
                    });
                }

            } catch (error) {
                console.error('Error loading data:', error);
                router.push('/portal');
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, [searchParams, router]);

    function categorizeByDistance(vacancies: Vacancy[], candidateCoords: Coordinates) {
        const near: Vacancy[] = [];
        const acceptable: Vacancy[] = [];
        const far: Vacancy[] = [];

        for (const vacancy of vacancies) {
            if (!vacancy.storeCoordinates) {
                far.push({ ...vacancy, distanceCategory: 'far' });
                continue;
            }

            const distanceKm = calculateDistanceKm(candidateCoords, vacancy.storeCoordinates);
            const maxDistance = getMaxDistanceForTurno(vacancy.turno || 'Mañana');
            const category = getDistanceCategory(distanceKm, vacancy.turno || 'Mañana');

            const vacancyWithDist = {
                ...vacancy,
                distanceKm: Math.round(distanceKm * 10) / 10,
                distanceCategory: category
            };

            if (distanceKm <= maxDistance) {
                if (category === 'perfect') {
                    near.push(vacancyWithDist);
                } else {
                    acceptable.push(vacancyWithDist);
                }
            } else {
                far.push(vacancyWithDist);
            }
        }

        // Sort by distance
        const sortByDistance = (a: Vacancy, b: Vacancy) =>
            (a.distanceKm || Infinity) - (b.distanceKm || Infinity);

        return {
            near: near.sort(sortByDistance),
            acceptable: acceptable.sort(sortByDistance),
            far: far.sort(sortByDistance)
        };
    }

    function handleApply(vacancy: Vacancy) {
        const token = searchParams.get('token');
        // Use first RQ ID for now (they're all same position)
        router.push(`/portal/postular/${vacancy.rqIds[0]}?token=${token}`);
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin w-12 h-12 border-4 border-violet-200 border-t-violet-600 rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-600">Buscando vacantes cerca de ti...</p>
                </div>
            </div>
        );
    }

    const totalNear = vacancies.near.length + vacancies.acceptable.length;
    const totalFar = vacancies.far.length;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-violet-600 to-cyan-500 text-white">
                <div className="max-w-4xl mx-auto px-4 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold">Vacantes para ti</h1>
                            <p className="text-white/80 text-sm">
                                Hola, {candidate?.nombre} 👋
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-white/70">Tu ubicación</p>
                            <p className="font-semibold">{candidate?.distrito}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto px-4 py-6">
                {/* Near Section */}
                {totalNear > 0 && (
                    <div className="mb-8">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-2xl">🎯</span>
                            <h2 className="text-xl font-bold text-gray-900">
                                Cerca de ti
                            </h2>
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                                {totalNear} disponibles
                            </span>
                        </div>
                        <p className="text-gray-600 mb-4 text-sm">
                            Estas vacantes están dentro de tu rango de distancia
                        </p>

                        <div className="space-y-4">
                            {[...vacancies.near, ...vacancies.acceptable].map((vacancy, idx) => (
                                <VacancyCard
                                    key={`${vacancy.posicion}-${vacancy.tiendaId}-${idx}`}
                                    vacancy={vacancy}
                                    onApply={() => handleApply(vacancy)}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* No Near Matches */}
                {totalNear === 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-8 text-center">
                        <span className="text-4xl mb-4 block">🔍</span>
                        <h3 className="text-lg font-semibold text-amber-800 mb-2">
                            No hay vacantes cerca de ti ahora
                        </h3>
                        <p className="text-amber-700 text-sm">
                            Pero puedes explorar otras oportunidades más lejos
                        </p>
                    </div>
                )}

                {/* Far Vacancies */}
                {totalFar > 0 && (
                    <div>
                        <button
                            onClick={() => setShowFar(!showFar)}
                            className="flex items-center gap-2 text-violet-600 hover:text-violet-700 font-medium mb-4"
                        >
                            <span>{showFar ? '▼' : '►'}</span>
                            Ver más vacantes ({totalFar})
                        </button>

                        {showFar && (
                            <div className="space-y-4">
                                <p className="text-gray-500 text-sm">
                                    Estas vacantes están más lejos pero puedes aplicar
                                </p>
                                {vacancies.far.map((vacancy, idx) => (
                                    <VacancyCard
                                        key={`far-${vacancy.posicion}-${vacancy.tiendaId}-${idx}`}
                                        vacancy={vacancy}
                                        onApply={() => handleApply(vacancy)}
                                        isFar={true}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Empty State */}
                {totalNear === 0 && totalFar === 0 && (
                    <div className="text-center py-12">
                        <span className="text-6xl mb-4 block">📭</span>
                        <h3 className="text-xl font-semibold text-gray-700 mb-2">
                            No hay vacantes disponibles
                        </h3>
                        <p className="text-gray-500">
                            Vuelve pronto, estamos actualizando constantemente
                        </p>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="bg-white border-t py-4 mt-8">
                <p className="text-center text-gray-400 text-sm">
                    Powered by <span className="text-violet-600 font-semibold">LIAH</span>
                </p>
            </div>
        </div>
    );
}

function VacancyCard({
    vacancy,
    onApply,
    isFar = false
}: {
    vacancy: Vacancy;
    onApply: () => void;
    isFar?: boolean;
}) {
    const maxDistance = getMaxDistanceForTurno(vacancy.turno || 'Mañana');
    const isNightShift = ['Noche', 'Rotativo'].includes(vacancy.turno || '');

    return (
        <div className={`bg-white rounded-xl border ${isFar ? 'border-gray-200' : 'border-green-200'} p-4 shadow-sm hover:shadow-md transition-shadow`}>
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-gray-900">{vacancy.posicion}</h3>
                        {vacancy.distanceCategory === 'perfect' && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                                ¡Muy cerca!
                            </span>
                        )}
                        {isNightShift && (
                            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full">
                                🌙 {vacancy.turno}
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-violet-600 font-medium">{vacancy.marcaNombre}</p>
                    <p className="text-sm text-gray-500 mt-1">
                        📍 {vacancy.tiendaNombre} • {vacancy.tiendaDistrito}
                    </p>
                    <div className="flex gap-3 mt-2 text-xs text-gray-500 flex-wrap">
                        <span className="px-2 py-1 bg-gray-100 rounded">{vacancy.modalidad}</span>
                        <span className="px-2 py-1 bg-gray-100 rounded">{vacancy.turno || 'Sin turno'}</span>
                        <span className="px-2 py-1 bg-violet-100 text-violet-700 rounded font-medium">
                            {vacancy.totalVacantes} vacante{vacancy.totalVacantes !== 1 ? 's' : ''}
                        </span>
                    </div>

                    {/* Distance indicator */}
                    {vacancy.distanceKm !== undefined && (
                        <div className="mt-2 flex items-center gap-2">
                            <span className={`text-xs ${vacancy.distanceKm <= maxDistance ? 'text-green-600' : 'text-amber-600'}`}>
                                📏 {formatDistance(vacancy.distanceKm)}
                            </span>
                            {vacancy.distanceKm > maxDistance && (
                                <span className="text-xs text-amber-500">
                                    (máx. recomendado: {maxDistance}km)
                                </span>
                            )}
                        </div>
                    )}
                </div>
                <button
                    onClick={onApply}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${isFar
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'bg-violet-600 text-white hover:bg-violet-700'
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
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin w-12 h-12 border-4 border-violet-200 border-t-violet-600 rounded-full"></div>
            </div>
        }>
            <VacantesContent />
        </Suspense>
    );
}
