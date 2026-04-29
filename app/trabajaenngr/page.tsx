'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronDown, MapPin, Users, Heart, Briefcase, ChevronRight, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

const HOLDING_ID = 'ngr '; // Note the trailing space found in DB for some brands

// Mapeo manual de estilos para marcas conocidas (en caso de que no tengan estos campos en Firestore)
const BRAND_STYLES: Record<string, { color: string, textColor: string, logo: string, description: string }> = {
  'bembos': {
    color: 'bg-[#2F3786]',
    textColor: 'text-[#2F3786]',
    logo: '🍔',
    description: 'La hamburguesa peruana con sabor único. Únete a nuestro equipo dinámico y apasionado.'
  },
  'papa-johns': {
    color: 'bg-[#C23122]',
    textColor: 'text-[#C23122]',
    logo: '🍕',
    description: 'Mejores ingredientes, mejor pizza. Sé parte de la familia Papa John\'s en Perú.'
  },
  'papa-john-s': { // Fallback for slug variant
    color: 'bg-[#C23122]',
    textColor: 'text-[#C23122]',
    logo: '🍕',
    description: 'Mejores ingredientes, mejor pizza. Sé parte de la familia Papa John\'s en Perú.'
  },
  'popeyes': {
    color: 'bg-[#E37B1D]',
    textColor: 'text-[#E37B1D]',
    logo: '🍗',
    description: 'El auténtico sabor cajún. Buscamos talento con chispa y energía.'
  },
  'chinawok': {
    color: 'bg-[#B53E34]',
    textColor: 'text-[#B53E34]',
    logo: '🥡',
    description: 'El rico sabor oriental al paso. Desarrolla tu carrera con nosotros.'
  },
  'dunkin': {
    color: 'bg-[#CC6538]',
    textColor: 'text-[#CC6538]',
    logo: '🍩',
    description: 'América se mueve con Dunkin. Lleva alegría y energía a nuestros clientes.'
  },
  'don-belisario': {
    color: 'bg-[#BE2B35]',
    textColor: 'text-[#BE2B35]',
    logo: '🐔',
    description: 'El pollo a la brasa más sabroso. Brinda una experiencia familiar inigualable.'
  }
};

const ESTADISTICAS = [
  { valor: '7,300+', etiqueta: 'Colaboradores' },
  { valor: '6', etiqueta: 'Marcas Icónicas' },
  { valor: '400+', etiqueta: 'Tiendas en Perú' },
  { valor: '14', etiqueta: 'Departamentos' }
];

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
  }
];

