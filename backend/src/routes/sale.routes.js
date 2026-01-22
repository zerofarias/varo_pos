/**
 * VARO POS - Rutas de Ventas (POS)
 */

const express = require('express');
const router = express.Router();
const saleController = require('../controllers/sale.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { requireOpenShift } = require('../middlewares/cash.middleware');

// Todas las rutas requieren autenticación
router.use(authenticate);

/**
 * @swagger
 * /sales:
 *   get:
 *     tags: [Sales]
 *     summary: Listar ventas
 *     description: Obtiene todas las ventas con filtros y paginación
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Registros por página
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha inicial
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha final
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, completed, cancelled, refunded]
 *         description: Estado de la venta
 *       - in: query
 *         name: customerId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtrar por cliente
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtrar por vendedor
 *     responses:
 *       200:
 *         description: Lista de ventas
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/PaginatedResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Sale'
 */
router.get('/', authorize('sales.view'), saleController.getAll);

/**
 * @swagger
 * /sales/daily-summary:
 *   get:
 *     tags: [Sales]
 *     summary: Resumen diario de ventas
 *     description: Devuelve estadísticas del día actual
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha a consultar (por defecto hoy)
 *     responses:
 *       200:
 *         description: Resumen diario
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalSales:
 *                       type: integer
 *                       example: 45
 *                     totalAmount:
 *                       type: number
 *                       example: 125000.50
 *                     totalProfit:
 *                       type: number
 *                       example: 35000.25
 *                     averageTicket:
 *                       type: number
 *                       example: 2777.79
 *                     byPaymentMethod:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           method:
 *                             type: string
 *                           total:
 *                             type: number
 *                           count:
 *                             type: integer
 */
router.get('/daily-summary', authorize('sales.view'), saleController.getDailySummary);

/**
 * @swagger
 * /sales/{id}:
 *   get:
 *     tags: [Sales]
 *     summary: Obtener venta por ID
 *     description: Devuelve el detalle completo de una venta
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la venta
 *     responses:
 *       200:
 *         description: Detalle de la venta
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Sale'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/:id', authorize('sales.view'), saleController.getById);

/**
 * @swagger
 * /sales:
 *   post:
 *     tags: [Sales]
 *     summary: Crear nueva venta
 *     description: |
 *       Registra una nueva venta en el sistema.
 *       
 *       **Lógica de negocio:**
 *       - Descuenta stock automáticamente (excepto servicios)
 *       - Soporta pagos mixtos (efectivo + tarjeta, etc.)
 *       - Aplica recargos/descuentos por método de pago
 *       - Registra movimientos de caja
 *       - Si es cuenta corriente, actualiza saldo del cliente
 *       
 *       **Tipos de documento:**
 *       - `TICKET_X`: Ticket común (solo descuenta stock)
 *       - `FACTURA_A/B/C`: Preparado para integración fiscal
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateSaleRequest'
 *           examples:
 *             ventaSimple:
 *               summary: Venta simple en efectivo
 *               value:
 *                 documentType: "TICKET_X"
 *                 items:
 *                   - productId: "550e8400-e29b-41d4-a716-446655440001"
 *                     quantity: 2
 *                   - productId: "550e8400-e29b-41d4-a716-446655440002"
 *                     quantity: 1
 *                 payments:
 *                   - paymentMethodId: "550e8400-e29b-41d4-a716-446655440010"
 *                     amount: 3500
 *             ventaMixta:
 *               summary: Venta con pago mixto
 *               value:
 *                 documentType: "TICKET_X"
 *                 customerId: "550e8400-e29b-41d4-a716-446655440020"
 *                 discountPercent: 5
 *                 items:
 *                   - productId: "550e8400-e29b-41d4-a716-446655440001"
 *                     quantity: 3
 *                     discountPercent: 10
 *                 payments:
 *                   - paymentMethodId: "550e8400-e29b-41d4-a716-446655440010"
 *                     amount: 2000
 *                   - paymentMethodId: "550e8400-e29b-41d4-a716-446655440011"
 *                     amount: 1325
 *                     reference: "TXN-ABC123"
 *             ventaFiado:
 *               summary: Venta a cuenta corriente
 *               value:
 *                 documentType: "TICKET_X"
 *                 customerId: "550e8400-e29b-41d4-a716-446655440020"
 *                 items:
 *                   - productId: "550e8400-e29b-41d4-a716-446655440001"
 *                     quantity: 5
 *                 payments:
 *                   - paymentMethodId: "550e8400-e29b-41d4-a716-446655440015"
 *                     amount: 4250
 *     responses:
 *       201:
 *         description: Venta creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Venta registrada exitosamente"
 *                 data:
 *                   $ref: '#/components/schemas/Sale'
 *       400:
 *         description: Error de validación
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               sinStock:
 *                 summary: Stock insuficiente
 *                 value:
 *                   success: false
 *                   error: "Stock insuficiente"
 *                   details: ["Producto 'Coca Cola 500ml' tiene 5 unidades y se requieren 10"]
 *               limiteCredito:
 *                 summary: Límite de crédito excedido
 *                 value:
 *                   success: false
 *                   error: "Límite de crédito excedido"
 *                   details: ["El cliente tiene un límite de $50000 y el saldo sería $55000"]
 */
router.post('/', authorize('sales.create'), requireOpenShift, saleController.create);

/**
 * @swagger
 * /sales/{id}/cancel:
 *   post:
 *     tags: [Sales]
 *     summary: Cancelar venta
 *     description: |
 *       Cancela una venta existente.
 *       
 *       **Efectos:**
 *       - Revierte el stock descontado
 *       - Revierte movimientos de caja
 *       - Si era cuenta corriente, revierte el cargo al cliente
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 example: "Error en el registro"
 *     responses:
 *       200:
 *         description: Venta cancelada
 *       400:
 *         description: La venta no puede ser cancelada
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.post('/:id/cancel', authorize('sales.cancel'), requireOpenShift, saleController.cancel);


/**
 * @swagger
 * /sales/{id}/credit-note:
 *   post:
 *     tags: [Sales]
 *     summary: Generar Nota de Crédito (Anular Venta)
 *     description: |
 *       Genera una Nota de Crédito para anular una venta existente.
 *       
 *       **Efectos:**
 *       - Crea un nuevo comprobante (Sale) con montos negativos
 *       - Restaura el stock de los productos
 *       - Registra una salida de dinero de la caja (si hubo pago efectivo)
 *       - Reintegra saldo a cuenta corriente (si aplica)
 *       - Emite NC electrónica en AFIP (si la venta original era fiscal)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la venta a anular
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 example: "Devolución por producto defectuoso"
 *     responses:
 *       201:
 *         description: Nota de Crédito creada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Sale'
 *       400:
 *         description: Error de validación (ej. venta ya anulada)
 * */
router.post('/:id/credit-note', authorize('sales.cancel'), requireOpenShift, saleController.createCreditNote);

module.exports = router;
