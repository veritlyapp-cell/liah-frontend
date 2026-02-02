'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, Navigation, Zap, ArrowRight, Loader2 } from 'lucide-react';
import { calculateDistanceKm, formatDistance } from '@/lib/geo/distance-utils';

interface GeolocationJobSearchProps {
    allJobs: any[];
    onFilterResults: (filtered: any[], userCoords: { lat: number, lng: number } | null) => void;
    theme?: 'light' | 'dark';
    colors?: {
        accent: string;
        bg?: string;
    };
}

export default function GeolocationJobSearch({
    allJobs,
    onFilterResults,
    theme = 'dark', // Default to dark for premium look
    colors = { accent: '#FF6B35' } // Default NGR orange
}: GeolocationJobSearchProps) {
    const [address, setAddress] = useState('');
    const [loading, setLoading] = useState(false);
    const [maxDistance, setMaxDistance] = useState(10); // Default 10km
    const [lastCoords, setLastCoords] = useState<{ lat: number, lng: number } | null>(null);

    const isDark = theme === 'dark';

    // Initial load: Pass all jobs back to parent
    useEffect(() => {
        if (allJobs.length > 0 && !lastCoords) {
            console.log('[GeolocationSearch] Initializing with all jobs:', allJobs.length);
            onFilterResults(allJobs, null);
        }
    }, [allJobs.length]);

    // Re-filter when distance changes if we have coordinates
    useEffect(() => {
        if (lastCoords) {
            filterJobs(lastCoords);
        }
    }, [maxDistance]);

    const handleUseMyLocation = () => {
        console.log('[GeolocationSearch] "Usar mi ubicación" clicked');
        setLoading(true);
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    console.log('[GeolocationSearch] Location acquired:', position.coords.latitude, position.coords.longitude);
                    const userCoords = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    filterJobs(userCoords);
                },
                (error) => {
                    console.error("[GeolocationSearch] Error getting location:", error);
                    alert("No pudimos obtener tu ubicación automáticamente. Por favor ingresa tu distrito.");
                    setLoading(false);
                },
                { timeout: 10000 }
            );
        } else {
            alert("Tu navegador no soporta geolocalización.");
            setLoading(false);
        }
    };

    const handleSearchAddress = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('[GeolocationSearch] "Buscar" clicked for address:', address);
        if (!address.trim()) return;

        setLoading(true);
        try {
            const res = await fetch('/api/geocode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address })
            });
            const data = await res.json();
            if (data.success && data.coordinates) {
                console.log('[GeolocationSearch] Geocoding success:', data.coordinates);
                filterJobs(data.coordinates);
            } else {
                console.error('[GeolocationSearch] Geocoding failed:', data.error);
                alert("No encontramos esa dirección. Intenta con una más específica.");
                setLoading(false);
            }
        } catch (error) {
            console.error("[GeolocationSearch] Fetch error:", error);
            setLoading(false);
        }
    };

    const filterJobs = (userCoords: { lat: number, lng: number }) => {
        console.log('[GeolocationSearch] Filtering jobs by distance:', maxDistance, 'KM from', userCoords);
        setLastCoords(userCoords);

        const withDistance = allJobs.map(job => {
            if (!job.storeCoordinates) return { ...job, distance: 999999 }; // Very far if no coords
            return {
                ...job,
                distance: calculateDistanceKm(userCoords, job.storeCoordinates)
            };
        });

        const filtered = withDistance.filter(job => {
            // If job has no coordinates, we only show it if the user REPLICATED a global search 
            // but for now, if they search, we only show what's nearby.
            if (job.distance === 999999) return false;
            return job.distance <= maxDistance;
        }).sort((a, b) => (a.distance || 0) - (b.distance || 0));

        console.log(`[GeolocationSearch] Found ${filtered.length} jobs near user out of ${allJobs.length}`);
        onFilterResults(filtered, userCoords);
        setLoading(false);
    };

    return (
        <div className="w-full max-w-4xl mx-auto px-6">
            <div
                className={`rounded-[2.5rem] p-6 md:p-10 shadow-2xl border transition-all duration-300 ${isDark
                    ? 'bg-neutral-900/90 backdrop-blur-xl border-neutral-800 shadow-black'
                    : 'bg-white border-violet-100 shadow-violet-200/50'
                    }`}
            >
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
                    <div>
                        <h2 className={`text-xl md:text-2xl font-black italic uppercase tracking-tighter leading-tight ${isDark ? 'text-white' : 'text-gray-900'
                            }`}>
                            Encuentra empleos <br />
                            <span
                                className="underline decoration-4 underline-offset-4"
                                style={{
                                    textDecorationColor: isDark ? `${colors.accent}44` : '#DDD6FE',
                                    color: colors.accent
                                }}
                            >
                                cerca a tu casa
                            </span>
                        </h2>
                    </div>

                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleUseMyLocation();
                        }}
                        className={`flex items-center gap-3 px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 hover:brightness-110`}
                        style={{
                            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F5F3FF',
                            color: isDark ? 'white' : colors.accent,
                            border: isDark ? '1px solid rgba(255,255,255,0.1)' : 'none'
                        }}
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="animate-spin" size={16} /> : <Navigation size={16} className="fill-current" />}
                        {loading ? 'Buscando...' : 'UBICACIÓN ACTUAL'}
                    </button>
                </div>

                <form onSubmit={handleSearchAddress} className="relative group z-10">
                    <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Ingresa tu distrito o dirección..."
                        className={`w-full pl-14 pr-32 py-5 border-2 border-transparent rounded-2xl text-lg font-bold outline-none transition-all placeholder:text-gray-500 ${isDark
                            ? 'bg-neutral-800 text-white focus:border-white focus:bg-neutral-700'
                            : 'bg-gray-50 text-gray-900 focus:border-violet-600 focus:bg-white'
                            }`}
                        style={{
                            borderColor: isDark ? 'rgba(255,255,255,0.05)' : undefined
                        }}
                    />
                    <div className={`absolute left-5 top-1/2 -translate-y-1/2 transition-colors pointer-events-none ${isDark ? 'text-gray-500 group-focus-within:text-white' : 'text-gray-300 group-focus-within:text-violet-600'
                        }`}>
                        <MapPin size={24} />
                    </div>
                    <button
                        type="submit"
                        className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-3 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:shadow-xl transition-all flex items-center gap-2 hover:brightness-110 active:scale-95"
                        style={{
                            backgroundColor: colors.accent
                        }}
                        disabled={loading}
                    >
                        {loading ? '...' : 'BUSCAR'} <ArrowRight size={16} />
                    </button>
                </form>

                <div className="mt-6 flex items-center gap-4 overflow-x-auto pb-2 scrollbar-hide">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">Rango:</span>
                    {[3, 5, 10, 20].map((dist) => (
                        <button
                            key={dist}
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setMaxDistance(dist);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all whitespace-nowrap ${maxDistance === dist
                                ? 'shadow-lg text-white'
                                : isDark ? 'bg-neutral-800 text-gray-400 hover:bg-neutral-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                }`}
                            style={{
                                backgroundColor: maxDistance === dist ? colors.accent : undefined
                            }}
                        >
                            {dist} KM
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
