'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { getDepartmentNames, getProvincesByDepartment, getDistrictsByProvince } from '@/lib/data/peru-locations';
import { calculateDistanceKm, getMaxDistanceForTurno, formatDistance, getDistanceCategory } from '@/lib/geo/distance-utils';
import type { Coordinates } from '@/lib/geo/distance-utils';

interface Vacancy {
    posicion: string;
    turno: string;
    modalidad: string;
    marcaNombre: string;
    tiendaNombre: string;
    tiendaDistrito: string;
    tiendaProvincia?: string;
    tiendaDepartamento?: string;
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
    const [allVacancies, setAllVacancies] = useState<Vacancy[]>([]);
    const [showFar, setShowFar] = useState(false);

    // Location Filters
    const [selectedDept, setSelectedDept] = useState('');
    const [selectedProv, setSelectedProv] = useState('');
    const [selectedDist, setSelectedDist] = useState('');
    const [availableProvinces, setAvailableProvinces] = useState<string[]>([]);
    const [availableDistricts, setAvailableDistricts] = useState<string[]>([]);

    const holdingSlug = searchParams.get('holding');
    const [brandColor, setBrandColor] = useState<string | null>(null);
    const [brandName, setBrandName] = useState<string | null>(null);
    const [brandLogo, setBrandLogo] = useState<string | null>(null);

