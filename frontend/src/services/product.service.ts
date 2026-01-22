/**
 * VARO POS - Servicios de Productos
 */

import api from './api';
import type { Product, Category, ApiResponse, PaginatedResponse } from '@/types';

interface ProductFilters {
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: string;
    lowStock?: boolean;
    featured?: boolean;
    favorites?: boolean;
    active?: boolean;
}

interface StockAlerts {
    critical: Product[];
    low: Product[];
    summary: {
        criticalCount: number;
        lowCount: number;
    };
}

export const productService = {
    async getAll(filters: ProductFilters = {}): Promise<PaginatedResponse<Product>> {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined) params.append(key, String(value));
        });
        const response = await api.get<PaginatedResponse<Product>>(`/products?${params}`);
        return response.data;
    },

    async getById(id: string): Promise<Product> {
        const response = await api.get<ApiResponse<Product>>(`/products/${id}`);
        return response.data.data;
    },

    async getByBarcode(barcode: string): Promise<Product> {
        const response = await api.get<ApiResponse<Product>>(`/products/barcode/${barcode}`);
        return response.data.data;
    },

    async create(data: Partial<Product>): Promise<Product> {
        const response = await api.post<ApiResponse<Product>>('/products', data);
        return response.data.data;
    },

    async update(id: string, data: Partial<Product>): Promise<Product> {
        const response = await api.put<ApiResponse<Product>>(`/products/${id}`, data);
        return response.data.data;
    },

    async delete(id: string): Promise<void> {
        await api.delete(`/products/${id}`);
    },

    async adjustStock(id: string, quantity: number, type: 'add' | 'subtract' | 'set', reason?: string): Promise<void> {
        await api.patch(`/products/${id}/stock`, { quantity, type, reason });
    },

    async getStockAlerts(): Promise<StockAlerts> {
        const response = await api.get<ApiResponse<StockAlerts>>('/products/stock-alerts');
        return response.data.data;
    },

    async createCategory(data: Partial<Category>): Promise<Category> {
        const response = await api.post<ApiResponse<Category>>('/categories', data);
        return response.data.data;
    },

    async getCategories(): Promise<Category[]> {
        const response = await api.get<ApiResponse<Category[]>>('/categories');
        return response.data.data;
    },

    async normalizeCategories(): Promise<{ merged: number; renamed: number }> {
        const response = await api.post<ApiResponse<{ merged: number; renamed: number }>>('/categories/normalize');
        return response.data.data;
    },
};

export default productService;
