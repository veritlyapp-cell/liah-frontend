'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';
import { Search, ChevronDown, MapPin, Users, Heart, Briefcase, ChevronRight, Menu, X, CheckCircle, Play, Filter, Clock } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

const HOLDING_IDS = ['ngr', 'ngr ', 'NGR', 'NGR ']; 

const BRAND_LOGOS = [
  { name: 'Bembos', url: '/logos/logo_bembos.png', slug: 'bembos' },
  { name: 'Papa Johns', url: '/logos/logo_papa_johns.png', slug: 'papa-johns' },
  { name: 'China Wok', url: '/logos/logo_china_wok.png', slug: 'china-wok' },
  { name: 'Dunkin', url: '/logos/logo_dunkin.png', slug: 'dunkin' },
  { name: 'Popeyes', url: '/logos/logo-popeyes.png', slug: 'popeyes' },
  { name: 'Don Belisario', url: '/logos/logo-don-belisario.png', slug: 'don-belisario' }
];

const BRAND_STYLES: Record<string, { color: string, textColor: string, logo: string, description: string, brandId: string }> = {
  'bembos': {
    brandId: 'bembos',
    color: 'bg-[#2F3786]',
    textColor: 'text-[#2F3786]',
    logo: '🍔',
    description: 'La hamburguesa peruana con sabor único. Únete a nuestro equipo dinámico y apasionado.'
  },
  'papa-johns': {
    brandId: 'papa-johns',
    color: 'bg-[#C23122]',
    textColor: 'text-[#C23122]',
    logo: '🍕',
    description: 'Mejores ingredientes, mejor pizza. Sé parte de la familia Papa John\'s en Perú.'
  },
  'popeyes': {
    brandId: 'popeyes',
    color: 'bg-[#E37B1D]',
    textColor: 'text-[#E37B1D]',
    logo: '🍗',
    description: 'El auténtico sabor cajún. Buscamos talento con chispa y energía.'
  },
  'chinawok': {
    brandId: 'chinawok',
    color: 'bg-[#B53E34]',
    textColor: 'text-[#B53E34]',
    logo: '🥡',
    description: 'El rico sabor oriental al paso. Desarrolla tu carrera con nosotros.'
  },
  'dunkin': {
    brandId: 'dunkin',
    color: 'bg-[#CC6538]',
    textColor: 'text-[#CC6538]',
    logo: '🍩',
    description: 'América se mueve con Dunkin. Lleva alegría y energía a nuestros clientes.'
  },
  'don-belisario': {
    brandId: 'don-belisario',
    color: 'bg-[#BE2B35]',
    textColor: 'text-[#BE2B35]',
    logo: '🐔',
    description: 'El pollo a la brasa más sabroso. Brinda una experiencia familiar inigualable.'
  }
};

const BENEFICIOS = [
  {
    titulo: 'Descuento NGR',
    desc: '25% de descuento en todas nuestras marcas desde el primer día.',
    icon: <Heart className="w-8 h-8 text-orange-500" />
  },
  {
    titulo: 'En Planilla',
    desc: 'Beneficios de ley completos: Vacaciones, Gratificaciones, CTS y EsSalud.',
    icon: <Briefcase className="w-8 h-8 text-orange-500" />
  },
  {
    titulo: 'Descuentos Corporativos',
    desc: 'Alianzas exclusivas con Grupo Intercorp (Cineplanet, Plaza Vea, etc).',
    icon: <Users className="w-8 h-8 text-orange-500" />
  },
  {
    titulo: 'Plataforma de Bienestar',
    desc: 'Atención gratuita en psicología, medicina y nutrición para ti y tu familia.',
    icon: <Heart className="w-8 h-8 text-orange-500" />
  },
  {
    titulo: 'Línea de Carrera',
    desc: 'Capacitación constante y acompañamiento para tu crecimiento profesional.',
    icon: <ChevronRight className="w-8 h-8 text-orange-500" />
  },
  {
    titulo: 'Great Place to Work',
    desc: 'Certificados como una de las mejores empresas para trabajar en el Perú.',
    icon: <CheckCircle className="w-8 h-8 text-orange-500" />
  }
];

