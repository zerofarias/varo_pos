/**
 * VARO POS - Store de Caja (Cash Management)
 */
import { create } from 'zustand';
import cashService, { OpenShiftData, CloseShiftData } from '@/services/cash.service';

interface CashShiftMetrics {
    transactionCount: number;
    totalSales: number;
    avgTicket: number;
    byPaymentMethod: Record<string, { count: number; total: number }>;
}

export interface CashShift {
    id: string;
    shiftNumber: string;
    status: 'OPEN' | 'CLOSED';
    openedAt: string;
    openingCash: number;
    cashRegister: {
        name: string;
        code: string;
    };
    metrics?: CashShiftMetrics;
}

interface CashStore {
    isLoading: boolean;
    activeShift: CashShift | null;
    isShiftOpen: boolean;
    initialized: boolean; // Para saber si ya comprobamos
    error: string | null;

    checkActiveShift: () => Promise<void>;
    openShift: (data: OpenShiftData) => Promise<void>;
    closeShift: (id: string, data: CloseShiftData) => Promise<any>;
    addMovement: (id: string, data: any) => Promise<void>;
}

export const useCashStore = create<CashStore>((set, get) => ({
    isLoading: false,
    activeShift: null,
    isShiftOpen: false,
    initialized: false,
    error: null,

    checkActiveShift: async () => {
        set({ isLoading: true, error: null });
        try {
            const res = await cashService.getActiveShift();
            if (res.data) {
                set({
                    activeShift: res.data,
                    isShiftOpen: true,
                    initialized: true
                });
            } else {
                set({
                    activeShift: null,
                    isShiftOpen: false,
                    initialized: true
                });
            }
        } catch (error: any) {
            console.error('Error checking active shift:', error);
            // Si el error es 401, no inicializamos como false activo?
            set({
                error: error.message,
                isShiftOpen: false,
                initialized: true
            });
        } finally {
            set({ isLoading: false });
        }
    },

    openShift: async (data) => {
        set({ isLoading: true, error: null });
        try {
            const res = await cashService.openShift(data);
            set({ activeShift: res.data, isShiftOpen: true });
        } catch (error: any) {
            set({ error: error.response?.data?.error || 'Error abriendo caja' });
            throw error;
        } finally {
            set({ isLoading: false });
        }
    },

    closeShift: async (id, data) => {
        set({ isLoading: true, error: null });
        try {
            const res = await cashService.closeShift(id, data);
            set({ activeShift: null, isShiftOpen: false });
            return res.data;
        } catch (error: any) {
            set({ error: error.response?.data?.error || 'Error cerrando caja' });
            throw error;
        } finally {
            set({ isLoading: false });
        }
    },

    addMovement: async (id, data) => {
        set({ isLoading: true });
        try {
            await cashService.addMovement(id, data);
            // Recargar info del shift para actualizar métricas
            await get().checkActiveShift();
        } catch (error: any) {
            console.error('Error adding movement:', error);
            throw error;
        } finally {
            set({ isLoading: false });
        }
    }
}));
