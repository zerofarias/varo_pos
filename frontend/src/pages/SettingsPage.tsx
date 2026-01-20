/**
 * VARO POS - Página de Configuración
 */

import { useState, useEffect } from 'react';
import {
    Settings, Store, Palette, Printer,
    Save, Check, CreditCard, Trash2, Plus, AlertCircle, Star
} from 'lucide-react';
import { useConfigStore, themeColors } from '@/stores/configStore';
import type { ThemeColor } from '@/types';
import api from '@/services/api';

const COLORS: ThemeColor[] = ['indigo', 'blue', 'emerald', 'rose', 'slate'];

interface PaymentMethod {
    id: string;
    code: string;
    name: string;
    surchargePercent: number;
    discountPercent: number;
    isActive: boolean;
}

export const SettingsPage = () => {
    const config = useConfigStore();
    const theme = themeColors[config.themeColor];
    const [saved, setSaved] = useState(false);

    // Estado para Métodos de Pago
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [loadingMethods, setLoadingMethods] = useState(false);
    const [newMethodName, setNewMethodName] = useState('');

    useEffect(() => {
        loadPaymentMethods();
    }, []);

    const loadPaymentMethods = async () => {
        setLoadingMethods(true);
        try {
            const res = await api.get('/payment-methods?includeInactive=true');
            // Asegurar tipos numéricos y acceso correcto a data
            const methods = (res.data.data || []).map((m: any) => ({
                ...m,
                surchargePercent: Number(m.surchargePercent),
                discountPercent: Number(m.discountPercent)
            }));
            setPaymentMethods(methods);
        } catch (error) {
            console.error('Error cargando métodos de pago', error);
        } finally {
            setLoadingMethods(false);
        }
    };

    const handleSaveConfig = () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleUpdateMethod = async (id: string, updates: Partial<PaymentMethod>) => {
        try {
            // Actualizar localmente primero para UX rápida
            setPaymentMethods(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));

            // await api.put... 
            await api.put(`/payment-methods/${id}`, updates);
            // alert('Actualizado'); // Opcional, feedback sutil
        } catch (error) {
            console.error('Error actualizando método', error);
            alert('Error al guardar cambio');
            loadPaymentMethods(); // Revertir
        }
    };

    const handleDeleteMethod = async (id: string) => {
        if (!confirm('¿Seguro que deseas eliminar este método de pago?')) return;
        try {
            await api.delete(`/payment-methods/${id}`);
            setPaymentMethods(prev => prev.filter(m => m.id !== id));
        } catch (error) {
            console.error(error);
            alert('No se pudo eliminar: ' + (error as any).message);
        }
    };

    const handleAddMethod = async () => {
        if (!newMethodName.trim()) return;
        try {
            const code = newMethodName.toUpperCase().replace(/\s+/g, '_').slice(0, 10);
            const res = await api.post('/payment-methods', {
                name: newMethodName,
                code: code,
                surchargePercent: 0,
                discountPercent: 0,
                isActive: true
            });
            setPaymentMethods([...paymentMethods, res.data.data]);
            setNewMethodName('');
        } catch (error) {
            console.error(error);
            alert('Error al crear método');
        }
    };

    return (
        <div className="h-full overflow-y-auto bg-slate-50">
            <div className="max-w-4xl mx-auto p-4 lg:p-8">
                <header className="mb-8">
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Settings className="text-slate-400" size={28} />
                        Configuración del Sistema
                    </h1>
                    <p className="text-slate-500 mt-1">Personaliza tu punto de venta</p>
                </header>

                <div className="space-y-6">

                    {/* --- MEDIOS DE PAGO --- */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                                <CreditCard size={20} className="text-slate-500" />
                                Medios de Pago y Recargos
                            </h2>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Nuevo método..."
                                    value={newMethodName}
                                    onChange={e => setNewMethodName(e.target.value)}
                                    className="text-sm px-3 py-1.5 border border-slate-300 rounded-lg outline-none focus:border-indigo-500"
                                    onKeyDown={e => e.key === 'Enter' && handleAddMethod()}
                                />
                                <button
                                    onClick={handleAddMethod}
                                    disabled={!newMethodName.trim()}
                                    className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-1"
                                >
                                    <Plus size={16} /> Agregar
                                </button>
                            </div>
                        </div>

                        <div className="p-0">
                            {loadingMethods ? (
                                <div className="p-8 text-center text-slate-400">Cargando...</div>
                            ) : (
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-500 font-medium">
                                        <tr>
                                            <th className="px-6 py-3">Nombre</th>
                                            <th className="px-6 py-3 w-32 text-center">Recargo %</th>
                                            <th className="px-6 py-3 w-32 text-center">Descuento %</th>
                                            <th className="px-6 py-3 w-16 text-center" title="Por Defecto">Defecto</th>
                                            <th className="px-6 py-3 w-24 text-center">Activo</th>
                                            <th className="px-6 py-3 w-16"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {paymentMethods.map((method) => (
                                            <tr key={method.id} className="hover:bg-slate-50 group">
                                                <td className="px-6 py-3">
                                                    <input
                                                        value={method.name}
                                                        onChange={e => handleUpdateMethod(method.id, { name: e.target.value })}
                                                        className="w-full bg-transparent border-none p-0 focus:ring-0 font-medium text-slate-700"
                                                    />
                                                </td>
                                                <td className="px-6 py-3">
                                                    <div className="relative flex items-center justify-center">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={method.surchargePercent}
                                                            onChange={e => handleUpdateMethod(method.id, { surchargePercent: Number(e.target.value) })}
                                                            className={`w-20 text-center px-2 py-1 rounded border outline-none focus:border-indigo-500 transition-colors ${method.surchargePercent > 0 ? 'border-amber-300 bg-amber-50 text-amber-700 font-bold' : 'border-slate-200 text-slate-500'}`}
                                                        />
                                                        <span className="absolute right-4 text-xs text-slate-400 pointer-events-none">%</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3">
                                                    <div className="relative flex items-center justify-center">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={method.discountPercent}
                                                            onChange={e => handleUpdateMethod(method.id, { discountPercent: Number(e.target.value) })}
                                                            className={`w-20 text-center px-2 py-1 rounded border outline-none focus:border-indigo-500 transition-colors ${method.discountPercent > 0 ? 'border-emerald-300 bg-emerald-50 text-emerald-700 font-bold' : 'border-slate-200 text-slate-500'}`}
                                                        />
                                                        <span className="absolute right-4 text-xs text-slate-400 pointer-events-none">%</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3 text-center">
                                                    <button
                                                        onClick={() => config.setDefaultPaymentMethod(method.id)}
                                                        className={`p-1.5 rounded-full transition-colors ${config.defaultPaymentMethodId === method.id ? 'text-amber-400 bg-amber-50' : 'text-slate-300 hover:text-amber-300'}`}
                                                        title="Marcar como por defecto"
                                                    >
                                                        <Star size={18} fill={config.defaultPaymentMethodId === method.id ? "currentColor" : "none"} />
                                                    </button>
                                                </td>
                                                <td className="px-6 py-3 text-center">
                                                    <button
                                                        onClick={() => handleUpdateMethod(method.id, { isActive: !method.isActive })}
                                                        className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 ${method.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                                    >
                                                        <div className={`w-4 h-4 rounded-full bg-white shadow transform transition-transform duration-200 ${method.isActive ? 'translate-x-5' : 'translate-x-0'}`} />
                                                    </button>
                                                </td>
                                                <td className="px-6 py-3 text-right">
                                                    <button
                                                        onClick={() => handleDeleteMethod(method.id)}
                                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                            <div className="bg-amber-50 px-6 py-3 text-xs text-amber-700 flex items-start gap-2">
                                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                                <div>
                                    <span className="font-bold">Nota:</span> Los recargos se aplicarán automáticamente al seleccionar el medio de pago en la pantalla de cobro.
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Business Info */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <Store size={20} className="text-slate-500" />
                            Datos del Negocio
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Nombre del Comercio
                                </label>
                                <input
                                    type="text"
                                    value={config.shopName}
                                    onChange={(e) => config.setShopName(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    CUIT
                                </label>
                                <input
                                    type="text"
                                    value={config.taxId || ''}
                                    onChange={(e) => config.updateConfig({ taxId: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                                    placeholder="XX-XXXXXXXX-X"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Dirección
                                </label>
                                <input
                                    type="text"
                                    value={config.shopAddress || ''}
                                    onChange={(e) => config.updateConfig({ shopAddress: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Teléfono
                                </label>
                                <input
                                    type="text"
                                    value={config.shopPhone || ''}
                                    onChange={(e) => config.updateConfig({ shopPhone: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Appearance */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <Palette size={20} className="text-slate-500" />
                            Apariencia
                        </h2>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-3">
                                Color del Tema
                            </label>
                            <div className="flex gap-3">
                                {COLORS.map((color) => (
                                    <button
                                        key={color}
                                        onClick={() => config.setThemeColor(color)}
                                        className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center transition-all ${config.themeColor === color
                                            ? 'border-slate-800 scale-110 shadow-lg'
                                            : 'border-transparent hover:scale-105'
                                            }`}
                                    >
                                        <div className={`w-10 h-10 rounded-lg ${themeColors[color].bg}`}>
                                            {config.themeColor === color && (
                                                <Check className="w-full h-full p-2 text-white" />
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-slate-500 mt-2">
                                Este color se aplicará a toda la interfaz
                            </p>
                        </div>
                    </div>

                    {/* POS Settings */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <Printer size={20} className="text-slate-500" />
                            Punto de Venta
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Pie del Ticket
                                </label>
                                <input
                                    type="text"
                                    value={config.ticketFooter || ''}
                                    onChange={(e) => config.setTicketFooter(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="¡Gracias por su compra!"
                                />
                            </div>

                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                <div>
                                    <p className="font-medium text-slate-700">Permitir stock negativo</p>
                                    <p className="text-xs text-slate-500">Permite vender sin stock disponible</p>
                                </div>
                                <button
                                    onClick={() => config.setAllowNegativeStock(!config.allowNegativeStock)}
                                    className={`w-12 h-6 rounded-full p-1 transition-colors ${config.allowNegativeStock ? 'bg-emerald-500' : 'bg-slate-300'
                                        }`}
                                >
                                    <div
                                        className={`w-4 h-4 rounded-full bg-white shadow-md transition-transform ${config.allowNegativeStock ? 'translate-x-6' : 'translate-x-0'
                                            }`}
                                    />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end pb-10">
                        <button
                            onClick={handleSaveConfig}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-white font-medium shadow-lg active:scale-95 transition-all ${saved ? 'bg-emerald-600' : `${theme.bg} ${theme.hover}`
                                }`}
                        >
                            {saved ? (
                                <>
                                    <Check size={20} />
                                    Guardado
                                </>
                            ) : (
                                <>
                                    <Save size={20} />
                                    Guardar Cambios
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
