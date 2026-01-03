'use client';

import Link from 'next/link';
import Logo from '@/components/Logo';

export default function PrivacidadPage() {
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
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Política de Privacidad</h1>
                    <p className="text-gray-600 mb-8">Última actualización: {currentDate}</p>

                    <div className="prose prose-lg max-w-none text-gray-700 space-y-6">
                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">1. Introducción</h2>
                            <p>
                                En <strong>Relie Labs S.A.C.</strong> ("nosotros", "la Empresa") respetamos su privacidad y nos
                                comprometemos a proteger sus datos personales. Esta Política de Privacidad explica cómo recopilamos,
                                usamos, almacenamos y protegemos su información cuando utiliza LIAH, nuestra plataforma de
                                reclutamiento inteligente.
                            </p>
                            <p>
                                Esta política cumple con la Ley N° 29733, Ley de Protección de Datos Personales del Perú,
                                y su Reglamento aprobado por D.S. N° 003-2013-JUS.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">2. Datos que Recopilamos</h2>

                            <h3 className="text-lg font-medium text-gray-800 mt-4 mb-2">2.1 Para Candidatos</h3>
                            <ul className="list-disc pl-6 space-y-2">
                                <li><strong>Datos de identificación:</strong> Nombre completo, DNI, fecha de nacimiento, género</li>
                                <li><strong>Datos de contacto:</strong> Número de teléfono (WhatsApp), correo electrónico</li>
                                <li><strong>Datos de ubicación:</strong> Distrito, provincia, departamento de residencia</li>
                                <li><strong>Datos laborales:</strong> Experiencia laboral, disponibilidad, expectativa salarial, puestos de interés</li>
                                <li><strong>Datos de interacción:</strong> Historial de conversaciones con el chatbot, respuestas a preguntas de filtrado</li>
                            </ul>

                            <h3 className="text-lg font-medium text-gray-800 mt-4 mb-2">2.2 Para Usuarios de Empresas</h3>
                            <ul className="list-disc pl-6 space-y-2">
                                <li><strong>Datos de cuenta:</strong> Nombre, correo electrónico corporativo, rol asignado</li>
                                <li><strong>Datos de uso:</strong> Registro de actividad en la plataforma, configuraciones realizadas</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">3. Finalidad del Tratamiento</h2>
                            <p>Sus datos personales serán utilizados para:</p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Gestionar el proceso de reclutamiento y selección de personal</li>
                                <li>Comunicarnos con usted sobre ofertas laborales relevantes</li>
                                <li>Coordinar entrevistas y evaluaciones</li>
                                <li>Mejorar nuestros servicios mediante análisis de datos agregados</li>
                                <li>Cumplir con obligaciones legales y regulatorias</li>
                                <li>Prevenir fraudes y garantizar la seguridad de la plataforma</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">4. Base Legal</h2>
                            <p>El tratamiento de sus datos se basa en:</p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li><strong>Consentimiento:</strong> Al aceptar estos términos, usted autoriza el tratamiento de sus datos</li>
                                <li><strong>Ejecución contractual:</strong> Para prestar los servicios de la plataforma</li>
                                <li><strong>Interés legítimo:</strong> Para mejorar nuestros servicios y prevenir fraudes</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">5. Compartición de Datos</h2>
                            <p>Sus datos podrán ser compartidos con:</p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li><strong>Empresas Clientes:</strong> Las empresas a las que usted postula tendrán acceso a su perfil de candidato</li>
                                <li><strong>Proveedores de servicios:</strong> Servicios de hosting (Google Cloud), mensajería (WhatsApp/Meta),
                                    y otros proveedores necesarios para operar la plataforma</li>
                                <li><strong>Autoridades:</strong> Cuando sea requerido por ley o mandato judicial</li>
                            </ul>
                            <p className="mt-4">
                                <strong>No vendemos</strong> sus datos personales a terceros con fines comerciales o publicitarios.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">6. Uso de Inteligencia Artificial</h2>
                            <p>
                                LIAH utiliza tecnología de inteligencia artificial (Google Gemini) para:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Automatizar conversaciones con candidatos</li>
                                <li>Extraer y validar información de las respuestas</li>
                                <li>Generar respuestas contextuales durante el proceso de postulación</li>
                            </ul>
                            <p className="mt-4">
                                Las decisiones finales de contratación siempre son tomadas por personas humanas en las empresas clientes,
                                no por sistemas automatizados.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">7. Seguridad de los Datos</h2>
                            <p>Implementamos medidas técnicas y organizativas para proteger sus datos:</p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Encriptación de datos en tránsito (HTTPS/TLS)</li>
                                <li>Almacenamiento seguro en servidores de Google Cloud</li>
                                <li>Control de acceso basado en roles</li>
                                <li>Auditorías periódicas de seguridad</li>
                                <li>Copias de seguridad automatizadas</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">8. Conservación de Datos</h2>
                            <p>
                                Conservamos sus datos personales mientras sean necesarios para los fines descritos o según lo
                                requiera la ley. Para candidatos, los datos de postulación se conservan por un período de
                                <strong> 2 años</strong> desde la última interacción, después del cual serán anonimizados o eliminados.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">9. Sus Derechos</h2>
                            <p>De acuerdo con la ley peruana, usted tiene derecho a:</p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li><strong>Acceso:</strong> Solicitar una copia de sus datos personales</li>
                                <li><strong>Rectificación:</strong> Corregir datos inexactos o incompletos</li>
                                <li><strong>Cancelación:</strong> Solicitar la eliminación de sus datos</li>
                                <li><strong>Oposición:</strong> Oponerse al tratamiento de sus datos</li>
                                <li><strong>Revocación:</strong> Retirar su consentimiento en cualquier momento</li>
                            </ul>
                            <p className="mt-4">
                                Para ejercer estos derechos, contacte a nuestro equipo de privacidad en:
                                <a href="mailto:privacidad@relielabs.com" className="text-violet-600 hover:underline ml-1">
                                    privacidad@relielabs.com
                                </a>
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">10. Cookies y Tecnologías Similares</h2>
                            <p>
                                Utilizamos cookies esenciales para el funcionamiento de la plataforma y cookies analíticas
                                para mejorar nuestros servicios. Puede configurar su navegador para rechazar cookies,
                                aunque esto puede afectar la funcionalidad del sitio.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">11. Cambios a esta Política</h2>
                            <p>
                                Podemos actualizar esta Política de Privacidad periódicamente. Notificaremos cambios significativos
                                a través de la plataforma o por correo electrónico. La fecha de última actualización siempre estará
                                visible al inicio del documento.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">12. Contacto</h2>
                            <p>
                                Si tiene preguntas sobre esta Política de Privacidad o sobre el tratamiento de sus datos,
                                puede contactarnos:
                            </p>
                            <ul className="list-none space-y-1 mt-4">
                                <li>📧 Email: <a href="mailto:privacidad@relielabs.com" className="text-violet-600 hover:underline">privacidad@relielabs.com</a></li>
                                <li>📧 Legal: <a href="mailto:legal@relielabs.com" className="text-violet-600 hover:underline">legal@relielabs.com</a></li>
                                <li>🌐 Web: <a href="https://getliah.com" className="text-violet-600 hover:underline">getliah.com</a></li>
                            </ul>
                        </section>

                        <section className="bg-violet-50 rounded-xl p-6 mt-8">
                            <h2 className="text-lg font-semibold text-violet-900 mb-2">Responsable del Tratamiento</h2>
                            <p className="text-violet-800">
                                <strong>Relie Labs S.A.C.</strong><br />
                                Lima, Perú<br />
                                Email: privacidad@relielabs.com
                            </p>
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
