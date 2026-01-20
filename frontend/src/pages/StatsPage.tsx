import { useState, useEffect } from 'react';
import {
    TrendingUp, Award, Clock, PieChart as PieIcon,
    Calendar, Users, DollarSign, Activity, Medal
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts';
import { statsService, DashboardSummary, SellerStat, HourlyStat, CategoryStat } from '@/services';
import { useConfigStore, themeColors } from '@/stores/configStore';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F'];

export const StatsPage = () => {
    const { themeColor } = useConfigStore();
    const theme = themeColors[themeColor];

    // Datos
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [topSellers, setTopSellers] = useState<SellerStat[]>([]);
    const [hourlySales, setHourlySales] = useState<HourlyStat[]>([]);
    const [categorySales, setCategorySales] = useState<CategoryStat[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [sum, top, hourly, cats] = await Promise.all([
                statsService.getSummary(),
                statsService.getTopSellers(),
                statsService.getHourlySales(),
                statsService.getByCategory()
            ]);
            setSummary(sum);
            setTopSellers(top);
            setHourlySales(hourly);
            setCategorySales(cats);
        } catch (error) {
            console.error("Error cargando estadísticas", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="h-full flex items-center justify-center"><div className="spinner w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" /></div>;
    }

    return (
        <div className="h-full overflow-y-auto bg-slate-50 p-6 space-y-6">

            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Activity className="text-indigo-600" />
                    Dashboard de Rendimiento
                </h1>
                <p className="text-slate-500 text-sm">Resumen de ventas y métricas clave en tiempo real</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Ventas de Hoy"
                    value={`$ ${summary?.totalAmount?.toLocaleString('es-AR') || '0'}`}
                    icon={DollarSign}
                    color="bg-emerald-50 text-emerald-600 border-emerald-200"
                />
                <StatCard
                    title="Operaciones"
                    value={summary?.transactionCount?.toString() || '0'}
                    icon={Users}
                    color="bg-blue-50 text-blue-600 border-blue-200"
                />
                <StatCard
                    title="Ticket Promedio"
                    value={`$ ${Math.round(summary?.averageTicket || 0).toLocaleString('es-AR')}`}
                    icon={TrendingUp}
                    color="bg-purple-50 text-purple-600 border-purple-200"
                />
                <StatCard
                    title="Pago Preferido"
                    value={summary?.topPaymentMethod || 'N/A'}
                    icon={Award}
                    color="bg-amber-50 text-amber-600 border-amber-200"
                />
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Gráfico Horario (2/3 ancho) */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2">
                        <Clock size={18} className="text-slate-400" />
                        Actividad por Hora (Hoy)
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={hourlySales}>
                                <defs>
                                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#818cf8" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis dataKey="hour" tickFormatter={(h) => `${h}:00`} stroke="#94a3b8" fontSize={12} />
                                <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(val) => `$${val / 1000}k`} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value: number) => [`$ ${value.toLocaleString()}`, 'Ventas']}
                                />
                                <Area type="monotone" dataKey="total" stroke="#4f46e5" fillOpacity={1} fill="url(#colorTotal)" strokeWidth={3} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Ranking Vendedores (1/3 ancho) GAMIFICATION */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
                    <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <Medal size={18} className="text-amber-500" />
                        Top Vendedores (Mes)
                    </h3>

                    <div className="flex-1 space-y-4">
                        {topSellers.map((seller, idx) => (
                            <div key={seller.userId} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white shadow-md
                                    ${idx === 0 ? 'bg-gradient-to-br from-yellow-400 to-amber-600' :
                                        idx === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-500' :
                                            idx === 2 ? 'bg-gradient-to-br from-orange-300 to-orange-500 ring-2 ring-orange-200' :
                                                'bg-slate-200 text-slate-500'}`
                                }>
                                    {idx + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-slate-800 truncate">{seller.name}</p>
                                    <p className="text-xs text-slate-500">{seller.count} ventas realizadas</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-indigo-600 text-sm">$ {Math.round(seller.totalSales / 1000)}k</p>
                                </div>
                            </div>
                        ))}
                        {topSellers.length === 0 && <p className="text-slate-400 text-center py-4">Sin datos aún</p>}
                    </div>
                </div>

                {/* Categorías (Pie Chart) */}
                <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <PieIcon size={18} className="text-slate-400" />
                        Ventas por Categoría
                    </h3>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={categorySales}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {categorySales.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(val: number) => `$ ${val.toLocaleString()}`} />
                                <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Promo Impact (Placeholder para futuro) */}
                <div className="lg:col-span-2 bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-2xl shadow-lg text-white relative overflow-hidden group">
                    {/* Background deco */}
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform rotate-12 scale-150">
                        <Award size={150} />
                    </div>

                    <h3 className="text-xl font-bold mb-2 relative z-10">¡Rompiendo Récords!</h3>
                    <p className="text-indigo-100 mb-4 max-w-md relative z-10">
                        El ticket promedio ha subido un 15% gracias a las nuevas promociones.
                        Sigue creando ofertas atractivas para mantener la racha.
                    </p>

                    <div className="flex gap-4 relative z-10">
                        <div className="bg-white/20 backdrop-blur-md p-3 rounded-lg">
                            <p className="text-xs text-indigo-200 uppercase">Oferta Top</p>
                            <p className="font-bold">2x1 Fernet</p>
                        </div>
                        <div className="bg-white/20 backdrop-blur-md p-3 rounded-lg">
                            <p className="text-xs text-indigo-200 uppercase">Impacto</p>
                            <p className="font-bold">+$45.000</p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

const StatCard = ({ title, value, icon: Icon, color }: any) => (
    <div className={`p-4 rounded-xl border flex items-center gap-4 ${color.split(' ')[0]} ${color.split(' ')[2] || 'border-slate-100'} bg-opacity-40`}>
        <div className={`p-3 rounded-xl bg-white shadow-sm ${color.split(' ')[1]}`}>
            <Icon size={24} />
        </div>
        <div>
            <p className="text-slate-500 text-xs font-semibold uppercase">{title}</p>
            <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
        </div>
    </div>
);
