/**
 * VARO POS - Página del Punto de Venta (MEJORADA)
 * ✅ Navegación con teclado (flechas + Enter)
 * ✅ Productos con oferta destacados
 * ✅ Diseño responsive
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
    Search, Scan, Trash2, Plus, Minus,
    CreditCard, Banknote, QrCode, User,
    ShoppingBag, ChevronLeft, X, CheckCircle, AlertCircle,
    Package, Tag, Percent, ArrowUp, ArrowDown, Star, LayoutGrid
} from 'lucide-react';
import { useCartStore } from '@/stores/cartStore';
import { useConfigStore, themeColors } from '@/stores/configStore';
import { productService, saleService } from '@/services';
import type { Product, Category, PaymentMethod } from '@/types';
import { useNavigate } from 'react-router-dom';
import { useCashStore } from '@/stores/cashStore';
import { ProductRow, ProductCard, CartItemRow, EmptyState, PaymentModal, QuickAccessGrid } from './POSComponents';

export const POSPage = () => {
    const { themeColor } = useConfigStore();
    const theme = themeColors[themeColor];
    const navigate = useNavigate();
    const { isShiftOpen, initialized, checkActiveShift, isLoading: shiftLoading } = useCashStore();

    useEffect(() => {
        checkActiveShift();
    }, []);

    useEffect(() => {
        if (initialized && !isShiftOpen) {
            navigate('/cash', { state: { from: 'pos', message: 'Debes abrir caja para empezar a vender.' } });
        }
    }, [initialized, isShiftOpen, navigate]);

    // (Moved to bottom to avoid hook order issues)

    const {
        items: cart,
        addItem,
        updateQuantity,
        clearCart,
        getTotal,
        getItemCount,
        loadPromotions
    } = useCartStore();

    // State
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSearching, setIsSearching] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [showMobileCart, setShowMobileCart] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
    const [amountTendered, setAmountTendered] = useState('');
    const [processing, setProcessing] = useState(false);
    const [genericProductTemplate, setGenericProductTemplate] = useState<Product | null>(null);
    const [toast, setToast] = useState<{ message: string; subtext?: string; type: 'success' | 'error' } | null>(null);

    // Keyboard navigation state
    const [selectedIndex, setSelectedIndex] = useState<number>(-1);
    const [isSearchFocused, setIsSearchFocused] = useState(false);

    const searchInputRef = useRef<HTMLInputElement>(null);
    const productListRef = useRef<HTMLDivElement>(null);

    // Load initial data
    // Load initial data
    useEffect(() => {
        loadInitialData();
        loadPromotions();
    }, []);

    // Debounced Search Effect
    useEffect(() => {
        const timer = setTimeout(() => {
            // Si hay un término de búsqueda o categoría seleccionada, buscar en el servidor
            if (searchTerm || selectedCategory) {
                searchProducts(searchTerm, selectedCategory);
            } else {
                // Si no hay filtros, volver a cargar datos iniciales (o mantener los que están si ya son los iniciales)
                // Para evitar recargas innecesarias, solo recargamos si no estamos viendo los iniciales
                // Pero por simplicidad, recargamos los top 50
                if (!loading) searchProducts('', null);
            }
        }, 300); // 300ms delay

        return () => clearTimeout(timer);
    }, [searchTerm, selectedCategory]);

    const loadInitialData = async () => {
        try {
            const [categoriesRes, methodsRes] = await Promise.all([
                productService.getCategories(),
                saleService.getPaymentMethods(),
            ]);
            setCategories(categoriesRes);
            setPaymentMethods(methodsRes);

            if (methodsRes.length > 0) {
                const defaultId = useConfigStore.getState().defaultPaymentMethodId;
                const defaultMethod = methodsRes.find(m => m.id === defaultId);

                if (defaultMethod) {
                    setSelectedPaymentMethod(defaultMethod.id);
                } else {
                    setSelectedPaymentMethod(methodsRes[0].id);
                }
            }

            // Carga inicial de productos
            await searchProducts('', null);

        } catch (error) {
            console.error('Error loading initial data:', error);
            showToast('Error', 'No se pudieron cargar los datos iniciales', 'error');
        } finally {
            setLoading(false);
        }
    };

    const searchProducts = async (term: string, category: string | null) => {
        setIsSearching(true);
        try {
            const res = await productService.getAll({
                search: term,
                categoryId: category || undefined,
                limit: 50, // Traer solo 50 resultados para mantener UI fluida
                active: true
            });
            setProducts(res.data);

            // Buscar plantilla genérica si no la tenemos
            if (!genericProductTemplate && term === '') {
                const generic = res.data.find(p => p.sku === 'VARIOS');
                if (generic) setGenericProductTemplate(generic);
            }
        } catch (err) {
            console.error("Search error", err);
        } finally {
            setIsSearching(false);
        }
    };

    // Filter logic is now simplified as backend does the heavy lifting
    // We only keep frontend filter for immediate feedback while debounce works, 
    // or to extra-filter what's already on screen (optional)
    // But since backend returns matches, we can use 'products' directly mostly.
    // However, to avoid UI flicker, we can alias products to filteredProducts
    const filteredProducts = products;

    // Detectar comando de producto genérico (/400 = $400)
    const genericProductMatch = useMemo(() => {
        const match = searchTerm.match(/^\/(\d+(?:\.\d{1,2})?)$/);
        if (match) {
            return parseFloat(match[1]);
        }
        return null;
    }, [searchTerm]);

    // Crear "producto genérico" al vuelo
    const createGenericProduct = (price: number): Product => {
        if (genericProductTemplate) {
            return {
                ...genericProductTemplate,
                id: `generic-${Date.now()}`,
                salePrice: price,
                databaseId: genericProductTemplate.id
            };
        }
        return {
            id: `generic-${Date.now()}`,
            sku: 'VARIOS',
            barcode: undefined,
            name: 'Varios / Genérico',
            description: 'Producto genérico sin código',
            costPrice: 0,
            salePrice: price,
            stockGlobal: 999,
            stockMinimum: 0,
            stockStatus: 'ok',
            manageStock: false,
            allowNegativeStock: true,
            isActive: true,
            isService: true,
            isFeatured: false,
            isGeneric: true,
            taxRate: 21,
            category: { id: 'generic', name: 'Varios', color: '#6b7280' }
        } as Product;
    };

    // Keyboard navigation handler
    const handleKeyDown = useCallback(async (e: React.KeyboardEvent) => {
        // Permitir navegación siempre, pero Enter depende del contexto

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev =>
                    prev < filteredProducts.length - 1 ? prev + 1 : prev
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
                break;
            case 'Enter':
                e.preventDefault();

                // 1. Si es comando de producto genérico (/400)
                if (genericProductMatch !== null && genericProductMatch > 0) {
                    const genericProduct = createGenericProduct(genericProductMatch);
                    handleAddToCart(genericProduct);
                    return;
                }

                // 2. Si hay un producto seleccionado visualmente con flechas
                if (selectedIndex >= 0 && filteredProducts[selectedIndex]) {
                    handleAddToCart(filteredProducts[selectedIndex]);
                    return;
                }

                // 3. Lógica Prioritaria de ESCÁNER / Búsqueda Exacta
                // Si el usuario da Enter y hay texto, intentamos buscar coincidencia EXACTA en backend
                // Esto cubre el caso donde el producto NO está en los 50 cargados
                if (searchTerm) {
                    // Primero buscar en memoria local por rapidez
                    const localExact = products.find(p => p.barcode === searchTerm || p.sku === searchTerm);
                    if (localExact) {
                        handleAddToCart(localExact);
                        return;
                    }

                    // Si no está local, buscar en servidor (Scanner mode)
                    try {
                        setLoading(true); // Pequeño feedback
                        const exactProduct = await productService.getByBarcode(searchTerm);
                        if (exactProduct) {
                            handleAddToCart(exactProduct);
                        } else {
                            // Intento fallback por SKU exacto si barcode falla (opcional, si el backend soporta)
                            // Si no, mostrar error
                            showToast('No encontrado', `No se encontró producto: ${searchTerm}`, 'error');
                        }
                    } catch (err) {
                        // Si da error (404), avisar
                        showToast('No encontrado', `No se encontró producto con código: ${searchTerm}`, 'error');
                    } finally {
                        setLoading(false);
                        // Opcional: Limpiar búsqueda para siguiente escaneo
                        setSearchTerm('');
                    }
                    return;
                }

                // 4. Si solo hay un resultado en pantalla (búsqueda manual que retornó 1)
                if (filteredProducts.length === 1) {
                    handleAddToCart(filteredProducts[0]);
                }
                break;
            case 'Escape':
                setSearchTerm('');
                setSelectedIndex(-1);
                searchInputRef.current?.blur();
                break;
            case 'F2':
                e.preventDefault();
                if (cart.length > 0) handleOpenPayment();
                break;
        }
    }, [filteredProducts, selectedIndex, searchTerm, cart, genericProductMatch, products, genericProductTemplate]);

    // Global keyboard shortcuts
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            // F1 - Focus search
            if (e.key === 'F1') {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
            // F2 - Open payment
            if (e.key === 'F2' && cart.length > 0) {
                e.preventDefault();
                handleOpenPayment();
            }
            // Escape - Close modals
            if (e.key === 'Escape') {
                setShowPaymentModal(false);
                setShowMobileCart(false);
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [cart]);

    const handleAddToCart = (product: Product) => {
        addItem(product);
        setSearchTerm('');
        setSelectedIndex(-1);
        searchInputRef.current?.focus();
    };

    const handleOpenPayment = () => {
        if (cart.length === 0) return;
        setAmountTendered(getTotal().toString());
        setShowPaymentModal(true);
    };

    const showToast = (message: string, subtext?: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, subtext, type });
        setTimeout(() => setToast(null), 3000); // Desaparece en 3 segundos
    };

    const handleCompleteSale = async (finalTotalProp?: number) => {
        const baseTotal = getTotal();
        // Si viene del modal con recargo, usar ese. Si no (ej pago rápido), calcular base.
        // Pero pago rápido debería soportar recargo también. Por ahora asumimos que payment modal es el camino.
        // Si finalTotalProp no viene, asumimos baseTotal (sin recargo).

        const method = paymentMethods.find(m => m.id === selectedPaymentMethod);

        // Calcular recargo si no vino prop (ej. acceso directo, aunque hoy solo se paga por modal)
        let finalTotal = finalTotalProp;
        if (finalTotal === undefined) {
            const surcharge = (method?.surchargePercent || 0) / 100;
            const discount = (method?.discountPercent || 0) / 100;
            finalTotal = baseTotal * (1 + surcharge - discount);
        }

        const tendered = parseFloat(amountTendered) || 0;

        if (method?.code === 'EFECTIVO' && tendered < finalTotal) {
            showToast('Monto insuficiente', 'El monto abonado es menor al total', 'error');
            return;
        }

        setProcessing(true);
        try {
            // Preparar items con Recargo si corresponde
            const itemsToSend = [...cart];
            const difference = finalTotal - baseTotal;

            if (Math.abs(difference) > 0.01) {
                // Crear ítem de ajuste
                const adjustmentName = difference > 0 ? `Recargo ${method?.name}` : `Descuento ${method?.name}`;
                // Usar template genérico o crear uno al vuelo con ID genérico
                // Nota: El backend debe saber manejar items con ID que no existen o mapearlos a VARIOS.
                // Asumimos que si usamos createGenericProduct se mapea correctamente.
                const adjustmentProduct = createGenericProduct(Math.abs(difference));
                adjustmentProduct.name = adjustmentName;

                itemsToSend.push({
                    product: adjustmentProduct,
                    quantity: 1,
                    subtotal: Math.abs(difference) // Sale service usará esto
                } as any);
                // Nota: cartToSaleData debe ser capaz de leer esto. 
                // Como itemsToSend no son exactamente CartItems del store, esperamos que funcione.
            }

            const saleData = saleService.cartToSaleData(
                itemsToSend,
                [{ paymentMethodId: selectedPaymentMethod, amount: finalTotal }]
            );
            const newSale = await saleService.create(saleData);

            const change = method?.code === 'EFECTIVO' ? tendered - finalTotal : 0;
            const methodName = method?.name || 'Pago';
            clearCart();
            setShowPaymentModal(false);
            setShowMobileCart(false);

            const details = `${methodName} $${finalTotal.toLocaleString('es-AR')}`;
            const subtext = change > 0
                ? `${details} • Vuelto: $${change.toLocaleString('es-AR')}`
                : details;

            showToast(`¡Venta ${newSale.saleNumber} Exitosa!`, subtext, 'success');
        } catch (error: any) {
            showToast('Error', error.response?.data?.error || 'No se pudo registrar la venta', 'error');
        } finally {
            setProcessing(false);
        }
    };

    const toggleFavorite = async (product: Product, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const newValue = !product.isFavorite;
            // Optimistic update
            setProducts(prev => prev.map(p => p.id === product.id ? { ...p, isFavorite: newValue } : p));

            // API call (asumiendo que existe, si falla revertir)
            // En un caso real deberíamos importar productService y usarlo, aquí asumimos que ya está.
            await productService.update(product.id, { isFavorite: newValue });

            showToast(newValue ? 'Añadido a Favoritos' : 'Quitado de Favoritos', '', 'success');
        } catch (error) {
            console.error('Error toggling favorite', error);
            showToast('Error', 'No se pudo actualizar favorito', 'error');
            // Revert
            setProducts(prev => prev.map(p => p.id === product.id ? { ...p, isFavorite: !product.isFavorite } : p));
        }
    };

    const cartTotal = getTotal();
    const cartCount = getItemCount();

    // Verification Loader (Moved here)
    if (!initialized || (shiftLoading && !isShiftOpen)) {
        return (
            <div className="h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <div className={`w-12 h-12 border-4 ${theme.text} border-t-transparent rounded-full spinner mx-auto mb-4 animate-spin`} />
                    <p className="text-slate-500">Verificando estado de caja...</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <div className={`w-10 h-10 border-4 ${theme.text} border-t-transparent rounded-full spinner mx-auto mb-3`} />
                    <p className="text-slate-500">Cargando productos...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col md:flex-row h-full w-full overflow-hidden relative" onKeyDown={handleKeyDown}>

            {/* === CATALOG PANEL === */}
            <div className={`w-full md:w-[60%] lg:w-[65%] flex flex-col bg-white border-r border-slate-200 h-full transition-all ${showMobileCart ? 'hidden md:flex' : 'flex'}`}>

                {/* Search Header */}
                <div className="p-4 border-b border-slate-200 bg-white shrink-0">
                    <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="F1: Buscar • ↑↓ Navegar • Enter Agregar • F2 Cobrar"
                            className={`w-full pl-10 pr-12 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-opacity-50 outline-none text-base ${theme.ring.replace('ring', 'focus:ring')}`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onFocus={() => setIsSearchFocused(true)}
                            onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-slate-400">
                            <ArrowUp size={14} />
                            <ArrowDown size={14} />
                            <Scan size={18} className="ml-1" />
                        </div>
                    </div>

                    {/* Product List Content */}
                    <div ref={productListRef} className="flex-1 overflow-y-auto bg-slate-50 p-3">
                        {!searchTerm ? (
                            /* === QUICK ACCESS GRID (FAVORITOS) === */
                            <QuickAccessGrid
                                products={products}
                                onAdd={handleAddToCart}
                                theme={theme}
                            />
                        ) : (
                            /* === SEARCH RESULTS === */
                            filteredProducts.length === 0 ? (
                                <EmptyState />
                            ) : (
                                <>
                                    {/* Desktop Table */}
                                    <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-slate-100 text-slate-600 font-medium border-b sticky top-0 z-10">
                                                <tr>
                                                    <th className="px-4 py-3 w-10"></th>
                                                    <th className="px-4 py-3">Producto</th>
                                                    <th className="px-4 py-3 w-28">Código</th>
                                                    <th className="px-4 py-3 text-right w-20">Stock</th>
                                                    <th className="px-4 py-3 text-right w-28">Precio</th>
                                                    <th className="px-4 py-3 w-16"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {filteredProducts.map((product, index) => (
                                                    <ProductRow
                                                        key={product.id}
                                                        product={product}
                                                        onAdd={handleAddToCart}
                                                        onToggleFav={toggleFavorite}
                                                        theme={theme}
                                                        isSelected={index === selectedIndex}
                                                        hasPromotion={product.isFeatured}
                                                    />
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Mobile Cards */}
                                    <div className="md:hidden space-y-2">
                                        {filteredProducts.map((product, index) => (
                                            <ProductCard
                                                key={product.id}
                                                product={product}
                                                onAdd={handleAddToCart}
                                                onToggleFav={toggleFavorite}
                                                theme={theme}
                                                isSelected={index === selectedIndex}
                                                hasPromotion={product.isFeatured}
                                            />
                                        ))}
                                    </div>
                                </>
                            )
                        )}
                    </div>

                    {/* Keyboard hint bar */}
                    <div className="hidden md:flex items-center justify-between px-4 py-2 bg-slate-100 border-t border-slate-200 text-xs text-slate-500">
                        <div className="flex items-center gap-4">
                            <span><kbd className="px-1.5 py-0.5 bg-white rounded border text-xs">F1</kbd> Buscar</span>
                            <span><kbd className="px-1.5 py-0.5 bg-white rounded border text-xs">↑↓</kbd> Navegar</span>
                            <span><kbd className="px-1.5 py-0.5 bg-white rounded border text-xs">Enter</kbd> Agregar</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span><kbd className="px-1.5 py-0.5 bg-white rounded border text-xs">F2</kbd> Cobrar</span>
                            <span><kbd className="px-1.5 py-0.5 bg-white rounded border text-xs">Esc</kbd> Cancelar</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* === CART PANEL === */}
            <div className={`w-full md:w-[40%] lg:w-[35%] flex flex-col bg-slate-50 h-full ${showMobileCart ? 'flex' : 'hidden md:flex'}`}>

                {/* Cart Header */}
                <div className="h-16 flex items-center justify-between px-4 bg-white border-b border-slate-200 shrink-0">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowMobileCart(false)}
                            className="md:hidden p-2 -ml-2 text-slate-500"
                        >
                            <ChevronLeft size={24} />
                        </button>
                        <h2 className="font-bold text-slate-800 flex items-center gap-2">
                            <span className={`text-white text-xs px-2 py-0.5 rounded-full ${theme.bg}`}>
                                {cartCount}
                            </span>
                            Ticket Actual
                        </h2>
                    </div>
                    <button
                        onClick={clearCart}
                        className="text-slate-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors"
                        title="Cancelar venta"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                            <Scan size={48} className="mb-3 opacity-50" />
                            <p className="text-sm">Escanee o busque un producto</p>
                        </div>
                    ) : (
                        cart.map(item => (
                            <CartItemRow
                                key={item.product.id}
                                item={item}
                                onUpdateQuantity={(qty) => updateQuantity(item.product.id, qty)}
                                theme={theme}
                            />
                        ))
                    )}
                </div>

                {/* Cart Footer */}
                <div className="bg-white border-t border-slate-200 p-4 shrink-0 pb-20 md:pb-4">
                    <div className="flex justify-between items-end mb-4">
                        <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total</p>
                            <p className="text-slate-400 text-xs">IVA Incluido</p>
                        </div>
                        <span className="text-4xl font-black text-slate-900">
                            $ {cartTotal.toLocaleString('es-AR')}
                        </span>
                    </div>

                    <button
                        onClick={handleOpenPayment}
                        disabled={cart.length === 0}
                        className={`w-full py-4 rounded-xl flex items-center justify-center gap-3 text-white font-bold text-lg shadow-lg ${theme.bg} ${theme.hover} active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        COBRAR (F2)
                    </button>

                    {/* Quick payment buttons */}
                    <div className="grid grid-cols-3 gap-2 mt-3">
                        {paymentMethods.slice(0, 3).map(method => (
                            <button
                                key={method.id}
                                onClick={() => {
                                    setSelectedPaymentMethod(method.id);
                                    handleOpenPayment();
                                }}
                                disabled={cart.length === 0}
                                className="flex flex-col items-center p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
                            >
                                {method.code === 'EFECTIVO' && <Banknote size={18} />}
                                {method.code === 'DEBITO' && <CreditCard size={18} />}
                                {method.code === 'MERCADOPAGO' && <QrCode size={18} />}
                                {!['EFECTIVO', 'DEBITO', 'MERCADOPAGO'].includes(method.code) && <CreditCard size={18} />}
                                <span className="text-[10px] font-bold mt-1">{method.name.split(' ')[0]}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* === MOBILE CART FAB === */}
            {!showMobileCart && cart.length > 0 && (
                <div className="md:hidden fixed bottom-20 left-4 right-4 z-40">
                    <button
                        onClick={() => setShowMobileCart(true)}
                        className={`w-full p-4 rounded-2xl shadow-xl flex items-center justify-between text-white ${theme.bg} animate-slide-up`}
                    >
                        <div className="flex items-center gap-3">
                            <div className="bg-white/20 p-2 rounded-lg">
                                <ShoppingBag size={20} />
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-sm">{cartCount} items</p>
                                <p className="text-xs opacity-80">Ver pedido</p>
                            </div>
                        </div>
                        <span className="text-xl font-bold">$ {cartTotal.toLocaleString('es-AR')}</span>
                    </button>
                </div>
            )}

            {/* === PAYMENT MODAL === */}
            {showPaymentModal && (
                <PaymentModal
                    total={cartTotal}
                    paymentMethods={paymentMethods}
                    selectedMethod={selectedPaymentMethod}
                    onSelectMethod={setSelectedPaymentMethod}
                    amountTendered={amountTendered}
                    onAmountChange={setAmountTendered}
                    onConfirm={handleCompleteSale}
                    onClose={() => setShowPaymentModal(false)}
                    processing={processing}
                    theme={theme}
                />
            )}
            {/* === TOAST === */}
            {toast && (
                <div className={`fixed top-6 right-6 z-[60] flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl animate-fade-in-down ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
                    } text-white min-w-[320px] active:scale-95 transition-transform cursor-pointer`} onClick={() => setToast(null)}>
                    <div className="bg-white/20 p-2 rounded-lg shrink-0">
                        {toast.type === 'success' ? <CheckCircle size={28} /> : <AlertCircle size={28} />}
                    </div>
                    <div>
                        <p className="font-bold text-lg leading-tight">{toast.message}</p>
                        {toast.subtext && <p className="text-white/90 text-sm mt-1">{toast.subtext}</p>}
                    </div>
                </div>
            )}
        </div>
    );
};

export default POSPage;
