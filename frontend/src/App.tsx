/**
 * VARO POS - App Principal
 */

import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

// Pages
import { LoginPage } from '@/pages/LoginPage';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { POSPage } from '@/pages/POSPage';
import { ProductsPage } from '@/pages/ProductsPage';
import { CustomersPage } from '@/pages/CustomersPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { CashRegisterPage } from '@/pages/CashRegisterPage';
import { CashDashboardPage } from '@/pages/CashDashboardPage';
import { ShiftDetailsPage } from '@/pages/ShiftDetailsPage';
import { PromotionsPage } from '@/pages/PromotionsPage';
import { StatsPage } from '@/pages/StatsPage';
import { UsersPage } from '@/pages/UsersPage';

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const { isAuthenticated, isLoading } = useAuthStore();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full spinner mx-auto mb-4" />
                    <p className="text-white text-lg">Cargando...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
};

function App() {
    const { refreshUser, token } = useAuthStore();

    useEffect(() => {
        if (token) {
            refreshUser();
        } else {
            useAuthStore.getState().setLoading(false);
        }
    }, []);

    return (
        <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected Routes */}
            <Route
                path="/"
                element={
                    <ProtectedRoute>
                        <DashboardLayout />
                    </ProtectedRoute>
                }
            >
                <Route index element={<Navigate to="/pos" replace />} />
                <Route path="pos" element={<POSPage />} />
                <Route path="products" element={<ProductsPage />} />
                <Route path="promotions" element={<PromotionsPage />} />
                <Route path="customers" element={<CustomersPage />} />
                <Route path="cash" element={<CashRegisterPage />} />
                <Route path="cash-dashboard" element={<CashDashboardPage />} />
                <Route path="cash-details/:id" element={<ShiftDetailsPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="stats" element={<StatsPage />} />
                <Route path="users" element={<UsersPage />} />
                <Route path="settings" element={<SettingsPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export default App;
