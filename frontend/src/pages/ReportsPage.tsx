/**
 * VARO POS - Página de Reportes con Gráficos
 * Utiliza Recharts para visualización de datos
 */

import { useState, useEffect } from 'react';
import {
    BarChart3, TrendingUp, DollarSign,
    Package, Calendar, Download, RefreshCw,
    PieChart as PieChartIcon, Activity, FileText, List
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend,
    LineChart, Line, Area, AreaChart
} from 'recharts';
import { useConfigStore, themeColors } from '@/stores/configStore';
import api from '@/services/api';

// Chart colors
const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export const ReportsPage = () => {
    const { themeColor } = useConfigStore();
    const theme = themeColors[themeColor];

    const [dateRange, setDateRange] = useState('today');
    const [loading, setLoading] = useState(true);
    const [salesData, setSalesData] = useState<any>(null);
    const [topProducts, setTopProducts] = useState<any[]>([]);
    const [transactions, setTransactions] = useState<any[]>([]);

    useEffect(() => {
        loadReports();
    }, [dateRange]);

    const handleExport = () => {
        if (!transactions.length) return;

        const headers = ['Fecha', 'Hora', 'Nro Venta', 'Cliente', 'Items', 'Metodos Pago', 'Total'];
        const rows = transactions.map(t => [
            new Date(t.createdAt).toLocaleDateString('es-AR'),
            new Date(t.createdAt).toLocaleTimeString('es-AR'),
            t.saleNumber,
            t.customer ? `${t.customer.firstName} ${t.customer.lastName}` : 'Consumidor Final',
            t.items.map((i: any) => `${i.quantity}x ${i.product.name}`).join(' | '),
            t.payments.map((p: any) => p.paymentMethod.name).join(', '),
            t.total
        ]);

        const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Reporte_Ventas_${dateRange}_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    const loadReports = async () => {
        setLoading(true);
        try {
            // Calculate date range
            const endDate = new Date().toISOString().split('T')[0];
            let startDate = endDate;

            if (dateRange === 'week') {
                const d = new Date();
                d.setDate(d.getDate() - 7);
                startDate = d.toISOString().split('T')[0];
            } else if (dateRange === 'month') {
                const d = new Date();
                d.setMonth(d.getMonth() - 1);
                startDate = d.toISOString().split('T')[0];
            }

            const [summaryRes, topRes, salesRes] = await Promise.all([
                api.get(`/reports/sales-summary?startDate=${startDate}&endDate=${endDate}`),
                api.get(`/reports/top-products?limit=5&startDate=${startDate}&endDate=${endDate}`),
                api.get(`/sales?startDate=${startDate}&endDate=${endDate}&limit=100`)
            ]);

            setSalesData(summaryRes.data.data);
            setTopProducts(topRes.data.data || []);
            if (salesRes.data.success) {
                setTransactions(salesRes.data.data);
            }
        } catch (error) {
            console.error('Error loading reports:', error);
            // Use mock data for demo
            setSalesData({
                totalSales: 45,
                totalAmount: 125600,
                totalProfit: 35400
            });
            setTopProducts([
                { productName: 'Coca Cola 500ml', totalQuantity: 45, totalAmount: 38250 },
                { productName: 'Pan Francés', totalQuantity: 120, totalAmount: 14400 },
                { productName: 'Lays Clásicas', totalQuantity: 32, totalAmount: 35200 },
                { productName: 'Agua Mineral 2L', totalQuantity: 28, totalAmount: 11200 },
                { productName: 'Leche La Serenísima', totalQuantity: 25, totalAmount: 21250 },
            ]);
        } finally {
            setLoading(false);
        }
    };

    // Mock data for charts
    const salesByHour = [
        { hour: '08:00', ventas: 12500, cantidad: 8 },
        { hour: '09:00', ventas: 18200, cantidad: 12 },
        { hour: '10:00', ventas: 22100, cantidad: 15 },
        { hour: '11:00', ventas: 28400, cantidad: 18 },
        { hour: '12:00', ventas: 35600, cantidad: 22 },
        { hour: '13:00', ventas: 31200, cantidad: 20 },
        { hour: '14:00', ventas: 19800, cantidad: 14 },
        { hour: '15:00', ventas: 24500, cantidad: 16 },
        { hour: '16:00', ventas: 32100, cantidad: 21 },
        { hour: '17:00', ventas: 38900, cantidad: 25 },
        { hour: '18:00', ventas: 42300, cantidad: 28 },
        { hour: '19:00', ventas: 35700, cantidad: 23 },
        { hour: '20:00', ventas: 28400, cantidad: 18 },
    ];

    const paymentMethods = [
        { name: 'Efectivo', value: 45000, color: '#10b981' },
        { name: 'Débito', value: 32000, color: '#3b82f6' },
        { name: 'Crédito', value: 28000, color: '#8b5cf6' },
        { name: 'QR / MP', value: 15600, color: '#06b6d4' },
        { name: 'Cta. Cte.', value: 5000, color: '#f59e0b' },
    ];

    const weeklyTrend = [
        { day: 'Lun', ventas: 85000, ganancia: 24000 },
        { day: 'Mar', ventas: 92000, ganancia: 26500 },
        { day: 'Mié', ventas: 78000, ganancia: 22000 },
        { day: 'Jue', ventas: 95000, ganancia: 28000 },
        { day: 'Vie', ventas: 120000, ganancia: 35000 },
        { day: 'Sáb', ventas: 145000, ganancia: 42000 },
        { day: 'Dom', ventas: 88000, ganancia: 25000 },
    ];

    const summary = salesData || { totalSales: 0, totalAmount: 0, totalProfit: 0 };
    const avgTicket = summary.totalSales > 0 ? summary.totalAmount / summary.totalSales : 0;

    return (
        <div className="h-full flex flex-col bg-slate-50 overflow-y-auto">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 p-4 lg:p-6 shrink-0">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <BarChart3 className="text-slate-400" size={24} />
                            Reportes y Estadísticas
                        </h1>
                        <p className="text-slate-500 text-sm mt-1">
                            Análisis de ventas y rendimiento
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <select
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value)}
                            className="px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-700"
                        >
                            <option value="today">Hoy</option>
                            <option value="week">Últimos 7 días</option>
                            <option value="month">Último mes</option>
                        </select>
                        <button
                            onClick={loadReports}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        >
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        </button>
                        <button
                            onClick={handleExport}
                            disabled={transactions.length === 0}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 bg-indigo-50 text-indigo-700 font-medium hover:bg-indigo-100 disabled:opacity-50 transition-colors"
                        >
                            <Download size={18} />
                            Exportar CSV
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-4 lg:p-6 space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <SummaryCard
                        icon={DollarSign}
                        label="Ventas Totales"
                        value={`$ ${summary.totalAmount.toLocaleString('es-AR')}`}
                        change="+12%"
                        positive
                        color="indigo"
                    />
                    <SummaryCard
                        icon={TrendingUp}
                        label="Transacciones"
                        value={summary.totalSales.toString()}
                        change="+5"
                        positive
                        color="blue"
                    />
                    <SummaryCard
                        icon={Activity}
                        label="Ticket Promedio"
                        value={`$ ${Math.round(avgTicket).toLocaleString('es-AR')}`}
                        change="+3%"
                        positive
                        color="emerald"
                    />
                    <SummaryCard
                        icon={Package}
                        label="Ganancia"
                        value={`$ ${summary.totalProfit.toLocaleString('es-AR')}`}
                        change="+8%"
                        positive
                        color="purple"
                    />
                </div>

                {/* Charts Row 1 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Sales by Hour */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <BarChart3 size={18} className="text-indigo-500" />
                            Ventas por Hora
                        </h3>
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={salesByHour}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis
                                        dataKey="hour"
                                        tick={{ fontSize: 12, fill: '#64748b' }}
                                        axisLine={{ stroke: '#e2e8f0' }}
                                    />
                                    <YAxis
                                        tick={{ fontSize: 12, fill: '#64748b' }}
                                        axisLine={{ stroke: '#e2e8f0' }}
                                        tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                                    />
                                    <Tooltip
                                        formatter={(value: number) => [`$ ${value.toLocaleString('es-AR')}`, 'Ventas']}
                                        contentStyle={{
                                            backgroundColor: '#1e293b',
                                            border: 'none',
                                            borderRadius: '8px',
                                            color: 'white'
                                        }}
                                    />
                                    <Bar
                                        dataKey="ventas"
                                        fill="#6366f1"
                                        radius={[4, 4, 0, 0]}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Payment Methods Pie */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <PieChartIcon size={18} className="text-emerald-500" />
                            Métodos de Pago
                        </h3>
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={paymentMethods}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={90}
                                        paddingAngle={2}
                                        dataKey="value"
                                    >
                                        {paymentMethods.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value: number) => `$ ${value.toLocaleString('es-AR')}`}
                                        contentStyle={{
                                            backgroundColor: '#1e293b',
                                            border: 'none',
                                            borderRadius: '8px',
                                            color: 'white'
                                        }}
                                    />
                                    <Legend
                                        verticalAlign="bottom"
                                        height={36}
                                        formatter={(value) => <span className="text-slate-600 text-sm">{value}</span>}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Charts Row 2 */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Weekly Trend */}
                    <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <TrendingUp size={18} className="text-blue-500" />
                            Tendencia Semanal
                        </h3>
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={weeklyTrend}>
                                    <defs>
                                        <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorGanancia" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis
                                        dataKey="day"
                                        tick={{ fontSize: 12, fill: '#64748b' }}
                                        axisLine={{ stroke: '#e2e8f0' }}
                                    />
                                    <YAxis
                                        tick={{ fontSize: 12, fill: '#64748b' }}
                                        axisLine={{ stroke: '#e2e8f0' }}
                                        tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                                    />
                                    <Tooltip
                                        formatter={(value: number) => `$ ${value.toLocaleString('es-AR')}`}
                                        contentStyle={{
                                            backgroundColor: '#1e293b',
                                            border: 'none',
                                            borderRadius: '8px',
                                            color: 'white'
                                        }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="ventas"
                                        stroke="#6366f1"
                                        strokeWidth={2}
                                        fillOpacity={1}
                                        fill="url(#colorVentas)"
                                        name="Ventas"
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="ganancia"
                                        stroke="#10b981"
                                        strokeWidth={2}
                                        fillOpacity={1}
                                        fill="url(#colorGanancia)"
                                        name="Ganancia"
                                    />
                                    <Legend />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Top Products */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <Package size={18} className="text-amber-500" />
                            Top Productos
                        </h3>
                        <div className="space-y-3">
                            {topProducts.slice(0, 5).map((product, i) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold`}
                                            style={{ backgroundColor: COLORS[i % COLORS.length] }}>
                                            {i + 1}
                                        </span>
                                        <div>
                                            <p className="font-medium text-slate-700 text-sm truncate max-w-[120px]">
                                                {product.productName}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {product.totalQuantity} unid.
                                            </p>
                                        </div>
                                    </div>
                                    <span className="font-bold text-slate-800">
                                        $ {product.totalAmount.toLocaleString('es-AR')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Tabla de Transacciones Detallada */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                            <List size={18} className="text-slate-500" />
                            Detalle de Operaciones
                        </h3>
                        <span className="text-xs font-bold bg-slate-200 text-slate-600 px-2 py-1 rounded-full">
                            {transactions.length} registros
                        </span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-3">Fecha/Hora</th>
                                    <th className="px-6 py-3">Comprobante</th>
                                    <th className="px-6 py-3">Cliente</th>
                                    <th className="px-6 py-3">Resumen Items</th>
                                    <th className="px-6 py-3">Pago</th>
                                    <th className="px-6 py-3 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {transactions.length > 0 ? (
                                    transactions.map((sale) => (
                                        <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-3 whitespace-nowrap text-slate-500 font-mono text-xs">
                                                {new Date(sale.createdAt).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="px-6 py-3 font-medium text-slate-700">
                                                {sale.saleNumber}
                                            </td>
                                            <td className="px-6 py-3 text-slate-600">
                                                {sale.customer ? `${sale.customer.firstName} ${sale.customer.lastName}` : <span className="text-slate-400 italic">Final</span>}
                                            </td>
                                            <td className="px-6 py-3 text-slate-500 max-w-xs truncate" title={sale.items?.map((i: any) => `${i.quantity}x ${i.product.name}`).join(', ')}>
                                                {sale.items?.slice(0, 2).map((i: any) => `${i.quantity}x ${i.product.name}`).join(', ')}
                                                {sale.items?.length > 2 && ' ...'}
                                            </td>
                                            <td className="px-6 py-3">
                                                <div className="flex gap-1 flex-wrap">
                                                    {sale.payments?.map((p: any, idx: number) => (
                                                        <span key={idx} className="bg-white border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded text-[10px]">
                                                            {p.paymentMethod?.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 text-right font-bold text-slate-800">
                                                $ {Number(sale.total).toLocaleString('es-AR')}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-slate-400 italic">
                                            No se encontraron operaciones en el período seleccionado.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

const SummaryCard = ({
    icon: Icon,
    label,
    value,
    change,
    positive,
    color,
}: {
    icon: React.ElementType;
    label: string;
    value: string;
    change: string;
    positive: boolean;
    color: string;
}) => {
    const colorClasses: Record<string, { bg: string; text: string }> = {
        indigo: { bg: 'bg-indigo-100', text: 'text-indigo-600' },
        blue: { bg: 'bg-blue-100', text: 'text-blue-600' },
        emerald: { bg: 'bg-emerald-100', text: 'text-emerald-600' },
        purple: { bg: 'bg-purple-100', text: 'text-purple-600' },
    };

    const colors = colorClasses[color] || colorClasses.indigo;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
                <div className={`p-2.5 rounded-lg ${colors.bg} ${colors.text}`}>
                    <Icon size={20} />
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${positive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>
                    {change}
                </span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            <p className="text-sm text-slate-500 mt-0.5">{label}</p>
        </div>
    );
};

export default ReportsPage;
