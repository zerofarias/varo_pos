import api from './api';

export interface DashboardSummary {
    totalAmount: number;
    transactionCount: number;
    averageTicket: number;
    topPaymentMethod: string;
}

export interface SellerStat {
    userId: string;
    name: string;
    role: string;
    totalSales: number;
    count: number;
}

export interface HourlyStat {
    hour: number;
    total: number;
    count: number;
}

export interface CategoryStat {
    name: string;
    value: number;
}

export const statsService = {
    getSummary: async () => {
        const res = await api.get<{ success: boolean, data: DashboardSummary }>('/stats/summary');
        return res.data.data;
    },
    getTopSellers: async () => {
        const res = await api.get<{ success: boolean, data: SellerStat[] }>('/stats/top-sellers');
        return res.data.data;
    },
    getHourlySales: async () => {
        const res = await api.get<{ success: boolean, data: HourlyStat[] }>('/stats/hourly');
        return res.data.data;
    },
    getByCategory: async () => {
        const res = await api.get<{ success: boolean, data: CategoryStat[] }>('/stats/by-category');
        return res.data.data;
    }
};
