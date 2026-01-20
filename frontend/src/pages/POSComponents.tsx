import React, { useState, useEffect, useRef } from 'react';
import {
    Star, Tag, Plus, Minus, X, CheckCircle, AlertCircle,
    Scan, Package, LayoutGrid, Banknote, CreditCard, QrCode
} from 'lucide-react';
import { themeColors } from '@/stores/configStore';
import type { Product, PaymentMethod } from '@/types';

// === HELPER COMPONENTS ===

export const StockBadge = ({
    status,
    stock,
    small = false
}: {
    status: string;
    stock: number;
    small?: boolean;
}) => {
    const styles = {
        ok: 'text-emerald-600',
        low: 'text-amber-600',
        critical: 'text-red-600',
        out: 'text-red-600',
    };

    return (
        <span className={`${styles[status as keyof typeof styles] || styles.ok} ${small ? 'text-xs' : 'text-sm'} font-medium`}>
            {stock}
        </span>
    );
};

export const ProductRow = ({
    product,
    onAdd,
    onToggleFav,
    theme,
    isSelected,
    hasPromotion
}: {
    product: Product;
    onAdd: (p: Product) => void;
    onToggleFav: (p: Product, e: React.MouseEvent) => void;
    theme: typeof themeColors['indigo'];
    isSelected: boolean;
    hasPromotion: boolean;
}) => (
    <tr
        data-product-row
        onClick={() => onAdd(product)}
        className={`cursor-pointer transition-all group ${isSelected
            ? `${theme.bg.replace('600', '100')} ring-2 ${theme.ring}`
            : hasPromotion
                ? 'bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100'
                : 'hover:bg-slate-50'
            }`}
    >
        <td className="px-4 py-3 text-center w-10">
            <button
                onClick={(e) => onToggleFav(product, e)}
                className={`p-1 rounded-full transition-colors ${product.isFavorite ? 'text-amber-400' : 'text-slate-200 hover:text-amber-300'}`}
            >
                <Star size={16} fill={product.isFavorite ? "currentColor" : "none"} />
            </button>
        </td>
        <td className="px-4 py-3">
            <div className="flex items-center gap-2">
                {hasPromotion && (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold">
                        <Tag size={10} />
                        OFERTA
                    </span>
                )}
                <span className={`font-medium ${hasPromotion ? 'text-amber-800' : 'text-slate-700'}`}>
                    {product.name}
                </span>
            </div>
        </td>
        <td className="px-4 py-3 text-slate-400 text-xs font-mono">
            {product.barcode || product.sku}
        </td>
        <td className="px-4 py-3 text-right">
            <StockBadge status={product.stockStatus} stock={product.stockGlobal} />
        </td>
        <td className="px-4 py-3 text-right">
            <span className={`font-bold ${hasPromotion ? 'text-amber-700' : 'text-slate-800'}`}>
                $ {product.salePrice.toLocaleString('es-AR')}
            </span>
        </td>
        <td className="px-4 py-3 text-center">
            <button className={`p-1.5 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity ${hasPromotion ? 'bg-gradient-to-r from-amber-500 to-orange-500' : theme.bg
                }`}>
                <Plus size={16} />
            </button>
        </td>
    </tr>
);

export const ProductCard = ({
    product,
    onAdd,
    onToggleFav,
    theme,
    isSelected,
    hasPromotion
}: {
    product: Product;
    onAdd: (p: Product) => void;
    onToggleFav: (p: Product, e: React.MouseEvent) => void;
    theme: typeof themeColors['indigo'];
    isSelected: boolean;
    hasPromotion: boolean;
}) => (
    <div
        data-product-row
        onClick={() => onAdd(product)}
        className={`p-4 rounded-xl shadow-sm border flex justify-between items-center active:scale-[0.98] transition-all ${isSelected
            ? `${theme.bg.replace('600', '100')} ring-2 ${theme.ring} border-transparent`
            : hasPromotion
                ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200'
                : 'bg-white border-slate-200'
            }`}
    >
        <div className="flex-1 min-w-0 pr-3">
            <div className="flex items-center gap-2 mb-1">
                {hasPromotion && (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold">
                        <Tag size={10} />
                        OFERTA
                    </span>
                )}
            </div>
            <h4 className={`font-semibold text-sm truncate ${hasPromotion ? 'text-amber-800' : 'text-slate-800'}`}>
                {product.name}
            </h4>
            <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                    {product.barcode || product.sku}
                </span>
                <StockBadge status={product.stockStatus} stock={product.stockGlobal} small />
            </div>
        </div>
        <div className="flex items-center gap-3">
            <span className={`text-lg font-bold ${hasPromotion ? 'text-amber-700' : 'text-slate-900'}`}>
                $ {product.salePrice.toLocaleString('es-AR')}
            </span>
            <button className={`p-2 rounded-full text-white ${hasPromotion ? 'bg-gradient-to-r from-amber-500 to-orange-500' : theme.bg
                }`}>
                <Plus size={18} />
            </button>
        </div>
    </div>
);

