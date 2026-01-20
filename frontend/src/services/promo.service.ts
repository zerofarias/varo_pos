import api from './api';
import type { Promotion, ApiResponse } from '@/types';

export const promoService = {
    /**
     * Obtener todas las promociones
     */
    async getAll(activeOnly = false): Promise<Promotion[]> {
        const res = await api.get<ApiResponse<Promotion[]>>(`/promotions?active=${activeOnly}`);
        return res.data.data;
    },

    /**
     * Obtener detalle de una promoción
     */
    async getById(id: string): Promise<Promotion> {
        const res = await api.get<ApiResponse<Promotion>>(`/promotions/${id}`);
        return res.data.data;
    },

    /**
     * Crear promoción
     */
    async create(data: Partial<Promotion> & { productIds?: string[] }): Promise<Promotion> {
        const res = await api.post<ApiResponse<Promotion>>('/promotions', data);
        return res.data.data;
    },

    /**
     * Actualizar promoción
     */
    async update(id: string, data: Partial<Promotion> & { productIds?: string[] }): Promise<Promotion> {
        const res = await api.put<ApiResponse<Promotion>>(`/promotions/${id}`, data);
        return res.data.data;
    },

    /**
     * Eliminar promoción
     */
    async delete(id: string): Promise<void> {
        await api.delete(`/promotions/${id}`);
    },

    /**
     * Cambiar estado activo
     */
    async toggle(id: string, isActive: boolean): Promise<void> {
        await api.patch(`/promotions/${id}/toggle`, { isActive });
    }
};

export default promoService;
