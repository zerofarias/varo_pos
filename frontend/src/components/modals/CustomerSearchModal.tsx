import { useState, useEffect, useRef } from 'react';
import { Search, User, Check, X, Plus } from 'lucide-react';
import { customerService } from '@/services';
import type { Customer } from '@/types';

interface CustomerSearchModalProps {
    onSelect: (customer: Customer) => void;
    onClose: () => void;
    theme?: any;
}

const CustomerSearchModal: React.FC<CustomerSearchModalProps> = ({ onSelect, onClose, theme }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Focus input on mount
        inputRef.current?.focus();
        loadCustomers();
    }, []);

    const loadCustomers = async (search = '') => {
        setLoading(true);
        try {
            const response = await customerService.getAll();
            const allCustomers: Customer[] = Array.isArray(response) ? response : (response as any).data || [];

            if (search) {
                const lower = search.toLowerCase();
                setCustomers(allCustomers.filter((c: any) =>
                    (c.firstName && c.firstName.toLowerCase().includes(lower)) ||
                    (c.lastName && c.lastName.toLowerCase().includes(lower)) ||
                    (c.documentNumber && c.documentNumber.includes(search)) ||
                    (c.businessName && c.businessName.toLowerCase().includes(lower))
                ));
            } else {
                setCustomers(allCustomers.slice(0, 20));
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            loadCustomers(searchTerm);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <User size={20} className="text-slate-500" />
                        Seleccionar Cliente
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 border-b border-slate-100">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Buscar por nombre, DNI o CUIT..."
                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-opacity-50 outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                    {loading ? (
                        <div className="p-8 text-center text-slate-400">Cargando...</div>
                    ) : customers.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">
                            <p>No se encontraron clientes.</p>
                            {/* Aquí podría ir botón "Crear Nuevo" */}
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {customers.map(customer => (
                                <button
                                    key={customer.id}
                                    onClick={() => onSelect(customer)}
                                    className="w-full text-left p-3 hover:bg-blue-50 rounded-xl flex items-center justify-between group transition-colors"
                                >
                                    <div>
                                        <p className="font-bold text-slate-800">
                                            {(customer as any).businessName || `${customer.firstName} ${customer.lastName}`}
                                        </p>
                                        <p className="text-xs text-slate-500 flex gap-2">
                                            <span>{customer.documentType}: {customer.documentNumber || '-'}</span>
                                            {customer.taxCondition && (
                                                <span className="bg-slate-100 px-1 rounded border border-slate-200 text-[10px]">
                                                    {customer.taxCondition.replace('_', ' ')}
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 text-blue-600">
                                        <Check size={20} />
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CustomerSearchModal;