export const CartItemRow = ({
    item,
    onUpdateQuantity,
    theme
}: {
    item: { product: Product; quantity: number; subtotal: number; promoDiscount?: number; promoName?: string };
    onUpdateQuantity: (qty: number) => void;
    theme: typeof themeColors['indigo'];
}) => {
    const hasPromo = (item.promoDiscount || 0) > 0;
    const originalSubtotal = item.quantity * item.product.salePrice;

    return (
        <div className={`p-3 rounded-xl shadow-sm border flex justify-between items-center transition-all ${hasPromo ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-amber-200 ring-1 ring-amber-200' : 'bg-white border-slate-200'
            }`}>
            <div className="flex-1 min-w-0 pr-2">
                <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-medium text-slate-800 truncate text-sm">{item.product.name}</p>
                    {hasPromo && (
                        <span className="shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-200">
                            <Tag size={10} className="fill-amber-500 text-amber-600" /> {item.promoName?.substring(0, 15)}
                        </span>
                    )}
                </div>

                <p className={`text-xs font-semibold ${theme.text}`}>
                    {item.quantity} x ${item.product.salePrice.toLocaleString('es-AR')}
                    {hasPromo && (
                        <span className="ml-1 text-slate-400 line-through font-normal">
                            = ${originalSubtotal.toLocaleString('es-AR')}
                        </span>
                    )}
                </p>
                {hasPromo && (
                    <p className="text-[10px] text-green-600 font-bold mt-0.5 bg-green-50 inline-block px-1 rounded border border-green-100">
                        Ahorro: -${item.promoDiscount?.toLocaleString('es-AR')}
                    </p>
                )}
            </div>

            <div className="flex items-center gap-3">
                <div className="text-right">
                    <span className={`font-bold text-lg ${hasPromo ? 'text-amber-700' : 'text-slate-900'}`}>
                        $ {item.subtotal.toLocaleString('es-AR')}
                    </span>
                </div>

                <div className="flex flex-col gap-1">
                    <button
                        onClick={(e) => { e.stopPropagation(); onUpdateQuantity(item.quantity + 1); }}
                        className="p-1 bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-600 rounded transition-colors"
                    >
                        <Plus size={14} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onUpdateQuantity(item.quantity - 1); }}
                        className="p-1 bg-slate-100 hover:bg-red-100 text-slate-600 hover:text-red-600 rounded transition-colors"
                    >
                        <Minus size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export const EmptyState = () => (
    <div className="h-full flex flex-col items-center justify-center text-slate-400 py-20">
        <Package size={48} className="mb-3 opacity-50" />
        <p className="text-sm">No se encontraron productos</p>
    </div>
);

