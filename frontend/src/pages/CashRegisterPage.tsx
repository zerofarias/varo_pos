import { useState, useEffect } from 'react';
import {
    Wallet, DollarSign, ArrowUpCircle, ArrowDownCircle,
    Clock, CheckCircle, XCircle, Plus, Minus,
    RefreshCw, AlertTriangle, Monitor, Eye
} from 'lucide-react';
import { useConfigStore, themeColors } from '@/stores/configStore';
import { useAuthStore } from '@/stores/authStore';
import api from '@/services/api';
import { saleService } from '@/services/sale.service';
import { SaleDetailsModal } from '@/components/modals/SaleDetailsModal';

// Interfaces actualizadas para CashShift
interface CashRegister {
    id: string;
    name: string;
    code: string;
    isOccupied: boolean;
    currentUser?: { firstName: string; lastName: string };
}

interface CashMovement {
    id: string;
    type: 'IN' | 'OUT';
    reason: string;
    amount: number;
    balance: number;
    description?: string;
    createdAt: string;
    saleId?: string;
}

interface ActiveShift {
    id: string;
    shiftNumber: string;
    cashRegisterId: string;
    cashRegister: { name: string; code: string };
    status: 'OPEN';
    openedAt: string;
    openingCash: number;
    expectedCash: number;
    totalSales: number;
    totalCashIn: number;
    totalCashOut: number;
    movements: CashMovement[];
    metrics: {
        transactionCount: number;
        totalSales: number;
    };
}

