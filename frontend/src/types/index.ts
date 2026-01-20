/**
 * VARO POS - Tipos del Frontend
 * Sincronizados con el backend Prisma
 */

// ==========================================
// AUTENTICACIÓN
// ==========================================

export interface User {
    id: string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    avatar?: string;
    isActive: boolean;
    role: Role;
    branch?: Branch;
    createdAt: string;
}

export interface Role {
    id: string;
    name: string;
    description?: string;
    permissions: string[];
}

export interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
}

export interface LoginCredentials {
    username: string;
    password: string;
}

// ==========================================
// SUCURSALES
// ==========================================

export interface Branch {
    id: string;
    code: string;
    name: string;
    address?: string;
    phone?: string;
    isMaster: boolean;
    isActive: boolean;
    syncStatus: 'pending' | 'syncing' | 'synced' | 'error';
}

// ==========================================
// PRODUCTOS
// ==========================================

export interface Product {
    id: string;
    sku: string;
    barcode?: string;
    name: string;
    description?: string;
    costPrice: number;
    salePrice: number;
    wholesalePrice?: number;
    stockGlobal: number;
    stockMinimum: number;
    manageStock?: boolean;      // Si es FALSE, no gestiona stock (servicios, cargas)
    allowNegativeStock: boolean;
    isService: boolean;
    isActive: boolean;
    isFeatured: boolean;
    isFavorite: boolean;
    isGeneric?: boolean;        // Producto genérico "Varios"
    imageUrl?: string;
    taxRate: number;
    category: Category;
    stockStatus: 'ok' | 'low' | 'critical' | 'out';
    daysUntilEmpty?: number;
    databaseId?: string; // ID real de DB para genéricos clonados
    promotions?: { promotion: { id: string; name: string; type: string } }[];
}

export interface Category {
    id: string;
    name: string;
    description?: string;
    color?: string;
    icon?: string;
    productCount?: number;
}

// ==========================================
// CARRITO Y VENTAS
// ==========================================

export interface CartItem {
    product: Product;
    quantity: number;
    discountPercent: number;
    subtotal: number;
    promoDiscount?: number;
    promoName?: string;
}

export interface Sale {
    id: string;
    saleNumber: string;
    documentType: 'TICKET_X' | 'FACTURA_A' | 'FACTURA_B' | 'FACTURA_C';
    subtotal: number;
    discountAmount: number;
    discountPercent: number;
    taxAmount: number;
    total: number;
    status: 'pending' | 'completed' | 'cancelled' | 'refunded';
    items: SaleItem[];
    payments: Payment[];
    customer?: CustomerSummary;
    user: UserSummary;
    createdAt: string;
}

export interface SaleItem {
    id: string;
    productId: string;
    productName: string;
    productSku: string;
    quantity: number;
    unitPrice: number;
    discountPercent: number;
    discountAmount: number;
    subtotal: number;
}

export interface Payment {
    id: string;
    paymentMethodId: string;
    paymentMethodName?: string;
    amount: number;
    reference?: string;
}

export interface UserSummary {
    id: string;
    username: string;
    fullName: string;
}

export interface CustomerSummary {
    id: string;
    code: string;
    fullName: string;
    currentBalance: number;
}

// ==========================================
// MÉTODOS DE PAGO
// ==========================================

export interface PaymentMethod {
    id: string;
    code: string;
    name: string;
    description?: string;
    surchargePercent: number;
    discountPercent: number;
    requiresReference: boolean;
    affectsCashRegister: boolean;
    isAccountPayment: boolean;
    isActive: boolean;
    icon?: string;
    color?: string;
}

// ==========================================
// CLIENTES
// ==========================================

export interface Customer {
    id: string;
    code: string;
    firstName: string;
    lastName: string;
    fullName?: string;
    documentType: string;
    documentNumber?: string;
    taxId?: string;
    taxCondition: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    creditLimit: number;
    currentBalance: number;
    alertOnDebt: boolean;
    blockOnLimit: boolean;
    maxDebtDays: number;
    isActive: boolean;
    debtStatus: 'ok' | 'warning' | 'blocked';
}

export interface AccountMovement {
    id: string;
    customerId: string;
    type: 'DEBIT' | 'CREDIT';
    amount: number;
    balance: number;
    description?: string;
    reference?: string;
    createdAt: string;
}

// ==========================================
// CAJA
// ==========================================

export interface CashRegister {
    id: string;
    name: string;
    branchId: string;
    isOpen: boolean;
    openedAt?: string;
    closedAt?: string;
    openingAmount: number;
    currentAmount: number;
    closingAmount?: number;
}

export interface CashMovement {
    id: string;
    cashRegisterId: string;
    userId: string;
    type: 'IN' | 'OUT';
    reason: string;
    amount: number;
    balance: number;
    description?: string;
    createdAt: string;
}

// ==========================================
// CONFIGURACIÓN
// ==========================================

export type ThemeColor = 'indigo' | 'blue' | 'emerald' | 'rose' | 'slate';

export interface SystemConfig {
    shopName: string;
    shopAddress?: string;
    shopPhone?: string;
    taxId?: string;
    themeColor: ThemeColor;
    ticketFooter?: string;
    allowNegativeStock: boolean;
    defaultPaymentMethodId?: string;
}

// ==========================================
// API RESPONSES
// ==========================================

export interface ApiResponse<T> {
    success: boolean;
    message?: string;
    data: T;
}

export interface PaginatedResponse<T> {
    success: boolean;
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface ApiError {
    success: false;
    error: string;
    details?: string[];
}

// ==========================================
// NAVEGACIÓN
// ==========================================


// ==========================================
// PROMOCIONES (OFERTERO)export type View = 'pos' | 'purchases' | 'master' | 'reports' | 'settings' | 'cash';

// ==========================================

export interface Promotion {
    id: string;
    name: string;
    description?: string;
    type: 'N_X_M' | 'PERCENTAGE' | 'FIXED_PRICE';
    isActive: boolean;

    // Vigencia
    startDate: string;
    endDate: string;
    startTime?: string;
    endTime?: string;
    daysOfWeek?: string; // "0,1,2,3,4,5,6"

    // Reglas
    buyQuantity?: number;
    payQuantity?: number;
    discountPercent?: number;
    fixedPrice?: number;

    // Condiciones
    paymentMethodId?: string;

    // Relaciones
    products?: PromotionProduct[];
    _count?: {
        products: number;
    };
}

export interface PromotionProduct {
    promotionId: string;
    productId: string;
    product?: Product;
}

