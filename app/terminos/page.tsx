'use client';

import Link from 'next/link';
import Logo from '@/components/Logo';

export default function TerminosPage() {
    const currentDate = new Date().toLocaleDateString('es-PE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <Link href="/landing">
                            <Logo size="sm" />
                        </Link>
                        <Link
                            href="/landing"
                            className="text-violet-600 hover:text-violet-700 font-medium"
                        >
                            ← Volver al inicio
                        </Link>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-4xl mx-auto px-4 py-12">
                <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Términos y Condiciones de Uso</h1>
                    <p className="text-gray-600 mb-8">Última actualización: {currentDate}</p>

                    <div className="prose prose-lg max-w-none text-gray-700 space-y-6">
                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">1. Identificación</h2>
                            <p>
                                LIAH es una plataforma de reclutamiento inteligente desarrollada y operada por <strong>Relie Labs S.A.C.</strong>,
                                con domicilio en Lima, Perú (en adelante, "Relie Labs", "nosotros" o "la Empresa").
                            </p>
                            <p>
                                Al acceder y utilizar LIAH (en adelante, "la Plataforma" o "el Servicio"), usted acepta estos Términos y Condiciones
                                en su totalidad. Si no está de acuerdo con alguna parte de estos términos, le solicitamos que no utilice nuestros servicios.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">2. Descripción del Servicio</h2>
                            <p>LIAH es una plataforma de reclutamiento masivo que ofrece:</p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Automatización de procesos de reclutamiento mediante inteligencia artificial</li>
                                <li>Gestión de candidatos a través de chatbot conversacional vía WhatsApp</li>
                                <li>Panel de administración para empresas clientes</li>
                                <li>Generación y seguimiento de requerimientos de personal (RQs)</li>
                                <li>Agendamiento automatizado de entrevistas</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">3. Usuarios de la Plataforma</h2>

                            <h3 className="text-lg font-medium text-gray-800 mt-4 mb-2">3.1 Empresas Clientes</h3>
                            <p>
                                Son las empresas que contratan los servicios de LIAH para gestionar sus procesos de reclutamiento.
                                Estas empresas son responsables de la información que proporcionan y del uso que sus empleados
                                hagan de la plataforma.
                            </p>

                            <h3 className="text-lg font-medium text-gray-800 mt-4 mb-2">3.2 Candidatos</h3>
                            <p>
                                Son las personas que interactúan con LIAH a través de WhatsApp o formularios web para postular
                                a ofertas laborales de las empresas clientes. Los candidatos deben proporcionar información
                                veraz y actualizada.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">4. Uso Aceptable</h2>
                            <p>Los usuarios se comprometen a:</p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Proporcionar información veraz, precisa y actualizada</li>
                                <li>No utilizar la plataforma para fines ilegales o no autorizados</li>
                                <li>No intentar acceder a áreas restringidas de la plataforma</li>
                                <li>No compartir credenciales de acceso con terceros</li>
                                <li>Respetar los derechos de propiedad intelectual de Relie Labs</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">5. Propiedad Intelectual</h2>
                            <p>
                                Todos los derechos de propiedad intelectual sobre LIAH, incluyendo pero no limitado a:
                                software, diseño, logos, marcas, nombres comerciales, algoritmos y documentación,
                                son propiedad exclusiva de Relie Labs S.A.C.
                            </p>
                            <p>
                                Queda prohibida la reproducción, distribución, modificación o uso no autorizado de
                                cualquier elemento de la plataforma sin consentimiento previo por escrito de Relie Labs.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">6. Limitación de Responsabilidad</h2>
                            <p>
                                LIAH se proporciona "tal cual" y "según disponibilidad". Relie Labs no garantiza que el servicio
                                sea ininterrumpido o libre de errores. No nos hacemos responsables de:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Decisiones de contratación tomadas por las empresas clientes</li>
                                <li>Información falsa proporcionada por candidatos</li>
                                <li>Interrupciones del servicio por causas de fuerza mayor</li>
                                <li>Pérdidas indirectas o consecuentes derivadas del uso del servicio</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">7. Modificaciones</h2>
                            <p>
                                Relie Labs se reserva el derecho de modificar estos Términos y Condiciones en cualquier momento.
                                Las modificaciones serán efectivas desde su publicación en la plataforma. El uso continuado del
                                servicio después de cualquier modificación constituye la aceptación de los nuevos términos.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">8. Ley Aplicable y Jurisdicción</h2>
                            <p>
                                Estos Términos y Condiciones se rigen por las leyes de la República del Perú. Cualquier controversia
                                derivada del uso de LIAH será sometida a la jurisdicción de los tribunales de Lima, Perú.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">9. Contacto</h2>
                            <p>
                                Para cualquier consulta sobre estos Términos y Condiciones, puede contactarnos a través de:
                            </p>
                            <ul className="list-none space-y-1">
                                <li>📧 Email: <a href="mailto:legal@relielabs.com" className="text-violet-600 hover:underline">legal@relielabs.com</a></li>
                                <li>🌐 Web: <a href="https://getliah.com" className="text-violet-600 hover:underline">getliah.com</a></li>
                            </ul>
                        </section>
                    </div>

                    {/* Footer */}
                    <div className="mt-12 pt-8 border-t border-gray-200">
                        <p className="text-center text-gray-500 text-sm">
                            © {new Date().getFullYear()} Relie Labs S.A.C. Todos los derechos reservados.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
