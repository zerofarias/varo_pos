/**
 * VARO POS - Store de Autenticación (Zustand)
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, AuthState } from '@/types';
import { authService } from '@/services/auth.service';

interface AuthActions {
    login: (username: string, password: string) => Promise<void>;
    logout: () => void;
    refreshUser: () => Promise<void>;
    setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState & AuthActions>()(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: true,

            login: async (username: string, password: string) => {
                set({ isLoading: true });
                try {
                    const { token, user } = await authService.login({ username, password });
                    set({
                        user,
                        token,
                        isAuthenticated: true,
                        isLoading: false
                    });
                } catch (error) {
                    set({ isLoading: false });
                    throw error;
                }
            },

            logout: () => {
                set({
                    user: null,
                    token: null,
                    isAuthenticated: false,
                    isLoading: false
                });
            },

            refreshUser: async () => {
                if (!get().token) {
                    set({ isLoading: false });
                    return;
                }
                try {
                    const user = await authService.me();
                    set({ user, isAuthenticated: true, isLoading: false });
                } catch {
                    set({
                        user: null,
                        token: null,
                        isAuthenticated: false,
                        isLoading: false
                    });
                }
            },

            setLoading: (loading: boolean) => set({ isLoading: loading }),
        }),
        {
            name: 'varo-pos-auth',
            partialize: (state) => ({ token: state.token }),
        }
    )
);

export default useAuthStore;
