import { useState, useEffect } from 'react';
import {
    Wallet, TrendingUp, AlertTriangle, CheckCircle,
    Clock, Calendar, User, ArrowRight, DollarSign,
    Search, Filter, Download, X, Eye, Lock,
    ChevronRight, AlertCircle, PlayCircle, StopCircle, RefreshCw
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    AreaChart, Area
} from 'recharts';
import { cashService } from '@/services';
import { useConfigStore, themeColors } from '@/stores/configStore';

// --- Interfaces & Types ---
interface CashShift {
    id: string;
    shiftNumber: string;
    userId: string;
    user?: { firstName: string; lastName: string; avatar?: string };
    status: 'OPEN' | 'CLOSED' | 'PENDING_REVIEW';
    openedAt: string;
    closedAt?: string;
    openingCash: number;
    expectedCash: number;
    countedCash?: number;
    cashDifference?: number;
    totalSales: number;
    totalCashIn: number;
    totalCashOut: number;
    closingNotes?: string;
}

interface DashboardStats {
    totalSales: number;
    totalDiff: number;
    openShiftsCount: number | null;
}

// --- Main Component ---
export const CashDashboardPage = () => {
    const { themeColor } = useConfigStore();
    const theme = themeColors[themeColor];

    // Estados
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [shifts, setShifts] = useState<CashShift[]>([]);
    const [stats, setStats] = useState<DashboardStats>({ totalSales: 0, totalDiff: 0, openShiftsCount: 0 });
    const [dateFilter, setDateFilter] = useState<{ start: string; end: string }>({
        start: new Date().toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });
    const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);

    // Cargar datos
    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            console.log('Cargando historial de turnos...');
            // 1. Obtener historial
            const history = await cashService.getShiftHistory(1, 100, dateFilter.start, dateFilter.end);
            console.log('Historial recibido:', history);

            if (history && Array.isArray(history.data)) {
                setShifts(history.data);

                // 2. Calcular métricas en memoria (simplificado para robustez)
                const totalSales = history.data.reduce((sum: number, s: CashShift) => sum + Number(s.totalSales || 0), 0);
                const totalDiff = history.data.reduce((sum: number, s: CashShift) => sum + Number(s.cashDifference || 0), 0);
                const openShifts = history.data.filter((s: CashShift) => s.status === 'OPEN').length;

                setStats({
                    totalSales,
                    totalDiff,
                    openShiftsCount: openShifts
                });
            } else {
                setShifts([]);
            }

        } catch (err: any) {
            console.error('Error cargando dashboard de cajas:', err);
            setError('No se pudo cargar la información de cajas. Verifica la conexión con el servidor.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [dateFilter]);

    // Render de Error
    if (error) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-slate-50 p-6">
                <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md border border-red-100">
                    <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Algo salió mal</h2>
                    <p className="text-slate-500 mb-6">{error}</p>
                    <button
                        onClick={loadData}
                        className="px-6 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors font-medium flex items-center justify-center gap-2 mx-auto"
                    >
                        <RefreshCw size={18} />
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-slate-50 overflow-hidden">
            {/* --- Header --- */}
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Wallet className={`text-${themeColor}-600`} />
                        Gestión de Cajas y Turnos
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Auditoría, control de efectivo y cierres de turno</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
                        <input
                            type="date"
                            value={dateFilter.start}
                            onChange={(e) => setDateFilter(prev => ({ ...prev, start: e.target.value }))}
                            className="bg-transparent border-none text-xs font-medium text-slate-600 focus:ring-0 px-2 py-1"
                        />
                        <span className="text-slate-400 text-xs">a</span>
                        <input
                            type="date"
                            value={dateFilter.end}
                            onChange={(e) => setDateFilter(prev => ({ ...prev, end: e.target.value }))}
                            className="bg-transparent border-none text-xs font-medium text-slate-600 focus:ring-0 px-2 py-1"
                        />
                    </div>
                    <button
                        onClick={loadData}
                        className="p-2.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors"
                        title="Recargar datos"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </header>

            {/* --- Content --- */}
            <main className="flex-1 overflow-y-auto p-6 space-y-6">

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <KpiCard
                        title="Ventas Totales (Período)"
                        value={`$ ${stats.totalSales.toLocaleString('es-AR')}`}
                        icon={TrendingUp}
                        color="indigo"
                        subtext="Facturación en turnos cerrados"
                    />
                    <KpiCard
                        title="Descuadre Acumulado"
                        value={`$ ${stats.totalDiff.toLocaleString('es-AR')}`}
                        icon={stats.totalDiff < 0 ? AlertCircle : CheckCircle}
                        color={stats.totalDiff < 0 ? 'red' : 'emerald'}
                        subtext={stats.totalDiff === 0 ? 'Cajas cuadradas perfectas' : stats.totalDiff < 0 ? 'Faltante de dinero' : 'Sobrante de dinero'}
                    />
                    <KpiCard
                        title="Turnos Abiertos"
                        value={stats.openShiftsCount?.toString() || '0'}
                        icon={Clock}
                        color="amber"
                        subtext="Cajas operando actualmente"
                    />
                </div>

                {/* Tabla de Turnos */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[600px]">
                    <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                            <Clock size={18} className="text-slate-400" />
                            Historial de Turnos
                        </h3>
                        <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded-full font-bold">
                            {shifts.length} Registros
                        </span>
                    </div>

                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Turno #</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Responsable</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Apertura</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cierre</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Ventas</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Diferencia</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {loading && shifts.length === 0 ? (
                                    // Skeletons
                                    Array(5).fill(0).map((_, i) => (
                                        <tr key={i}>
                                            <td className="px-6 py-4"><div className="h-4 w-16 bg-slate-100 rounded animate-pulse" /></td>
                                            <td className="px-6 py-4"><div className="h-4 w-24 bg-slate-100 rounded animate-pulse" /></td>
                                            <td className="px-6 py-4"><div className="h-4 w-32 bg-slate-100 rounded animate-pulse" /></td>
                                            <td className="px-6 py-4"><div className="h-4 w-24 bg-slate-100 rounded animate-pulse" /></td>
                                            <td className="px-6 py-4"><div className="h-4 w-24 bg-slate-100 rounded animate-pulse" /></td>
                                            <td className="px-6 py-4"><div className="h-4 w-20 bg-slate-100 rounded animate-pulse ml-auto" /></td>
                                            <td className="px-6 py-4"><div className="h-4 w-20 bg-slate-100 rounded animate-pulse ml-auto" /></td>
                                        </tr>
                                    ))
                                ) : shifts.length > 0 ? (
                                    shifts.map((shift) => (
                                        <tr
                                            key={shift.id}
                                            onClick={() => window.open(`/cash-details/${shift.id}`, '_blank')}
                                            className="hover:bg-indigo-50/50 cursor-pointer transition-colors group"
                                            title="Click para ver detalle completo en nueva pestaña"
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <StatusBadge status={shift.status} />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-slate-500">
                                                {shift.shiftNumber}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500 overflow-hidden">
                                                        {shift.user?.avatar ? (
                                                            <img src={shift.user.avatar} className="w-full h-full object-cover" />
                                                        ) : (
                                                            shift.user?.firstName?.charAt(0) || 'U'
                                                        )}
                                                    </div>
                                                    <span className="text-sm font-medium text-slate-700">
                                                        {shift.user ? `${shift.user.firstName} ${shift.user.lastName}` : 'Usuario eliminado'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                                {new Date(shift.openedAt).toLocaleString('es-AR', {
                                                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                                                })}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                                {shift.closedAt ? new Date(shift.closedAt).toLocaleString('es-AR', {
                                                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                                                }) : '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-slate-700">
                                                $ {Number(shift.totalSales).toLocaleString('es-AR')}
                                            </td>
                                            <td className={`px-6 py-4 whitespace-nowrap text-right font-bold ${!shift.cashDifference ? 'text-slate-400' :
                                                shift.cashDifference < 0 ? 'text-red-500' : 'text-emerald-500'
                                                }`}>
                                                {shift.status === 'OPEN' ? '-' : (
                                                    `$ ${Number(shift.cashDifference || 0).toLocaleString('es-AR')}`
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic">
                                            No se encontraron turnos en el rango de fechas seleccionado.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </main>
        </div>
    );
};

// --- Subcomponents ---



const KpiCard = ({ title, value, icon: Icon, color, subtext }: any) => {
    const colors: any = {
        indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200',
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200',
        amber: 'bg-amber-50 text-amber-600 border-amber-200',
        red: 'bg-red-50 text-red-600 border-red-200',
    };

    const activeColor = colors[color] || colors.indigo;

    return (
        <div className={`p-5 rounded-2xl border bg-white shadow-sm flex items-start gap-4 transition-all hover:shadow-md`}>
            <div className={`p-3 rounded-xl ${activeColor}`}>
                <Icon size={24} />
            </div>
            <div>
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-1 opacity-80">{title}</p>
                <h3 className="text-2xl font-bold text-slate-800 tracking-tight">{value}</h3>
                {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
            </div>
        </div>
    );
};

const StatusBadge = ({ status }: { status: string }) => {
    const config = {
        OPEN: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Abierto', icon: PlayCircle },
        CLOSED: { bg: 'bg-slate-100', text: 'text-slate-700', label: 'Cerrado', icon: StopCircle },
        PENDING_REVIEW: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Revisión', icon: AlertCircle },
    };

    const { bg, text, label, icon: Icon } = config[status as keyof typeof config] || config.CLOSED;

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${bg} ${text}`}>
            <Icon size={12} />
            {label}
        </span>
    );
};

export default CashDashboardPage;