export default function NGRCareersPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [marcas, setMarcas] = useState<any[]>([]);
  const [rqs, setRqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Cargar Marcas de NGR
  useEffect(() => {
    const q = query(collection(db, 'marcas'), where('holdingId', 'in', ['ngr', 'ngr ']));
    const unsub = onSnapshot(q, (snapshot) => {
      const loaded = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMarcas(loaded);
    });
    return () => unsub();
  }, []);

  // 2. Cargar Requerimientos Activos para contar vacantes
  useEffect(() => {
    const q = query(collection(db, 'rqs'), where('holdingId', 'in', ['ngr', 'ngr ']));
    const unsub = onSnapshot(q, (snapshot) => {
      const loaded = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Filtrar por aprobados y no cerrados/llenos
      const activeRqs = loaded.filter((rq: any) => 
        rq.approvalStatus === 'approved' && 
        (rq.status === 'active' || rq.status === 'recruiting')
      );
      setRqs(activeRqs);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // 3. Procesar datos para la UI
  const marcasConVacantes = useMemo(() => {
    return marcas.map(marca => {
      const slug = marca.slug || marca.nombre.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const style = BRAND_STYLES[slug] || {
        color: 'bg-orange-600',
        textColor: 'text-orange-600',
        logo: '🏢',
        description: 'Sé parte de una de las marcas más importantes del sector gastronómico.'
      };

      const vacantesCount = rqs.filter((rq: any) => rq.marcaId === marca.id).length;

      return {
        ...marca,
        ...style,
        vacantes: vacantesCount
      };
    }).filter(m => m.activa !== false);
  }, [marcas, rqs]);

  const totalVacantes = rqs.length;

  return (
    <div className="min-h-screen bg-[#FDF8F6] text-gray-900 font-sans selection:bg-orange-200">
      
      {/* HEADER STICKY */}
      <header className="fixed top-0 left-0 right-0 bg-white shadow-sm z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo NGR */}
            <div className="flex items-center gap-3">
              <img 
                src="/logos/ngr-logo.png" 
                alt="NGR Logo" 
                className="h-10 w-auto object-contain"
                onError={(e) => {
                  // Fallback si la imagen no carga
                  (e.target as any).src = 'https://www.trabajaenngr.pe/logos/logo_NGR.svg';
                }}
              />
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-8">
              <a href="#marcas" className="text-gray-600 hover:text-orange-600 font-medium transition-colors">Nuestras Marcas</a>
              <a href="#cultura" className="text-gray-600 hover:text-orange-600 font-medium transition-colors">Nuestra Cultura</a>
              <a href="#beneficios" className="text-gray-600 hover:text-orange-600 font-medium transition-colors">Beneficios</a>
              <a 
                href="#marcas"
                className="bg-orange-600 text-white px-6 py-2.5 rounded-full font-medium hover:bg-orange-700 transition-colors shadow-sm"
              >
                Portal de Empleo
              </a>
            </nav>

            {/* Mobile menu button */}
            <button 
              className="md:hidden p-2 text-gray-600"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-4 shadow-lg overflow-hidden"
            >
              <a href="#marcas" className="block text-gray-600 font-medium" onClick={() => setMobileMenuOpen(false)}>Nuestras Marcas</a>
              <a href="#cultura" className="block text-gray-600 font-medium" onClick={() => setMobileMenuOpen(false)}>Nuestra Cultura</a>
              <a href="#beneficios" className="block text-gray-600 font-medium" onClick={() => setMobileMenuOpen(false)}>Beneficios</a>
              <a href="#marcas" className="block w-full text-center bg-orange-600 text-white px-6 py-3 rounded-full font-medium" onClick={() => setMobileMenuOpen(false)}>
                Portal de Empleo
              </a>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* HERO SECTION */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-orange-600 text-white relative overflow-hidden">
        <div className="absolute top-10 left-10 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-50px] right-[-50px] w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm text-sm font-medium mb-6"
          >
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            {loading ? 'Buscando vacantes...' : `+${totalVacantes} Vacantes disponibles hoy`}
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight"
          >
            ¿Listo(a) para iniciar tu carrera en NGR?
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl md:text-2xl text-orange-100 mb-10 max-w-2xl mx-auto"
          >
            Únete a más de 7,300 personas que ya forman parte de la familia NGR. Tu próximo gran desafío te está esperando.
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <a 
              href="#marcas" 
              className="inline-flex items-center justify-center gap-2 bg-white text-orange-600 px-8 py-4 rounded-full font-bold text-lg hover:bg-gray-50 hover:shadow-lg transition-all transform hover:-translate-y-1"
            >
              <Search className="w-5 h-5" />
              Buscar Vacantes
            </a>
          </motion.div>
        </div>
      </section>

      {/* STATS SECTION */}
      <section className="relative -mt-10 z-20 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {ESTADISTICAS.map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-white rounded-2xl p-6 text-center shadow-lg shadow-gray-200/50 border border-gray-100"
            >
              <div className="text-3xl md:text-4xl font-black text-orange-600 mb-2">{stat.valor}</div>
              <div className="text-sm md:text-base text-gray-600 font-medium">{stat.etiqueta}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* MARCAS SECTION */}
      <section id="marcas" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Descubre Nuestras Marcas</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Tenemos oportunidades increíbles en cada una de nuestras icónicas marcas. Selecciona la que más te apasione.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {marcasConVacantes.map((marca, i) => (
            <motion.div
              key={marca.id}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 hover:shadow-xl transition-shadow flex flex-col h-full group"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center text-3xl shadow-inner overflow-hidden">
                  {marca.logoUrl ? (
                    <img src={marca.logoUrl} alt={marca.nombre} className="w-full h-full object-contain" />
                  ) : (
                    marca.logo
                  )}
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${marca.vacantes > 0 ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                  {marca.vacantes} vacantes
                </span>
              </div>
              
              <h3 className={`text-2xl font-bold mb-3 ${marca.textColor}`}>{marca.nombre}</h3>
              <p className="text-gray-600 mb-8 flex-grow">{marca.description}</p>
              
              <Link 
                href={`/portal/${marca.id}`}
                className={`w-full py-3 px-6 rounded-xl text-white font-medium flex items-center justify-center gap-2 transition-all transform group-hover:-translate-y-1 ${marca.color} hover:brightness-110 shadow-md`}
              >
                Ver Oportunidades
                <ChevronRight className="w-4 h-4" />
              </Link>
            </motion.div>
          ))}
          {marcasConVacantes.length === 0 && !loading && (
            <div className="col-span-full py-20 text-center text-gray-500">
              No se encontraron marcas configuradas para NGR.
            </div>
          )}
        </div>
      </section>

      {/* BENEFICIOS SECTION */}
      <section id="beneficios" className="py-20 px-4 sm:px-6 lg:px-8 bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">¿Por qué trabajar en NGR?</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              No solo ofrecemos un empleo, te brindamos un lugar donde crecer, disfrutar y construir tu futuro.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {BENEFICIOS.map((ben, i) => (
              <div key={i} className="text-center p-6">
                <div className="w-16 h-16 mx-auto bg-orange-50 rounded-2xl flex items-center justify-center mb-6">
                  {ben.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{ben.titulo}</h3>
                <p className="text-gray-600">{ben.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CULTURA SECTION */}
      <section id="cultura" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden">
        <div className="flex flex-col md:flex-row items-center gap-12 mb-20">
          <div className="w-full md:w-1/2">
            <div className="aspect-video bg-orange-100 rounded-3xl overflow-hidden relative shadow-lg">
              <div className="absolute inset-0 flex items-center justify-center text-orange-400">
                <Users className="w-20 h-20 opacity-50" />
              </div>
            </div>
          </div>
          <div className="w-full md:w-1/2">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
              <Briefcase className="w-6 h-6" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Desarrollo Profesional Continuo</h2>
            <p className="text-lg text-gray-600 leading-relaxed mb-6">
              En NGR creemos en promover desde adentro. Tendrás acceso a capacitaciones constantes, líneas de carrera claras y la oportunidad de liderar tus propios equipos en un ambiente dinámico.
            </p>
            <ul className="space-y-3">
              {['Capacitaciones mensuales', 'Línea de carrera acelerada', 'Programas de liderazgo'].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-gray-700 font-medium">
                  <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs">✓</div>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#0B1120] text-gray-300 py-16 px-4 sm:px-6 lg:px-8 border-t-[8px] border-orange-600">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-3 mb-6">
              <img src="/logos/ngr-logo.png" alt="NGR Logo" className="h-10 w-auto brightness-0 invert" />
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              Holding gastronómico líder en el Perú. Transformamos ingredientes en experiencias únicas y memorables para todos.
            </p>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6">Nuestras Marcas</h4>
            <ul className="space-y-3 text-sm">
              {marcasConVacantes.slice(0, 6).map(m => (
                <li key={m.id}><Link href={`/portal/${m.id}`} className="hover:text-orange-400 transition-colors">{m.nombre}</Link></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6">Enlaces Rápidos</h4>
            <ul className="space-y-3 text-sm">
              <li><a href="#marcas" className="hover:text-orange-400 transition-colors">Buscar Empleo</a></li>
              <li><a href="#cultura" className="hover:text-orange-400 transition-colors">Nuestra Cultura</a></li>
              <li><a href="#beneficios" className="hover:text-orange-400 transition-colors">Beneficios</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6">Contacto</h4>
            <ul className="space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-500 shrink-0" />
                <span>Lima, Perú</span>
              </li>
            </ul>
          </div>

        </div>

        <div className="max-w-7xl mx-auto pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
          <p>© {new Date().getFullYear()} NGR. Todos los derechos reservados.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">Términos y Condiciones</a>
            <a href="#" className="hover:text-white transition-colors">Políticas de Privacidad</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