export const PaymentModal = ({
    total,
    paymentMethods,
    selectedMethod,
    onSelectMethod,
    amountTendered,
    onAmountChange,
    onConfirm,
    onClose,
    processing,
    theme,
}: {
    total: number;
    paymentMethods: PaymentMethod[];
    selectedMethod: string;
    onSelectMethod: (id: string) => void;
    amountTendered: string;
    onAmountChange: (val: string) => void;
    onConfirm: (amount: number) => void;
    onClose: () => void;
    processing: boolean;
    theme: typeof themeColors['indigo'];
}) => {
    const selectedPayment = paymentMethods.find(m => m.id === selectedMethod);
    const surchargePercent = selectedPayment?.surchargePercent || 0;
    const discountPercent = selectedPayment?.discountPercent || 0;
    const surchargeAmount = total * (surchargePercent / 100);
    const discountAmount = total * (discountPercent / 100);
    const finalTotal = total + surchargeAmount - discountAmount;
    const tendered = parseFloat(amountTendered) || 0;
    const change = tendered - finalTotal;
    const amountInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setTimeout(() => amountInputRef.current?.focus(), 100);
    }, []);

    return (
        <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">
                <div className="p-5 border-b bg-slate-50 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-slate-800">Finalizar Venta</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>
                <div className="p-5 space-y-5 overflow-y-auto">
                    <div className="text-center">
                        <p className="text-sm text-slate-500 font-medium uppercase">Total a Pagar</p>
                        {(surchargeAmount > 0 || discountAmount > 0) && (
                            <div className="mb-1 flex flex-col items-center text-xs text-slate-500 gap-0.5">
                                <span className="line-through opacity-70">${total.toLocaleString('es-AR')}</span>
                                {surchargeAmount > 0 && <span className="text-amber-600 font-semibold">Recargo: +${surchargeAmount.toLocaleString('es-AR')}</span>}
                                {discountAmount > 0 && <span className="text-emerald-600 font-semibold">Descuento: -${discountAmount.toLocaleString('es-AR')}</span>}
                            </div>
                        )}
                        <p className={`text-4xl font-black ${theme.text}`}>
                            $ {finalTotal.toLocaleString('es-AR')}
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {paymentMethods.map(method => (
                            <button
                                key={method.id}
                                onClick={() => onSelectMethod(method.id)}
                                className={`py-3 px-4 rounded-xl font-semibold text-sm border-2 transition-all relative overflow-hidden ${selectedMethod === method.id
                                    ? `border-current ${theme.text} bg-slate-50`
                                    : 'border-slate-100 bg-white text-slate-600 hover:border-slate-300'
                                    }`}
                            >
                                <span className="relative z-10">{method.name}</span>
                                {method.surchargePercent > 0 && (
                                    <span className="block text-[10px] text-amber-600 font-bold mt-0.5 relative z-10">
                                        +{method.surchargePercent}% Recargo
                                    </span>
                                )}
                                {method.discountPercent > 0 && (
                                    <span className="block text-[10px] text-emerald-600 font-bold mt-0.5 relative z-10">
                                        -{method.discountPercent}% Desc.
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                    {selectedPayment?.code === 'EFECTIVO' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Monto Recibido
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                                <input
                                    ref={amountInputRef}
                                    type="number"
                                    className={`w-full pl-8 pr-4 py-4 text-2xl font-bold border-2 rounded-xl focus:outline-none ${theme.text} focus:border-current`}
                                    value={amountTendered}
                                    onChange={(e) => onAmountChange(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && onConfirm(finalTotal)}
                                />
                            </div>
                            {change >= 0 && tendered > 0 && (
                                <div className="mt-3 flex justify-between items-center p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                                    <span className="text-emerald-700 font-medium">Vuelto:</span>
                                    <span className="text-xl font-bold text-emerald-700">
                                        $ {change.toLocaleString('es-AR')}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <div className="p-5 border-t bg-slate-50">
                    <button
                        onClick={() => onConfirm(finalTotal)}
                        disabled={processing || (selectedPayment?.code === 'EFECTIVO' && tendered < finalTotal)}
                        className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg ${theme.bg} ${theme.hover} active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50`}
                    >
                        {processing ? (
                            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full spinner" />
                        ) : (
                            <>
                                <CheckCircle size={24} />
                                CONFIRMAR VENTA
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export const QuickAccessGrid = ({
    products,
    onAdd,
    theme
}: {
    products: Product[];
    onAdd: (p: Product) => void;
    theme: typeof themeColors['indigo']
}) => {
    const favorites = products.filter(p => p.isFavorite);
    const featured = products.filter(p => p.isFeatured && !p.isFavorite);

    if (favorites.length === 0 && featured.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center animate-fade-in">
                <div className="bg-slate-100 p-4 rounded-full mb-4">
                    <LayoutGrid size={48} className="text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-600 mb-2">Panel de Accesos Rápidos</h3>
                <p className="max-w-xs mx-auto text-sm">
                    Aquí aparecerán tus productos favoritos y ofertas.
                    <br /><br />
                    Usa el buscador para encontrar productos y marca la <Star size={12} className="inline text-amber-500 fill-amber-500" /> para añadirlos aquí.
                </p>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-8 animate-fade-in">
            {favorites.length > 0 && (
                <div>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Star size={16} className="text-amber-400 fill-amber-400" />
                        Favoritos
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {favorites.map(product => (
                            <button
                                key={product.id}
                                onClick={() => onAdd(product)}
                                className="relative group flex flex-col items-start p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md hover:border-indigo-300 transition-all active:scale-95 text-left h-32 justify-between"
                            >
                                <div className="w-full">
                                    <h4 className="font-semibold text-slate-800 line-clamp-2 leading-tight mb-1">
                                        {product.name}
                                    </h4>
                                    <p className="text-xs text-slate-400 font-mono">
                                        {product.sku}
                                    </p>
                                </div>
                                <div className="w-full flex justify-between items-end">
                                    <span className={`text-lg font-bold ${theme.text}`}>
                                        ${product.salePrice.toLocaleString('es-AR')}
                                    </span>
                                    <div className={`p-1.5 rounded-full ${theme.bg} text-white opacity-0 group-hover:opacity-100 transition-opacity`}>
                                        <Plus size={16} />
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
            {featured.length > 0 && (
                <div>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Tag size={16} className="text-indigo-500" />
                        Ofertas Destacadas
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {featured.map(product => (
                            <button
                                key={product.id}
                                onClick={() => onAdd(product)}
                                className="relative group flex flex-col p-0 bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 rounded-xl shadow-sm hover:shadow-md hover:border-indigo-300 transition-all active:scale-95 text-left overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg z-10">
                                    OFERTA
                                </div>
                                <div className="p-4 h-32 flex flex-col justify-between w-full">
                                    <div>
                                        <h4 className="font-semibold text-indigo-900 line-clamp-2 leading-tight mb-1">
                                            {product.name}
                                        </h4>
                                    </div>
                                    <span className="text-lg font-bold text-indigo-700">
                                        ${product.salePrice.toLocaleString('es-AR')}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
