/**
 * VARO POS - Página de Clientes con Modal de Edición
 */

import { useState, useEffect } from 'react';
import {
    Search, Plus, Users, Phone, MapPin,
    CreditCard, ChevronRight, AlertCircle, Edit
} from 'lucide-react';
import { customerService } from '@/services';
import { useConfigStore, themeColors } from '@/stores/configStore';
import { CustomerModal } from '@/components/modals/EditModals';
import type { Customer } from '@/types';

export const CustomersPage = () => {
    const { themeColor } = useConfigStore();
    const theme = themeColors[themeColor];

    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showWithDebt, setShowWithDebt] = useState(false);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

    useEffect(() => {
        loadCustomers();
    }, []);

    const loadCustomers = async () => {
        try {
            const response = await customerService.getAll({ limit: 500 });
            setCustomers(response.data);
        } catch (error) {
            console.error('Error loading customers:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredCustomers = customers.filter(c => {
        const matchesSearch =
            c.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.documentNumber?.includes(searchTerm) ||
            c.code.includes(searchTerm);
        const matchesDebt = showWithDebt ? c.currentBalance < 0 : true;
        return matchesSearch && matchesDebt;
    });

    const totalDebt = customers
        .filter(c => c.currentBalance < 0)
        .reduce((sum, c) => sum + Math.abs(c.currentBalance), 0);

    const handleOpenNew = () => {
        setEditingCustomer(null);
        setShowModal(true);
    };

    const handleEdit = (customer: Customer) => {
        setEditingCustomer(customer);
        setShowModal(true);
    };

    const handleSave = async (data: Partial<Customer>) => {
        try {
            if (editingCustomer) {
                await customerService.update(editingCustomer.id, data);
            } else {
                await customerService.create(data);
            }
            loadCustomers();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Error al guardar');
            throw error;
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await customerService.delete(id);
            loadCustomers();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Error al eliminar');
            throw error;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className={`w-10 h-10 border-4 ${theme.text} border-t-transparent rounded-full spinner`} />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 p-4 lg:p-6 shrink-0">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <Users className="text-slate-400" size={24} />
                            Clientes
                        </h1>
                        <p className="text-slate-500 text-sm mt-1">
                            {customers.length} clientes • Deuda total: $ {totalDebt.toLocaleString('es-AR')}
                        </p>
                    </div>
                    <button
                        onClick={handleOpenNew}
                        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white font-medium ${theme.bg} ${theme.hover} transition-colors`}
                    >
                        <Plus size={20} />
                        Nuevo Cliente
                    </button>
                </div>

                {/* Filters */}
                <div className="flex flex-col lg:flex-row gap-3 mt-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar cliente..."
                            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => setShowWithDebt(!showWithDebt)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-colors ${showWithDebt
                                ? 'bg-red-50 border-red-200 text-red-700'
                                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        <AlertCircle size={18} />
                        Con deuda
                    </button>
                </div>
            </div>

            {/* Customer Grid */}
            <div className="flex-1 overflow-y-auto p-4 lg:p-6 pb-20 lg:pb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredCustomers.map(customer => (
                        <CustomerCard
                            key={customer.id}
                            customer={customer}
                            theme={theme}
                            onEdit={handleEdit}
                        />
                    ))}
                </div>

                {filteredCustomers.length === 0 && (
                    <div className="text-center py-20 text-slate-400">
                        <Users size={48} className="mx-auto mb-3 opacity-50" />
                        <p>No se encontraron clientes</p>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <CustomerModal
                    customer={editingCustomer}
                    onClose={() => setShowModal(false)}
                    onSave={handleSave}
                    onDelete={editingCustomer ? handleDelete : undefined}
                    theme={theme}
                />
            )}
        </div>
    );
};

const CustomerCard = ({
    customer,
    theme,
    onEdit
}: {
    customer: Customer;
    theme: typeof themeColors['indigo'];
    onEdit: (c: Customer) => void;
}) => {
    const hasDebt = customer.currentBalance < 0;
    const fullName = `${customer.firstName} ${customer.lastName}`;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow relative overflow-hidden">
            {/* Debt indicator bar */}
            <div className={`absolute top-0 left-0 w-1 h-full ${hasDebt ? 'bg-red-500' : 'bg-emerald-500'}`} />

            <div className="flex justify-between items-start mb-3 pl-2">
                <div>
                    <h3 className="font-bold text-slate-800 text-lg">{fullName}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                            {customer.code}
                        </span>
                        {customer.documentNumber && `• ${customer.documentNumber}`}
                    </p>
                </div>
                <button
                    onClick={() => onEdit(customer)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                    <Edit size={18} />
                </button>
            </div>

            <div className="flex items-center justify-between mb-4 pl-2">
                <div className="text-sm text-slate-500">
                    <p className="flex items-center gap-1">
                        <Phone size={14} />
                        {customer.phone || '-'}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Saldo</p>
                    <span className={`text-xl font-bold ${hasDebt ? 'text-red-600' : 'text-emerald-600'}`}>
                        $ {Math.abs(customer.currentBalance).toLocaleString('es-AR')}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4 pl-2">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <p className="text-[10px] text-slate-400 uppercase">Límite</p>
                    <p className="text-sm text-slate-700 font-medium">
                        $ {customer.creditLimit.toLocaleString('es-AR')}
                    </p>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <p className="text-[10px] text-slate-400 uppercase">Estado</p>
                    <StatusBadge
                        status={customer.debtStatus}
                    />
                </div>
            </div>

            <div className="flex justify-between items-center pl-2 pt-3 border-t border-slate-100">
                <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${customer.isActive
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${customer.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    {customer.isActive ? 'Activo' : 'Inactivo'}
                </span>
                <button
                    onClick={() => onEdit(customer)}
                    className={`text-sm font-medium flex items-center gap-1 ${theme.text} hover:underline`}
                >
                    Editar <ChevronRight size={16} />
                </button>
            </div>
        </div>
    );
};

const StatusBadge = ({ status }: { status: string }) => {
    const styles = {
        ok: 'text-emerald-700',
        warning: 'text-amber-700',
        blocked: 'text-red-700',
    };

    const labels = {
        ok: 'OK',
        warning: 'Alerta',
        blocked: 'Bloqueado',
    };

    return (
        <span className={`text-sm font-medium ${styles[status as keyof typeof styles] || styles.ok}`}>
            {labels[status as keyof typeof labels] || 'OK'}
        </span>
    );
};

export default CustomersPage;
