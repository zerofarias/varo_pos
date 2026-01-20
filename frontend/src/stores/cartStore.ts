/**
 * VARO POS - Store del Carrito (Zustand)
 * Con soporte para Promociones Automáticas
 */

import { create } from 'zustand';
import type { CartItem, Product, Customer, Promotion } from '@/types';
import { promoService } from '@/services/promo.service';

interface CartState {
    items: CartItem[];
    customer: Customer | null;
    discountPercent: number; // Descuento global manual
    documentType: 'TICKET_X' | 'FACTURA_A' | 'FACTURA_B' | 'FACTURA_C';
    promotions: Promotion[];
}

interface CartActions {
    addItem: (product: Product) => void;
    removeItem: (productId: string) => void;
    updateQuantity: (productId: string, quantity: number) => void;
    updateItemDiscount: (productId: string, discountPercent: number) => void;

    setCustomer: (customer: Customer | null) => void;
    setDiscountPercent: (percent: number) => void;
    setDocumentType: (type: CartState['documentType']) => void;
    clearCart: () => void;

    // Promociones
    loadPromotions: () => Promise<void>;
    applyPromotions: () => void;

    // Getters
    getSubtotal: () => number;
    getDiscountAmount: () => number;
    getTotal: () => number;
    getItemCount: () => number;
}

// Lógica de cálculo individual (Considera descuentos manuales y de promo)
const calculateItemSubtotal = (item: CartItem): number => {
    const gross = item.product.salePrice * item.quantity;
    const manualDiscount = (gross * item.discountPercent) / 100;
    const promoDiscount = item.promoDiscount || 0;
    // El subtotal no puede ser negativo
    return Math.max(0, gross - manualDiscount - promoDiscount);
};

// Motor de Promociones
const applyPromotionsLogic = (items: CartItem[], promotions: Promotion[]): CartItem[] => {
    // Clona los items para no mutar el estado anterior directamente
    let newItems: CartItem[] = items.map(item => ({
        ...item,
        promoDiscount: 0,
        promoName: undefined
    }));

    if (promotions.length === 0) return newItems;

    promotions.forEach(promo => {
        // Encontrar items afectados por esta promo
        // La validación simple usa el ID.
        // Si promo.products es undefined (no cargado), no aplica.
        if (!promo.products || promo.products.length === 0) return;

        // Items del carrito que están en la lista de la promo
        const eligibleItems = newItems.filter(item =>
            promo.products?.some(p => p.productId === item.product.id)
        );

        if (eligibleItems.length === 0) return;

        // 1. TIPO PORCENTAJE
        if (promo.type === 'PERCENTAGE' && promo.discountPercent) {
            eligibleItems.forEach(item => {
                const discount = (item.product.salePrice * item.quantity * promo.discountPercent!) / 100;
                item.promoDiscount = (item.promoDiscount || 0) + discount;
                item.promoName = promo.name;
            });
        }

        // 2. TIPO NxM
        else if (promo.type === 'N_X_M' && promo.buyQty && promo.payQty) {
            const totalQty = eligibleItems.reduce((acc, item) => acc + item.quantity, 0);

            if (totalQty >= promo.buyQty) {
                const sets = Math.floor(totalQty / promo.buyQty);
                const freeCount = sets * (promo.buyQty - promo.payQty);

                // Descontar los más baratos
                // Expandir a unidades individuales
                let allUnits: { price: number, itemIndex: number }[] = [];
                eligibleItems.forEach(item => {
                    // Mapeamos de vuelta al índice en newItems
                    const idx = newItems.indexOf(item);
                    for (let i = 0; i < item.quantity; i++) {
                        allUnits.push({ price: item.product.salePrice, itemIndex: idx });
                    }
                });

                // Ordenar precio asc
                allUnits.sort((a, b) => a.price - b.price);

                // Marcar como gratis las primeras N unidades
                const freeUnits = allUnits.slice(0, freeCount);

                freeUnits.forEach(unit => {
                    const item = newItems[unit.itemIndex];
                    item.promoDiscount = (item.promoDiscount || 0) + unit.price;
                    item.promoName = promo.name;
                });
            }
        }

        // 3. FIXED PRICE (Combo)
        else if (promo.type === 'FIXED_PRICE' && promo.fixedPrice != null) {
            // Asume que el fixed price es por SET de productos definidos?
            // O si compro 1 unidad de X cuesta Fixed?
            // Interpretación simple: Si comprás estos productos, el total es Fixed? 
            // Complejo. Asumiremos "Precio Unitario Fijo" si un solo producto, o "Precio Combo" si varios.
            // Implementación básica: Si hay 1 item y coincide, fija el precio.
            // Dejémoslo para v2 si es complejo. El usuario pidió 2x1 y %.
        }
    });

    // Recalcular subtotales con los descuentos aplicados
    return newItems.map(item => ({
        ...item,
        subtotal: calculateItemSubtotal(item)
    }));
};


