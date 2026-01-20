/**
 * VARO POS - Servicios de Ventas
 */

import api from './api';
import type { Sale, CartItem, PaymentMethod, ApiResponse, PaginatedResponse } from '@/types';

interface CreateSaleData {
    documentType?: string;
    customerId?: string;
    discountPercent?: number;
    items: Array<{
        productId: string;
        quantity: number;
        discountPercent?: number;
        unitPrice?: number; // Precio personalizado para genéricos
    }>;
    payments: Array<{
        paymentMethodId: string;
        amount: number;
        reference?: string;
    }>;
}

interface SaleFilters {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    status?: string;
    customerId?: string;
    userId?: string;
}

interface DailySummary {
    date: string;
    totalSales: number;
    totalAmount: number;
    totalProfit: number;
    averageTicket: number;
    byPaymentMethod: Array<{
        method: string;
        total: number;
        count: number;
    }>;
}

export const saleService = {
    async getAll(filters: SaleFilters = {}): Promise<PaginatedResponse<Sale>> {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined) params.append(key, String(value));
        });
        const response = await api.get<PaginatedResponse<Sale>>(`/sales?${params}`);
        return response.data;
    },

    async getById(id: string): Promise<Sale> {
        const response = await api.get<ApiResponse<Sale>>(`/sales/${id}`);
        return response.data.data;
    },

    async create(data: CreateSaleData): Promise<Sale> {
        const response = await api.post<ApiResponse<Sale>>('/sales', data);
        return response.data.data;
    },

    async cancel(id: string, reason?: string): Promise<void> {
        await api.post(`/sales/${id}/cancel`, { reason });
    },

    async getDailySummary(date?: string): Promise<DailySummary> {
        const params = date ? `?date=${date}` : '';
        const response = await api.get<ApiResponse<DailySummary>>(`/sales/daily-summary${params}`);
        return response.data.data;
    },

    async getPaymentMethods(): Promise<PaymentMethod[]> {
        const response = await api.get<ApiResponse<PaymentMethod[]>>('/payment-methods');
        return response.data.data;
    },

    // Helper para convertir carrito a formato de API
    cartToSaleData(
        cart: CartItem[],
        payments: Array<{ paymentMethodId: string; amount: number; reference?: string }>,
        options?: { customerId?: string; discountPercent?: number; documentType?: string }
    ): CreateSaleData {
        return {
            documentType: options?.documentType || 'TICKET_X',
            customerId: options?.customerId,
            discountPercent: options?.discountPercent || 0,
            items: cart.map(item => ({
                // Si el producto tiene 'databaseId' (generic), usarlo. Si no, usar item.product.id
                productId: item.product.databaseId || item.product.id,
                quantity: item.quantity,
                discountPercent: item.discountPercent,
                unitPrice: item.product.salePrice // Importante: enviar el precio del carrito
            })),
            payments,
        };
    },
};

export default saleService;
