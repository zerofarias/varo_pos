/**
 * VARO POS - Rutas de Devoluciones a Proveedor
 */

const express = require('express');
const router = express.Router();
const supplierReturnController = require('../controllers/supplierReturn.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

/**
 * @swagger
 * /api/supplier-returns:
 *   post:
 *     summary: Crear Devolución a Proveedor
 *     description: Genera remito de devolución, descuenta stock, NO afecta caja
 *     tags: [Supplier Returns]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - supplierId
 *               - items
 *             properties:
 *               supplierId:
 *                 type: string
 *               returnType:
 *                 type: string
 *                 enum: [DEFECTIVE, EXPIRED, DAMAGED, OTHER]
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId:
 *                       type: string
 *                     quantity:
 *                       type: integer
 *                     reason:
 *                       type: string
 *                     expirationDate:
 *                       type: string
 *                       format: date
 *                     batchNumber:
 *                       type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Remito generado
 */
router.post('/', authenticate, authorize('inventory.manage'), supplierReturnController.createSupplierReturn);

/**
 * @swagger
 * /api/supplier-returns:
 *   get:
 *     summary: Listar Devoluciones a Proveedor
 *     tags: [Supplier Returns]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', authenticate, supplierReturnController.getSupplierReturns);

/**
 * @swagger
 * /api/supplier-returns/report:
 *   get:
 *     summary: Reporte de devoluciones por proveedor
 *     tags: [Supplier Returns]
 *     security:
 *       - bearerAuth: []
 */
router.get('/report', authenticate, authorize('reports.view'), supplierReturnController.getReturnsBySupplierReport);

/**
 * @swagger
 * /api/supplier-returns/{id}:
 *   get:
 *     summary: Obtener detalle de remito
 *     tags: [Supplier Returns]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', authenticate, supplierReturnController.getSupplierReturnById);

/**
 * @swagger
 * /api/supplier-returns/{id}/status:
 *   patch:
 *     summary: Actualizar estado de devolución
 *     tags: [Supplier Returns]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id/status', authenticate, authorize('inventory.manage'), supplierReturnController.updateSupplierReturnStatus);

/**
 * @swagger
 * /api/supplier-returns/{id}/cancel:
 *   post:
 *     summary: Cancelar devolución (repone stock)
 *     tags: [Supplier Returns]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/cancel', authenticate, authorize('inventory.manage'), supplierReturnController.cancelSupplierReturn);

module.exports = router;