export const useCartStore = create<CartState & CartActions>((set, get) => ({
    items: [],
    customer: null,
    discountPercent: 0,
    documentType: 'TICKET_X',
    promotions: [],

    loadPromotions: async () => {
        try {
            // Cargar solo vigentes
            const promos = await promoService.getAll(true);
            // Necesitamos los detalles de productos para saber a cuáles aplica
            // getAll ya devuelve isActive=true, pero necesitamos include products. 
            // El controller actual incluye `_count`, no los productos.
            // Ouch. El controller getAll NECESITA include products para que esto funcione.
            // DEBO ACTUALIZAR EL CONTROLLER getAll.
            // Mientras tanto seteo array vacio.
            set({ promotions: promos });
        } catch (e) {
            console.error('Error loading promotions', e);
        }
    },

    applyPromotions: () => {
        const { items, promotions } = get();
        const newItems = applyPromotionsLogic(items, promotions);
        set({ items: newItems });
    },

    addItem: (product: Product) => {
        const items = get().items;
        // Limpiamos referencias a promos viejas antes de mergear lógicas
        // Mejor añadir raw y luego applyPromotions

        const existingIndex = items.findIndex(item => item.product.id === product.id);
        let newItems = [...items];

        if (existingIndex >= 0) {
            newItems[existingIndex] = {
                ...newItems[existingIndex],
                quantity: newItems[existingIndex].quantity + 1,
                // El subtotal se recalculará en applyPromotions
            };
        } else {
            const newItem: CartItem = {
                product,
                quantity: 1,
                discountPercent: 0,
                subtotal: product.salePrice,
            };
            newItems.push(newItem);
        }

        // Aplicar lógica de promos sobre la nueva lista
        // Primero setear items raw
        // set({ items: newItems }); // No necesario si llamamos a la logica directo
        const finalItems = applyPromotionsLogic(newItems, get().promotions);
        set({ items: finalItems });
    },

    removeItem: (productId: string) => {
        const items = get().items.filter(item => item.product.id !== productId);
        const finalItems = applyPromotionsLogic(items, get().promotions);
        set({ items: finalItems });
    },

    updateQuantity: (productId: string, quantity: number) => {
        if (quantity <= 0) {
            get().removeItem(productId);
            return;
        }

        const items = get().items.map(item => {
            if (item.product.id === productId) {
                return { ...item, quantity };
            }
            return item;
        });

        const finalItems = applyPromotionsLogic(items, get().promotions);
        set({ items: finalItems });
    },

    updateItemDiscount: (productId: string, discountPercent: number) => {
        const items = get().items.map(item => {
            if (item.product.id === productId) {
                return { ...item, discountPercent };
            }
            return item;
        });
        const finalItems = applyPromotionsLogic(items, get().promotions);
        set({ items: finalItems });
    },

    setCustomer: (customer: Customer | null) => set({ customer }),
    setDiscountPercent: (percent: number) => set({ discountPercent: percent }),
    setDocumentType: (type: CartState['documentType']) => set({ documentType: type }),
    clearCart: () => set({ items: [], customer: null, discountPercent: 0 }),

    getSubtotal: () => get().items.reduce((sum, item) => sum + item.subtotal, 0),
    getDiscountAmount: () => (get().getSubtotal() * get().discountPercent) / 100,
    getTotal: () => get().getSubtotal() - get().getDiscountAmount(),
    getItemCount: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
}));

export default useCartStore;
