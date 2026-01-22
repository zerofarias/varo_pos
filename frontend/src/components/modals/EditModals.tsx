/**
 * VARO POS - Modales de Edición
 * ProductModal y CustomerModal reutilizables
 */

import { useState, useEffect } from 'react';
import { X, Save, Loader2, Package, User, Trash2, CreditCard } from 'lucide-react';
import type { Product, Customer, Category } from '@/types';
import { themeColors } from '@/stores/configStore';

type ThemeType = typeof themeColors['indigo'];

// ========================================
// PRODUCT MODAL
// ========================================

interface ProductModalProps {
    product?: Product | null;
    categories: Category[];
    onClose: () => void;
    onSave: (data: Partial<Product>) => Promise<void>;
    onDelete?: (id: string) => Promise<void>;
    theme: ThemeType;
}

export const ProductModal = ({
    product,
    categories,
    onClose,
    onSave,
    onDelete,
    theme
}: ProductModalProps) => {
    const isEditing = !!product;
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const [formData, setFormData] = useState({
        name: product?.name || '',
        sku: product?.sku || '',
        barcode: product?.barcode || '',
        description: product?.description || '',
        costPrice: product?.costPrice?.toString() || '',
        salePrice: product?.salePrice?.toString() || '',
        stockGlobal: product?.stockGlobal?.toString() || '0',
        stockMinimum: product?.stockMinimum?.toString() || '5',
        categoryId: product?.category?.id || '',
        isService: product?.isService || false,
        allowNegativeStock: product?.allowNegativeStock || false,
        isFeatured: product?.isFeatured || false,
        taxRate: product?.taxRate?.toString() || '21',
    });

    const handleChange = (field: string, value: string | boolean) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name || !formData.salePrice || !formData.categoryId) {
            alert('Complete los campos obligatorios');
            return;
        }

        setLoading(true);
        try {
            await onSave({
                ...formData,
                costPrice: parseFloat(formData.costPrice) || 0,
                salePrice: parseFloat(formData.salePrice) || 0,
                stockGlobal: parseInt(formData.stockGlobal) || 0,
                stockMinimum: parseInt(formData.stockMinimum) || 0,
                taxRate: parseFloat(formData.taxRate) || 21,
            });
            onClose();
        } catch (error) {
            console.error('Error saving product:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!product || !onDelete) return;
        if (!confirm('¿Está seguro de eliminar este producto?')) return;

        setDeleting(true);
        try {
            await onDelete(product.id);
            onClose();
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl animate-scale-in my-8">
                {/* Header */}
                <div className="p-5 border-b flex justify-between items-center bg-slate-50 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${theme.bg} text-white`}>
                            <Package size={20} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">
                            {isEditing ? 'Editar Producto' : 'Nuevo Producto'}
                        </h3>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2">
                        <X size={24} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Nombre del Producto *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => handleChange('name', e.target.value)}
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="Ej: Coca Cola 500ml"
                            required
                        />
                    </div>

                    {/* SKU & Barcode */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                SKU / Código
                            </label>
                            <input
                                type="text"
                                value={formData.sku}
                                onChange={(e) => handleChange('sku', e.target.value)}
                                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                                placeholder="BEB-001"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Código de Barras
                            </label>
                            <input
                                type="text"
                                value={formData.barcode}
                                onChange={(e) => handleChange('barcode', e.target.value)}
                                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                                placeholder="7790895000539"
                            />
                        </div>
                    </div>

                    {/* Category */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Categoría *
                        </label>
                        <select
                            value={formData.categoryId}
                            onChange={(e) => handleChange('categoryId', e.target.value)}
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                            required
                        >
                            <option value="">Seleccione una categoría</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Prices */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Precio de Costo
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                                <input
                                    type="number"
                                    value={formData.costPrice}
                                    onChange={(e) => handleChange('costPrice', e.target.value)}
                                    className="w-full pl-8 pr-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="0"
                                    step="0.01"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Precio de Venta *
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                                <input
                                    type="number"
                                    value={formData.salePrice}
                                    onChange={(e) => handleChange('salePrice', e.target.value)}
                                    className="w-full pl-8 pr-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="0"
                                    step="0.01"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Stock */}
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Stock Actual
                            </label>
                            <input
                                type="number"
                                value={formData.stockGlobal}
                                onChange={(e) => handleChange('stockGlobal', e.target.value)}
                                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Stock Mínimo
                            </label>
                            <input
                                type="number"
                                value={formData.stockMinimum}
                                onChange={(e) => handleChange('stockMinimum', e.target.value)}
                                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                IVA %
                            </label>
                            <select
                                value={formData.taxRate}
                                onChange={(e) => handleChange('taxRate', e.target.value)}
                                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="0">0%</option>
                                <option value="10.5">10.5%</option>
                                <option value="21">21%</option>
                                <option value="27">27%</option>
                            </select>
                        </div>
                    </div>

                    {/* Toggles */}
                    <div className="grid grid-cols-3 gap-4">
                        <ToggleOption
                            label="Es Servicio"
                            description="Sin control de stock"
                            checked={formData.isService}
                            onChange={(v) => handleChange('isService', v)}
                        />
                        <ToggleOption
                            label="Stock Negativo"
                            description="Permite vender sin stock"
                            checked={formData.allowNegativeStock}
                            onChange={(v) => handleChange('allowNegativeStock', v)}
                        />
                        <ToggleOption
                            label="Destacado"
                            description="Aparece con oferta"
                            checked={formData.isFeatured}
                            onChange={(v) => handleChange('isFeatured', v)}
                        />
                    </div>
                </form>

                {/* Footer */}
                <div className="p-5 border-t bg-slate-50 flex justify-between rounded-b-2xl">
                    <div>
                        {isEditing && onDelete && (
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={deleting}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-red-600 hover:bg-red-50 font-medium"
                            >
                                <Trash2 size={18} />
                                {deleting ? 'Eliminando...' : 'Eliminar'}
                            </button>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-medium hover:bg-slate-100"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-white font-bold ${theme.bg} ${theme.hover} disabled:opacity-50`}
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            {loading ? 'Guardando...' : 'Guardar'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ========================================
// CUSTOMER MODAL
// ========================================

interface CustomerModalProps {
    customer?: Customer | null;
    onClose: () => void;
    onSave: (data: Partial<Customer>) => Promise<void>;
    onDelete?: (id: string) => Promise<void>;
    theme: ThemeType;
}

export const CustomerModal = ({
    customer,
    onClose,
    onSave,
    onDelete,
    theme
}: CustomerModalProps) => {
    const isEditing = !!customer;
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const [formData, setFormData] = useState({
        firstName: customer?.firstName || '',
        lastName: customer?.lastName || '',
        documentType: customer?.documentType || 'DNI',
        documentNumber: customer?.documentNumber || '',
        email: customer?.email || '',
        phone: customer?.phone || '',
        address: customer?.address || '',
        city: customer?.city || '',
        creditLimit: customer?.creditLimit?.toString() || '0',
        alertOnDebt: customer?.alertOnDebt ?? true,
        blockOnLimit: customer?.blockOnLimit ?? true,
        maxDebtDays: customer?.maxDebtDays?.toString() || '30',
    });

    const handleChange = (field: string, value: string | boolean) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.firstName || !formData.lastName) {
            alert('Ingrese nombre y apellido');
            return;
        }

        setLoading(true);
        try {
            await onSave({
                ...formData,
                creditLimit: parseFloat(formData.creditLimit) || 0,
                maxDebtDays: parseInt(formData.maxDebtDays) || 30,
            });
            onClose();
        } catch (error) {
            console.error('Error saving customer:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!customer || !onDelete) return;
        if (!confirm('¿Está seguro de eliminar este cliente?')) return;

        setDeleting(true);
        try {
            await onDelete(customer.id);
            onClose();
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl animate-scale-in my-8">
                {/* Header */}
                <div className="p-5 border-b flex justify-between items-center bg-slate-50 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${theme.bg} text-white`}>
                            <User size={20} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">
                            {isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}
                        </h3>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2">
                        <X size={24} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                    {/* Name */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Nombre *
                            </label>
                            <input
                                type="text"
                                value={formData.firstName}
                                onChange={(e) => handleChange('firstName', e.target.value)}
                                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Apellido *
                            </label>
                            <input
                                type="text"
                                value={formData.lastName}
                                onChange={(e) => handleChange('lastName', e.target.value)}
                                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                required
                            />
                        </div>
                    </div>

                    {/* Document */}
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Tipo Doc.
                            </label>
                            <select
                                value={formData.documentType}
                                onChange={(e) => handleChange('documentType', e.target.value)}
                                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="DNI">DNI</option>
                                <option value="CUIT">CUIT</option>
                                <option value="CUIL">CUIL</option>
                                <option value="PASAPORTE">Pasaporte</option>
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Número de Documento
                            </label>
                            <input
                                type="text"
                                value={formData.documentNumber}
                                onChange={(e) => handleChange('documentNumber', e.target.value)}
                                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                                placeholder="12345678"
                            />
                        </div>
                    </div>

                    {/* Contact */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Email
                            </label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => handleChange('email', e.target.value)}
                                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="cliente@email.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Teléfono
                            </label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => handleChange('phone', e.target.value)}
                                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="+54 11 1234-5678"
                            />
                        </div>
                    </div>

                    {/* Address */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Dirección
                            </label>
                            <input
                                type="text"
                                value={formData.address}
                                onChange={(e) => handleChange('address', e.target.value)}
                                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Ciudad
                            </label>
                            <input
                                type="text"
                                value={formData.city}
                                onChange={(e) => handleChange('city', e.target.value)}
                                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Credit Settings */}
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <h4 className="font-medium text-slate-800 mb-3">Cuenta Corriente</h4>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Límite de Crédito
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                                    <input
                                        type="number"
                                        value={formData.creditLimit}
                                        onChange={(e) => handleChange('creditLimit', e.target.value)}
                                        className="w-full pl-8 pr-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Días Máx. de Deuda
                                </label>
                                <input
                                    type="number"
                                    value={formData.maxDebtDays}
                                    onChange={(e) => handleChange('maxDebtDays', e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                        </div>
                        <div className="flex gap-6">
                            <ToggleOption
                                label="Alertar si tiene deuda"
                                checked={formData.alertOnDebt}
                                onChange={(v) => handleChange('alertOnDebt', v)}
                            />
                            <ToggleOption
                                label="Bloquear si supera límite"
                                checked={formData.blockOnLimit}
                                onChange={(v) => handleChange('blockOnLimit', v)}
                            />
                        </div>
                    </div>
                </form>

                {/* Footer */}
                <div className="p-5 border-t bg-slate-50 flex justify-between rounded-b-2xl">
                    <div>
                        {isEditing && onDelete && (
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={deleting}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-red-600 hover:bg-red-50 font-medium"
                            >
                                <Trash2 size={18} />
                                {deleting ? 'Eliminando...' : 'Eliminar'}
                            </button>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-medium hover:bg-slate-100"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-white font-bold ${theme.bg} ${theme.hover} disabled:opacity-50`}
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            {loading ? 'Guardando...' : 'Guardar'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ========================================
// TOGGLE OPTION COMPONENT
// ========================================

const ToggleOption = ({
    label,
    description,
    checked,
    onChange
}: {
    label: string;
    description?: string;
    checked: boolean;
    onChange: (v: boolean) => void;
}) => (
    <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-slate-100 transition-colors">
        <button
            type="button"
            onClick={() => onChange(!checked)}
            className={`relative w-10 h-5 rounded-full transition-colors ${checked ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
        >
            <div
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'
                    }`}
            />
        </button>
        <div>
            <span className="text-sm font-medium text-slate-700">{label}</span>
            {description && (
                <p className="text-xs text-slate-500">{description}</p>
            )}
        </div>
    </label>
);

// ========================================
// PAYMENT MODAL
// ========================================

interface PaymentModalProps {
    customer: Customer;
    onClose: () => void;
    onSave: (amount: number, description: string) => Promise<void>;
    theme: ThemeType;
}

export const PaymentModal = ({
    customer,
    onClose,
    onSave,
    theme
}: PaymentModalProps) => {
    const [loading, setLoading] = useState(false);
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');

    const currentBalance = Math.abs(customer.currentBalance);
    const isDebt = customer.currentBalance < 0;
    const payAmount = parseFloat(amount) || 0;

    // Si la deuda es $1000 (currentBalance = -1000) y pago $500, nuevo saldo = -500
    // Si la deuda es $1000 y pago $1200, nuevo saldo = +200 (a favor)
    const newBalance = customer.currentBalance + payAmount;
    const isNewBalanceDebt = newBalance < 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!payAmount || payAmount <= 0) {
            alert('Ingrese un monto válido');
            return;
        }

        setLoading(true);
        try {
            await onSave(payAmount, description);
            onClose();
        } catch (error) {
            console.error('Error saving payment:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl animate-scale-in my-8">
                {/* Header */}
                <div className="p-5 border-b flex justify-between items-center bg-slate-50 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-emerald-600 text-white`}>
                            <CreditCard size={20} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">Registrar Pago</h3>
                            <p className="text-xs text-slate-500">{customer.firstName} {customer.lastName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2">
                        <X size={24} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">

                    {/* Balance Info */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-slate-500">Saldo Actual</span>
                            <span className={`font-bold ${isDebt ? 'text-red-600' : 'text-emerald-600'}`}>
                                $ {Math.abs(customer.currentBalance).toLocaleString('es-AR')} {isDebt ? '(Deuda)' : '(Favor)'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                            <span className="text-sm text-slate-600 font-medium">Nuevo Saldo</span>
                            <span className={`font-bold ${isNewBalanceDebt ? 'text-slate-500' : 'text-emerald-600'}`}>
                                $ {Math.abs(newBalance).toLocaleString('es-AR')} {isNewBalanceDebt ? '(Deuda)' : '(Favor)'}
                            </span>
                        </div>
                    </div>

                    {/* Amount */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Monto a Pagar *
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full pl-8 pr-4 py-3 text-lg font-bold rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                                placeholder="0.00"
                                step="0.01"
                                autoFocus
                                required
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Descripción / Notas
                        </label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="Ej: Pago parcial efectivo"
                        />
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading || !payAmount}
                        className={`w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-white font-bold bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {loading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                        {loading ? 'Registrando...' : 'Confirmar Pago'}
                    </button>
                </form>
            </div>
        </div>
    );
};
