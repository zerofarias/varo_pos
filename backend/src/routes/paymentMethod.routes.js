/**
 * VARO POS - Rutas de Métodos de Pago
 */

const express = require('express');
const router = express.Router();
const paymentMethodController = require('../controllers/paymentMethod.controller');
const { authenticate, authorize, optionalAuth } = require('../middlewares/auth.middleware');

/**
 * @swagger
 * /payment-methods:
 *   get:
 *     tags: [Settings]
 *     summary: Listar métodos de pago
 *     security: []
 *     responses:
 *       200:
 *         description: Lista de métodos de pago activos
 */
router.get('/', optionalAuth, paymentMethodController.getAll);

/**
 * @swagger
 * /payment-methods:
 *   post:
 *     tags: [Settings]
 *     summary: Crear método de pago
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - name
 *             properties:
 *               code:
 *                 type: string
 *                 example: "MERCADOPAGO"
 *               name:
 *                 type: string
 *                 example: "Mercado Pago"
 *               surchargePercent:
 *                 type: number
 *                 example: 3.5
 *               discountPercent:
 *                 type: number
 *                 example: 0
 *               icon:
 *                 type: string
 *               color:
 *                 type: string
 *     responses:
 *       201:
 *         description: Método de pago creado
 */
router.post('/', authenticate, authorize('settings.edit'), paymentMethodController.create);

/**
 * @swagger
 * /payment-methods/{id}:
 *   put:
 *     tags: [Settings]
 *     summary: Actualizar método de pago
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Método de pago actualizado
 */
router.put('/:id', authenticate, authorize('settings.edit'), paymentMethodController.update);

/**
 * @swagger
 * /payment-methods/{id}:
 *   delete:
 *     tags: [Settings]
 *     summary: Eliminar método de pago
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Método de pago eliminado
 */
router.delete('/:id', authenticate, authorize('settings.edit'), paymentMethodController.delete);

module.exports = router;
