'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';

export default function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    { icon: '📋', title: 'Gestión de Requerimientos', desc: 'Crea y administra vacantes (RQs) con toda la información necesaria para reclutar' },
    { icon: '✅', title: 'Flujo de Aprobaciones', desc: 'Workflow configurable de aprobación multinivel según tu estructura organizacional' },
    { icon: '🤖', title: 'CUL Validado por IA', desc: 'Validación automática del Certificado Único Laboral con inteligencia artificial' },
    { icon: '👥', title: 'Registro de Candidatos', desc: 'Portal de autoregistro para candidatos con validación de datos y documentos' },
    { icon: '📊', title: 'Métricas y Reportes', desc: 'Dashboard con analíticas en tiempo real del proceso de reclutamiento' },
  ];

  const stats = [
    { value: '85%', label: 'Reducción tiempo de contratación' },
    { value: '100%', label: 'Validación automática CUL' },
    { value: 'Multi', label: 'Niveles de aprobación' },
    { value: 'Real-time', label: 'Métricas en vivo' },
  ];

  const whatsappNumber = '51956833456';
  const whatsappMessage = encodeURIComponent('Hola, me interesa conocer más sobre LIAH para mi empresa');

  return (
    <div style={{ fontFamily: "'Open Sans', 'Inter', system-ui, sans-serif" }} className="min-h-screen bg-white overflow-hidden">
      {/* ==================== NAVBAR ==================== */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${isScrolled ? 'bg-white/95 backdrop-blur-xl shadow-lg' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between">
            <img src="/logos/liah-logo.png" alt="LIAH" style={{ height: '48px', objectFit: 'contain' }} />
            <div className="flex items-center gap-4">
              <a
                href={`https://wa.me/${whatsappNumber}?text=${whatsappMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`px-5 py-2.5 rounded-full font-medium transition-all duration-300 ${isScrolled ? 'text-gray-700 hover:text-violet-600 hover:bg-violet-50' : 'text-white/90 hover:text-white hover:bg-white/10'}`}
              >
                Contáctanos
              </a>
              <Link
                href="/login"
                className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-cyan-500 text-white rounded-full font-semibold shadow-lg shadow-violet-500/30 hover:shadow-xl hover:shadow-violet-500/40 hover:scale-105 transition-all duration-300"
              >
                Iniciar Sesión
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ==================== HERO SECTION ==================== */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-900 via-violet-800 to-indigo-900" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-500/30 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 py-32">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            {/* Left: Content */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 mb-8">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-white/80 text-sm font-medium">Potenciado por Google Gemini AI</span>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-8 leading-[1.1]">
                Reclutamiento Masivo
                <br />
                <span className="bg-gradient-to-r from-cyan-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                  Automatizado con IA
                </span>
              </h1>

              <p className="text-lg md:text-xl text-white/70 mb-10 leading-relaxed max-w-xl">
                LIAH gestiona tus Requerimientos de Vacantes con flujos de aprobación,
                valida el CUL con IA, registra candidatos y te da métricas en tiempo real.
              </p>

              <div className="flex flex-col sm:flex-row items-start gap-4">
                <a
                  href={`https://wa.me/${whatsappNumber}?text=${whatsappMessage}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold text-lg shadow-2xl shadow-green-500/30 hover:shadow-green-500/50 hover:scale-105 transition-all duration-300"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  Hablar con LIAH
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </a>
                <a
                  href="#demo"
                  className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white rounded-xl font-bold text-lg border border-white/20 hover:bg-white/20 transition-all duration-300"
                >
                  Ver Demo
                </a>
              </div>
            </div>

            {/* Right: Visual */}
            <div className="hidden lg:flex justify-center">
              <div className="relative w-full max-w-lg aspect-square bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-3xl border border-white/20 p-8 flex items-center justify-center">
                <div className="grid grid-cols-2 gap-6 w-full">
                  {features.map((f, i) => (
                    <div key={i} className="bg-white/10 rounded-2xl p-6 text-center border border-white/10 hover:bg-white/20 transition-all">
                      <div className="text-4xl mb-3">{f.icon}</div>
                      <p className="text-white/80 text-sm font-medium">{f.title}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-8 h-12 rounded-full border-2 border-white/30 flex items-start justify-center p-2">
            <div className="w-1.5 h-3 bg-white/50 rounded-full animate-pulse" />
          </div>
        </div>
      </section>

      {/* ==================== FEATURES TWO-COLUMN SECTION ==================== */}
      <section className="py-32 lg:py-40 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-20 lg:gap-32 items-center">
            {/* Left: Content */}
            <div>
              <div className="inline-flex items-center gap-2 bg-violet-100 px-4 py-2 rounded-full mb-8">
                <span className="w-2 h-2 bg-violet-600 rounded-full" />
                <span className="text-violet-600 text-sm font-semibold">FUNCIONALIDADES</span>
              </div>

              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6 leading-tight">
                Todo lo que necesitas para reclutar a escala
              </h2>

              <p className="text-lg text-gray-600 mb-10 leading-relaxed">
                LIAH automatiza el proceso completo de reclutamiento masivo, desde la creación de vacantes hasta la contratación final.
              </p>

              <div className="space-y-6">
                {features.slice(0, 2).map((feature, idx) => (
                  <div key={idx} className="flex gap-4 items-start">
                    <div className="w-14 h-14 bg-gradient-to-br from-violet-100 to-cyan-100 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0">
                      {feature.icon}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 mb-1">{feature.title}</h3>
                      <p className="text-gray-600 text-sm leading-relaxed">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Image/Visual */}
            <div className="bg-gradient-to-br from-violet-50 to-cyan-50 rounded-3xl aspect-square flex items-center justify-center p-8">
              <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                {features.map((f, i) => (
                  <div key={i} className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 text-center hover:shadow-xl hover:-translate-y-1 transition-all">
                    <div className="text-3xl mb-3">{f.icon}</div>
                    <p className="text-gray-700 text-xs font-semibold">{f.title}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== STATS SECTION ==================== */}
      <section className="py-24 bg-gradient-to-r from-violet-900 via-violet-800 to-indigo-900 relative overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-fuchsia-500/20 rounded-full blur-3xl" />

        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 lg:gap-20">
            {stats.map((stat, idx) => (
              <div key={idx} className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-white mb-3">{stat.value}</div>
                <div className="text-white/60 text-sm leading-relaxed">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== HOW IT WORKS - TWO COLUMN ==================== */}
      <section className="py-32 lg:py-40 bg-gray-50" id="demo">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-20 lg:gap-32 items-center">
            {/* Left: Visual */}
            <div className="order-2 lg:order-1 bg-white rounded-3xl p-8 shadow-xl border border-gray-100">
              <div className="space-y-6">
                {[
                  { step: '01', title: 'Creas tu RQ', desc: 'Vacante con toda la información necesaria', icon: '📋' },
                  { step: '02', title: 'Aprobaciones', desc: 'Flujo multinivel configurable', icon: '✅' },
                  { step: '03', title: 'Registro Candidatos', desc: 'Portal de autoregistro con validación CUL', icon: '👥' },
                  { step: '04', title: 'Métricas', desc: 'Dashboard con analíticas en tiempo real', icon: '📊' },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl hover:bg-violet-50 transition-colors">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-2xl text-white flex-shrink-0">
                      {item.icon}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-violet-600">{item.step}</span>
                      <h4 className="font-bold text-gray-900">{item.title}</h4>
                      <p className="text-gray-500 text-sm">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Content */}
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 bg-violet-100 px-4 py-2 rounded-full mb-8">
                <span className="w-2 h-2 bg-violet-600 rounded-full" />
                <span className="text-violet-600 text-sm font-semibold">CÓMO FUNCIONA</span>
              </div>

              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6 leading-tight">
                Así funciona LIAH
              </h2>

              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                En 4 simples pasos, automatiza tu proceso de reclutamiento masivo y reduce el tiempo de contratación en un 85%.
              </p>

              <a
                href={`https://wa.me/${whatsappNumber}?text=${whatsappMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-violet-600 to-cyan-500 text-white rounded-xl font-bold shadow-lg shadow-violet-500/30 hover:shadow-xl hover:scale-105 transition-all"
              >
                Solicitar Demo
                <span>→</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== FINAL CTA ==================== */}
      <section className="py-32 lg:py-40 bg-gradient-to-br from-violet-600 via-violet-700 to-indigo-800 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-fuchsia-500/20 rounded-full blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-8 leading-tight">
            ¿Listo para revolucionar tu reclutamiento?
          </h2>
          <p className="text-xl text-white/80 mb-12 max-w-2xl mx-auto leading-relaxed">
            Únete a las empresas que ya están contratando más rápido con LIAH
          </p>
          <a
            href={`https://wa.me/${whatsappNumber}?text=${whatsappMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-10 py-5 bg-white text-violet-700 rounded-2xl font-bold text-xl shadow-2xl shadow-white/20 hover:shadow-white/40 hover:scale-105 transition-all duration-300"
          >
            <svg className="w-7 h-7 text-green-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Solicitar Demo Gratis
          </a>
        </div>
      </section>

      {/* ==================== FOOTER ==================== */}
      <footer className="py-16 bg-gray-900">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <img src="/logos/liah-logo.png" alt="LIAH" style={{ height: '40px', objectFit: 'contain' }} />
            <p className="text-gray-400 text-sm">
              © 2026 LIAH by Relie Labs. Todos los derechos reservados.
            </p>
            <div className="flex items-center gap-8">
              <Link href="/terminos" className="text-gray-400 hover:text-white transition-colors">Términos</Link>
              <Link href="/privacidad" className="text-gray-400 hover:text-white transition-colors">Privacidad</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
