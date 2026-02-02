'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    ArrowRight,
    Upload,
    User,
    Mail,
    Phone,
    FileText,
    DollarSign,
    CheckCircle2,
    Zap,
    ChevronLeft
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

function UneteContent() {
    const router = useRouter();
    const params = useParams();
    // Get holdingSlug from dynamic route params
    const holdingSlug = params.holdingSlug as string || 'ngr';

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [holdingName, setHoldingName] = useState('...');
    const [colors, setColors] = useState({
        primary: '#7c3aed',
        secondary: '#4f46e5',
        yellow: '#FF6B35'
    });

    const [formData, setFormData] = useState({
        nombre: '',
        apellidos: '',
        dni: '',
        email: '',
        telefono: '',
        expectativa: '',
        mensaje: ''
    });

    const [file, setFile] = useState<File | null>(null);
    const [dragging, setDragging] = useState(false);

    useEffect(() => {
        async function loadHolding() {
            try {
                const q = query(collection(db, 'holdings'), where('slug', '==', holdingSlug.toLowerCase()));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    const data = snap.docs[0].data() as any;
                    setHoldingName(data.nombre || holdingSlug.toUpperCase());
                    if (data.config?.branding?.enabled) {
                        setColors({
                            primary: data.config.branding.primaryColor || '#7c3aed',
                            secondary: data.config.branding.secondaryColor || '#4f46e5',
                            yellow: '#FF6B35'
                        });
                    }
                }
            } catch (error) {
                console.error('Error loading holding:', error);
            } finally {
                setLoading(false);
            }
        }
        loadHolding();
    }, [holdingSlug]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) {
            alert('Por favor sube tu CV');
            return;
        }

        setSubmitting(true);

        try {
            // Use FormData for file upload
            const data = new FormData();
            data.append('file', file);
            data.append('holdingSlug', holdingSlug);
            data.append('payload', JSON.stringify(formData));

            const res = await fetch('/api/portal/talent', {
                method: 'POST',
                body: data
            });

            if (res.ok) {
                setSuccess(true);
            } else {
                const err = await res.json();
                alert(err.error || 'Error al enviar');
            }
        } catch (error) {
            console.error('Error submitting:', error);
            alert('Error de conexión');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="animate-spin w-12 h-12 border-4 border-slate-200 border-t-violet-600 rounded-full" />
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-[3rem] p-12 max-w-lg w-full text-center shadow-2xl"
                >
                    <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-8">
                        <CheckCircle2 size={48} className="text-green-600" />
                    </div>
                    <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tighter uppercase italic leading-none">¡Recibido!</h2>
                    <p className="text-lg text-slate-600 mb-8 font-medium">
                        Tu perfil ha sido guardado exitosamente en nuestra base de datos.
                        Te contactaremos cuando surja una oportunidad ideal para ti.
                    </p>
                    <button
                        onClick={() => router.push(`/empleos/${holdingSlug}`)}
                        className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase italic tracking-widest hover:bg-violet-600 transition-all shadow-xl"
                    >
                        Volver al portal
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-20 flex flex-col items-center">
            {/* Nav */}
            <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-slate-100 px-6 py-4 w-full">
                <div className="max-w-3xl mx-auto grid grid-cols-3 items-center">
                    <button
                        onClick={() => router.push(`/empleos/${holdingSlug}`)}
                        className="flex items-center gap-2 text-slate-500 font-bold text-sm uppercase tracking-wider hover:text-slate-900 transition-colors"
                    >
                        <ChevronLeft size={20} /> <span className="hidden md:inline">Volver</span>
                    </button>

                    <div className="text-center">
                        <span className="font-black italic text-slate-900 uppercase tracking-tighter whitespace-nowrap">
                            {holdingName} <span className="text-violet-600">Talent</span>
                        </span>
                    </div>

                    <div className="flex justify-end">
                        {/* Placeholder for balance */}
                    </div>
                </div>
            </nav>

            <header className="bg-slate-900 text-white pt-20 pb-40 px-6 w-full flex justify-center">
                <div className="max-w-3xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-xs font-black uppercase tracking-widest mb-6">
                        <Zap size={14} className="text-yellow-400" /> Únete a nuestra red de talento
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase italic leading-none mb-6">
                        Impulsa tu <br /><span className="text-violet-400">carrera_</span>
                    </h1>
                    <p className="text-lg text-slate-400 max-w-xl mx-auto font-medium">
                        No necesitas esperar a una vacante específica. Déjanos tu CV y nuestra IA te encontrará el puesto ideal.
                    </p>
                </div>
            </header>

            <div className="max-w-3xl w-full mx-auto px-6 -mt-24">
                <form onSubmit={handleSubmit} className="bg-white rounded-[3rem] p-8 md:p-12 shadow-2xl border border-slate-100 space-y-8">
                    {/* Personales */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                <User size={14} /> Nombres
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.nombre}
                                onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold outline-none focus:border-violet-400 transition-colors"
                                placeholder="Juan Gabriel"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                <User size={14} /> Apellidos
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.apellidos}
                                onChange={e => setFormData({ ...formData, apellidos: e.target.value })}
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold outline-none focus:border-violet-400 transition-colors"
                                placeholder="Pérez García"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                <FileText size={14} /> DNI / CE
                            </label>
                            <input
                                type="text"
                                required
                                maxLength={12}
                                value={formData.dni}
                                onChange={e => setFormData({ ...formData, dni: e.target.value.replace(/\D/g, '') })}
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold outline-none focus:border-violet-400 transition-colors"
                                placeholder="76543210"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                <Phone size={14} /> Celular
                            </label>
                            <input
                                type="tel"
                                required
                                maxLength={9}
                                value={formData.telefono}
                                onChange={e => setFormData({ ...formData, telefono: e.target.value.replace(/\D/g, '') })}
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold outline-none focus:border-violet-400 transition-colors"
                                placeholder="987654321"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <Mail size={14} /> Correo Electrónico
                        </label>
                        <input
                            type="email"
                            required
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold outline-none focus:border-violet-400 transition-colors"
                            placeholder="juan@ejemplo.com"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <DollarSign size={14} /> Pretensión Salarial Mensual (Bruto)
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.expectativa}
                            onChange={e => setFormData({ ...formData, expectativa: e.target.value })}
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold outline-none focus:border-violet-400 transition-colors"
                            placeholder="S/ 2,500 - S/ 3,000 o monto fijo"
                        />
                    </div>

                    {/* CV Upload */}
                    <div className="space-y-4">
                        <label className="text-sm font-black uppercase tracking-widest text-slate-400">Sube tu CV (PDF o Imagen)</label>
                        <div
                            onDragOver={e => { e.preventDefault(); setDragging(true); }}
                            onDragLeave={() => setDragging(false)}
                            onDrop={handleDrop}
                            className={`
                                relative border-4 border-dashed rounded-[2.5rem] p-12 text-center transition-all
                                ${dragging ? 'border-violet-400 bg-violet-50 scale-[0.98]' : 'border-slate-100 bg-slate-50 hover:border-slate-200'}
                                ${file ? 'border-green-200 bg-green-50' : ''}
                            `}
                        >
                            <input
                                type="file"
                                id="cv-upload"
                                className="hidden"
                                accept=".pdf,.png,.jpg,.jpeg"
                                onChange={handleFileChange}
                            />
                            <label htmlFor="cv-upload" className="cursor-pointer block">
                                <div className={`w-20 h-20 mx-auto rounded-3xl flex items-center justify-center mb-6 transition-transform ${file ? 'bg-green-100 scale-110' : 'bg-slate-200'}`}>
                                    {file ? <CheckCircle2 className="text-green-600" size={40} /> : <Upload className="text-slate-500" size={40} />}
                                </div>
                                <p className="text-xl font-black text-slate-900 uppercase italic">
                                    {file ? file.name : 'Haz clic para subir o arrastra tu archivo'}
                                </p>
                                <p className="text-slate-400 font-bold text-sm mt-2 uppercase tracking-widest">
                                    PDF, JPG o PNG (Máx 5MB)
                                </p>
                            </label>
                        </div>
                    </div>

                    <div className="pt-6">
                        <button
                            type="submit"
                            disabled={submitting}
                            className={`
                                w-full py-6 rounded-[2rem] font-black uppercase italic tracking-widest text-lg shadow-2xl transition-all
                                ${submitting ? 'bg-slate-100 text-slate-400 cursor-wait' : 'bg-slate-900 text-white hover:bg-violet-600 active:scale-[0.98]'}
                            `}
                        >
                            {submitting ? 'Procesando tu perfil...' : 'Unirme a la red de talento'}
                        </button>
                        <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-6">
                            Al unirte, autorizas el tratamiento de tus datos para fines de reclutamiento.
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function UnetePage() {
    return (
        <Suspense fallback={null}>
            <UneteContent />
        </Suspense>
    );
}
