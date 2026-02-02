'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

function SurveyContent() {
    const searchParams = useSearchParams();
    const name = searchParams.get('name') || '';
    const company = searchParams.get('company') || 'tu empresa';

    const [step, setStep] = useState(1);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    // Form State
    const [nps, setNps] = useState<number | null>(null);
    const [motivos, setMotivos] = useState<string[]>([]);
    const [tiempoViaje, setTiempoViaje] = useState('');
    const [herramientas, setHerramientas] = useState<string | null>(null);
    const [comentario, setComentario] = useState('');

    const motivosOptions = [
        "Mejor oferta salarial",
        "Distancia / Tiempo de viaje",
        "Relación con el jefe inmediato",
        "Falta de crecimiento",
        "Motivos personales / Estudios",
        "Otros"
    ];

    const toggleMotivo = (opt: string) => {
        setMotivos(prev => prev.includes(opt) ? prev.filter(m => m !== opt) : [...prev, opt]);
    };

    const handleSubmit = async () => {
        if (nps === null) return alert('Por favor, califica tu experiencia.');
        setSubmitting(true);
        try {
            await addDoc(collection(db, 'exit_surveys'), {
                nombre: name,
                empresa: company,
                nps,
                motivosSalida: motivos,
                tiempoViajeSede: tiempoViaje,
                recibioHerramientas: herramientas,
                comentarioMejora: comentario,
                createdAt: Timestamp.now()
            });
            setSubmitted(true);
        } catch (error) {
            console.error('Error saving survey:', error);
            alert('Hubo un error al enviar tus respuestas. Por favor, intenta de nuevo.');
        } finally {
            setSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <div className="text-center py-12 px-6">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl animate-bounce">
                    ✓
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-4">¡Muchas gracias, {name}!</h1>
                <p className="text-gray-600 max-w-md mx-auto leading-relaxed">
                    Tus respuestas han sido recibidas de forma anónima y confidencial.
                    Tu sinceridad nos ayuda a construir mejores ambientes laborales para todos.
                </p>
                <button
                    onClick={() => window.location.href = 'https://getliah.com'}
                    className="mt-10 text-violet-600 font-bold hover:underline"
                >
                    Volver a Liah
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto py-10 px-6">
            <div className="text-center mb-10">
                <div className="text-violet-600 text-3xl font-black tracking-tighter mb-2">LIAH FLOW</div>
                <h1 className="text-xl text-gray-500 font-medium">Encuesta de Salida Confidencial</h1>
                <div className="mt-4 bg-gray-100 rounded-full h-1.5 w-full overflow-hidden">
                    <div
                        className="bg-violet-600 h-full transition-all duration-500"
                        style={{ width: `${(step / 4) * 100}%` }}
                    />
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 min-h-[400px] flex flex-col justify-between">

                {/* STEP 1: NPS */}
                {step === 1 && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6 leading-tight">
                            ¿Qué tan probable es que recomiendes a un amigo o familiar trabajar en <span className="text-violet-600">{company}</span>?
                        </h2>
                        <p className="text-sm text-gray-400 mb-8 font-medium">Siendo 0 nada probable y 10 muy probable.</p>

                        <div className="flex flex-wrap justify-center gap-2 mb-10">
                            {[...Array(11)].map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setNps(i)}
                                    className={`w-12 h-12 rounded-xl text-lg font-bold transition-all duration-200 ${nps === i
                                            ? 'bg-violet-600 text-white shadow-lg shadow-violet-200 transform scale-110'
                                            : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                                        }`}
                                >
                                    {i}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* STEP 2: REASONS */}
                {step === 2 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">
                            ¿Cuál fue el motivo real de tu salida?
                        </h2>
                        <p className="text-sm text-gray-400 mb-6 font-medium">Puedes marcar más de una opción.</p>

                        <div className="space-y-3">
                            {motivosOptions.map(opt => (
                                <button
                                    key={opt}
                                    onClick={() => toggleMotivo(opt)}
                                    className={`w-full text-left p-4 rounded-2xl border-2 transition-all duration-200 flex justify-between items-center ${motivos.includes(opt)
                                            ? 'border-violet-600 bg-violet-50 text-violet-700 font-bold'
                                            : 'border-gray-50 bg-gray-50 text-gray-600 hover:border-gray-200'
                                        }`}
                                >
                                    {opt}
                                    {motivos.includes(opt) && <span>✓</span>}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* STEP 3: CLIMATE */}
                {step === 3 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-8">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 mb-4">¿Cuánto tiempo te tomaba llegar a tu sede de trabajo?</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {['Menos de 30 min', '30 min a 1 hora', '1 a 2 horas', 'Más de 2 horas'].map(opt => (
                                    <button
                                        key={opt}
                                        onClick={() => setTiempoViaje(opt)}
                                        className={`p-4 rounded-2xl border-2 text-sm font-medium transition-all ${tiempoViaje === opt ? 'border-violet-600 bg-violet-50 text-violet-700' : 'border-gray-50 bg-gray-50 text-gray-500'
                                            }`}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h2 className="text-xl font-bold text-gray-900 mb-4">¿Sientes que recibiste las herramientas y capacitación necesarias?</h2>
                            <div className="flex gap-4">
                                {['Sí', 'No'].map(opt => (
                                    <button
                                        key={opt}
                                        onClick={() => setHerramientas(opt)}
                                        className={`flex-1 p-4 rounded-2xl border-2 text-lg font-bold transition-all ${herramientas === opt ? 'border-violet-600 bg-violet-50 text-violet-700' : 'border-gray-50 bg-gray-50 text-gray-500'
                                            }`}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 4: FEEDBACK */}
                {step === 4 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Comentarios y sugerencias</h2>
                        <p className="text-gray-500 mb-6">Si pudieras cambiar una sola cosa para que tus compañeros no renuncien, ¿qué sería?</p>

                        <textarea
                            value={comentario}
                            onChange={(e) => setComentario(e.target.value)}
                            className="w-full h-40 border-2 border-gray-100 rounded-2xl p-4 focus:border-violet-600 outline-none resize-none transition-all"
                            placeholder="Tu opinión honesta..."
                        />
                    </div>
                )}

                {/* NAVIGATION */}
                <div className="mt-10 flex gap-4">
                    {step > 1 && (
                        <button
                            onClick={() => setStep(prev => prev - 1)}
                            className="px-8 py-4 rounded-2xl font-bold text-gray-400 hover:text-gray-600 transition-all"
                        >
                            Atrás
                        </button>
                    )}

                    {step < 4 ? (
                        <button
                            onClick={() => setStep(prev => prev + 1)}
                            disabled={step === 1 && nps === null}
                            className="flex-1 bg-violet-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-violet-100 hover:bg-violet-700 disabled:opacity-50 transition-all"
                        >
                            Siguiente
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="flex-1 bg-violet-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-violet-100 hover:bg-violet-700 disabled:opacity-50 transition-all"
                        >
                            {submitting ? 'Enviando...' : 'Finalizar Encuesta'}
                        </button>
                    )}
                </div>
            </div>

            <div className="mt-12 text-center text-xs text-gray-400 font-medium">
                <div className="mb-4 text-gray-500 uppercase tracking-widest text-[10px]">Compromiso Liah HR</div>
                <p className="max-w-md mx-auto leading-relaxed">
                    Esta encuesta es administrada de forma independiente para asegurar el anonimato.
                    Tus respuestas se procesan de forma agregada bajo la <strong>Ley N° 29733</strong> (Ley de Protección de Datos Personales).
                </p>
            </div>
        </div>
    );
}

export default function ExitSurveyPage() {
    return (
        <div className="min-h-screen bg-[#FDFDFF] font-sans text-gray-900">
            <Suspense fallback={
                <div className="flex items-center justify-center min-h-screen">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-violet-600"></div>
                </div>
            }>
                <SurveyContent />
            </Suspense>
        </div>
    );
}
