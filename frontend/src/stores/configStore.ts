/**
 * VARO POS - Store de Configuración (Zustand)
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SystemConfig, ThemeColor } from '@/types';

interface ConfigState extends SystemConfig {
    setShopName: (name: string) => void;
    setThemeColor: (color: ThemeColor) => void;
    setTicketFooter: (footer: string) => void;
    setAllowNegativeStock: (allow: boolean) => void;
    setDefaultPaymentMethod: (id: string) => void;

    // Printer Settings
    printOnSale: boolean;
    printOnFiscal: boolean;
    setPrintOnSale: (value: boolean) => void;
    setPrintOnFiscal: (value: boolean) => void;

    updateConfig: (config: Partial<SystemConfig>) => void;
}

const defaultConfig: SystemConfig & { printOnSale: boolean; printOnFiscal: boolean } = {
    shopName: 'VARO POS',
    shopAddress: '',
    shopPhone: '',
    taxId: '',
    themeColor: 'indigo',
    ticketFooter: '¡Gracias por su compra!',
    allowNegativeStock: false,
    printOnSale: true,
    printOnFiscal: true,
};

export const useConfigStore = create<ConfigState>()(
    persist(
        (set) => ({
            ...defaultConfig,

            setShopName: (shopName: string) => set({ shopName }),
            setThemeColor: (themeColor: ThemeColor) => set({ themeColor }),
            setTicketFooter: (ticketFooter: string) => set({ ticketFooter }),
            setAllowNegativeStock: (allowNegativeStock: boolean) => set({ allowNegativeStock }),
            setDefaultPaymentMethod: (defaultPaymentMethodId: string) => set({ defaultPaymentMethodId }),

            setPrintOnSale: (printOnSale: boolean) => set({ printOnSale }),
            setPrintOnFiscal: (printOnFiscal: boolean) => set({ printOnFiscal }),

            updateConfig: (config: Partial<SystemConfig>) => set((state) => ({ ...state, ...config })),
        }),
        {
            name: 'varo-pos-config',
        }
    )
);

// Theme color utilities
export const themeColors: Record<ThemeColor, { bg: string; text: string; ring: string; hover: string }> = {
    indigo: {
        bg: 'bg-indigo-600',
        text: 'text-indigo-600',
        ring: 'ring-indigo-500',
        hover: 'hover:bg-indigo-700',
    },
    blue: {
        bg: 'bg-blue-600',
        text: 'text-blue-600',
        ring: 'ring-blue-500',
        hover: 'hover:bg-blue-700',
    },
    emerald: {
        bg: 'bg-emerald-600',
        text: 'text-emerald-600',
        ring: 'ring-emerald-500',
        hover: 'hover:bg-emerald-700',
    },
    rose: {
        bg: 'bg-rose-600',
        text: 'text-rose-600',
        ring: 'ring-rose-500',
        hover: 'hover:bg-rose-700',
    },
    slate: {
        bg: 'bg-slate-600',
        text: 'text-slate-600',
        ring: 'ring-slate-500',
        hover: 'hover:bg-slate-700',
    },
};

export default useConfigStore;