export default function NGRCareersPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [marcas, setMarcas] = useState<any[]>([]);
  const [tiendas, setTiendas] = useState<any[]>([]);
  const [rqs, setRqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState(1);
  const [selectedDepartamento, setSelectedDepartamento] = useState('');
  const [selectedProvincia, setSelectedProvincia] = useState('');
  const [selectedDistrito, setSelectedDistrito] = useState('');
  const [filterBrandId, setFilterBrandId] = useState('');

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  useEffect(() => {
    // Escuchar marcas del holding
    const qMarcas = query(collection(db, 'marcas'), where('holdingId', 'in', HOLDING_IDS));
    const unsubMarcas = onSnapshot(qMarcas, (snapshot) => {
      const loaded = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMarcas(loaded);
    });

    // Escuchar tiendas registradas del holding
    const qTiendas = query(collection(db, 'tiendas'), where('holdingId', 'in', HOLDING_IDS));
    const unsubTiendas = onSnapshot(qTiendas, (snapshot) => {
      const loaded = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTiendas(loaded);
    });

    // Escuchar vacantes (RQs) aprobadas y activas del holding
    const qRqs = query(collection(db, 'rqs'), where('holdingId', 'in', HOLDING_IDS)); 
    const unsubRqs = onSnapshot(qRqs, (snapshot) => {
      const loaded = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const filtered = loaded.filter((rq: any) => 
        rq.approvalStatus === 'approved' && 
        (rq.status === 'active' || rq.status === 'recruiting' || rq.status === 'open')
      );
      setRqs(filtered);
      setLoading(false);
    });

    return () => {
      unsubMarcas();
      unsubTiendas();
      unsubRqs();
    };
  }, []);

  const marcasConData = useMemo(() => {
    return marcas.map(marca => {
      const slug = marca.slug || marca.nombre.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const style = BRAND_STYLES[slug] || {
        color: 'bg-orange-600',
        textColor: 'text-orange-600',
        logo: '🏢',
        description: 'Sé parte de una de las marcas más importantes del sector gastronómico.'
      };
      
      const vacantesCount = rqs.filter((rq: any) => rq.marcaId === marca.id).length;
      const tiendasCount = tiendas.filter((t: any) => t.marcaId === marca.id).length;

      return { ...marca, ...style, vacantes: vacantesCount, tiendasCount };
    }).filter(m => m.activa !== false);
  }, [marcas, rqs, tiendas]);

  const totalVacantes = rqs.length;

  const normalize = (str: string) => (str || '').trim().toUpperCase();

  const getLoc = (r: any) => ({
    dep: normalize(r.tiendaDepartamento || r.departamento || 'LIMA'),
    prov: normalize(r.tiendaProvincia || r.provincia || r.tiendaDepartamento || r.departamento || 'LIMA'),
    dist: normalize(r.tiendaDistrito || r.distrito)
  });

  const uniqueDepartamentos = useMemo(() => {
    const deps = rqs.map(r => getLoc(r).dep);
    return Array.from(new Set(deps)).sort();
  }, [rqs]);

  const uniqueProvincias = useMemo(() => {
    const filtered = rqs.filter(r => getLoc(r).dep === selectedDepartamento);
    const provs = filtered.map(r => getLoc(r).prov);
    return Array.from(new Set(provs)).sort();
  }, [rqs, selectedDepartamento]);

  const uniqueDistritos = useMemo(() => {
    const filtered = rqs.filter(r => 
      getLoc(r).dep === selectedDepartamento && 
      getLoc(r).prov === selectedProvincia
    );
    return Array.from(new Set(filtered.map(r => getLoc(r).dist))).filter(Boolean).sort();
  }, [rqs, selectedDepartamento, selectedProvincia]);

  const groupedFilteredResults = useMemo(() => {
    const filtered = rqs.filter(r => {
      const loc = getLoc(r);
      const matchDep = !selectedDepartamento || loc.dep === selectedDepartamento;
      const matchProv = !selectedProvincia || loc.prov === selectedProvincia;
      const matchDist = !selectedDistrito || loc.dist === selectedDistrito;
      const matchBrand = !filterBrandId || r.marcaId === filterBrandId;
      return matchDep && matchProv && matchDist && matchBrand;
    });

    const groups: Record<string, any> = {};
    filtered.forEach(rq => {
      const key = `${rq.posicion}|${rq.tiendaNombre}|${rq.jornada || 'TC'}`.toLowerCase();
      if (!groups[key]) {
        groups[key] = { ...rq, count: 1 };
      } else {
        groups[key].count += 1;
      }
    });

    return Object.values(groups);
  }, [rqs, selectedDepartamento, selectedProvincia, selectedDistrito, filterBrandId]);

  const handleOpenSearch = (brandId = '') => {
    setFilterBrandId(brandId);
    setModalStep(1);
    setSelectedDepartamento('');
    setSelectedProvincia('');
    setSelectedDistrito('');
    setIsModalOpen(true);
  };

  const ESTADISTICAS_REALES = useMemo(() => [
    { valor: '7,300+', etiqueta: 'Colaboradores' },
    { valor: marcas.length.toString(), etiqueta: 'Marcas Icónicas' },
    { valor: tiendas.length.toString(), etiqueta: 'Tiendas en Perú' },
    { valor: uniqueDepartamentos.length > 0 ? uniqueDepartamentos.length.toString() : '14', etiqueta: 'Departamentos' }
  ], [marcas, tiendas, uniqueDepartamentos]);

  return (
    <div className="min-h-screen bg-[#FDF8F6] text-gray-900 font-sans selection:bg-orange-200">
      
      <motion.div className="fixed top-0 left-0 right-0 h-1 bg-orange-600 origin-left z-[100]" style={{ scaleX }} />

      <header className="fixed top-0 left-0 right-0 bg-white shadow-sm z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center group cursor-pointer h-full py-2 overflow-visible">
              <img 
                src="/logos/ngr-logo-full.png" 
                alt="NGR Logo" 
                className="h-16 w-auto object-contain scale-[1.6] transform origin-left"
                onError={(e) => { (e.target as any).src = 'https://www.trabajaenngr.pe/logos/logo_NGR.svg'; }}
              />
            </div>

            <nav className="hidden lg:flex items-center gap-8">
              <a href="#marcas" className="text-gray-600 hover:text-orange-600 font-bold transition-colors text-xs uppercase tracking-widest">Nuestras Marcas</a>
              <a href="#cultura" className="text-gray-600 hover:text-orange-600 font-bold transition-colors text-xs uppercase tracking-widest">Nuestra Cultura</a>
              <a href="#beneficios" className="text-gray-600 hover:text-orange-600 font-bold transition-colors text-xs uppercase tracking-widest">Beneficios</a>
              <button onClick={() => handleOpenSearch()} className="bg-orange-600 text-white px-5 py-2 rounded-full font-black hover:bg-orange-700 transition-colors shadow-lg text-[9px] uppercase tracking-[0.15em]">
                Portal de Empleo
              </button>
            </nav>

            <button className="lg:hidden p-2 text-gray-600" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </header>

      <section className="pt-32 pb-12 px-4 bg-orange-600 text-white relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm text-xs font-medium mb-4">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            {loading ? 'Buscando vacantes...' : `+${totalVacantes} Vacantes disponibles hoy`}
          </motion.div>
          <motion.h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4 leading-tight uppercase italic">¿Listo(a) para iniciar tu carrera en NGR?</motion.h1>
          <motion.p className="text-lg md:text-xl text-orange-100 mb-8 max-w-2xl mx-auto">Únete a más de 7,300 personas que ya forman parte de la familia NGR. Tu próximo gran desafío te está esperando.</motion.p>
          <button onClick={() => handleOpenSearch()} className="inline-flex items-center justify-center gap-2 bg-white text-orange-600 px-8 py-4 rounded-full font-bold text-lg hover:bg-gray-50 hover:shadow-2xl transition-all transform hover:-translate-y-1 shadow-xl">
            <Search className="w-5 h-5" /> Buscar Vacantes
          </button>
        </div>
      </section>

      <div className="bg-white py-14 border-b border-gray-100 relative z-20">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap justify-center items-center gap-12 md:gap-24">
          {BRAND_LOGOS.map((logo, i) => (
            <img key={i} src={logo.url} alt={logo.name} className="h-16 md:h-24 w-auto object-contain hover:scale-125 transition-transform cursor-pointer" />
          ))}
        </div>
      </div>

      <section className="relative -mt-6 z-20 max-w-6xl mx-auto px-4 mb-16 pt-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {ESTADISTICAS_REALES.map((stat, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 text-center shadow-lg border border-gray-100 transform hover:-translate-y-1 transition-all">
              <div className="text-2xl font-black text-orange-600 mb-1 italic">{stat.valor}</div>
              <div className="text-[10px] text-gray-600 font-medium uppercase tracking-widest">{stat.etiqueta}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="beneficios" className="py-20 px-4 bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4 uppercase italic">¿Por qué trabajar en NGR?</h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">No solo ofrecemos un empleo, te brindamos un lugar donde crecer, disfrutar y construir tu futuro.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {BENEFICIOS.map((ben, i) => (
              <div key={i} className="text-center p-8 bg-white rounded-3xl border border-slate-50 hover:border-orange-100 hover:shadow-2xl hover:shadow-orange-600/5 transition-all group">
                <div className="w-16 h-16 mx-auto bg-orange-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">{ben.icon}</div>
                <h3 className="text-xl font-black text-slate-900 mb-3 uppercase italic tracking-tight">{ben.titulo}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{ben.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-orange-600 text-white">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-black mb-16 uppercase italic tracking-tight">Experiencia de los colaboradores</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center text-left">
            <div className="aspect-video bg-black/20 rounded-[32px] overflow-hidden shadow-2xl relative group cursor-pointer border-4 border-white/20 transition-all hover:scale-[1.02]">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 bg-white text-orange-600 rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform"><Play size={32} className="ml-1 fill-current" /></div>
              </div>
              <p className="absolute bottom-6 left-6 font-black text-xl uppercase tracking-widest italic">Video Testimonial NGR</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {['Miguel Díaz', 'Pasión Gatica', 'Celeste Agustín', 'Próximamente'].map((name, i) => (
                <div key={i} className="bg-white/10 backdrop-blur-md p-8 rounded-3xl border border-white/10 hover:bg-white/20 transition-all">
                  <h4 className="font-black text-xl mb-1 uppercase italic tracking-tight">{name}</h4>
                  <p className="text-orange-100 text-sm font-bold uppercase tracking-widest">Supervisor Operaciones</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="marcas" className="py-20 px-4 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4 uppercase italic tracking-tight">Descubre Nuestras Marcas</h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">Selecciona la marca que más te apasione para ver sus vacantes.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {marcasConData.map((marca) => (
            <div key={marca.id} className="bg-white rounded-[32px] p-10 shadow-sm border border-slate-50 flex flex-col h-full group transition-all hover:shadow-2xl hover:shadow-slate-200/50">
              <div className="flex justify-between items-start mb-8">
                <div className="w-20 h-20 rounded-[24px] bg-slate-50 flex items-center justify-center p-4 overflow-hidden shrink-0 border border-slate-100">
                  <img src={marca.logoUrl} alt={marca.nombre} className="w-full h-full object-contain" />
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${marca.vacantes > 0 ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-gray-500'}`}>
                    {marca.vacantes} vacantes
                  </span>
                  <span className="px-4 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest bg-blue-50 text-blue-600 border border-blue-100">
                    {marca.tiendasCount} tiendas
                  </span>
                </div>
              </div>
              <h3 className={`text-2xl font-black mb-4 uppercase italic tracking-tight ${marca.textColor}`}>{marca.nombre}</h3>
              <p className="text-slate-500 mb-10 flex-grow leading-relaxed">{marca.description}</p>
              <button onClick={() => handleOpenSearch(marca.id)} className={`w-full py-4 px-6 rounded-2xl text-white text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 ${marca.color} hover:brightness-110 shadow-xl transition-all transform group-hover:-translate-y-1`}>
                Ver Oportunidades <ChevronRight size={18} />
              </button>
            </div>
          ))}
        </div>
      </section>

      <footer className="bg-[#0B1120] text-gray-300 py-24 px-4 border-t-[8px] border-orange-600">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
            <div className="col-span-1">
              <img 
                src="/logos/ngr-logo-full.png" 
                alt="NGR" 
                className="h-16 w-auto mb-8 brightness-0 invert opacity-100"
                onError={(e) => { (e.target as any).src = 'https://www.trabajaenngr.pe/logos/logo_NGR.svg'; }}
              />
              <p className="text-gray-400 text-sm leading-relaxed max-w-xs uppercase">Holding gastronómico líder en el Perú. Transformamos ingredientes en experiencias únicas y memorables para todos.</p>
            </div>
            
            <div>
              <h4 className="text-white font-black text-sm uppercase tracking-[0.2em] mb-8 italic">Nuestras Marcas</h4>
              <ul className="grid grid-cols-1 gap-4 text-[10px] font-black uppercase tracking-widest">
                {marcasConData.map((m, i) => (
                  <li key={i}>
                    <Link href={`/trabajaenngr/marca/${m.id}`} className="hover:text-orange-400 transition-colors text-left uppercase">
                       {m.nombre}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-white font-black text-sm uppercase tracking-[0.2em] mb-8 italic">Enlaces Rápidos</h4>
              <ul className="space-y-4 text-[10px] font-black uppercase tracking-widest">
                <li><button onClick={() => handleOpenSearch()} className="hover:text-orange-400 transition-colors text-left uppercase">Buscar Empleo</button></li>
                <li><a href="#cultura" className="hover:text-orange-400 transition-colors uppercase">Nuestra Cultura</a></li>
                <li><a href="#beneficios" className="hover:text-orange-400 transition-colors uppercase">Beneficios</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-black text-sm uppercase tracking-[0.2em] mb-8 italic">Ubicación</h4>
              <ul className="space-y-4 text-xs font-bold text-gray-400">
                <li className="flex items-center gap-3 uppercase"><MapPin size={18} className="text-orange-600 shrink-0" /> Lima, Perú</li>
              </ul>
            </div>
          </div>

          <div className="pt-10 border-t border-gray-800 flex flex-col items-start gap-4">
            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-600 italic">© {new Date().getFullYear()} NGR. Todos los derechos reservados.</p>
              <div className="flex items-center gap-2 opacity-40">
                <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500">Potenciado por</span>
                <span className="text-[10px] font-black text-white uppercase tracking-widest">Relié Labs</span>
              </div>
            </div>
          </div>
        </div>
      </footer>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-2xl bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-10 border-b border-slate-100 flex justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-3xl font-black text-slate-900 italic uppercase tracking-tight">Oportunidades</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase mt-1 tracking-widest">{filterBrandId ? marcas.find(m => m.id === filterBrandId)?.nombre : 'Todas las marcas'}</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-white rounded-full shadow-sm transition-all"><X size={28} className="text-slate-400" /></button>
              </div>
              <div className="px-10 py-8 bg-white overflow-y-auto">
                <div className="flex items-center justify-between max-w-sm mx-auto mb-10">
                  {[1, 2, 3].map((s) => (
                    <div key={s} className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-lg shadow-xl transition-all ${modalStep === s ? 'bg-orange-600 text-white shadow-orange-600/20' : modalStep > s ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                        {modalStep > s ? '✓' : s}
                      </div>
                      {s < 3 && <div className="w-16 h-px bg-slate-100" />}
                    </div>
                  ))}
                </div>

                {modalStep === 1 && (
                  <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    <p className="text-sm font-black text-slate-500 uppercase tracking-widest text-center">Paso 1: ¿Dónde te gustaría trabajar?</p>
                    <div className="grid grid-cols-2 gap-4">
                      {uniqueDepartamentos.map(dep => <button key={dep} onClick={() => { setSelectedDepartamento(dep); setModalStep(2); }} className="p-6 rounded-3xl border bg-slate-50 hover:bg-white hover:border-orange-200 hover:shadow-xl transition-all text-left uppercase text-xs font-black tracking-widest">{dep}</button>)}
                    </div>
                  </div>
                )}
                {modalStep === 2 && (
                  <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-black text-slate-500 uppercase tracking-widest">Paso 2: Selecciona Provincia</p>
                      <button onClick={() => setModalStep(1)} className="text-[10px] font-black text-orange-600 uppercase">Atrás</button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {uniqueProvincias.map(prov => <button key={prov} onClick={() => { setSelectedProvincia(prov); setModalStep(3); }} className="p-6 rounded-3xl border bg-slate-50 hover:bg-white hover:border-orange-200 hover:shadow-xl transition-all text-left uppercase text-xs font-black tracking-widest">{prov}</button>)}
                    </div>
                  </div>
                )}
                {modalStep === 3 && (
                  <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xl font-black uppercase italic tracking-tight">Paso 3: Elige Distrito</h4>
                      <button onClick={() => { setModalStep(1); setSelectedDistrito(''); }} className="text-[10px] font-black text-orange-600 uppercase border-2 border-orange-200 px-4 py-2 rounded-xl">Reiniciar</button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-8">
                      {uniqueDistritos.map(dist => (
                        <button 
                          key={dist} 
                          onClick={() => setSelectedDistrito(dist)} 
                          className={`p-6 rounded-3xl border transition-all text-left uppercase text-xs font-black tracking-widest ${selectedDistrito === dist ? 'bg-orange-600 text-white border-orange-600 shadow-xl' : 'bg-slate-50 hover:bg-white hover:border-orange-200'}`}
                        >
                          {dist}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-4 pt-4 border-t border-slate-100">
                      <h5 className="text-xs font-black uppercase tracking-widest text-slate-400">
                        {selectedDistrito ? `Vacantes en ${selectedDistrito}:` : 'Resultados generales:'}
                      </h5>
                      <div className="grid grid-cols-1 gap-4 max-h-96 overflow-y-auto pr-2 scrollbar-thin">
                        {groupedFilteredResults.filter(r => !selectedDistrito || normalize(r.tiendaDistrito || r.distrito) === selectedDistrito).map(rq => (
                          <div key={rq.id} className="p-6 rounded-[24px] border bg-slate-50 flex justify-between items-center group hover:bg-white hover:shadow-xl transition-all border-slate-100">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                  <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">{rq.marcaNombre}</span>
                                  {rq.count > 1 && (
                                    <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full text-[8px] font-black">
                                      {rq.count} vacantes
                                    </span>
                                  )}
                              </div>
                              <h5 className="text-md font-black uppercase italic tracking-tight group-hover:text-orange-600 transition-colors">{rq.posicion}</h5>
                              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">{rq.tiendaNombre}</p>
                            </div>
                            <Link href={`/portal/vacante/${rq.id}`} className="px-8 py-3 bg-orange-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-orange-600/20 italic">Postular</Link>
                          </div>
                        ))}
                        {groupedFilteredResults.length === 0 && (
                          <div className="p-10 bg-slate-50 rounded-3xl text-center border-2 border-dashed border-slate-200">
                              <p className="text-xs font-black text-slate-400 uppercase italic tracking-widest">No se encontraron vacantes para los filtros seleccionados.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
