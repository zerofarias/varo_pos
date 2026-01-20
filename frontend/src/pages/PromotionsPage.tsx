/**
 * VARO POS - Página de Gestión de Promociones ("El Ofertero")
 */
import { useState, useEffect } from 'react';
import {
    Plus, Calendar, Tag, Percent, DollarSign, Trash2, Edit,
    Gift, AlertCircle, Clock
} from 'lucide-react';
import { promoService } from '@/services';
import { useConfigStore, themeColors } from '@/stores/configStore';
import type { Promotion } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import CreatePromotionModal from '@/components/modals/CreatePromotionModal';

export const PromotionsPage = () => {
    const { themeColor } = useConfigStore();
    const theme = themeColors[themeColor];

    const [promos, setPromos] = useState<Promotion[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingPromo, setEditingPromo] = useState<Promotion | undefined>(undefined);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const data = await promoService.getAll();
            setPromos(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('¿Eliminar esta oferta?')) return;
        try {
            await promoService.delete(id);
            loadData();
        } catch (error) {
            alert('Error al eliminar');
        }
    };

    const handleEdit = (promo: Promotion, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingPromo(promo);
        setShowModal(true);
    };

    const handleToggle = async (id: string, current: boolean, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await promoService.toggle(id, !current);
            setPromos(prev => prev.map(p => p.id === id ? { ...p, isActive: !current } : p));
        } catch (error) {
            console.error(error);
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingPromo(undefined);
    };

    return (
        <div className="h-full flex flex-col bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 p-6 shrink-0">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <Gift className="text-pink-500" size={28} />
                            Ofertero
                        </h1>
                        <p className="text-slate-500 text-sm mt-1">
                            Gestiona tus promociones 2x1, descuentos y combos
                        </p>
                    </div>
                    <button
                        onClick={() => { setEditingPromo(undefined); setShowModal(true); }}
                        className={`flex items-center gap-2 px-5 py-3 rounded-xl text-white font-medium shadow-lg shadow-indigo-200 hover:shadow-xl transition-all hover:-translate-y-0.5 ${theme.bg}`}
                    >
                        <Plus size={20} />
                        Nueva Oferta
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                {loading ? (
                    <div className="flex justify-center py-20"><div className="spinner w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" /></div>
                ) : promos.length === 0 ? (
                    <div className="text-center py-20 text-slate-400">
                        <Gift size={64} className="mx-auto mb-4 opacity-30" />
                        <h3 className="text-lg font-medium text-slate-600">No hay ofertas activas</h3>
                        <p>¡Crea tu primera promoción para atraer clientes!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {promos.map(promo => (
                            <PromoCard
                                key={promo.id}
                                promo={promo}
                                theme={theme}
                                onDelete={handleDelete}
                                onEdit={handleEdit}
                                onToggle={handleToggle}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <CreatePromotionModal
                    initialData={editingPromo}
                    onClose={handleCloseModal}
                    onSuccess={() => {
                        handleCloseModal();
                        loadData();
                    }}
                />
            )}
        </div>
    );
};

const PromoCard = ({ promo, theme, onDelete, onEdit, onToggle }: any) => {
    // Icono y Color según tipo
    const getTypeConfig = (type: string) => {
        switch (type) {
            case 'N_X_M': return { icon: Tag, color: 'bg-purple-100 text-purple-700', label: 'NxM' };
            case 'PERCENTAGE': return { icon: Percent, color: 'bg-blue-100 text-blue-700', label: 'Descuento' };
            case 'FIXED_PRICE': return { icon: DollarSign, color: 'bg-emerald-100 text-emerald-700', label: 'Precio Fijo' };
            default: return { icon: Gift, color: 'bg-slate-100 text-slate-700', label: 'Promo' };
        }
    };

    const config = getTypeConfig(promo.type);
    const Icon = config.icon;

    // Check venciomiento
    const isExpired = new Date(promo.endDate) < new Date();

    return (
        <div
            onClick={(e) => onEdit(promo, e)}
            className={`cursor-pointer group bg-white rounded-2xl border transition-all hover:shadow-md relative overflow-hidden ${!promo.isActive ? 'border-slate-200 opacity-70' :
                    isExpired ? 'border-red-200' : 'border-slate-200 hover:border-indigo-300'
                }`}>
            {/* Status Stripe */}
            <div className={`h-1.5 w-full ${!promo.isActive ? 'bg-slate-300' : isExpired ? 'bg-red-400' : theme.bg}`} />

            <div className="p-5">
                <div className="flex justify-between items-start mb-4">
                    <div className={`p-2 rounded-lg ${config.color}`}>
                        <Icon size={20} />
                    </div>
                    <div className="flex items-center gap-2">
                        <div
                            onClick={(e) => onToggle(promo.id, promo.isActive, e)}
                            className={`cursor-pointer w-10 h-6 rounded-full p-1 transition-colors ${promo.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}
                        >
                            <div className={`w-4 h-4 bg-white rounded-full transition-transform ${promo.isActive ? 'translate-x-4' : ''}`} />
                        </div>
                    </div>
                </div>

                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="font-bold text-slate-800 text-lg mb-1">{promo.name}</h3>
                        <p className="text-slate-500 text-sm line-clamp-2 min-h-[20px]">
                            {promo.description}
                        </p>
                    </div>
                </div>

                <div className="mt-4 flex flex-col gap-2">
                    {/* Vigencia */}
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Calendar size={14} />
                        <span>Hasta {format(new Date(promo.endDate), 'dd MMM yyyy', { locale: es })}</span>
                        {isExpired && <span className="text-red-500 font-bold">(Vencida)</span>}
                    </div>

                    {/* Detalles */}
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Tag size={14} />
                        <span>{promo.products?.length || promo._count?.products || 0} productos incluidos</span>
                    </div>
                </div>
            </div>

            {/* Footer Actions */}
            <div className="bg-slate-50 p-3 border-t border-slate-100 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={(e) => onEdit(promo, e)}
                    className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold"
                >
                    <Edit size={16} /> EDITAR
                </button>
                <button
                    onClick={(e) => onDelete(promo.id, e)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                    <Trash2 size={16} />
                </button>
            </div>
        </div>
    );
};

export default PromotionsPage;
