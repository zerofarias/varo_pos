/**
 * VARO POS - Servicios de Clientes
 */

import api from './api';
import type { Customer, AccountMovement, ApiResponse, PaginatedResponse } from '@/types';

interface CustomerFilters {
    page?: number;
    limit?: number;
    search?: string;
    withDebt?: boolean;
}

interface PaymentResult {
    previousBalance: number;
    paymentAmount: number;
    newBalance: number;
    change: number;
}

interface DebtAlert {
    customer: {
        id: string;
        code: string;
        fullName: string;
        currentBalance: number;
        creditLimit: number;
    };
    alertType: 'warning' | 'blocked';
    reasons: string[];
}

export const customerService = {
    async getAll(filters: CustomerFilters = {}): Promise<PaginatedResponse<Customer>> {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined) params.append(key, String(value));
        });
        const response = await api.get<PaginatedResponse<Customer>>(`/customers?${params}`);
        return response.data;
    },

    async getById(id: string): Promise<Customer> {
        const response = await api.get<ApiResponse<Customer>>(`/customers/${id}`);
        return response.data.data;
    },

    async create(data: Partial<Customer>): Promise<Customer> {
        const response = await api.post<ApiResponse<Customer>>('/customers', data);
        return response.data.data;
    },

    async update(id: string, data: Partial<Customer>): Promise<Customer> {
        const response = await api.put<ApiResponse<Customer>>(`/customers/${id}`, data);
        return response.data.data;
    },

    async delete(id: string): Promise<void> {
        await api.delete(`/customers/${id}`);
    },

    async registerPayment(id: string, amount: number, description?: string, reference?: string): Promise<PaymentResult> {
        const response = await api.post<ApiResponse<PaymentResult>>(`/customers/${id}/payment`, {
            amount,
            description,
            reference,
        });
        return response.data.data;
    },

    async getAccountMovements(id: string, filters?: { startDate?: string; endDate?: string }): Promise<AccountMovement[]> {
        const params = new URLSearchParams();
        if (filters?.startDate) params.append('startDate', filters.startDate);
        if (filters?.endDate) params.append('endDate', filters.endDate);
        const response = await api.get<ApiResponse<AccountMovement[]>>(`/customers/${id}/account-movements?${params}`);
        return response.data.data;
    },

    async getDebtAlerts(): Promise<{ alerts: DebtAlert[]; summary: { blocked: number; warning: number } }> {
        const response = await api.get<ApiResponse<{ alerts: DebtAlert[]; summary: { blocked: number; warning: number } }>>('/customers/debt-alerts');
        return response.data.data;
    },
};

export default customerService;
