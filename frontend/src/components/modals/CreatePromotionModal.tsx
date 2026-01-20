import { useState, useEffect } from 'react';
import { X, Tag, Percent, DollarSign, Calendar, CreditCard, Banknote, Smartphone, Check, Search, PlusCircle } from 'lucide-react';
import { promoService, productService } from '@/services';
import { useConfigStore, themeColors } from '@/stores/configStore';
import type { Product, Promotion } from '@/types';

interface Props {
    onClose: () => void;
    onSuccess: () => void;
    initialData?: Promotion;
}

const CreatePromotionModal = ({ onClose, onSuccess, initialData }: Props) => {
    const { themeColor } = useConfigStore();
    const theme = themeColors[themeColor];

    // Form State
    const [name, setName] = useState('');
    const [type, setType] = useState<'N_X_M' | 'PERCENTAGE' | 'FIXED_PRICE' | null>(null);

    // Reglas
    const [buyQty, setBuyQty] = useState<number>(2);
    const [payQty, setPayQty] = useState<number>(1);
    const [discountPercent, setDiscountPercent] = useState<number>(10);
    const [fixedPrice, setFixedPrice] = useState<number>(0);

    // Vigencia
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    const [daysOfWeek, setDaysOfWeek] = useState<string>('0,1,2,3,4,5,6');

    // Pagos
    const [paymentMethod, setPaymentMethod] = useState<string | null>(null);

    // Productos
    const [search, setSearch] = useState('');
    const [searchResults, setSearchResults] = useState<Product[]>([]);
    const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);

    const [loading, setLoading] = useState(false);

    // Cargar datos iniciales (Edición)
    useEffect(() => {
        const loadDetails = async () => {
            if (initialData) {
                // UI Inmediata
                setName(initialData.name);
                setType(initialData.type);
                setStartDate(initialData.startDate.split('T')[0]);
                setEndDate(initialData.endDate.split('T')[0]);
                setDaysOfWeek(initialData.daysOfWeek || '0,1,2,3,4,5,6');
                setPaymentMethod(initialData.paymentMethodId || null);

                if (initialData.buyQuantity) setBuyQty(initialData.buyQuantity);
                if (initialData.payQuantity) setPayQty(initialData.payQuantity);
                if (initialData.discountPercent) setDiscountPercent(initialData.discountPercent);
                if (initialData.fixedPrice) setFixedPrice(initialData.fixedPrice);

                // Fetch Full Data
                try {
                    const fullPromo = await promoService.getById(initialData.id);
                    if (fullPromo.products) {
                        const prods = fullPromo.products
                            .map(pp => pp.product)
                            .filter(Boolean) as Product[];
                        setSelectedProducts(prods);
                    }
                } catch (error) {
                    console.error("Error cargando detalles:", error);
                }
            }
        };
        loadDetails();
    }, [initialData]);

    // Búsqueda de productos
    useEffect(() => {
        const timeout = setTimeout(async () => {
            if (search.length > 2) {
                try {
                    const res = await productService.getAll({ search, limit: 10 });
                    setSearchResults(res.data);
                } catch (e) { console.error(e); }
            }
        }, 300);
        return () => clearTimeout(timeout);
    }, [search]);

    const handleSubmit = async () => {
        if (!name || !type || selectedProducts.length === 0) {
            alert('Por favor completa los campos requeridos y selecciona productos.');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                name,
                type,
                startDate,
                endDate,
                daysOfWeek,
                // Reglas según tipo
                buyQuantity: type === 'N_X_M' ? buyQty : undefined,
                payQuantity: type === 'N_X_M' ? payQty : undefined,
                discountPercent: type === 'PERCENTAGE' ? discountPercent : undefined,
                fixedPrice: type === 'FIXED_PRICE' ? fixedPrice : undefined,
                // Pago
                paymentMethodId: paymentMethod || undefined,
                // Productos
                productIds: selectedProducts.map(p => p.id)
            };

            if (initialData) {
                await promoService.update(initialData.id, payload);
            } else {
                await promoService.create(payload);
            }
            onSuccess();
        } catch (error) {
            console.error(error);
            alert('Error al guardar la promoción');
        } finally {
            setLoading(false);
        }
    };

    const toggleDay = (day: number) => {
        const current = daysOfWeek ? daysOfWeek.split(',').map(Number) : [];
        let newDays;
        if (current.includes(day)) {
            newDays = current.filter(d => d !== day);
        } else {
            newDays = [...current, day].sort();
        }
        setDaysOfWeek(newDays.join(','));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">
                            {initialData ? 'Editar Oferta' : 'Nueva Oferta'}
                        </h2>
                        <p className="text-sm text-gray-500">
                            {initialData ? 'Modifica las reglas existentes' : 'Configura las reglas para aumentar tus ventas'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Body Scrolling */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">

                    {/* 1. Nombre */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la Promoción</label>
                        <input
                            type="text"
                            className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-lg font-medium"
                            placeholder="Ej: 2x1 en Cervezas Artesanales"
                            value={name}
                            onChange={e => setName(e.target.value)}
                        />
                    </div>

                    {/* 2. Tipo de Oferta (Cards) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">Tipo de Oferta</label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[
                                { id: 'N_X_M', label: 'NxM (2x1, 3x2)', icon: Tag, color: 'bg-purple-50 text-purple-600', border: 'peer-checked:border-purple-500 peer-checked:bg-purple-50' },
                                { id: 'PERCENTAGE', label: 'Descuento %', icon: Percent, color: 'bg-blue-50 text-blue-600', border: 'peer-checked:border-blue-500 peer-checked:bg-blue-50' },
                                { id: 'FIXED_PRICE', label: 'Precio Fijo', icon: DollarSign, color: 'bg-emerald-50 text-emerald-600', border: 'peer-checked:border-emerald-500 peer-checked:bg-emerald-50' },
                            ].map((opt) => (
                                <label key={opt.id} className="cursor-pointer relative">
                                    <input
                                        type="radio"
                                        name="promoType"
                                        className="peer sr-only"
                                        checked={type === opt.id}
                                        onChange={() => setType(opt.id as any)}
                                    />
                                    <div className={`p-4 rounded-xl border-2 border-gray-100 hover:border-gray-300 transition-all flex flex-col items-center gap-3 ${type === opt.id ? `border-${opt.color.split('-')[1]}-500 bg-gray-50` : ''}`}>
                                        <div className={`p-3 rounded-full ${opt.color}`}>
                                            <opt.icon size={24} />
                                        </div>
                                        <span className="font-semibold text-gray-700">{opt.label}</span>
                                        {type === opt.id && <div className="absolute top-3 right-3 text-emerald-500"><Check size={20} /></div>}
                                    </div>
                                </label>
                            ))}
                        </div>

                        {/* Configuración Dinámica según Tipo */}
                        <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100 transition-all">
                            {type === 'N_X_M' && (
                                <div className="flex items-center gap-4">
                                    <div className="flex-1">
                                        <label className="text-xs text-gray-500 uppercase font-bold">Llevas (Cantidad)</label>
                                        <input type="number" min="1" value={buyQty} onChange={e => setBuyQty(Number(e.target.value))} className="w-full mt-1 p-2 rounded-lg border text-center font-bold text-xl" />
                                    </div>
                                    <span className="pt-6 font-bold text-gray-400">PAGAS</span>
                                    <div className="flex-1">
                                        <label className="text-xs text-gray-500 uppercase font-bold">Pagas (Cantidad)</label>
                                        <input type="number" min="1" value={payQty} onChange={e => setPayQty(Number(e.target.value))} className="w-full mt-1 p-2 rounded-lg border text-center font-bold text-xl" />
                                    </div>
                                </div>
                            )}
                            {type === 'PERCENTAGE' && (
                                <div>
                                    <label className="text-xs text-gray-500 uppercase font-bold">Porcentaje de Descuento</label>
                                    <div className="relative mt-1">
                                        <input type="number" min="1" max="100" value={discountPercent} onChange={e => setDiscountPercent(Number(e.target.value))} className="w-full p-2 pl-4 pr-10 rounded-lg border font-bold text-xl" />
                                        <Percent size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    </div>
                                </div>
                            )}
                            {type === 'FIXED_PRICE' && (
                                <div>
                                    <label className="text-xs text-gray-500 uppercase font-bold">Precio Final del Set</label>
                                    <div className="relative mt-1">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg font-bold">$</span>
                                        <input type="number" min="0" value={fixedPrice} onChange={e => setFixedPrice(Number(e.target.value))} className="w-full p-2 pl-8 rounded-lg border font-bold text-xl" />
                                    </div>
                                </div>
                            )}
                            {!type && <p className="text-center text-gray-400 text-sm">Selecciona un tipo de oferta arriba</p>}
                        </div>
                    </div>

                    {/* 3. Vigencia y Pagos */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Fechas */}
                        <div>
                            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><Calendar size={18} /> Vigencia</h3>
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <div>
                                    <label className="text-xs text-gray-500">Desde</label>
                                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 rounded-lg border bg-white" />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500">Hasta</label>
                                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 rounded-lg border bg-white" />
                                </div>
                            </div>
                            <label className="text-xs text-gray-500 mb-2 block">Días permitidos</label>
                            <div className="flex justify-between gap-1">
                                {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d, i) => {
                                    const active = daysOfWeek.includes(i.toString());
                                    return (
                                        <button
                                            key={i}
                                            onClick={() => toggleDay(i)}
                                            className={`w-8 h-8 rounded-full text-xs font-bold transition-all ${active ? theme.bg + ' text-white shadow-md scale-105' : 'bg-gray-100 text-gray-400'}`}
                                        >
                                            {d}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Pagos (Cards solicitadas) */}
                        <div>
                            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><CreditCard size={18} /> Medio de Pago</h3>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { id: null, label: 'Cualquiera', icon: Check },
                                    { id: 'cash', label: 'Efectivo', icon: Banknote },
                                    { id: 'card', label: 'Tarjeta', icon: CreditCard },
                                    { id: 'qr', label: 'QR / App', icon: Smartphone }
                                ].map((pm) => (
                                    <button
                                        key={String(pm.id)}
                                        onClick={() => setPaymentMethod(pm.id)}
                                        className={`p-3 rounded-xl border flex items-center gap-2 transition-all ${paymentMethod === pm.id ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500' : 'border-gray-200 hover:border-indigo-200 bg-white'}`}
                                    >
                                        <pm.icon size={18} />
                                        <span className="text-sm font-medium">{pm.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* 4. Productos */}
                    <div>
                        <h3 className="font-semibold text-gray-800 mb-3">Productos Incluidos ({selectedProducts.length})</h3>
                        <div className="relative mb-3">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar productos para agregar..."
                                className="w-full p-3 pl-10 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>

                        {/* Resultados búsqueda */}
                        {searchResults.length > 0 && search.length > 2 && (
                            <div className="bg-white border rounded-xl shadow-lg max-h-60 overflow-y-auto mb-4 divide-y">
                                {searchResults.map(prod => (
                                    <div
                                        key={prod.id}
                                        className="p-3 hover:bg-gray-50 flex justify-between items-center cursor-pointer group"
                                        onClick={() => {
                                            if (!selectedProducts.find(p => p.id === prod.id)) {
                                                setSelectedProducts([...selectedProducts, prod]);
                                            }
                                            setSearch('');
                                            setSearchResults([]);
                                        }}
                                    >
                                        <div>
                                            <p className="font-medium text-gray-800">{prod.name}</p>
                                            <p className="text-xs text-gray-500">{prod.sku}</p>
                                        </div>
                                        <PlusCircle className="text-indigo-400 group-hover:text-indigo-600" size={20} />
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Lista seleccionados */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {selectedProducts.map(prod => (
                                <div key={prod.id} className="flex justify-between items-center p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                                    <span className="text-sm font-medium text-indigo-900 truncate">{prod.name}</span>
                                    <button
                                        onClick={() => setSelectedProducts(prev => prev.filter(p => p.id !== prod.id))}
                                        className="text-indigo-400 hover:text-red-500"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}
                            {selectedProducts.length === 0 && (
                                <div className="col-span-full py-8 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                                    No hay productos seleccionados
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-2.5 rounded-xl font-medium text-gray-600 hover:bg-gray-200 transition-colors">
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className={`px-6 py-2.5 rounded-xl font-medium text-white shadow-lg shadow-indigo-200 hover:shadow-xl transition-all hover:-translate-y-0.5 ${theme.bg} ${loading ? 'opacity-70 cursor-wait' : ''}`}
                    >
                        {loading ? 'Guardar' : (initialData ? 'Actualizar Oferta' : 'Crear Oferta')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreatePromotionModal;
