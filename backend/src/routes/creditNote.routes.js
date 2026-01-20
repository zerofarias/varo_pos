/**
 * VARO POS - Rutas de Notas de Crédito
 */

const express = require('express');
const router = express.Router();
const creditNoteController = require('../controllers/creditNote.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

/**
 * @swagger
 * /api/credit-notes:
 *   post:
 *     summary: Crear Nota de Crédito
 *     description: Genera una NC vinculada a una venta, repone stock y registra en arqueo
 *     tags: [Credit Notes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - originalSaleId
 *             properties:
 *               originalSaleId:
 *                 type: string
 *                 description: ID de la venta original
 *               reason:
 *                 type: string
 *                 enum: [PAYMENT_FAILED, CUSTOMER_RETURN, ERROR, OTHER]
 *               items:
 *                 type: array
 *                 description: Ítems a devolver (opcional, si no se especifica devuelve todo)
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId:
 *                       type: string
 *                     quantity:
 *                       type: integer
 *               paymentMethodId:
 *                 type: string
 *                 description: Método de pago para la devolución
 *     responses:
 *       201:
 *         description: NC creada exitosamente
 */
router.post('/', authenticate, authorize('sales.refund'), creditNoteController.createCreditNote);

/**
 * @swagger
 * /api/credit-notes:
 *   get:
 *     summary: Listar Notas de Crédito
 *     tags: [Credit Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de notas de crédito
 */
router.get('/', authenticate, creditNoteController.getCreditNotes);

/**
 * @swagger
 * /api/credit-notes/{id}:
 *   get:
 *     summary: Obtener detalle de una NC
 *     tags: [Credit Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Detalle de la NC
 */
router.get('/:id', authenticate, creditNoteController.getCreditNoteById);

module.exports = router;