    useEffect(() => {
        async function loadData() {
            const token = searchParams.get('token');
            // If no token, we just continue in 'public mode'
            
            try {
                let candidateCoords: Coordinates | null = null;
                let candidateData: CandidateSession | null = null;

                if (token) {
                    // Validate session and get candidate data
                    const sessionRes = await fetch('/api/portal/validate-session', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ token })
                    });

                    if (sessionRes.ok) {
                        const sessionData = await sessionRes.json();
                        setCandidate(sessionData.candidate);
                        candidateData = sessionData.candidate;
                        candidateCoords = sessionData.candidate.coordinates;
                    }
                }

                // Get aggregated vacancies - filter by holding if available
                const vacanciesUrl = holdingSlug
                    ? `/api/portal/vacancies-aggregated?holding=${holdingSlug}`
                    : '/api/portal/vacancies-aggregated';
                const vacanciesRes = await fetch(vacanciesUrl);
                const vacanciesData = await vacanciesRes.json();
                const vList = vacanciesData.vacancies || [];
                setAllVacancies(vList);

                // Calculate distance for each vacancy and categorize
                if (candidateCoords) {
                    const categorized = categorizeByDistance(
                        vList,
                        candidateCoords
                    );
                    setVacancies(categorized);
                } else {
                    // No candidate coords -> all are 'far' or 'near' based on manual filters (handled later by useMemo)
                    setVacancies({ near: [], acceptable: [], far: vList });
                }

            } catch (error) {
                console.error('Error loading data:', error);
                // In public mode, don't redirect away on error, just show empty
            } finally {
                setLoading(false);
            }
        }

        async function fetchHoldingConfig() {
            if (!holdingSlug) return;
            try {
                const q = query(collection(db, 'holdings'), where('slug', '==', holdingSlug.toLowerCase()));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    const data = snap.docs[0].data();
                    const b = data.config?.branding || data.branding || {};
                    if (b?.primaryColor) setBrandColor(b.primaryColor);
                    if (data.nombre) setBrandName(data.nombre);
                    if (data.logoUrl) setBrandLogo(data.logoUrl);
                }
            } catch (error) {
                console.error('Error fetching holding:', error);
            }
        }

        loadData();
        fetchHoldingConfig();
    }, [searchParams, holdingSlug]); // Removed router from dependencies to avoid loop

    // Update Provinces/Districts
    useEffect(() => {
        if (selectedDept) {
            setAvailableProvinces(getProvincesByDepartment(selectedDept).map(p => p.name));
            setAvailableDistricts([]);
            setSelectedProv('');
            setSelectedDist('');
        } else {
            setAvailableProvinces([]);
            setAvailableDistricts([]);
        }
    }, [selectedDept]);

    useEffect(() => {
        if (selectedDept && selectedProv) {
            setAvailableDistricts(getDistrictsByProvince(selectedDept, selectedProv).map(d => d.name));
            setSelectedDist('');
        } else {
            setAvailableDistricts([]);
        }
    }, [selectedDept, selectedProv]);

    // Apply manual filters
    const filteredVacancies = useMemo(() => {
        let list = [...allVacancies];
        if (selectedDept) list = list.filter(v => v.tiendaDepartamento === selectedDept);
        if (selectedProv) list = list.filter(v => v.tiendaProvincia === selectedProv);
        if (selectedDist) list = list.filter(v => v.tiendaDistrito === selectedDist);
        return list;
    }, [allVacancies, selectedDept, selectedProv, selectedDist]);

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
        // Go to vacancy detail page first (shows job info + apply button)
        let url = `/portal/vacante/${vacancy.rqIds[0]}`;
        const params = [];
        if (token) params.push(`token=${token}`);
        if (holdingSlug) params.push(`holding=${holdingSlug}`);
        if (params.length) url += '?' + params.join('&');
        router.push(url);
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin w-12 h-12 border-4 border-gray-200 rounded-full mx-auto mb-4" style={{ borderTopColor: brandColor || '#4F46E5' }}></div>
                    <p className="text-gray-600">Buscando vacantes para ti...</p>
                </div>
            </div>
        );
    }

    const totalNear = vacancies.near.length + vacancies.acceptable.length;
    const totalFar = vacancies.far.length;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div
                className="text-white transition-colors duration-500 shadow-lg"
                style={{ backgroundColor: brandColor || '#4F46E5' }}
            >
                <div className="max-w-4xl mx-auto px-4 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold italic uppercase tracking-tighter">Vacantes para ti</h1>
                            <p className="text-white/80 text-sm">
                                {brandName ? `Oportunidades en ${brandName}` : `Hola, ${candidate?.nombre} 👋`}
                            </p>
                        </div>
                        <div className="text-right flex items-center gap-4">
                            {brandLogo && <img src={brandLogo} alt="Logo" className="h-10 w-auto object-contain bg-white/10 p-1 rounded" />}
                            <div>
                                <p className="text-sm text-white/70">Tu ubicación</p>
                                <p className="font-semibold">{candidate?.distrito}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Location Filters */}
                <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 mb-8 -mt-12 relative z-10">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-xl">📍</span>
                        <h2 className="text-lg font-bold text-gray-900 uppercase italic tracking-tighter">Filtra por ubicación</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Departamento</label>
                            <select
                                value={selectedDept}
                                onChange={(e) => setSelectedDept(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500"
                            >
                                <option value="">Todos los Departamentos</option>
                                {getDepartmentNames().map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Provincia</label>
                            <select
                                value={selectedProv}
                                onChange={(e) => setSelectedProv(e.target.value)}
                                disabled={!selectedDept}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50"
                            >
                                <option value="">Todas las Provincias</option>
                                {availableProvinces.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Distrito</label>
                            <select
                                value={selectedDist}
                                onChange={(e) => setSelectedDist(e.target.value)}
                                disabled={!selectedProv}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50"
                            >
                                <option value="">Todos los Distritos</option>
                                {availableDistricts.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Candidate specific view (Near) - Only if candidate has coordinates and NO manual filter is active */}
                {candidate?.coordinates && !selectedDept && !selectedProv && !selectedDist && totalNear > 0 && (
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
                            Estas vacantes están dentro de tu rango de distancia (San Isidro)
                        </p>

                        <div className="space-y-4">
                            {[...vacancies.near, ...vacancies.acceptable].map((vacancy, idx) => (
                                <VacancyCard
                                    key={`${vacancy.posicion}-${vacancy.tiendaId}-${idx}`}
                                    vacancy={vacancy}
                                    onApply={() => handleApply(vacancy)}
                                    brandColor={brandColor}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Manual Filter or No Match View */}
                {(selectedDept || (!candidate?.coordinates && totalFar > 0)) && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900">
                                {selectedDept ? 'Resultados de búsqueda' : 'Todas las vacantes'}
                            </h2>
                            <span className="px-3 py-1 bg-violet-100 text-violet-700 rounded-full text-sm font-black italic uppercase tracking-tighter">
                                {filteredVacancies.length} vacantes
                            </span>
                        </div>
                        
                        {filteredVacancies.length > 0 ? (
                            <div className="space-y-4">
                                {filteredVacancies.map((vacancy, idx) => (
                                    <VacancyCard
                                        key={`filtered-${vacancy.posicion}-${vacancy.tiendaId}-${idx}`}
                                        vacancy={vacancy}
                                        onApply={() => handleApply(vacancy)}
                                        brandColor={brandColor}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                                <span className="text-6xl mb-4 block opacity-20">🏪</span>
                                <h3 className="text-xl font-bold text-slate-400">No encontramos vacantes</h3>
                                <p className="text-slate-400 text-sm mt-2">Prueba cambiando los filtros de ubicación</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Footer and far vacancies section removed if redundant with the new search logic */}

                {/* Empty State (Original) */}
                {!selectedDept && totalNear === 0 && totalFar === 0 && (
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
            <div className="bg-white border-t py-6 mt-8">
                <p className="text-center text-gray-400 text-sm">
                    Powered by <span className="font-black italic uppercase tracking-tighter" style={{ color: brandColor || '#4F46E5' }}>LIAH</span>
                </p>
            </div>
        </div>
    );
}

function VacancyCard({
    vacancy,
    onApply,
    isFar = false,
    brandColor = null
}: {
    vacancy: Vacancy;
    onApply: () => void;
    isFar?: boolean;
    brandColor?: string | null;
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
                    <p className="text-sm font-bold uppercase tracking-wide" style={{ color: brandColor || '#4F46E5' }}>{vacancy.marcaNombre}</p>
                    <p className="text-sm text-gray-500 mt-1">
                        📍 {vacancy.tiendaNombre} • {vacancy.tiendaDistrito}{vacancy.tiendaProvincia ? `, ${vacancy.tiendaProvincia}` : ''}{vacancy.tiendaDepartamento ? `, ${vacancy.tiendaDepartamento}` : ''}
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
                    className="px-6 py-2 rounded-lg font-bold transition-all hover:scale-105 shadow-md active:scale-95"
                    style={{
                        backgroundColor: isFar ? '#f3f4f6' : (brandColor || '#4F46E5'),
                        color: isFar ? '#374151' : 'white'
                    }}
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
