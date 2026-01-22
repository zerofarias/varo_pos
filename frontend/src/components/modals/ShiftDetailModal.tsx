
import { useEffect, useState } from 'react';
import { X, Calendar, User, DollarSign, Clock, TrendingUp, TrendingDown, CreditCard, FileText, ArrowRight } from 'lucide-react';
import { cashService } from '@/services';
import { themeColors } from '@/stores/configStore';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';

interface ShiftDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    shiftId: string | null;
    themeColor?: string;
}

export const ShiftDetailModal = ({ isOpen, onClose, shiftId, themeColor = 'indigo' }: ShiftDetailModalProps) => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'sales' | 'movements'>('overview');

    const theme = themeColors[themeColor as keyof typeof themeColors] || themeColors.indigo;

    useEffect(() => {
        if (isOpen && shiftId) {
            loadDetails(shiftId);
        } else {
            setData(null);
        }
    }, [isOpen, shiftId]);

    const loadDetails = async (id: string) => {
        setLoading(true);
        try {
            const response = await cashService.getShiftDetails(id);
            if (response.success) {
                setData(response.data);
            }
        } catch (error) {
            console.error('Error loading shift details:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const formatCurrency = (val: number) => `$ ${Number(val).toLocaleString('es-AR')}`;
    const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

    // Prepare chart data
    const paymentData = data?.metrics?.byPaymentMethod
        ? Object.entries(data.metrics.byPaymentMethod).map(([name, value]) => ({ name, value }))
        : [];

    // Colors for charts
    const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-scale-in">

                {/* Header */}
                <div className={`px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50`}>
                    <div className="flex items-center gap-4">
                        {loading ? (
                            <div className="w-12 h-12 bg-slate-200 rounded-full animate-pulse" />
                        ) : (
                            <div className={`w-12 h-12 rounded-full ${theme.bg} text-white flex items-center justify-center text-xl font-bold shadow-lg shadow-indigo-200 overflow-hidden`}>
                                {data?.user?.avatar ? (
                                    <img src={data.user.avatar} alt="User" className="w-full h-full object-cover" />
                                ) : (
                                    data?.user?.firstName?.charAt(0) || <User />
                                )}
                            </div>
                        )}
                        <div>
                            {loading ? (
                                <div className="h-4 w-32 bg-slate-200 rounded animate-pulse mb-2" />
                            ) : (
                                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    {data?.user?.firstName} {data?.user?.lastName}
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${data?.status === 'OPEN' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                        {data?.status === 'OPEN' ? 'TURNO ABIERTO' : 'CERRADO'}
                                    </span>
                                </h2>
                            )}
                            <div className="flex items-center gap-3 text-sm text-slate-500">
                                {loading ? (
                                    <div className="h-3 w-48 bg-slate-200 rounded animate-pulse" />
                                ) : (
                                    <>
                                        <span className="flex items-center gap-1"><Clock size={14} /> Inicio: {formatDate(data?.openedAt)}</span>
                                        {data?.closedAt && <span className="flex items-center gap-1"><ArrowRight size={14} /> Fin: {formatDate(data?.closedAt)}</span>}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-red-500 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="flex-1 flex items-center justify-center py-20">
                        <div className={`w-10 h-10 border-4 ${theme.text} border-t-transparent rounded-full animate-spin`} />
                    </div>
                )}

                {/* Content */}
                {!loading && data && (
                    <div className="flex-1 overflow-hidden flex flex-col md:flex-row">

                        {/* Sidebar / Tabs (Desktop) or Top Bar (Mobile) */}
                        <div className="w-full md:w-64 bg-slate-50 border-r border-slate-200 p-4 flex flex-row md:flex-col gap-2 shrink-0 overflow-x-auto">
                            <button
                                onClick={() => setActiveTab('overview')}
                                className={`flex items-center gap-3 p-3 rounded-xl text-sm font-semibold transition-all ${activeTab === 'overview' ? 'bg-white text-slate-800 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:bg-white/50'}`}
                            >
                                <TrendingUp size={18} className={activeTab === 'overview' ? theme.text : 'text-slate-400'} />
                                Resumen General
                            </button>
                            <button
                                onClick={() => setActiveTab('sales')}
                                className={`flex items-center gap-3 p-3 rounded-xl text-sm font-semibold transition-all ${activeTab === 'sales' ? 'bg-white text-slate-800 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:bg-white/50'}`}
                            >
                                <FileText size={18} className={activeTab === 'sales' ? theme.text : 'text-slate-400'} />
                                Ventas ({data.metrics.transactionCount})
                            </button>
                            <button
                                onClick={() => setActiveTab('movements')}
                                className={`flex items-center gap-3 p-3 rounded-xl text-sm font-semibold transition-all ${activeTab === 'movements' ? 'bg-white text-slate-800 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:bg-white/50'}`}
                            >
                                <DollarSign size={18} className={activeTab === 'movements' ? theme.text : 'text-slate-400'} />
                                Movimientos ({data.movements?.length || 0})
                            </button>
                        </div>

                        {/* Main Content Area */}
                        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">

                            {/* --- OVERVIEW TAB --- */}
                            {activeTab === 'overview' && (
                                <div className="space-y-6 animate-fade-in">
                                    {/* Main Cards Grid */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Ventas Netas</p>
                                            <p className="text-xl md:text-2xl font-black text-indigo-600 truncate">{formatCurrency(data.metrics.netSales)}</p>
                                        </div>
                                        <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Descuadre</p>
                                            <p className={`text-xl md:text-2xl font-black truncate ${!data.cashDifference ? 'text-slate-300' : data.cashDifference < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                                {data.status === 'OPEN' ? '-' : formatCurrency(data.cashDifference)}
                                            </p>
                                        </div>
                                        <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Efectivo Real</p>
                                            <p className="text-xl md:text-2xl font-black text-slate-700 truncate">{data.countedCash ? formatCurrency(data.countedCash) : '-'}</p>
                                        </div>
                                        <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Ticket Promedio</p>
                                            <p className="text-xl md:text-2xl font-black text-slate-700 truncate">{formatCurrency(data.metrics.avgTicket)}</p>
                                        </div>
                                    </div>

                                    {/* Charts & Details Section */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                        {/* Payment Methods Chart */}
                                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
                                            <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2">
                                                <CreditCard size={18} className="text-slate-400" />
                                                Medios de Pago
                                            </h3>
                                            <div className="h-64 relative">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={paymentData}
                                                            cx="50%"
                                                            cy="50%"
                                                            innerRadius={60}
                                                            outerRadius={80}
                                                            paddingAngle={5}
                                                            dataKey="value"
                                                        >
                                                            {paymentData.map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                                            ))}
                                                        </Pie>
                                                        <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                                                        <Legend verticalAlign="bottom" height={36} />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>

                                        {/* Cash Flow Summary */}
                                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                                            <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2">
                                                <DollarSign size={18} className="text-slate-400" />
                                                Flujo de Caja
                                            </h3>
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                                    <span className="text-sm font-medium text-slate-600">Fondo Inicial</span>
                                                    <span className="font-bold text-slate-700">{formatCurrency(data.openingCash)}</span>
                                                </div>
                                                <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                                                    <span className="text-sm font-medium text-emerald-700 flex items-center gap-2"><TrendingUp size={14} /> Entradas</span>
                                                    <span className="font-bold text-emerald-700">+{formatCurrency(data.totalCashIn || 0)}</span>
                                                </div>
                                                <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-100">
                                                    <span className="text-sm font-medium text-red-700 flex items-center gap-2"><TrendingDown size={14} /> Salidas</span>
                                                    <span className="font-bold text-red-700">-{formatCurrency(data.totalCashOut || 0)}</span>
                                                </div>
                                                <div className="border-t border-slate-100 pt-3 flex justify-between items-center">
                                                    <span className="font-bold text-slate-800">Esperado en Caja</span>
                                                    <span className="font-black text-xl text-slate-800">{formatCurrency(data.expectedCash)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {data.closingNotes && (
                                        <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 text-amber-800 text-sm">
                                            <p className="font-bold mb-1 flex items-center gap-2"><FileText size={14} /> Notas de Cierre:</p>
                                            <p>{data.closingNotes}</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* --- SALES TAB --- */}
                            {activeTab === 'sales' && (
                                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-fade-in">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50 border-b border-slate-200">
                                            <tr>
                                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Hora</th>
                                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Ticket</th>
                                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Cliente</th>
                                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Pago</th>
                                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-right">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {data.sales?.length === 0 ? (
                                                <tr><td colSpan={5} className="p-8 text-center text-slate-400">No hay ventas registradas</td></tr>
                                            ) : (
                                                data.sales.map((sale: any) => (
                                                    <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="px-6 py-4 text-sm text-slate-500 font-mono">
                                                            {new Date(sale.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm font-medium text-slate-700">
                                                            {sale.saleNumber || 'S/N'}
                                                            {sale.isCreditNote && <span className="ml-2 text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold">NC</span>}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-slate-600">
                                                            {sale.customer ? `${sale.customer.firstName} ${sale.customer.lastName}` : 'Consumidor Final'}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-wrap gap-1">
                                                                {sale.payments.map((p: any, i: number) => (
                                                                    <span key={i} className="text-xs bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-600">
                                                                        {p.paymentMethod.name}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm font-bold text-slate-800 text-right">
                                                            {formatCurrency(sale.total)}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* --- MOVEMENTS TAB --- */}
                            {activeTab === 'movements' && (
                                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-fade-in">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50 border-b border-slate-200">
                                            <tr>
                                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Hora</th>
                                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Tipo</th>
                                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Concepto</th>
                                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Descripción</th>
                                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-right">Monto</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {data.movements?.length === 0 ? (
                                                <tr><td colSpan={5} className="p-8 text-center text-slate-400">No hay movimientos extra</td></tr>
                                            ) : (
                                                data.movements.map((mov: any) => (
                                                    <tr key={mov.id} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="px-6 py-4 text-sm text-slate-500 font-mono">
                                                            {new Date(mov.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${mov.type === 'IN' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                                                }`}>
                                                                {mov.type === 'IN' ? 'INGRESO' : 'EGRESO'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm font-medium text-slate-700">
                                                            {mov.reason}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-slate-500 italic">
                                                            {mov.description || '-'}
                                                        </td>
                                                        <td className={`px-6 py-4 text-sm font-bold text-right ${mov.type === 'IN' ? 'text-emerald-600' : 'text-red-600'
                                                            }`}>
                                                            {mov.type === 'IN' ? '+' : '-'}{formatCurrency(mov.amount)}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
