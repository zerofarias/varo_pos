import React, { useRef } from 'react';
import QRCode from 'react-qr-code';
import { X, Printer, Download } from 'lucide-react';
import { useConfigStore } from '@/stores/configStore';

interface Sale {
    id: string;
    saleNumber: string; // T-SUC-NUM
    fiscalNumber?: string; // 0001-00000015
    afipCae?: string;
    afipCaeExpiration?: string | Date; // Date string
    afipQrData?: string; // URL o Base64
    afipStatus?: string;
    created_at: string;
    total: number;
    subtotal: number;
    taxAmount?: number;
    discountAmount: number;
    items: any[];
    payments: any[];
    customer?: {
        firstName: string;
        lastName: string;
        documentNumber?: string;
        documentType?: string;
        taxCondition?: string;
        address?: string;
    };
    user?: {
        username: string;
    };
    branch?: {
        name: string;
        address?: string;
        phone?: string;
        code: string;
    };
}

interface ReceiptModalProps {
    sale: Sale;
    onClose: () => void;
    theme?: any;
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({ sale, onClose, theme }) => {
    const printRef = useRef<HTMLDivElement>(null);
    const config = useConfigStore();

    const handlePrint = () => {
        const content = printRef.current;
        if (!content) return;

        const printWindow = window.open('', '', 'width=400,height=600');
        if (printWindow) {
            printWindow.document.write('<html><head><title>Imprimir Ticket</title>');
            printWindow.document.write(`
                <style>
                    body { font-family: 'Courier New', monospace; font-size: 12px; margin: 0; padding: 10px; }
                    .ticket { width: 100%; max-width: 300px; margin: 0 auto; }
                    .center { text-align: center; }
                    .right { text-align: right; }
                    .bold { font-weight: bold; }
                    .line { border-top: 1px dashed #000; margin: 10px 0; }
                    .flex { display: flex; justify-content: space-between; }
                    .item { margin-bottom: 5px; }
                    .qr { margin-top: 15px; display: flex; justify-content: center; }
                    img { max-width: 100%; }
                    @media print {
                        body { width: 80mm; margin: 0; padding: 0; }
                        .ticket { width: 100%; }
                    }
                </style>
            `);
            printWindow.document.write('</head><body>');
            printWindow.document.write('<div class="ticket">' + content.innerHTML + '</div>');
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 500);
        }
    };

    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleString('es-AR');
        } catch (e) {
            return dateStr;
        }
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(Number(val));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Printer size={20} className="text-slate-500" />
                        Comprobante de Venta
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                        <X size={20} />
                    </button>
                </div>

                {/* Ticket Preview */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-100">
                    <div ref={printRef} className="bg-white shadow-sm p-6 mx-auto" style={{ maxWidth: '320px', fontFamily: '"Courier New", monospace', fontSize: '13px' }}>

                        {/* Encabezado Comercio */}
                        <div className="text-center mb-4">
                            <h2 className="font-bold text-lg mb-1">{config.shopName || sale.branch?.name || 'VARO POS'}</h2>
                            <p>{config.shopAddress || sale.branch?.address || 'Dirección desconocida'}</p>
                            <p>Tel: {config.shopPhone || sale.branch?.phone || '-'}</p>
                            <p>CUIT: {config.taxId || '20-XXXXXXXX-X'}</p>
                            <p className="mt-2 font-bold">RESPONSABLE MONOTRIBUTO</p>
                        </div>

                        <div className="border-t border-dashed border-slate-300 my-2"></div>

                        {/* Datos Comprobante */}
                        <div className="mb-4">
                            {sale.fiscalNumber ? (
                                <div className="text-center font-bold text-sm">
                                    <p>FACTURA C</p>
                                    <p>Nro: {sale.fiscalNumber}</p>
                                </div>
                            ) : (
                                <div className="text-center font-bold">
                                    <p>DOCUMENTO NO FISCAL</p>
                                    <p>Nro: {sale.saleNumber}</p>
                                </div>
                            )}
                            <p className="text-xs text-center mt-1">{formatDate(sale.created_at)}</p>
                        </div>

                        {/* Datos Cliente ... */}
                        {/* (Mantenemos igual esta parte, salto al final del bloque con view_file o asumo contexto) */}
                        {/* Mejor reemplazo solo bloques específicos para no tocar lo del medio */}

                        {/* Datos Cliente */}
                        <div className="mb-4 text-xs">
                            <p><span className="font-bold">Cliente:</span> {sale.customer ? `${sale.customer.firstName} ${sale.customer.lastName}` : 'CONSUMIDOR FINAL'}</p>
                            {sale.customer?.documentNumber && (
                                <p><span className="font-bold">{sale.customer.documentType}:</span> {sale.customer.documentNumber}</p>
                            )}
                            {sale.customer?.address && (
                                <p><span className="font-bold">Dir:</span> {sale.customer.address}</p>
                            )}
                            <p><span className="font-bold">Cond. IVA:</span> {sale.customer?.taxCondition?.replace('_', ' ') || 'CONSUMIDOR FINAL'}</p>
                        </div>

                        <div className="border-t border-dashed border-slate-300 my-2"></div>

                        {/* Items */}
                        <div className="border-t border-dashed border-slate-300 my-2"></div>

                        {/* Items - Tabla Detallada */}
                        <table className="w-full text-xs mb-4" style={{ borderCollapse: 'collapse' }}>
                            <thead>
                                <tr className="border-b border-dashed border-slate-400">
                                    <th className="text-left py-1 w-8">Cnt</th>
                                    <th className="text-left py-1">Detalle</th>
                                    <th className="text-right py-1 w-16">P.Unit</th>
                                    <th className="text-right py-1 w-16">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sale.items?.map((item, i) => (
                                    <tr key={i}>
                                        <td className="text-left py-1 align-top">{item.quantity}</td>
                                        <td className="text-left py-1 align-top">
                                            {item.product_name || item.product?.name}
                                            {item.discountPercent > 0 && <div className="text-[10px] italic">Desc {item.discountPercent}%</div>}
                                        </td>
                                        <td className="text-right py-1 align-top">{formatCurrency(item.unitPrice || item.unit_price)}</td>
                                        <td className="text-right py-1 align-top font-bold">{formatCurrency(item.subtotal)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="border-t border-dashed border-slate-300 my-2"></div>

                        {/* Importes y Desglose */}
                        <div className="text-right text-xs mb-4 space-y-1">
                            <div className="flex justify-between">
                                <span>Subtotal:</span>
                                <span>{formatCurrency(sale.total + sale.discountAmount)}</span>
                            </div>


                            {sale.discountAmount > 0 && (
                                <div className="flex justify-between text-slate-500 italic">
                                    <span>Descuento:</span>
                                    <span>-{formatCurrency(sale.discountAmount)}</span>
                                </div>
                            )}

                            <div className="border-t border-slate-300 my-1"></div>

                            <div className="flex justify-between font-bold text-base mt-2">
                                <span>TOTAL</span>
                                <span>{formatCurrency(sale.total)}</span>
                            </div>
                        </div>

                        {/* Fiscal Data (CAE / QR) */}
                        {sale.afipCae && (
                            <div className="mt-6 text-center">
                                <p className="font-bold">CAE: {sale.afipCae}</p>
                                <p className="text-xs">Vto. CAE: {sale.afipCaeExpiration ? formatDate(sale.afipCaeExpiration.toString()).split(',')[0] : '-'}</p>

                                {sale.afipQrData && (
                                    <div className="mt-4 flex justify-center bg-white p-2">
                                        <QRCode value={sale.afipQrData} size={120} />
                                    </div>
                                )}
                                <div className="mt-2 text-[10px] text-slate-400">
                                    <p>Comprobante Autorizado</p>
                                </div>
                            </div>
                        )}

                        {!sale.afipCae && (
                            <div className="mt-6 text-center text-xs text-slate-400">
                                <p>*** DOCUMENTO NO VALIDO COMO FACTURA ***</p>
                            </div>
                        )}

                        <div className="mt-8 text-center text-[10px]">
                            <p>Gracias por su compra</p>
                        </div>

                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 bg-white border-t border-slate-100 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 px-4 rounded-xl bg-slate-100 font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                    >
                        Cerrar
                    </button>
                    <button
                        onClick={handlePrint}
                        className={`flex-1 py-3 px-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 shadow-lg hover:brightness-110 active:scale-95 transition-all ${theme?.bg || 'bg-blue-600'}`}
                    >
                        <Printer size={20} />
                        IMPRIMIR
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReceiptModal;
