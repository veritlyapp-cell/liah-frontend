'use client';

import { useState, useRef, useEffect } from 'react';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';

interface HoldingLogoUploadProps {
    holdingId: string;
}

export default function HoldingLogoUpload({ holdingId }: HoldingLogoUploadProps) {
    const [holdingName, setHoldingName] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [previewUrl, setPreviewUrl] = useState('');
    const [branding, setBranding] = useState({
        enabled: false,
        primaryColor: '#E30613',
        secondaryColor: '#1A1A1A',
        phrases: [] as string[],
        gallery: [] as string[],
        videos: [] as { id: string, title: string }[],
        description: ''
    });
    const fileInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);
    const [ytInput, setYtInput] = useState('');

    // Load current holding data
    useEffect(() => {
        async function loadHolding() {
            if (!holdingId) return;

            try {
                const holdingRef = doc(db, 'holdings', holdingId);
                const holdingDoc = await getDoc(holdingRef);

                if (holdingDoc.exists()) {
                    const data = holdingDoc.data();
                    setHoldingName(data.nombre || '');
                    setLogoUrl(data.logoUrl || '');
                    setPreviewUrl(data.logoUrl || '');
                    if (data.config?.branding) {
                        setBranding({
                            enabled: data.config.branding.enabled ?? true, // Default to true if configuring
                            primaryColor: data.config.branding.primaryColor || '#E30613',
                            secondaryColor: data.config.branding.secondaryColor || '#1A1A1A',
                            phrases: data.config.branding.phrases || [],
                            gallery: data.config.branding.gallery || [],
                            videos: data.config.branding.videos || [],
                            description: data.config.branding.description || ''
                        });
                    } else {
                        // Default presets for Phillip Chu Joy or generic premium
                        setBranding(prev => ({
                            ...prev,
                            enabled: true,
                            primaryColor: '#E30613',
                            secondaryColor: '#1A1A1A'
                        }));
                    }
                }
            } catch (error) {
                console.error('Error loading holding:', error);
            }
        }

        loadHolding();
    }, [holdingId]);

    async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>, target: 'logo' | 'gallery') {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);

        try {
            if (target === 'logo') {
                const file = files[0];
                const fileName = `logos/holdings/${holdingId}_${Date.now()}.${file.name.split('.').pop()}`;
                const storageRef = ref(storage, fileName);
                await uploadBytes(storageRef, file);
                const url = await getDownloadURL(storageRef);
                setLogoUrl(url);
                setPreviewUrl(url);
            } else {
                const newGallery = [...branding.gallery];
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    const fileName = `branding/${holdingId}/gallery/${Date.now()}_${file.name}`;
                    const storageRef = ref(storage, fileName);
                    await uploadBytes(storageRef, file);
                    const url = await getDownloadURL(storageRef);
                    newGallery.push(url);
                }
                setBranding({ ...branding, gallery: newGallery });
            }
        } catch (error: any) {
            console.error('Error subiendo:', error);
            alert(`❌ Error subiendo: ${error.message}`);
        } finally {
            setUploading(false);
        }
    }

    const addYoutubeVideo = () => {
        if (!ytInput) return;
        let id = ytInput;
        // Basic extract ID from URL
        if (ytInput.includes('v=')) id = ytInput.split('v=')[1].split('&')[0];
        else if (ytInput.includes('youtu.be/')) id = ytInput.split('youtu.be/')[1].split('?')[0];
        else if (ytInput.includes('embed/')) id = ytInput.split('embed/')[1].split('?')[0];

        if (id.length < 5) {
            alert('ID de video inválido');
            return;
        }

        setBranding({
            ...branding,
            videos: [...branding.videos, { id, title: 'Video Corportativo' }]
        });
        setYtInput('');
    };

    const removeGalleryItem = (index: number) => {
        const newGallery = [...branding.gallery];
        newGallery.splice(index, 1);
        setBranding({ ...branding, gallery: newGallery });
    };

    const removeVideoItem = (index: number) => {
        const newVideos = [...branding.videos];
        newVideos.splice(index, 1);
        setBranding({ ...branding, videos: newVideos });
    };

    async function handleSave() {
        if (!holdingId) return;
        setSaving(true);
        try {
            const holdingRef = doc(db, 'holdings', holdingId);
            await updateDoc(holdingRef, {
                nombre: holdingName,
                logoUrl: logoUrl || null,
                config: { branding },
                updatedAt: Timestamp.now()
            });
            alert('✅ Marca empleadora guardada');
        } catch (error: any) {
            console.error('Error guardando:', error);
            alert('❌ Error guardando');
        } finally {
            setSaving(false);
        }
    }

    if (!holdingId) return null;

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header / Brand Card */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="h-32 bg-gradient-to-r from-red-600 to-red-800 relative">
                    <div className="absolute -bottom-12 left-8 p-1 bg-white rounded-2xl shadow-lg border border-gray-100">
                        {previewUrl ? (
                            <img src={previewUrl} alt="Logo" className="w-24 h-24 object-contain rounded-xl" />
                        ) : (
                            <div className="w-24 h-24 bg-gray-50 flex items-center justify-center rounded-xl border-2 border-dashed border-gray-200 text-gray-400 text-xs text-center p-2">
                                Sin Logo
                            </div>
                        )}
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute -top-2 -right-2 w-8 h-8 bg-violet-600 text-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
                        >
                            ✏️
                        </button>
                    </div>
                </div>

                <div className="pt-16 pb-6 px-8 flex justify-between items-end gap-6">
                    <div className="flex-1">
                        <input
                            type="text"
                            value={holdingName}
                            onChange={(e) => setHoldingName(e.target.value)}
                            className="text-2xl font-black text-gray-900 bg-transparent border-b border-transparent hover:border-violet-200 transition-colors focus:outline-none focus:border-violet-500 w-full"
                            placeholder="Nombre de la Marca"
                        />
                        <p className="text-sm text-gray-500 mt-1">Configuración de Identidad y Portal</p>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saving || uploading}
                        className="px-6 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                    >
                        {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Visual Settings */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Colors & Style */}
                    <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                        <h4 className="font-bold text-gray-900 flex items-center gap-2">🎨 Colores de Marca</h4>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="p-4 bg-gray-50 rounded-xl space-y-3">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Color Primario</label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="color"
                                        value={branding.primaryColor}
                                        onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                                        className="w-12 h-12 rounded-lg cursor-pointer border-2 border-white shadow-sm"
                                    />
                                    <input
                                        type="text"
                                        value={branding.primaryColor}
                                        onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                                        className="flex-1 bg-white px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono"
                                    />
                                </div>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-xl space-y-3">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Color Secundario</label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="color"
                                        value={branding.secondaryColor}
                                        onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })}
                                        className="w-12 h-12 rounded-lg cursor-pointer border-2 border-white shadow-sm"
                                    />
                                    <input
                                        type="text"
                                        value={branding.secondaryColor}
                                        onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })}
                                        className="flex-1 bg-white px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono"
                                    />
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setBranding({ ...branding, primaryColor: '#E30613', secondaryColor: '#1A1A1A' })}
                            className="text-xs font-bold text-red-600 hover:text-red-700 underline"
                        >
                            Aplicar Paleta Phill-Chu-Joy
                        </button>
                    </section>

                    {/* Content CMS */}
                    <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
                        <h4 className="font-bold text-gray-900 flex items-center gap-2">✍️ Contenido del Portal</h4>

                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Descripción de la Empresa</label>
                            <textarea
                                value={branding.description}
                                onChange={(e) => setBranding({ ...branding, description: e.target.value })}
                                placeholder="Describe por qué es genial trabajar aquí..."
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm min-h-[120px] focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Frases destacadas (Hero)</label>
                            <textarea
                                value={branding.phrases.join('\n')}
                                onChange={(e) => setBranding({ ...branding, phrases: e.target.value.split('\n').filter(Boolean) })}
                                placeholder="Una frase por línea&#10;Ej: El futuro es hoy"
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-red-500"
                            />
                        </div>
                    </section>
                </div>

                {/* Media Side */}
                <div className="space-y-8">
                    {/* Gallery Manager */}
                    <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                        <div className="flex justify-between items-center">
                            <h4 className="font-bold text-gray-900">📸 Galería de Fotos</h4>
                            <button
                                onClick={() => galleryInputRef.current?.click()}
                                disabled={uploading}
                                className="text-xs px-3 py-1 bg-violet-50 text-violet-600 font-bold rounded-lg hover:bg-violet-100 transition-colors"
                            >
                                {uploading ? '⏳...' : '+ Subir'}
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2 min-h-[100px]">
                            {branding.gallery.map((url, idx) => (
                                <div key={idx} className="group relative aspect-video bg-gray-50 rounded-lg overflow-hidden border border-gray-100">
                                    <img src={url} alt="Gallery" className="w-full h-full object-cover" />
                                    <button
                                        onClick={() => removeGalleryItem(idx)}
                                        className="absolute top-1 right-1 w-6 h-6 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px]"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                            <button
                                onClick={() => galleryInputRef.current?.click()}
                                className="aspect-video border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-violet-300 hover:text-violet-400 transition-all"
                            >
                                <span className="text-xl">+</span>
                                <span className="text-[10px] font-bold uppercase">Añadir</span>
                            </button>
                        </div>
                        <input
                            ref={galleryInputRef}
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={(e) => handleFileUpload(e, 'gallery')}
                            className="hidden"
                        />
                    </section>

                    {/* YouTube Manager */}
                    <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                        <h4 className="font-bold text-gray-900">🎥 Videos de YouTube</h4>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={ytInput}
                                onChange={(e) => setYtInput(e.target.value)}
                                placeholder="Pega el link de YouTube"
                                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-xs"
                            />
                            <button
                                onClick={addYoutubeVideo}
                                className="px-3 py-2 bg-red-600 text-white rounded-lg font-bold text-xs"
                            >
                                Añadir
                            </button>
                        </div>

                        <div className="space-y-2">
                            {branding.videos.map((vid, idx) => (
                                <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                    <div className="w-12 h-9 bg-gray-200 rounded flex items-center justify-center text-[10px] text-gray-400 overflow-hidden">
                                        <img src={`https://img.youtube.com/vi/${vid.id}/default.jpg`} alt="YT" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] text-gray-400 font-mono truncate">ID: {vid.id}</p>
                                    </div>
                                    <button onClick={() => removeVideoItem(idx)} className="text-gray-300 hover:text-red-500 transition-colors">🗑️</button>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload(e, 'logo')}
                className="hidden"
            />
        </div>
    );
}
