/**
 * VARO POS - Servicio de Caja (Cash Shifts)
 */
import api from './api';

export interface OpenShiftData {
    cashRegisterId: string;
    openingCash: number;
}

export interface CloseShiftData {
    countedCash: number;
    closingNotes?: string;
}

export const cashService = {
    /**
     * Obtener el turno de caja activo del usuario actual
     */
    async getActiveShift() {
        // GET /cash-shifts/active devuelve objeto { data: Shift | null, message }
        const response = await api.get('/cash-shifts/active');
        return response.data;
    },

    /**
     * Abrir un nuevo turno de caja
     */
    async openShift(data: OpenShiftData) {
        const response = await api.post('/cash-shifts/open', data);
        return response.data;
    },

    /**
     * Cerrar un turno existente
     */
    async closeShift(id: string, data: CloseShiftData) {
        const response = await api.post(`/cash-shifts/${id}/close`, data);
        return response.data;
    },

    /**
     * Obtener lista de cajas físicas
     */
    async getRegisters() {
        const response = await api.get('/cash-shifts/registers');
        return response.data; // { data: registers[] }
    },

    /**
     * Registrar movimiento (egreso/ingreso)
     */
    async addMovement(id: string, data: { type: 'IN' | 'OUT', amount: number, reason: string, description?: string }) {
        const response = await api.post(`/cash-shifts/${id}/movement`, data);
        return response.data;
    },

    /**
     * Obtener historial de turnos (paginado)
     */
    async getShiftHistory(page: number = 1, limit: number = 20, startDate?: string, endDate?: string) {
        const response = await api.get('/cash-shifts/history', {
            params: { page, limit, startDate, endDate }
        });
        return response.data;
    },

    /**
     * Obtener detalles completos de un turno
     */
    async getShiftDetails(id: string) {
        const response = await api.get(`/cash-shifts/${id}/details`);
        return response.data;
    }
};

export default cashService;
