/**
 * VARO POS - Servicios de Autenticación
 */

import api from './api';
import type { User, LoginCredentials, ApiResponse } from '@/types';

interface LoginResponse {
    token: string;
    user: User;
}

export const authService = {
    async login(credentials: LoginCredentials): Promise<LoginResponse> {
        const response = await api.post<ApiResponse<LoginResponse>>('/auth/login', credentials);
        return response.data.data;
    },

    async me(): Promise<User> {
        const response = await api.get<ApiResponse<User>>('/auth/me');
        return response.data.data;
    },

    async refreshToken(): Promise<{ token: string }> {
        const response = await api.post<ApiResponse<{ token: string }>>('/auth/refresh');
        return response.data.data;
    },

    async changePassword(currentPassword: string, newPassword: string): Promise<void> {
        await api.post('/auth/change-password', { currentPassword, newPassword });
    },
};

export default authService;
