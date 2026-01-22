/**
 * VARO POS - Layout Principal del Dashboard
 * Desktop: Sidebar compacto con iconos
 * Mobile: Bottom Navigation
 */

import { Outlet, NavLink, useLocation } from 'react-router-dom';
import {
    ShoppingCart,
    Package,
    Users,
    BarChart3,
    Settings,
    LogOut,
    Store,
    Wallet,
    Gift,
    Activity,
    ClipboardCheck,
    Shield
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useConfigStore, themeColors } from '@/stores/configStore';

const navItems = [
    { path: '/stats', icon: Activity, label: 'Dashboard' },
    { path: '/pos', icon: ShoppingCart, label: 'Ventas' },
    { path: '/products', icon: Package, label: 'Productos' },
    { path: '/promotions', icon: Gift, label: 'Ofertero' },
    { path: '/customers', icon: Users, label: 'Clientes' },
    { path: '/cash', icon: Wallet, label: 'Caja' },
    { path: '/cash-dashboard', icon: ClipboardCheck, label: 'Cajas y Turnos' },
    { path: '/reports', icon: BarChart3, label: 'Reportes' },
    { path: '/users', icon: Shield, label: 'Usuarios' },
    { path: '/settings', icon: Settings, label: 'Config' },
];

export const DashboardLayout = () => {
    const { user, logout } = useAuthStore();
    const { shopName, themeColor } = useConfigStore();
    const location = useLocation();

    const theme = themeColors[themeColor];

    return (
        <div className="flex flex-col md:flex-row h-screen w-full bg-slate-100 overflow-hidden">

            {/* === DESKTOP SIDEBAR === */}
            <aside className="hidden md:flex w-20 bg-slate-900 text-slate-300 flex-col justify-between shadow-xl z-50 shrink-0">
                {/* Logo */}
                <div>
                    <div className="h-16 flex items-center justify-center border-b border-slate-800 bg-slate-950">
                        <div className={`p-2 rounded-xl text-white shadow-lg ${theme.bg}`}>
                            <Store size={24} />
                        </div>
                    </div>

                    {/* Nav Items */}
                    <nav className="mt-6 flex flex-col gap-2 px-3 items-center">
                        {navItems.map((item) => (
                            <NavItem
                                key={item.path}
                                {...item}
                                isActive={location.pathname === item.path}
                                theme={theme}
                            />
                        ))}
                    </nav>
                </div>

                {/* User & Logout */}
                <div className="p-3 border-t border-slate-800 bg-slate-950">
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold text-sm">
                            {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                        </div>
                        <button
                            onClick={logout}
                            className="group relative p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-colors"
                            title="Cerrar sesión"
                        >
                            <LogOut size={20} />
                            <Tooltip label="Cerrar Sesión" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* === MOBILE HEADER === */}
            <header className="md:hidden h-14 bg-slate-900 flex items-center justify-between px-4 shrink-0 z-40">
                <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg ${theme.bg}`}>
                        <Store size={18} className="text-white" />
                    </div>
                    <span className="font-bold text-white text-sm truncate max-w-[180px]">
                        {shopName}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-xs">
                        {user?.firstName}
                    </span>
                    <button
                        onClick={logout}
                        className="p-2 text-slate-400 hover:text-red-400"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </header>

            {/* === MAIN CONTENT === */}
            <main className="flex-1 flex flex-col h-full overflow-hidden pb-16 md:pb-0">
                <Outlet />
            </main>

            {/* === MOBILE BOTTOM NAV === */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 flex justify-around items-center z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                {navItems.slice(0, 5).map((item) => (
                    <MobileNavItem
                        key={item.path}
                        {...item}
                        isActive={location.pathname === item.path}
                        theme={theme}
                    />
                ))}
            </nav>
        </div>
    );
};

// Desktop Nav Item with Tooltip
const NavItem = ({
    path,
    icon: Icon,
    label,
    isActive,
    theme
}: {
    path: string;
    icon: React.ElementType;
    label: string;
    isActive: boolean;
    theme: typeof themeColors['indigo'];
}) => (
    <NavLink
        to={path}
        className={`
      group relative flex items-center justify-center p-3 rounded-xl transition-all duration-200
      ${isActive
                ? `${theme.bg} text-white shadow-lg`
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
    `}
    >
        <Icon size={22} />
        <Tooltip label={label} />
    </NavLink>
);

// Mobile Nav Item
const MobileNavItem = ({
    path,
    icon: Icon,
    label,
    isActive,
    theme
}: {
    path: string;
    icon: React.ElementType;
    label: string;
    isActive: boolean;
    theme: typeof themeColors['indigo'];
}) => (
    <NavLink
        to={path}
        className={`
      flex flex-col items-center justify-center flex-1 h-full gap-1
      ${isActive ? theme.text : 'text-slate-400'}
    `}
    >
        <div className={`transition-transform duration-200 ${isActive ? '-translate-y-0.5' : ''}`}>
            <Icon size={22} />
        </div>
        <span className="text-[10px] font-medium">{label}</span>
    </NavLink>
);

// Tooltip Component
const Tooltip = ({ label }: { label: string }) => (
    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-1.5 bg-slate-800 text-white text-xs font-medium rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
        {label}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 -ml-1 w-2 h-2 bg-slate-800 rotate-45" />
    </div>
);

export default DashboardLayout;
