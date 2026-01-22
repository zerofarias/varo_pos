import axios from 'axios';
import { api } from './api';
import type { Sale, CartItem, PaymentMethod } from '@/types';

// Definir interfaz local si no existe en types
interface SaleFilters {
    page?: number;
    limit?: number;
    startDate?: Date;
    endDate?: Date;
    status?: string;
    customerId?: string;
}

export const saleService = {
    getAll: async (filters?: SaleFilters) => {
        const params = new URLSearchParams();
        if (filters) {
            if (filters.page) params.append('page', filters.page.toString());
            if (filters.limit) params.append('limit', filters.limit.toString());
            if (filters.startDate) params.append('startDate', filters.startDate.toISOString());
            if (filters.endDate) params.append('endDate', filters.endDate.toISOString());
            if (filters.status) params.append('status', filters.status);
            if (filters.customerId) params.append('customerId', filters.customerId);
        }
        const response = await api.get(`/sales?${params.toString()}`);
        return response.data;
    },

    getById: async (id: string) => {
        const response = await api.get(`/sales/${id}`);
        return response.data;
    },

    create: async (data: any) => {
        const response = await api.post('/sales', data);
        return response.data;
    },

    cancel: async (id: string, reason?: string) => {
        const response = await api.post(`/sales/${id}/cancel`, { reason });
        return response.data;
    },

    createCreditNote: async (id: string, reason: string) => {
        const response = await api.post(`/sales/${id}/credit-note`, { reason });
        return response.data;
    },

    getPaymentMethods: async () => {
        const response = await api.get('/payment-methods');
        return response.data as PaymentMethod[];
    },

    // Helper para convertir items del carrito al formato de venta
    cartToSaleData: (
        cartItems: CartItem[],
        payments: { paymentMethodId: string; amount: number }[],
        customerId?: string,
        discountPercent: number = 0
    ) => {
        const items = cartItems.map(item => ({
            productId: (item.product as any).databaseId || item.product.id, // ID real para el backend
            quantity: item.quantity,
            discountPercent: item.discountPercent,
            unitPrice: item.product.salePrice // Precio personalizado
        }));

        return {
            items,
            payments,
            customerId,
            discountPercent
        };
    },
};


