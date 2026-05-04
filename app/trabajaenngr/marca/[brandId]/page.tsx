'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Search, ChevronRight, Briefcase, Users, Heart, ArrowLeft, Clock, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, getDoc, getDocs } from 'firebase/firestore';

const HOLDING_IDS = ['ngr', 'ngr ', 'NGR', 'NGR ']; 

// Shared styles (mirrored from main page for consistency)
const BRAND_STYLES: Record<string, { color: string, textColor: string, bannerColor: string, slogan: string }> = {
  'bembos': {
    color: 'bg-[#2F3786]',
    textColor: 'text-[#2F3786]',
    bannerColor: 'bg-[#2F3786]',
    slogan: 'En Bembos, la hamburguesa se hace y se disfruta a la peruana.'
  },
  'papa-johns': {
    color: 'bg-[#C23122]',
    textColor: 'text-[#C23122]',
    bannerColor: 'bg-[#C23122]',
    slogan: 'Mejores ingredientes, mejor pizza.'
  },
  'popeyes': {
    color: 'bg-[#E37B1D]',
    textColor: 'text-[#E37B1D]',
    bannerColor: 'bg-[#E37B1D]',
    slogan: 'El auténtico sabor cajún.'
  },
  'chinawok': {
    color: 'bg-[#B53E34]',
    textColor: 'text-[#B53E34]',
    bannerColor: 'bg-[#B53E34]',
    slogan: 'El rico sabor oriental al paso.'
  },
  'dunkin': {
    color: 'bg-[#CC6538]',
    textColor: 'text-[#CC6538]',
    bannerColor: 'bg-[#CC6538]',
    slogan: 'América se mueve con Dunkin.'
  },
  'don-belisario': {
    color: 'bg-[#BE2B35]',
    textColor: 'text-[#BE2B35]',
    bannerColor: 'bg-[#BE2B35]',
    slogan: 'El pollo a la brasa más sabroso.'
  }
};

