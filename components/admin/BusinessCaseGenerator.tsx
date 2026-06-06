import { useState } from 'react';
import { Copy, ExternalLink, Calculator, DollarSign } from 'lucide-react';

export default function BusinessCaseGenerator() {
    const [formData, setFormData] = useState({
        client: '',
        stores: 50,
        hires: 150,
        turnover: 15,
        salary: 1025,
        currency: 'PEN',
        fee: 499,
        setup: 1500
    });

    const [generatedUrl, setGeneratedUrl] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleGenerate = (e: React.FormEvent) => {
        e.preventDefault();
        const baseUrl = window.location.origin;
        const queryParams = new URLSearchParams({
            client: formData.client,
            stores: formData.stores.toString(),
            hires: formData.hires.toString(),
            turnover: formData.turnover.toString(),
            salary: formData.salary.toString(),
            currency: formData.currency,
            fee: formData.fee.toString(),
            setup: formData.setup.toString(),
        }).toString();

        setGeneratedUrl(`${baseUrl}/roi?${queryParams}`);
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(generatedUrl);
        alert('Enlace copiado al portapapeles');
    };

    return (
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm max-w-4xl mx-auto mt-8">
            <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-violet-50 text-violet-600 rounded-2xl flex items-center justify-center">
                    <Calculator className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-xl font-black text-gray-900 uppercase italic tracking-tight">Generador de Business Case</h2>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Crea enlaces dinámicos de ROI para clientes</p>
                </div>
            </div>

            <form onSubmit={handleGenerate} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nombre del Cliente</label>
                    <input type="text" name="client" value={formData.client} onChange={handleChange} required className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-violet-500 focus:outline-none" placeholder="Ej. NGR" />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Moneda</label>
                    <select name="currency" value={formData.currency} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-violet-500 focus:outline-none">
                        <option value="PEN">Soles (PEN)</option>
                        <option value="MXN">Pesos (MXN)</option>
                        <option value="CLP">Pesos (CLP)</option>
                        <option value="COP">Pesos (COP)</option>
                        <option value="USD">Dólares (USD)</option>
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Número de Tiendas</label>
                    <input type="number" name="stores" value={formData.stores} onChange={handleChange} required className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-violet-500 focus:outline-none" />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ingresos Mensuales Promedio</label>
                    <input type="number" name="hires" value={formData.hires} onChange={handleChange} required className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-violet-500 focus:outline-none" />
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">% Rotación Mensual</label>
                    <input type="number" step="0.1" name="turnover" value={formData.turnover} onChange={handleChange} required className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-violet-500 focus:outline-none" />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Salario Promedio ({formData.currency})</label>
                    <input type="number" name="salary" value={formData.salary} onChange={handleChange} required className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-violet-500 focus:outline-none" />
                </div>

                <div className="col-span-1 md:col-span-2 mt-4 pt-4 border-t border-gray-100">
                    <h3 className="text-sm font-black text-gray-900 flex items-center gap-2 mb-4">
                        <DollarSign className="w-4 h-4 text-emerald-500" />
                        Propuesta LIAH (USD)
                    </h3>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Fee Mensual (USD)</label>
                    <input type="number" name="fee" value={formData.fee} onChange={handleChange} required className="w-full px-4 py-3 bg-emerald-50 text-emerald-900 border border-emerald-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Setup Fee (Único, USD)</label>
                    <input type="number" name="setup" value={formData.setup} onChange={handleChange} required className="w-full px-4 py-3 bg-emerald-50 text-emerald-900 border border-emerald-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                </div>

                <div className="col-span-1 md:col-span-2 pt-4">
                    <button type="submit" className="w-full py-4 bg-slate-900 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-slate-900/10">
                        Generar Business Case URL
                    </button>
                </div>
            </form>

            {generatedUrl && (
                <div className="mt-8 p-6 bg-violet-50 rounded-2xl border border-violet-100 animate-fade-in">
                    <p className="text-[10px] font-black text-violet-400 uppercase tracking-widest mb-3">Enlace Generado</p>
                    <div className="flex items-center gap-3">
                        <input type="text" readOnly value={generatedUrl} className="flex-1 bg-white border border-violet-200 px-4 py-3 rounded-xl text-sm text-gray-600 font-mono focus:outline-none" />
                        <button onClick={copyToClipboard} className="p-3 bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors shrink-0">
                            <Copy className="w-5 h-5" />
                        </button>
                        <a href={generatedUrl} target="_blank" rel="noopener noreferrer" className="p-3 bg-white text-violet-600 border border-violet-200 rounded-xl hover:bg-violet-50 transition-colors shrink-0">
                            <ExternalLink className="w-5 h-5" />
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
}
