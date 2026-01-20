/**
 * VARO POS - Página de Productos con Paginación y Búsqueda Server-Side
 */

import { useState, useEffect } from 'react';
import {
    Search, Plus, Edit, Package,
    AlertTriangle, Tag, ChevronLeft, ChevronRight, Sparkles, Star
} from 'lucide-react';
import { productService } from '@/services';
import { useConfigStore, themeColors } from '@/stores/configStore';
import { ProductModal } from '@/components/modals/EditModals';
import type { Product, Category } from '@/types';

export const ProductsPage = () => {
    const { themeColor } = useConfigStore();
    const theme = themeColors[themeColor];

    // Data states
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);

    // Pagination & Filters
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const limit = 50;

    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [showLowStock, setShowLowStock] = useState(false);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    // Stats state
    const [stats, setStats] = useState({
        total: 0,
        low: 0,
        critical: 0
    });

    // 1. Initial Load (Categories & Stats)
    useEffect(() => {
        loadInitialData();
    }, []);

    // 2. Debounce Search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setPage(1); // Reset page on search
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // 3. Reset page on filter change
    useEffect(() => {
        setPage(1);
    }, [selectedCategory, showLowStock]);

    // 4. Load Products when params change
    useEffect(() => {
        loadProducts();
    }, [page, debouncedSearch, selectedCategory, showLowStock]);

    const loadInitialData = async () => {
        // 1. Cargar Categorías
        try {
            const cats = await productService.getCategories();
            setCategories(cats);
        } catch (error) {
            console.error('Error loading categories:', error);
        }

        // 2. Cargar Alertas de Stock (No bloqueante)
        try {
            const alerts = await productService.getStockAlerts();
            setStats(prev => ({
                ...prev,
                // Si stats.total es 0, intentar preservarlo o esperar a loadProducts
                low: alerts.summary?.lowCount || 0,
                critical: alerts.summary?.criticalCount || 0
            }));
        } catch (error) {
            console.warn('Error loading stock alerts (ignorable):', error);
        }
    };

    const loadProducts = async () => {
        setLoading(true);
        try {
            const res = await productService.getAll({
                page,
                limit,
                search: debouncedSearch,
                categoryId: selectedCategory || undefined,
                lowStock: showLowStock || undefined
            });

            setProducts(res.data);
            setTotalPages(res.pagination.totalPages);
            setTotalItems(res.pagination.total);

            // Actualizar total stats
            setStats(prev => ({ ...prev, total: res.pagination.total }));

        } catch (error) {
            console.error('Error loading products:', error);
        } finally {
            setLoading(false);
        }
    };

    // Recargar categories helper
    const loadCategories = async () => {
        try {
            const cats = await productService.getCategories();
            setCategories(cats);
        } catch (e) { console.error(e); }
    };

    const handleOpenNew = () => {
        setEditingProduct(null);
        setShowModal(true);
    };

    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        setShowModal(true);
    };

    const handleSave = async (data: Partial<Product>) => {
        try {
            if (editingProduct) {
                await productService.update(editingProduct.id, data);
            } else {
                await productService.create(data);
            }
            loadProducts(); // Reload current page
            setShowModal(false);
        } catch (error: any) {
            alert(error.response?.data?.error || 'Error al guardar');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este producto?')) return;
        try {
            await productService.delete(id);
            loadProducts();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Error al eliminar');
        }
    };

    const handleNormalize = async () => {
        if (!confirm('Esta acción fusionará categorías duplicadas (ej: "Bebidas" y "bebidas") y corregirá mayúsculas/minúsculas.\n¿Desea continuar?')) return;
        try {
            const res = await productService.normalizeCategories();
            alert(`Optimización completada:\n• Categorías fusionadas: ${res.merged}\n• Renombradas: ${res.renamed}`);
            loadCategories();
            loadProducts();
        } catch (error) {
            console.error(error);
            alert('Error al optimizar categorías');
        }
    };

    const handleToggleFavorite = async (product: Product) => {
        try {
            const newValue = !product.isFavorite;
            // Optimistic update
            setProducts(prev => prev.map(p => p.id === product.id ? { ...p, isFavorite: newValue } : p));

            await productService.update(product.id, { isFavorite: newValue });
        } catch (error) {
            console.error('Error toggling favorite', error);
            // Revert
            setProducts(prev => prev.map(p => p.id === product.id ? { ...p, isFavorite: !product.isFavorite } : p));
            alert('No se pudo actualizar favorito');
        }
    };

    return (
        <div className="h-full flex flex-col bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 p-4 lg:p-6 shrink-0">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <Package className="text-slate-400" size={24} />
                            Productos
                        </h1>
                        <p className="text-slate-500 text-sm mt-1">
                            {totalItems} productos registrados
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleNormalize}
                            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-600 font-medium hover:bg-slate-50 transition-colors"
                            title="Optimizar Categorías (Fusionar duplicados)"
                        >
                            <Sparkles size={20} className="text-purple-500" />
                            <span className="hidden xl:inline">Optimizar</span>
                        </button>
                        <button
                            onClick={handleOpenNew}
                            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white font-medium ${theme.bg} ${theme.hover} transition-colors`}
                        >
                            <Plus size={20} />
                            Nuevo Producto
                        </button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
                    <StatCard label="Total" value={stats.total} color="slate" />
                    <StatCard label="Stock Bajo" value={stats.low} color="amber" />
                    <StatCard label="Crítico" value={stats.critical} color="red" />
                    <StatCard label="Página Actual" value={products.length} color="emerald" />
                </div>

                {/* Filters */}
                <div className="flex flex-col lg:flex-row gap-3 mt-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, código o SKU..."
                            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        className="px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-700"
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                        <option value="">Todas las categorías</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                    <button
                        onClick={() => setShowLowStock(!showLowStock)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-colors ${showLowStock
                            ? 'bg-amber-50 border-amber-200 text-amber-700'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        <AlertTriangle size={18} />
                        Stock bajo
                    </button>
                </div>
            </div>

            {/* Product Grid */}
            <div className="flex-1 overflow-y-auto p-4 lg:p-6">
                {loading ? (
                    <div className="flex items-center justify-center h-40">
                        <div className={`w-10 h-10 border-4 ${theme.text} border-t-transparent rounded-full spinner`} />
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-6">
                            {products.map(product => (
                                <ProductCard
                                    key={product.id}
                                    product={product}
                                    theme={theme}
                                    onEdit={handleEdit}
                                    onToggleFav={handleToggleFavorite}
                                />
                            ))}
                        </div>

                        {products.length === 0 && (
                            <div className="text-center py-20 text-slate-400">
                                <Package size={48} className="mx-auto mb-3 opacity-50" />
                                <p>No se encontraron productos</p>
                            </div>
                        )}

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="flex justify-center items-center gap-4 py-6 border-t border-slate-200 mt-4">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="p-2 rounded-lg border border-slate-200 disabled:opacity-50 hover:bg-slate-50"
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                <span className="text-slate-600 font-medium">
                                    Página {page} de {totalPages}
                                </span>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="p-2 rounded-lg border border-slate-200 disabled:opacity-50 hover:bg-slate-50"
                                >
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <ProductModal
                    product={editingProduct}
                    categories={categories}
                    onClose={() => setShowModal(false)}
                    onSave={handleSave}
                    onDelete={editingProduct ? handleDelete : undefined}
                    theme={theme}
                />
            )}
        </div>
    );
};

const StatCard = ({ label, value, color }: { label: string; value: number; color: string }) => {
    const colorClasses: Record<string, string> = {
        slate: 'bg-slate-100 text-slate-700',
        emerald: 'bg-emerald-100 text-emerald-700',
        amber: 'bg-amber-100 text-amber-700',
        red: 'bg-red-100 text-red-700',
    };

    return (
        <div className={`p-4 rounded-xl ${colorClasses[color]}`}>
            <p className="text-xs font-medium uppercase opacity-70">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
        </div>
    );
};

const ProductCard = ({
    product,
    theme,
    onEdit,
    onToggleFav
}: {
    product: Product;
    theme: typeof themeColors['indigo'];
    onEdit: (p: Product) => void;
    onToggleFav: (p: Product) => void;
}) => {
    const stockColors = {
        ok: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        low: 'bg-amber-100 text-amber-700 border-amber-200',
        critical: 'bg-red-100 text-red-700 border-red-200',
        out: 'bg-red-100 text-red-700 border-red-200',
    };

    return (
        <div className={`bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow ${product.promotions && product.promotions.length > 0
                ? 'border-purple-300 bg-purple-50/30'
                : product.isFeatured
                    ? 'border-amber-300 bg-gradient-to-br from-white to-amber-50'
                    : 'border-slate-200'
            }`}>
            <div className="flex justify-between items-start mb-3">
                <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-2 mb-1">
                        {product.isFeatured && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold">
                                <Tag size={10} />
                                OFERTA
                            </span>
                        )}
                        {product.promotions && product.promotions.length > 0 && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 text-[10px] font-bold border border-purple-200">
                                <Tag size={10} className="fill-purple-500" />
                                {product.promotions[0].promotion.name}
                            </span>
                        )}
                        {product.isFavorite && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] font-bold">
                                <Star size={10} className="fill-current" />
                                FAVORITO
                            </span>
                        )}
                    </div>
                    <h3 className="font-semibold text-slate-800 truncate">{product.name}</h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                        {product.sku} {product.barcode && `• ${product.barcode}`}
                    </p>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={(e) => { e.stopPropagation(); onToggleFav(product); }}
                        className={`p-1.5 rounded-lg transition-colors ${product.isFavorite
                            ? 'text-amber-400 hover:text-amber-500 hover:bg-amber-50'
                            : 'text-slate-300 hover:text-amber-400 hover:bg-slate-100'}`}
                        title={product.isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
                    >
                        <Star size={18} className={product.isFavorite ? "fill-current" : ""} />
                    </button>
                    <button
                        onClick={() => onEdit(product)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                        title="Editar producto"
                    >
                        <Edit size={18} />
                    </button>
                </div>
            </div>

            <div className="flex items-center justify-between mb-4">
                <div>
                    <p className="text-2xl font-bold text-slate-900">
                        $ {product.salePrice.toLocaleString('es-AR')}
                    </p>
                    <p className="text-xs text-slate-400">
                        Costo: $ {product.costPrice.toLocaleString('es-AR')}
                    </p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${stockColors[product.stockStatus]}`}>
                    Stock: {product.stockGlobal}
                </span>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                    {product.category?.name || 'Sin Categoría'}
                </span>
                <button
                    onClick={() => onEdit(product)}
                    className={`text-sm font-medium ${theme.text} hover:underline`}
                >
                    Editar
                </button>
            </div>
        </div>
    );
};

export default ProductsPage;