export default function BrandLandingPage() {
  const { brandId } = useParams();
  const [marca, setMarca] = useState<any>(null);
  const [rqs, setRqs] = useState<any[]>([]);
  const [tiendas, setTiendas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProvincia, setSelectedProvincia] = useState('');
  const [selectedDistrito, setSelectedDistrito] = useState('');
  const [selectedJornada, setSelectedJornada] = useState('');

  const brandStyle = useMemo(() => {
    if (!marca) return null;
    const slug = marca.slug || marca.nombre.toLowerCase().replace(/[^a-z0-9]/g, '-');
    return BRAND_STYLES[slug] || {
      color: 'bg-orange-600',
      textColor: 'text-orange-600',
      bannerColor: 'bg-orange-600',
      slogan: 'Sé parte de nuestra gran familia.'
    };
  }, [marca]);

  useEffect(() => {
    if (!brandId) return;

    // 1. Fetch Brand Data
    const marcaRef = doc(db, 'marcas', brandId as string);
    getDoc(marcaRef).then(snap => {
      if (snap.exists()) {
        setMarca({ id: snap.id, ...snap.data() });
      } else {
        const qSlug = query(collection(db, 'marcas'), where('slug', '==', brandId));
        getDocs(qSlug).then(snapSlug => {
          if (!snapSlug.empty) {
            setMarca({ id: snapSlug.docs[0].id, ...snapSlug.docs[0].data() });
          }
        });
      }
    });
  }, [brandId]);

  useEffect(() => {
    if (!marca?.id) return;

    // 2. Fetch RQs for this brand
    const qRqs = query(collection(db, 'rqs'), where('marcaId', '==', marca.id));
    const unsubRqs = onSnapshot(qRqs, (snapshot) => {
      const loaded = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const activeRqs = loaded.filter((rq: any) => 
        rq.approvalStatus === 'approved' && 
        (rq.status === 'active' || rq.status === 'recruiting' || rq.status === 'open')
      );
      setRqs(activeRqs);
      setLoading(false);
    });

    // 3. Fetch Tiendas for the whole holding and filter by brand in client (robust check)
    const qTiendas = query(collection(db, 'tiendas'), where('holdingId', 'in', HOLDING_IDS));
    const unsubTiendas = onSnapshot(qTiendas, (snapshot) => {
      const allTiendas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      const brandTiendas = allTiendas.filter(t => 
        t.marcaId === marca.id || 
        (t.marcaNombre && t.marcaNombre.toLowerCase().trim() === marca.nombre.toLowerCase().trim())
      );
      setTiendas(brandTiendas);
    });

    return () => {
      unsubRqs();
      unsubTiendas();
    };
  }, [marca?.id, marca?.nombre]);

  const uniqueProvincias = useMemo(() => {
    return Array.from(new Set(rqs.map(r => r.provincia || 'Lima'))).sort();
  }, [rqs]);

  const uniqueDistritos = useMemo(() => {
    return Array.from(new Set(rqs.filter(r => !selectedProvincia || r.provincia === selectedProvincia).map(r => r.distrito))).filter(Boolean).sort();
  }, [rqs, selectedProvincia]);

  const groupedResults = useMemo(() => {
    const filtered = rqs.filter(r => {
      const matchSearch = !searchTerm || r.posicion.toLowerCase().includes(searchTerm.toLowerCase()) || r.tiendaNombre.toLowerCase().includes(searchTerm.toLowerCase());
      const matchProv = !selectedProvincia || r.provincia === selectedProvincia || (!r.provincia && selectedProvincia === 'Lima');
      const matchDist = !selectedDistrito || r.distrito === selectedDistrito;
      const matchJornada = !selectedJornada || r.jornada === selectedJornada;
      return matchSearch && matchProv && matchDist && matchJornada;
    });

    // Grouping by Position + Tienda + Jornada
    const groups: Record<string, any> = {};
    filtered.forEach(rq => {
      const key = `${rq.posicion}|${rq.tiendaNombre}|${rq.jornada || 'TC'}`.toLowerCase();
      if (!groups[key]) {
        groups[key] = {
          ...rq,
          count: 1,
          allIds: [rq.id]
        };
      } else {
        groups[key].count += 1;
        groups[key].allIds.push(rq.id);
      }
    });

    return Object.values(groups);
  }, [rqs, searchTerm, selectedProvincia, selectedDistrito, selectedJornada]);

  if (loading && !marca) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* BRAND BANNER */}
      <section className={`${brandStyle?.bannerColor} pt-32 pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden`}>
        <div className="absolute top-0 right-0 w-1/3 h-full opacity-10">
          <img src={marca?.logoUrl} alt="" className="w-full h-full object-contain scale-150 rotate-12" />
        </div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <Link href="/trabajaenngr" className="inline-flex items-center gap-2 text-white/80 hover:text-white text-sm font-bold uppercase tracking-widest mb-12 transition-colors">
            <ArrowLeft size={16} />
            Volver a NGR
          </Link>

          <div className="flex flex-col md:flex-row items-center gap-12 text-center md:text-left">
            <div className="w-40 h-40 bg-white rounded-[32px] p-6 shadow-2xl flex items-center justify-center shrink-0">
              <img src={marca?.logoUrl} alt={marca?.nombre} className="w-full h-full object-contain" />
            </div>
            
            <div className="text-white max-w-2xl">
              <h1 className="text-6xl font-black italic tracking-tight mb-2 uppercase">{marca?.nombre}</h1>
              <p className="text-xl font-medium text-white/90 italic mb-10">
                “{brandStyle?.slogan}”
              </p>
              
              <div className="flex flex-wrap justify-center md:justify-start gap-12">
                <div className="flex flex-col">
                  <span className="text-4xl font-black italic">{rqs.length}</span>
                  <span className="text-xs font-bold uppercase tracking-widest text-white/60">Empleos disponibles</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-4xl font-black italic">{tiendas.length}</span>
                  <span className="text-xs font-bold uppercase tracking-widest text-white/60">Locales</span>
                </div>
              </div>
            </div>

            <div className="hidden lg:block flex-1">
               <img 
                src={`https://www.trabajaenngr.pe/img/marcas/${marca?.slug || brandId}_banner.jpg`} 
                alt="Equipo" 
                className="rounded-3xl shadow-2xl border-4 border-white/10"
                onError={(e) => {
                  (e.target as any).src = 'https://www.trabajaenngr.pe/img/equipo_generico.jpg';
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* FILTER SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-20 pb-32">
        <div className="bg-white rounded-[32px] shadow-2xl shadow-slate-200/50 p-8 border border-slate-100">
          <div className="mb-8">
            <h2 className="text-2xl font-black text-slate-900 italic uppercase">Conoce Nuestras Vacantes</h2>
            <p className="text-sm font-bold text-slate-400 mt-1 uppercase">Encuentra oportunidades por local</p>
          </div>

          {/* Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-10">
            <div className="md:col-span-4 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input 
                type="text"
                placeholder="Buscar por puesto o palabra clave"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-orange-600 focus:bg-white outline-none transition-all"
              />
            </div>
            
            <div className="md:col-span-2 relative">
              <select 
                value={selectedProvincia}
                onChange={(e) => { setSelectedProvincia(e.target.value); setSelectedDistrito(''); }}
                className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-orange-600 focus:bg-white outline-none appearance-none cursor-pointer"
              >
                <option value="">Provincia</option>
                {uniqueProvincias.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={16} />
            </div>

            <div className="md:col-span-2 relative">
              <select 
                value={selectedDistrito}
                onChange={(e) => setSelectedDistrito(e.target.value)}
                className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-orange-600 focus:bg-white outline-none appearance-none cursor-pointer"
              >
                <option value="">Distrito</option>
                {uniqueDistritos.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={16} />
            </div>

            <div className="md:col-span-2 relative">
              <select 
                value={selectedJornada}
                onChange={(e) => setSelectedJornada(e.target.value)}
                className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-orange-600 focus:bg-white outline-none appearance-none cursor-pointer"
              >
                <option value="">Jornada</option>
                <option value="Tiempo completo">Tiempo completo</option>
                <option value="Part-time">Part-time</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={16} />
            </div>

            <div className="md:col-span-2">
              <button 
                onClick={() => { setSearchTerm(''); setSelectedProvincia(''); setSelectedDistrito(''); setSelectedJornada(''); }}
                className="w-full h-full py-4 px-4 bg-slate-100 text-slate-400 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
              >
                Limpiar
              </button>
            </div>
          </div>

          {/* Results Area */}
          <div className="space-y-4">
            <div className="flex justify-between items-center px-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{groupedResults.length} posiciones encontradas</span>
              <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Ordenar por: <span className="text-orange-600">Más recientes</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {groupedResults.map(rq => (
                <div key={rq.id} className="p-8 rounded-[32px] bg-white border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-8 group hover:border-orange-200 hover:shadow-2xl hover:shadow-orange-600/5 transition-all">
                  <div className="flex gap-6 items-center flex-1">
                    <div className="w-16 h-16 rounded-[20px] bg-slate-50 border border-slate-100 flex items-center justify-center p-3 shadow-inner group-hover:scale-105 transition-transform">
                      <img src={marca?.logoUrl} alt={marca?.nombre} className="w-full h-full object-contain" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight group-hover:text-orange-600 transition-colors">{rq.posicion}</h3>
                        {rq.count > 1 && (
                          <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full text-[9px] font-black uppercase">
                            {rq.count} vacantes
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <MapPin size={14} className="text-orange-600" />
                          <span className="text-[11px] font-bold uppercase">{rq.distrito || rq.tiendaDistrito}, {rq.provincia || rq.tiendaProvincia || 'Lima'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Briefcase size={14} className="text-orange-600" />
                          <span className="text-[11px] font-bold uppercase">{rq.tiendaNombre}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Clock size={14} className="text-orange-600" />
                          <span className="text-[11px] font-bold uppercase">{rq.jornada || 'Tiempo completo'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Link 
                    href={`/portal/vacante/${rq.id}`}
                    className={`w-full md:w-auto px-10 py-4 ${brandStyle?.bannerColor} text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:brightness-110 shadow-xl shadow-slate-200 transition-all text-center italic`}
                  >
                    Postular ahora
                  </Link>
                </div>
              ))}

              {groupedResults.length === 0 && (
                <div className="py-20 text-center bg-slate-50/50 rounded-[32px] border border-dashed border-slate-200">
                  <Search className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-sm font-bold text-slate-400 uppercase italic">No se encontraron vacantes para estos filtros.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#0B1120] text-gray-300 py-16 px-4 sm:px-6 lg:px-8 border-t-[8px] border-orange-600">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3">
            <img 
              src="/logos/ngr-logo-full.png" 
              alt="NGR" 
              className="h-8 w-auto brightness-0 invert opacity-100"
              onError={(e) => { (e.target as any).src = 'https://www.trabajaenngr.pe/logos/logo_NGR.svg'; }}
            />
            <span className="text-white/20">|</span>
            <span className="text-xs font-bold uppercase tracking-widest">{marca?.nombre}</span>
          </div>
          <p className="text-[10px] uppercase font-black tracking-widest text-gray-500 italic">
            © {new Date().getFullYear()} NGR. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
