
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X, Calendar, User, DollarSign, Clock, TrendingUp, TrendingDown, CreditCard, FileText, ArrowLeft, Printer, Search, Eye, Package, AlertTriangle, Ban } from 'lucide-react';
import { cashService, saleService } from '@/services';
import { themeColors, useConfigStore } from '@/stores/configStore';
import ReceiptModal from '@/components/modals/ReceiptModal';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

interface ShiftDetail {
    id: string;
    status: 'OPEN' | 'CLOSED';
    openedAt: string;
    closedAt?: string;
    user: {
        firstName: string;
        lastName: string;
        avatar?: string;
    };
    metrics: {
        transactionCount: number;
        netSales: number;
        avgTicket: number;
        byPaymentMethod: Record<string, number>;
    };
    movements: any[];
    sales: any[];
    openingCash: number;
    totalCashIn: number;
    totalCashOut: number;
    expectedCash: number;
    countedCash?: number;
    cashDifference?: number;
    closingNotes?: string;
}

export const ShiftDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { themeColor } = useConfigStore();
    const theme = themeColors[themeColor] || themeColors.indigo;

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<ShiftDetail | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'sales' | 'movements' | 'activity'>('activity');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSale, setSelectedSale] = useState<any | null>(null);
    const [showReceipt, setShowReceipt] = useState(false);

    useEffect(() => {
        if (id) {
            loadDetails(id);
        }
    }, [id]);

    const loadDetails = async (shiftId: string) => {
        setLoading(true);
        try {
            const response = await cashService.getShiftDetails(shiftId);
            if (response.success) {
                setData(response.data);
            }
        } catch (error) {
            console.error('Error loading shift details:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        setShowReceipt(true);
    };

    const handleVoid = async () => {
        if (!selectedSale) return;
        if (!confirm(`¿ANULAR VENTA ${selectedSale.saleNumber}?\n\nEsta acción revertirá el stock y la caja. Es irreversible.`)) return;

        const reason = prompt('Ingrese motivo de la anulación (opcional):', 'Error de carga');
        if (reason === null) return; // Cancelado

        try {
            await saleService.cancel(selectedSale.id, reason);
            alert('Venta anulada correctamente.');
            setSelectedSale(null);
            setShowReceipt(false);
            if (id) loadDetails(id);
        } catch (error: any) {
            console.error(error);
            alert('Error al anular: ' + (error.response?.data?.error || error.message));
        }
    };

    if (loading && !data) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className={`w-12 h-12 border-4 ${theme.text} border-t-transparent rounded-full animate-spin`} />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
                <h2 className="text-xl font-bold text-slate-800 mb-2">Turno no encontrado</h2>
                <button onClick={() => navigate('/cash-dashboard')} className="text-indigo-600 hover:underline">Volver</button>
            </div>
        );
    }

    const formatCurrency = (val: number) => `$ ${Number(val).toLocaleString('es-AR')}`;
    const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

    // Prepare chart data
    const paymentData = data.metrics.byPaymentMethod
        ? Object.entries(data.metrics.byPaymentMethod).map(([name, value]) => ({ name, value }))
        : [];

    const totalPayments = paymentData.reduce((acc, curr) => acc + curr.value, 0);

    // Colors for charts
    const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Header Sticky */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-20 px-6 py-4 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            Reporte de Caja
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${data.status === 'OPEN' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                {data.status === 'OPEN' ? 'ABIERTO' : 'CERRADO'}
                            </span>
                        </h1>
                        <p className="text-sm text-slate-500">
                            {formatDate(data.openedAt)} {data.closedAt && ` - ${formatDate(data.closedAt)}`}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => window.print()}
                        className="print:hidden flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-full hover:bg-slate-200 transition-colors font-medium text-sm"
                    >
                        <Printer size={16} />
                        <span className="hidden sm:inline">Imprimir</span>
                    </button>

                    <div className="text-right hidden sm:block">
                        <p className="text-xs text-slate-400 font-bold uppercase">Responsable</p>
                        <p className="font-semibold text-slate-700">{data.user.firstName} {data.user.lastName}</p>
                    </div>
                    <div className={`w-10 h-10 rounded-full ${theme.bg} text-white flex items-center justify-center font-bold shadow-md overflow-hidden`}>
                        {data.user.avatar ? <img src={data.user.avatar} className="w-full h-full object-cover" /> : data.user.firstName.charAt(0)}
                    </div>
                </div>
            </div>

            <div className="flex-1 max-w-7xl mx-auto w-full p-6 flex flex-col gap-6">

                {/* Navigation Tabs */}
                <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200 w-fit overflow-x-auto max-w-full">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'overview' ? `${theme.bg} text-white shadow-md` : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        <TrendingUp size={16} /> Resumen
                    </button>
                    <button
                        onClick={() => setActiveTab('activity')}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'activity' ? `${theme.bg} text-white shadow-md` : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        <Clock size={16} /> Actividad (Detalle)
                    </button>
                </div>

                {/* --- OVERVIEW TAB --- */}
                {activeTab === 'overview' && (
                    <div className="space-y-6 animate-fade-in">
                        {/* KPI Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden group hover:shadow-md transition-shadow">
                                <div className={`absolute top-0 right-0 p-3 opacity-10 ${theme.text}`}>
                                    <DollarSign size={48} />
                                </div>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider z-10">Ventas Netas</p>
                                <p className={`text-3xl font-black ${theme.text} z-10`}>{formatCurrency(data.metrics.netSales)}</p>
                            </div>

                            <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden group hover:shadow-md transition-shadow">
                                <div className={`absolute top-0 right-0 p-3 opacity-10 ${!data.cashDifference ? 'text-slate-400' : data.cashDifference < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                    <TrendingUp size={48} />
                                </div>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider z-10">Descuadre</p>
                                <p className={`text-3xl font-black z-10 ${!data.cashDifference ? 'text-slate-300' : data.cashDifference < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                    {data.status === 'OPEN' ? '-' : formatCurrency(data.cashDifference || 0)}
                                </p>
                            </div>

                            <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden group hover:shadow-md transition-shadow">
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Efectivo Real</p>
                                <p className="text-3xl font-black text-slate-700">{data.countedCash ? formatCurrency(data.countedCash) : '-'}</p>
                            </div>

                            <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden group hover:shadow-md transition-shadow">
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Ticket Promedio</p>
                                <p className="text-3xl font-black text-slate-700">{formatCurrency(data.metrics.avgTicket)}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Payment Methods Chart */}
                            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
                                <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2">
                                    <CreditCard size={18} className="text-slate-400" />
                                    Medios de Pago
                                </h3>
                                <div className="flex flex-col sm:flex-row items-center gap-8 h-full">
                                    <div className="h-48 w-48 relative shrink-0">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={paymentData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={45}
                                                    outerRadius={70}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                >
                                                    {paymentData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="flex-1 w-full space-y-3 overflow-y-auto max-h-64 pr-2">
                                        {paymentData.map((entry, index) => {
                                            const percentage = totalPayments > 0 ? ((entry.value / totalPayments) * 100).toFixed(1) : '0.0';
                                            return (
                                                <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <span className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}></span>
                                                        <span className="text-sm font-medium text-slate-600">{entry.name}</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm font-bold text-slate-800">{formatCurrency(entry.value)}</p>
                                                        <p className="text-[10px] font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-100 inline-block mt-1">{percentage}%</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Cash Flow Summary */}
                            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm h-full">
                                <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2">
                                    <DollarSign size={18} className="text-slate-400" />
                                    Flujo de Caja
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl">
                                        <span className="text-sm font-medium text-slate-600">Fondo Inicial</span>
                                        <span className="font-bold text-slate-700">{formatCurrency(data.openingCash)}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                                        <span className="text-sm font-medium text-emerald-700 flex items-center gap-2"><TrendingUp size={16} /> Entradas</span>
                                        <span className="font-bold text-emerald-700">+{formatCurrency(data.totalCashIn || 0)}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-4 bg-red-50 rounded-xl border border-red-100">
                                        <span className="text-sm font-medium text-red-700 flex items-center gap-2"><TrendingDown size={16} /> Salidas</span>
                                        <span className="font-bold text-red-700">-{formatCurrency(data.totalCashOut || 0)}</span>
                                    </div>
                                    <div className="border-t-2 border-slate-100 pt-4 mt-2 flex justify-between items-center">
                                        <span className="font-bold text-slate-800 text-lg">Esperado en Caja</span>
                                        <span className="font-black text-2xl text-slate-800">{formatCurrency(data.expectedCash)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {data.closingNotes && (
                            <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 text-amber-800">
                                <p className="font-bold mb-2 flex items-center gap-2"><FileText size={18} /> Notas de Cierre:</p>
                                <p className="text-sm leading-relaxed opacity-90">{data.closingNotes}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* --- ACTIVITY TAB (UNIFIED & RESPONSIVE) --- */}
                {activeTab === 'activity' && (
                    <div className="space-y-4 animate-fade-in">
                        {(() => {
                            // Unificar movimientos y ventas
                            const sales = (data.sales || []).map(s => ({
                                type: s.fiscalNumber ? 'FISCAL' : 'SALE',
                                date: new Date(s.createdAt),
                                amount: s.total,
                                id: s.id,
                                data: s
                            }));

                            // Obtener lista de Números de Venta para filtrar referencias
                            const saleNumbers = new Set((data.sales || []).map(s => s.saleNumber).filter(Boolean));

                            // Filtrar movimientos duplicados de ventas
                            const movements = (data.movements || []).filter(m => {
                                const reason = (m.reason || '').toLowerCase();
                                const desc = (m.description || '').toLowerCase();

                                // 1. Si tienen saleId vinculado a una venta de este turno
                                if (m.saleId && data.sales?.some(s => s.id === m.saleId)) return false;

                                // 2. Heurística de texto: "Venta" o "Sale"
                                if (reason.includes('venta') || reason.includes('sale')) return false;
                                if (desc.includes('venta') || desc.includes('sale')) return false;

                                // 3. Buscar si menciona el número de ticket
                                for (const saleNum of saleNumbers) {
                                    if (saleNum) {
                                        const sn = saleNum.toLowerCase();
                                        if (desc.includes(sn) || reason.includes(sn)) return false;
                                    }
                                }

                                return true;
                            }).map(m => ({
                                type: m.type, // IN / OUT
                                date: new Date(m.createdAt),
                                amount: m.amount,
                                id: m.id,
                                data: m
                            }));

                            const allActivity = [...sales, ...movements].sort((a, b) => b.date.getTime() - a.date.getTime());

                            if (allActivity.length === 0) {
                                return (
                                    <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
                                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                                            <Clock size={32} />
                                        </div>
                                        <h3 className="text-slate-500 font-bold mb-1">Sin actividad</h3>
                                        <p className="text-slate-400 text-sm">Este turno no tiene movimientos registrados.</p>
                                    </div>
                                );
                            }

                            return (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {allActivity.map((item) => {
                                        // Configuración de estilo según tipo
                                        let cardStyle = "border-slate-200 bg-white";
                                        let icon = <DollarSign size={20} />;
                                        let title = "";
                                        let subtitle = "";
                                        let amountColor = "text-slate-800";
                                        let tag = null;

                                        if (item.type === 'FISCAL') {
                                            cardStyle = "border-sky-200 bg-sky-50/30";
                                            icon = <div className="bg-sky-100 text-sky-600 p-2 rounded-lg"><FileText size={20} /></div>;
                                            title = `Factura ${item.data.invoiceType || 'C'} ${item.data.fiscalNumber || 'N/A'}`;
                                            subtitle = item.data.customer ? `${item.data.customer.firstName} ${item.data.customer.lastName}` : "Consumidor Final";
                                            amountColor = "text-sky-700";
                                            tag = <span className="text-[10px] font-bold bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full uppercase tracking-wider">Fiscal</span>;
                                        } else if (item.type === 'SALE') {
                                            cardStyle = "border-slate-200 bg-white";
                                            icon = <div className="bg-slate-100 text-slate-600 p-2 rounded-lg"><FileText size={20} /></div>;
                                            title = `Ticket Interno #${item.data.saleNumber}`;
                                            subtitle = item.data.customer ? `${item.data.customer.firstName} ${item.data.customer.lastName}` : "Consumidor Final";
                                            amountColor = "text-slate-700";
                                            tag = <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full uppercase tracking-wider">Interno</span>;
                                        } else if (item.type === 'IN') {
                                            cardStyle = "border-emerald-200 bg-emerald-50/30";
                                            icon = <div className="bg-emerald-100 text-emerald-600 p-2 rounded-lg"><TrendingUp size={20} /></div>;
                                            title = item.data.reason || "Ingreso de Caja";
                                            subtitle = item.data.description || "Sin descripción";
                                            amountColor = "text-emerald-700";
                                            tag = <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full uppercase tracking-wider">Ingreso</span>;
                                        } else if (item.type === 'OUT') {
                                            cardStyle = "border-rose-200 bg-rose-50/30";
                                            icon = <div className="bg-rose-100 text-rose-600 p-2 rounded-lg"><TrendingDown size={20} /></div>;
                                            title = item.data.reason || "Egreso de Caja";
                                            subtitle = item.data.description || "Sin descripción";
                                            amountColor = "text-rose-700";
                                            tag = <span className="text-[10px] font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full uppercase tracking-wider">Egreso</span>;
                                        }

                                        return (
                                            <div key={`${item.type}-${item.id}`} className={`relative p-4 rounded-xl border shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-4 ${cardStyle}`}>

                                                <div className="flex justify-between items-start">
                                                    <div className="flex gap-3">
                                                        {icon}
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-0.5">
                                                                <h4 className="font-bold text-slate-800 text-sm leading-tight">{title}</h4>
                                                            </div>
                                                            <p className="text-xs text-slate-500 line-clamp-1">{subtitle}</p>
                                                            <div className="flex items-center gap-2 mt-1.5">
                                                                <span className="text-[10px] font-mono text-slate-400">
                                                                    {item.date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                                {tag}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-end justify-between border-t border-black/5 pt-3">
                                                    <div>
                                                        {(item.type === 'FISCAL' || item.type === 'SALE') && (
                                                            <button
                                                                onClick={() => setSelectedSale(item.data)}
                                                                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2 py-1 rounded transition-colors flex items-center gap-1"
                                                            >
                                                                <Eye size={12} /> VER TICKET
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className={`text-lg font-black ${amountColor}`}>
                                                        {item.type === 'OUT' ? '-' : '+'}{formatCurrency(item.amount)}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })()}
                    </div>
                )}
            </div>

            {/* Modal de Detalle de Ticket */}
            {selectedSale && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-8 max-h-[90vh] overflow-hidden flex flex-col">
                        {/* Header del Modal */}
                        <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                    <FileText className="text-white" size={20} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">
                                        Ticket #{selectedSale.saleNumber || 'S/N'}
                                    </h3>
                                    <p className="text-indigo-100 text-sm">
                                        {new Date(selectedSale.createdAt).toLocaleString('es-AR')}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedSale(null)}
                                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                            >
                                <X className="text-white" size={24} />
                            </button>
                        </div>

                        {/* Contenido del Modal */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Info del Cliente y Vendedor */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Cliente */}
                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                                    <div className="flex items-center gap-2 mb-3">
                                        <User size={16} className="text-slate-400" />
                                        <span className="text-xs font-bold text-slate-400 uppercase">Cliente</span>
                                    </div>
                                    <p className="font-semibold text-slate-800">
                                        {selectedSale.customer ?
                                            `${selectedSale.customer.firstName} ${selectedSale.customer.lastName}` :
                                            'Consumidor Final'
                                        }
                                    </p>
                                    {selectedSale.customer?.documentNumber && (
                                        <p className="text-sm text-slate-500 mt-1">
                                            {selectedSale.customer.documentType}: {selectedSale.customer.documentNumber}
                                        </p>
                                    )}
                                </div>

                                {/* Vendedor */}
                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                                    <div className="flex items-center gap-2 mb-3">
                                        <User size={16} className="text-slate-400" />
                                        <span className="text-xs font-bold text-slate-400 uppercase">Vendedor</span>
                                    </div>
                                    <p className="font-semibold text-slate-800">
                                        {data?.user ? `${data.user.firstName} ${data.user.lastName}` : 'N/A'}
                                    </p>
                                </div>
                            </div>

                            {/* Productos */}
                            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
                                    <Package size={18} className="text-slate-400" />
                                    <h4 className="font-bold text-slate-700">Productos</h4>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-slate-50 border-b border-slate-200">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Producto</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Cant.</th>
                                                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">P. Unit.</th>
                                                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Desc.</th>
                                                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Subtotal</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {selectedSale.items?.map((item: any, index: number) => (
                                                <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-4 py-3">
                                                        <div>
                                                            <p className="font-medium text-slate-800">{item.product?.name || item.productName}</p>
                                                            {(item.product?.barcode || item.productSku) && (
                                                                <p className="text-xs text-slate-400 font-mono">{item.product?.barcode || item.productSku}</p>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-center font-semibold text-slate-700">
                                                        {item.quantity}
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-slate-600">
                                                        {formatCurrency(item.unitPrice)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-red-600">
                                                        {item.discount > 0 ? `-${formatCurrency(item.discount)}` : '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-bold text-slate-800">
                                                        {formatCurrency(item.subtotal)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Métodos de Pago */}
                            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
                                    <CreditCard size={18} className="text-slate-400" />
                                    <h4 className="font-bold text-slate-700">Métodos de Pago</h4>
                                </div>
                                <div className="p-4 space-y-2">
                                    {selectedSale.payments?.map((payment: any, index: number) => (
                                        <div key={index} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                            <span className="font-medium text-slate-700">{payment.paymentMethod?.name}</span>
                                            <span className="font-bold text-slate-800">{formatCurrency(payment.amount)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Resumen de Totales */}
                            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600">Subtotal:</span>
                                        <span className="font-semibold text-slate-800">{formatCurrency(selectedSale.subtotal || selectedSale.total)}</span>
                                    </div>
                                    {selectedSale.discountAmount > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-red-600">Descuento:</span>
                                            <span className="font-semibold text-red-600">-{formatCurrency(selectedSale.discountAmount)}</span>
                                        </div>
                                    )}
                                    {selectedSale.tax > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-600">Impuestos:</span>
                                            <span className="font-semibold text-slate-800">{formatCurrency(selectedSale.tax)}</span>
                                        </div>
                                    )}
                                    <div className="border-t-2 border-slate-300 pt-2 mt-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-lg font-bold text-slate-800">Total:</span>
                                            <span className="text-2xl font-black text-indigo-600">{formatCurrency(selectedSale.total)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Notas */}
                            {selectedSale.notes && (
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <FileText size={16} className="text-amber-600" />
                                        <span className="text-xs font-bold text-amber-700 uppercase">Notas</span>
                                    </div>
                                    <p className="text-sm text-amber-800">{selectedSale.notes}</p>
                                </div>
                            )}

                            {/* Indicator si es nota de crédito */}
                            {selectedSale.isCreditNote && (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle size={20} className="text-red-600" />
                                        <span className="font-bold text-red-700">Esta es una Nota de Crédito</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer del Modal */}
                        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-between gap-3">
                            <div className="flex gap-2">
                                <button
                                    onClick={handleVoid}
                                    className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-bold flex items-center gap-2"
                                >
                                    <Ban size={16} /> ANULAR
                                </button>
                                <button
                                    onClick={handlePrint}
                                    className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium flex items-center gap-2"
                                >
                                    <Printer size={16} /> IMPRIMIR
                                </button>
                            </div>

                            <button
                                onClick={() => setSelectedSale(null)}
                                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showReceipt && selectedSale && (
                <ReceiptModal
                    sale={selectedSale}
                    onClose={() => setShowReceipt(false)}
                />
            )}
        </div>
    );
};