export const CashRegisterPage = () => {
    const { themeColor } = useConfigStore();
    const { user } = useAuthStore();
    const theme = themeColors[themeColor];

    const [activeShift, setActiveShift] = useState<ActiveShift | null>(null);
    const [loading, setLoading] = useState(true);

    // Modal states
    const [showOpenModal, setShowOpenModal] = useState(false);
    const [showCloseModal, setShowCloseModal] = useState(false);
    const [showMovementModal, setShowMovementModal] = useState(false);
    const [movementType, setMovementType] = useState<'IN' | 'OUT'>('IN');
    const [summaryData, setSummaryData] = useState<any>(null);

    // Ticket View State
    const [selectedSale, setSelectedSale] = useState<any>(null);
    const [showSaleModal, setShowSaleModal] = useState(false);

    useEffect(() => {
        loadActiveShift();
    }, []);

    const loadActiveShift = async () => {
        try {
            const response = await api.get('/cash-shifts/active');
            setActiveShift(response.data.data);
        } catch (error) {
            console.error('Error loading active shift:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleViewTicket = async (saleId: string) => {
        try {
            const saleData = await saleService.getById(saleId);
            setSelectedSale(saleData.data || saleData); // Ajuste por si viene en data wrapper
            setShowSaleModal(true);
        } catch (error: any) {
            console.error('Error loading ticket:', error);
            const msg = error.response?.data?.error || error.message || 'Error desconocido';
            alert(`No se pudo cargar el detalle del ticket: ${msg}`);
        }
    };

    const handleVoidSale = async (saleData: any, reason: string) => {
        try {
            await saleService.createCreditNote(saleData.id, reason);
            alert('Nota de Crédito generada exitosamente');
            setShowSaleModal(false);
            loadActiveShift();
        } catch (error: any) {
            console.error('Error voiding sale:', error);
            const msg = error.response?.data?.error || error.message || 'Error desconocido';
            alert(`Error al generar Nota de Crédito: ${msg}`);
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
        <div className="h-full flex flex-col bg-slate-50 overflow-y-auto">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 p-4 lg:p-6 shrink-0">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <Wallet className="text-slate-400" size={24} />
                            Mi Caja (Turno Actual)
                        </h1>
                        <p className="text-slate-500 text-sm mt-1">
                            {user?.firstName} {user?.lastName} • {activeShift ? `Turno #${activeShift.shiftNumber}` : 'Sin turno activo'}
                        </p>
                    </div>
                    <button
                        onClick={loadActiveShift}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                    >
                        <RefreshCw size={18} />
                        Actualizar
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-4 lg:p-6 space-y-6">

                {/* Status Card */}
                <div className={`rounded-2xl p-6 ${activeShift
                    ? 'bg-gradient-to-br from-emerald-500 to-emerald-600'
                    : 'bg-gradient-to-br from-slate-600 to-slate-700'
                    } text-white shadow-lg`}>
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                {activeShift ? (
                                    <CheckCircle size={24} />
                                ) : (
                                    <XCircle size={24} />
                                )}
                                <span className="text-lg font-semibold">
                                    {activeShift ? `Turno Abierto en ${activeShift.cashRegister.name}` : 'Caja Cerrada (Sin Turno)'}
                                </span>
                            </div>
                            {activeShift && (
                                <p className="text-white/80 text-sm flex items-center gap-1">
                                    <Clock size={14} />
                                    Iniciado: {new Date(activeShift.openedAt).toLocaleString('es-AR')}
                                </p>
                            )}
                        </div>

                        {activeShift ? (
                            <div className="text-right">
                                <p className="text-white/70 text-sm uppercase tracking-wide">Saldo Esperado</p>
                                <p className="text-4xl font-black">
                                    $ {Number(activeShift.expectedCash).toLocaleString('es-AR')}
                                </p>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowOpenModal(true)}
                                className="px-6 py-3 bg-white text-emerald-600 rounded-xl font-bold hover:bg-white/90 transition-colors"
                            >
                                Abrir Turno
                            </button>
                        )}
                    </div>
                </div>

                {/* Quick Stats */}
                {activeShift && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard
                            icon={DollarSign}
                            label="Fondo Inicial"
                            value={`$ ${Number(activeShift.openingCash).toLocaleString('es-AR')}`}
                            color="blue"
                        />
                        <StatCard
                            icon={ArrowUpCircle}
                            label="Ventas (Efectivo)"
                            value={`$ ${(Number(activeShift.totalCashIn) - Number(activeShift.openingCash)).toLocaleString('es-AR')}`}
                            color="emerald"
                        />
                        <StatCard
                            icon={ArrowDownCircle}
                            label="Salidas"
                            value={`$ ${Number(activeShift.totalCashOut).toLocaleString('es-AR')}`}
                            color="red"
                        />
                        <StatCard
                            icon={Wallet}
                            label="Ventas Totales"
                            value={`$ ${Number(activeShift.totalSales).toLocaleString('es-AR')}`}
                            subtext={`${activeShift.metrics.transactionCount} tickets`}
                            color="indigo"
                        />
                    </div>
                )}

                {/* Actions */}
                {activeShift && (
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={() => { setMovementType('IN'); setShowMovementModal(true); }}
                            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors"
                        >
                            <Plus size={20} />
                            Ingreso
                        </button>
                        <button
                            onClick={() => { setMovementType('OUT'); setShowMovementModal(true); }}
                            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors"
                        >
                            <Minus size={20} />
                            Egreso
                        </button>
                        <button
                            onClick={() => setShowCloseModal(true)}
                            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-700 text-white font-medium hover:bg-slate-800 transition-colors ml-auto"
                        >
                            <XCircle size={20} />
                            Cerrar Turno (Arqueo)
                        </button>
                    </div>
                )}

                {/* Movements List */}
                {activeShift && activeShift.movements.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-4 border-b border-slate-200">
                            <h3 className="font-semibold text-slate-800">Movimientos del Turno</h3>
                        </div>
                        <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                            {activeShift.movements.map(movement => (
                                <div key={movement.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${movement.type === 'IN'
                                            ? 'bg-emerald-100 text-emerald-600'
                                            : 'bg-red-100 text-red-600'
                                            }`}>
                                            {movement.type === 'IN' ? <ArrowUpCircle size={20} /> : <ArrowDownCircle size={20} />}
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-800">
                                                {(movement.reason === 'SALE' && movement.description)
                                                    ? movement.description
                                                    : movement.reason === 'OPENING' ? 'Apertura de Turno'
                                                        : movement.reason === 'CLOSING' ? 'Cierre de Turno'
                                                            : movement.reason === 'SALE' ? 'Venta'
                                                                : movement.description || movement.reason}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {new Date(movement.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className={`font-bold ${movement.type === 'IN' ? 'text-emerald-600' : 'text-red-600'}`}>
                                                {movement.type === 'IN' ? '+' : '-'}$ {Number(movement.amount).toLocaleString('es-AR')}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                Saldo: $ {Number(movement.balance).toLocaleString('es-AR')}
                                            </p>
                                        </div>
                                        {movement.saleId && (
                                            <button
                                                onClick={() => handleViewTicket(movement.saleId!)}
                                                className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                                                title="Ver Ticket"
                                            >
                                                <Eye size={18} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Empty state */}
                {!activeShift && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                            <Wallet size={40} className="text-slate-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-slate-700 mb-2">
                            No tienes un turno activo
                        </h3>
                        <p className="text-slate-500 mb-6 max-w-md mx-auto">
                            Para comenzar a operar y realizar ventas, debes abrir un turno asignado a una caja.
                        </p>
                        <button
                            onClick={() => setShowOpenModal(true)}
                            className={`px-6 py-3 rounded-xl text-white font-bold ${theme.bg} ${theme.hover}`}
                        >
                            Abrir Turno Ahora
                        </button>
                    </div>
                )}
            </div>

            {/* Modals */}
            {showOpenModal && (
                <OpenShiftModal
                    onClose={() => setShowOpenModal(false)}
                    onSuccess={() => { setShowOpenModal(false); loadActiveShift(); }}
                    theme={theme}
                />
            )}

            {showCloseModal && activeShift && (
                <CloseShiftModal
                    activeShift={activeShift}
                    onClose={() => setShowCloseModal(false)}
                    onSuccess={(data) => {
                        setShowCloseModal(false);
                        loadActiveShift();
                        if (data) setSummaryData(data);
                    }}
                    theme={theme}
                />
            )}

            {summaryData && (
                <ShiftSummaryModal
                    data={summaryData}
                    onClose={() => setSummaryData(null)}
                    theme={theme}
                />
            )}

            {showMovementModal && activeShift && (
                <MovementModal
                    shiftId={activeShift.id}
                    type={movementType}
                    onClose={() => setShowMovementModal(false)}
                    onSuccess={() => { setShowMovementModal(false); loadActiveShift(); }}
                    theme={theme}
                />
            )}

            {showSaleModal && selectedSale && (
                <SaleDetailsModal
                    sale={selectedSale}
                    onClose={() => setShowSaleModal(false)}
                    onVoid={handleVoidSale}
                    onPrint={() => {
                        // El modal maneja la impresión interna si no se pasa handler
                    }}
                />
            )}
        </div>
    );
};

// === Sub Components ===

const StatCard = ({
    icon: Icon,
    label,
    value,
    subtext,
    color
}: {
    icon: React.ElementType;
    label: string;
    value: string;
    subtext?: string;
    color: string;
}) => {
    const colorClasses: Record<string, string> = {
        blue: 'bg-blue-100 text-blue-600',
        emerald: 'bg-emerald-100 text-emerald-600',
        red: 'bg-red-100 text-red-600',
        indigo: 'bg-indigo-100 text-indigo-600',
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <div className={`w-10 h-10 rounded-lg ${colorClasses[color]} flex items-center justify-center mb-3`}>
                <Icon size={20} />
            </div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
            <p className="text-xl font-bold text-slate-800">{value}</p>
            {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
        </div>
    );
};

// Open Shift Modal
const OpenShiftModal = ({
    onClose,
    onSuccess,
    theme
}: {
    onClose: () => void;
    onSuccess: () => void;
    theme: typeof themeColors['indigo'];
}) => {
    const [amount, setAmount] = useState('0');
    const [loading, setLoading] = useState(false);
    const [registers, setRegisters] = useState<CashRegister[]>([]);
    const [selectedRegister, setSelectedRegister] = useState<string>('');
    const [loadingRegisters, setLoadingRegisters] = useState(true);

    useEffect(() => {
        loadRegisters();
    }, []);

    const loadRegisters = async () => {
        try {
            const res = await api.get('/cash-shifts/registers');
            const availables = res.data.data;
            setRegisters(availables);
            if (availables.length > 0) {
                // Seleccionar primera disponible
                const firstFree = availables.find((r: CashRegister) => !r.isOccupied);
                if (firstFree) setSelectedRegister(firstFree.id);
            }
        } catch (error) {
            console.error('Error loading registers', error);
        } finally {
            setLoadingRegisters(false);
        }
    };

    const handleSubmit = async () => {
        if (!selectedRegister) return;
        setLoading(true);
        try {
            await api.post('/cash-shifts/open', {
                cashRegisterId: selectedRegister,
                openingCash: parseFloat(amount) || 0
            });
            onSuccess();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Error al abrir turno');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl animate-scale-in">
                <div className="p-6 border-b">
                    <h3 className="text-xl font-bold text-slate-800">Abrir Turno</h3>
                    <p className="text-slate-500 text-sm mt-1">Seleccione caja y monto inicial</p>
                </div>

                <div className="p-6 space-y-4">
                    {loadingRegisters ? (
                        <div className="text-center py-4 text-slate-500">Cargando cajas...</div>
                    ) : (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Caja</label>
                            <div className="grid grid-cols-1 gap-2">
                                {registers.map(reg => (
                                    <button
                                        key={reg.id}
                                        onClick={() => !reg.isOccupied && setSelectedRegister(reg.id)}
                                        disabled={reg.isOccupied}
                                        className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${selectedRegister === reg.id
                                            ? `border-emerald-500 bg-emerald-50 text-emerald-800`
                                            : reg.isOccupied
                                                ? 'border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed'
                                                : 'border-slate-200 hover:border-slate-300'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Monitor size={20} className={selectedRegister === reg.id ? 'text-emerald-600' : 'text-slate-400'} />
                                            <div className="text-left">
                                                <p className="font-semibold text-sm">{reg.name}</p>
                                                {reg.isOccupied && (
                                                    <p className="text-xs text-amber-600">Ocupada por {reg.currentUser?.firstName}</p>
                                                )}
                                            </div>
                                        </div>
                                        {selectedRegister === reg.id && <CheckCircle size={20} className="text-emerald-600" />}
                                    </button>
                                ))}
                                {registers.length === 0 && (
                                    <p className="text-sm text-red-500">No hay cajas físicas registradas en el sistema.</p>
                                )}
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Monto de Apertura
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full pl-8 pr-4 py-3 text-xl font-bold border-2 rounded-xl focus:outline-none focus:border-emerald-500"
                                placeholder="0"
                            />
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t bg-slate-50 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-100"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !selectedRegister}
                        className="flex-1 py-3 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 disabled:opacity-50"
                    >
                        {loading ? 'Abriendo...' : 'Abrir Turno'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Close Shift Modal
const CloseShiftModal = ({
    activeShift,
    onClose,
    onSuccess,
    theme
}: {
    activeShift: ActiveShift;
    onClose: () => void;
    onSuccess: (data?: any) => void;
    theme: typeof themeColors['indigo'];
}) => {
    const [countedAmount, setCountedAmount] = useState(activeShift.expectedCash.toString());
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    const difference = (parseFloat(countedAmount) || 0) - Number(activeShift.expectedCash);

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const res = await api.post(`/cash-shifts/${activeShift.id}/close`, {
                countedCash: parseFloat(countedAmount) || 0,
                closingNotes: notes
            });
            onSuccess(res.data.data);
        } catch (error: any) {
            alert(error.response?.data?.error || 'Error al cerrar turno');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl animate-scale-in">
                <div className="p-6 border-b">
                    <h3 className="text-xl font-bold text-slate-800">Cerrar Turno (Arqueo)</h3>
                    <p className="text-slate-500 text-sm mt-1">Verifique el efectivo en caja</p>
                </div>
                <div className="p-6 space-y-4">
                    <div className="bg-slate-100 rounded-lg p-4">
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-slate-600">Saldo Esperado (Sistema):</span>
                            <span className="font-bold">$ {Number(activeShift.expectedCash).toLocaleString('es-AR')}</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Efectivo Contado (Real)
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                            <input
                                type="number"
                                value={countedAmount}
                                onChange={(e) => setCountedAmount(e.target.value)}
                                className="w-full pl-8 pr-4 py-4 text-2xl font-bold border-2 rounded-xl focus:outline-none focus:border-slate-500"
                            />
                        </div>
                    </div>

                    {difference !== 0 && (
                        <div className={`p-3 rounded-lg flex items-center gap-2 ${difference > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                            }`}>
                            <AlertTriangle size={18} />
                            <span className="font-medium">
                                Diferencia: {difference > 0 ? '+' : ''}$ {difference.toLocaleString('es-AR')}
                            </span>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Notas del Cierre
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full p-3 border rounded-lg resize-none"
                            rows={2}
                            placeholder="Comentarios sobre diferencias u otros..."
                        />
                    </div>
                </div>
                <div className="p-6 border-t bg-slate-50 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-100"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex-1 py-3 rounded-xl bg-slate-700 text-white font-bold hover:bg-slate-800 disabled:opacity-50"
                    >
                        {loading ? 'Cerrando...' : 'Confirmar Cierre'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Movement Modal
const MovementModal = ({
    shiftId,
    type,
    onClose,
    onSuccess,
    theme
}: {
    shiftId: string;
    type: 'IN' | 'OUT';
    onClose: () => void;
    onSuccess: () => void;
    theme: typeof themeColors['indigo'];
}) => {
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);

    const reasons = type === 'IN'
        ? ['DEPOSIT', 'CORRECTION', 'OTHER']
        : ['WITHDRAWAL', 'EXPENSE', 'SUPPLIER', 'OTHER'];

    const reasonLabels: Record<string, string> = {
        DEPOSIT: 'Depósito (Fondo)',
        CORRECTION: 'Corrección',
        WITHDRAWAL: 'Retiro',
        EXPENSE: 'Gasto',
        SUPPLIER: 'Pago Proveedor',
        OTHER: 'Otro',
    };

    const handleSubmit = async () => {
        if (!amount || !reason) return;

        setLoading(true);
        try {
            await api.post(`/cash-shifts/${shiftId}/movement`, {
                type,
                amount: parseFloat(amount),
                reason,
                description
            });
            onSuccess();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Error al registrar movimiento');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl animate-scale-in">
                <div className={`p-6 border-b ${type === 'IN' ? 'bg-emerald-50' : 'bg-red-50'}`}>
                    <h3 className={`text-xl font-bold ${type === 'IN' ? 'text-emerald-800' : 'text-red-800'}`}>
                        {type === 'IN' ? 'Registrar Ingreso' : 'Registrar Egreso'}
                    </h3>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Monto</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className={`w-full pl-8 pr-4 py-4 text-2xl font-bold border-2 rounded-xl focus:outline-none ${type === 'IN' ? 'focus:border-emerald-500' : 'focus:border-red-500'
                                    }`}
                                placeholder="0"
                                autoFocus
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Motivo</label>
                        <div className="grid grid-cols-2 gap-2">
                            {reasons.map(r => (
                                <button
                                    key={r}
                                    onClick={() => setReason(r)}
                                    className={`py-2 px-3 rounded-lg border-2 text-sm font-medium transition-colors ${reason === r
                                        ? type === 'IN'
                                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                            : 'border-red-500 bg-red-50 text-red-700'
                                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                                        }`}
                                >
                                    {reasonLabels[r]}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Descripción (opcional)
                        </label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full p-3 border rounded-lg"
                            placeholder="Detalle..."
                        />
                    </div>
                </div>
                <div className="p-6 border-t bg-slate-50 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-100"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !amount || !reason}
                        className={`flex-1 py-3 rounded-xl text-white font-bold disabled:opacity-50 ${type === 'IN' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'
                            }`}
                    >
                        {loading ? 'Guardando...' : 'Confirmar'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Summary Modal (Reporte de Cierre)
const ShiftSummaryModal = ({
    data,
    onClose,
    theme
}: {
    data: any;
    onClose: () => void;
    theme: typeof themeColors['indigo'];
}) => {
    const { summary, cashRegister, user, shiftNumber, openedAt, closedAt } = data;

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl animate-scale-in overflow-hidden">
                <div className={`p-6 border-b text-center text-white ${summary.difference === 0 ? 'bg-emerald-500' : summary.difference > 0 ? 'bg-blue-500' : 'bg-amber-500'}`}>
                    <div className="w-16 h-16 mx-auto bg-white/20 rounded-full flex items-center justify-center mb-3">
                        <CheckCircle size={32} className="text-white" />
                    </div>
                    <h3 className="text-2xl font-bold">Turno Cerrado</h3>
                    <p className="opacity-90">{cashRegister.name} • {shiftNumber}</p>
                </div>

                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                    {/* User Info */}
                    <div className="text-center pb-4 border-b border-slate-100">
                        <p className="font-semibold text-slate-800">{user.firstName} {user.lastName}</p>
                        <p className="text-xs text-slate-500">
                            {new Date(openedAt).toLocaleString('es-AR')} - {new Date(closedAt).toLocaleTimeString('es-AR')}
                        </p>
                    </div>

                    {/* Money Stats */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-600">Fondo Inicial:</span>
                            <span className="font-mono">$ {Number(summary.openingCash).toLocaleString('es-AR')}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-600">Ventas (Efectivo):</span>
                            <span className="font-mono text-emerald-600">+$ {Number(summary.totalCashIn - summary.openingCash).toLocaleString('es-AR')}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-600">Pagos/Retiros:</span>
                            <span className="font-mono text-red-600">-$ {Number(summary.totalCashOut).toLocaleString('es-AR')}</span>
                        </div>
                        <div className="border-t border-slate-200 my-2"></div>
                        <div className="flex justify-between items-center font-bold">
                            <span className="text-slate-800">Saldo Esperado:</span>
                            <span>$ {Number(summary.expectedCash).toLocaleString('es-AR')}</span>
                        </div>
                        <div className="flex justify-between items-center font-bold text-lg">
                            <span className="text-slate-800">Efectivo Real:</span>
                            <span className="bg-slate-100 px-2 rounded">$ {Number(summary.countedCash).toLocaleString('es-AR')}</span>
                        </div>
                    </div>

                    {/* Difference Alert */}
                    {summary.difference !== 0 && (
                        <div className={`p-4 rounded-xl text-center ${summary.difference > 0
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                            <p className="text-xs font-bold uppercase mb-1">Diferencia de Caja</p>
                            <p className="text-xl font-black">
                                {summary.difference > 0 ? '+' : ''}$ {Number(summary.difference).toLocaleString('es-AR')}
                            </p>
                            <p className="text-xs opacity-80 mt-1">
                                {summary.difference > 0 ? 'Sobrante' : 'Faltante'} en efectivo
                            </p>
                        </div>
                    )}

                    {/* Sales Stats */}
                    <div className="bg-slate-50 p-4 rounded-xl text-sm space-y-2">
                        <div className="flex justify-between">
                            <span>Ventas Totales:</span>
                            <span className="font-bold">$ {Number(summary.totalSales).toLocaleString('es-AR')}</span>
                        </div>
                        {/* Aquí se podrían agregar más detalles si backend los envía */}
                    </div>
                </div>

                <div className="p-6 bg-slate-50 border-t">
                    <button
                        onClick={onClose}
                        className={`w-full py-3 rounded-xl text-white font-bold shadow-lg shadow-indigo-200 ${theme.bg} ${theme.hover}`}
                    >
                        Entendido
                    </button>
                </div>
            </div>
        </div>
    );
};
