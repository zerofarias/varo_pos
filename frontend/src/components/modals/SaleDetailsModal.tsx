
import { X, FileText, User, Package, CreditCard, AlertTriangle, Printer, Ban } from 'lucide-react';
import ReceiptModal from './ReceiptModal';
import { useState } from 'react';

interface SaleDetailsModalProps {
    sale: any;
    onClose: () => void;
    onVoid?: (sale: any, reason: string) => void;
    onPrint?: (sale: any) => void;
}

export const SaleDetailsModal = ({ sale, onClose, onVoid, onPrint }: SaleDetailsModalProps) => {
    const [showReceipt, setShowReceipt] = useState(false);
    const [isVoiding, setIsVoiding] = useState(false);
    const [voidReason, setVoidReason] = useState('');

    const formatCurrency = (val: number) => `$ ${Number(val).toLocaleString('es-AR')}`;

    const handlePrintClick = () => {
        if (onPrint) {
            onPrint(sale);
        } else {
            setShowReceipt(true);
        }
    };

    const handleVoidConfirm = () => {
        if (onVoid && voidReason.trim()) {
            onVoid(sale, voidReason);
            setIsVoiding(false);
        }
    };

    if (!sale) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-8 max-h-[90vh] overflow-hidden flex flex-col animate-scale-in">
                {/* Header del Modal */}
                <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                            <FileText className="text-white" size={20} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">
                                Ticket #{sale.saleNumber || 'S/N'}
                            </h3>
                            <p className="text-indigo-100 text-sm">
                                {new Date(sale.createdAt).toLocaleString('es-AR')}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <X className="text-white" size={24} />
                    </button>
                </div>

                {/* Contenido del Modal */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* Sección de Anulación (Visible si isVoiding es true) */}
                    {isVoiding && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 animate-fade-in shadow-inner">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="text-red-600 shrink-0 mt-1" size={24} />
                                <div className="flex-1">
                                    <h4 className="font-bold text-red-800 text-lg mb-1">Confirmar Anulación / Nota de Crédito</h4>
                                    <p className="text-sm text-red-700 mb-3">
                                        Esta acción generará una <strong>Nota de Crédito</strong> asociada a esta venta.
                                        Se restaurará el stock de los productos y se registrará un movimiento de egreso de caja por la devolución del dinero (si corresponde).
                                    </p>

                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-xs font-bold text-red-800 uppercase mb-1">Motivo de la anulación</label>
                                            <textarea
                                                value={voidReason}
                                                onChange={(e) => setVoidReason(e.target.value)}
                                                placeholder="Ej: Producto defectuoso, error en cobro, cambio de opinión..."
                                                className="w-full p-3 rounded-lg border border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none text-slate-700 resize-none bg-white"
                                                rows={2}
                                                autoFocus
                                            />
                                        </div>
                                        <div className="flex justify-end gap-3 pt-2">
                                            <button
                                                onClick={() => setIsVoiding(false)}
                                                className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg transition-colors"
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                onClick={handleVoidConfirm}
                                                disabled={!voidReason.trim()}
                                                className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed shadow transition-all active:scale-95"
                                            >
                                                Confirmar Nota de Crédito
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Info del Cliente y Vendedor */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Cliente */}
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                            <div className="flex items-center gap-2 mb-3">
                                <User size={16} className="text-slate-400" />
                                <span className="text-xs font-bold text-slate-400 uppercase">Cliente</span>
                            </div>
                            <p className="font-semibold text-slate-800">
                                {sale.customer ?
                                    `${sale.customer.firstName} ${sale.customer.lastName}` :
                                    'Consumidor Final'
                                }
                            </p>
                            {sale.customer?.documentNumber && (
                                <p className="text-sm text-slate-500 mt-1">
                                    {sale.customer.documentType}: {sale.customer.documentNumber}
                                </p>
                            )}
                        </div>

                        {/* Vendedor */}
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                            <div className="flex items-center gap-2 mb-3">
                                <User size={16} className="text-slate-400" />
                                <span className="text-xs font-bold text-slate-400 uppercase">Vendedor</span>
                            </div>
                            <p className="font-semibold text-slate-800">
                                {sale.user ? `${sale.user.firstName} ${sale.user.lastName}` : 'N/A'}
                            </p>
                        </div>
                    </div>

                    {/* Productos */}
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
                            <Package size={18} className="text-slate-400" />
                            <h4 className="font-bold text-slate-700">Productos</h4>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Producto</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Cant.</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">P. Unit.</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Desc.</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {sale.items?.map((item: any, index: number) => (
                                        <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-4 py-3">
                                                <div>
                                                    <p className="font-medium text-slate-800">{item.product?.name || item.productName}</p>
                                                    {(item.product?.barcode || item.productSku) && (
                                                        <p className="text-xs text-slate-400 font-mono">{item.product?.barcode || item.productSku}</p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center font-semibold text-slate-700">
                                                {item.quantity}
                                            </td>
                                            <td className="px-4 py-3 text-right text-slate-600">
                                                {formatCurrency(item.unitPrice)}
                                            </td>
                                            <td className="px-4 py-3 text-right text-red-600">
                                                {item.discountAmount > 0 ? `-${formatCurrency(item.discountAmount)}` : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold text-slate-800">
                                                {formatCurrency(item.subtotal)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Métodos de Pago */}
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
                            <CreditCard size={18} className="text-slate-400" />
                            <h4 className="font-bold text-slate-700">Métodos de Pago</h4>
                        </div>
                        <div className="p-4 space-y-2">
                            {sale.payments?.map((payment: any, index: number) => (
                                <div key={index} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                    <span className="font-medium text-slate-700">{payment.paymentMethod?.name}</span>
                                    <span className="font-bold text-slate-800">{formatCurrency(payment.amount)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Resumen de Totales */}
                    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-600">Subtotal:</span>
                                <span className="font-semibold text-slate-800">{formatCurrency(sale.subtotal || sale.total)}</span>
                            </div>
                            {sale.discountAmount > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-red-600">Descuento:</span>
                                    <span className="font-semibold text-red-600">-{formatCurrency(sale.discountAmount)}</span>
                                </div>
                            )}
                            {sale.taxAmount > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">Impuestos (IVA):</span>
                                    <span className="font-semibold text-slate-800">{formatCurrency(sale.taxAmount)}</span>
                                </div>
                            )}
                            <div className="border-t-2 border-slate-300 pt-2 mt-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-lg font-bold text-slate-800">Total:</span>
                                    <span className="text-2xl font-black text-indigo-600">{formatCurrency(sale.total)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Información AFIP */}
                    {sale.cae && (
                        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex flex-col items-center text-center">
                            <p className="text-indigo-800 font-bold mb-1">FACTURA ELECTRÓNICA AFIP</p>
                            <p className="text-sm text-indigo-600 font-mono">CAE: {sale.cae}</p>
                            <p className="text-sm text-indigo-600">Vto CAE: {new Date(sale.caeExpiration).toLocaleDateString('es-AR')}</p>
                            <p className="text-xs text-indigo-400 mt-2">Comprobante autorizado</p>
                        </div>
                    )}

                    {sale.afipError && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <AlertTriangle size={16} className="text-red-600" />
                                <span className="text-xs font-bold text-red-700 uppercase">Error AFIP</span>
                            </div>
                            <p className="text-sm text-red-800 break-words">{sale.afipError}</p>
                        </div>
                    )}

                    {/* Notas */}
                    {sale.notes && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <FileText size={16} className="text-amber-600" />
                                <span className="text-xs font-bold text-amber-700 uppercase">Notas</span>
                            </div>
                            <p className="text-sm text-amber-800">{sale.notes}</p>
                        </div>
                    )}

                    {/* Indicator si es nota de crédito */}
                    {sale.isCreditNote && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                            <div className="flex items-center gap-2">
                                <AlertTriangle size={20} className="text-red-600" />
                                <span className="font-bold text-red-700">Esta venta es una Nota de Crédito</span>
                            </div>
                            {sale.creditNoteReason && (
                                <p className="text-sm text-red-800 mt-2">Motivo: {sale.creditNoteReason}</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer del Modal */}
                <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-between gap-3 shrink-0">
                    <div className="flex gap-2">
                        {onVoid && !sale.isCreditNote && !isVoiding && (
                            <button
                                onClick={() => setIsVoiding(true)}
                                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-bold flex items-center gap-2"
                            >
                                <Ban size={16} /> ANULAR / NC
                            </button>
                        )}
                        <button
                            onClick={handlePrintClick}
                            className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium flex items-center gap-2"
                        >
                            <Printer size={16} /> IMPRIMIR
                        </button>
                    </div>

                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium"
                    >
                        Cerrar
                    </button>
                </div>
            </div>

            {/* Modal de Impresión anidado si no se proveyó handler externo */}
            {showReceipt && (
                <ReceiptModal
                    sale={sale}
                    onClose={() => setShowReceipt(false)}
                />
            )}
        </div>
    );
};
