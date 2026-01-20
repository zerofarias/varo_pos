/**
 * VARO POS - Rutas de Caja Registradora
 */

const express = require('express');
const router = express.Router();
const cashRegisterController = require('../controllers/cashRegister.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.use(authenticate);

/**
 * @swagger
 * /cash-registers:
 *   get:
 *     tags: [Cash Register]
 *     summary: Listar cajas registradoras
 *     responses:
 *       200:
 *         description: Lista de cajas
 */
router.get('/', authorize('cashregister.view'), cashRegisterController.getAll);

/**
 * @swagger
 * /cash-registers/current:
 *   get:
 *     tags: [Cash Register]
 *     summary: Obtener caja activa del usuario
 *     description: Devuelve la caja abierta por el usuario actual
 *     responses:
 *       200:
 *         description: Caja activa o null si no hay caja abierta
 */
router.get('/current', cashRegisterController.getCurrent);

/**
 * @swagger
 * /cash-registers/{id}/open:
 *   post:
 *     tags: [Cash Register]
 *     summary: Abrir caja
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - openingAmount
 *             properties:
 *               openingAmount:
 *                 type: number
 *                 example: 5000
 *     responses:
 *       200:
 *         description: Caja abierta
 */
router.post('/:id/open', authorize('cashregister.open'), cashRegisterController.open);

/**
 * @swagger
 * /cash-registers/{id}/close:
 *   post:
 *     tags: [Cash Register]
 *     summary: Cerrar caja
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
 *               closingAmount:
 *                 type: number
 *                 description: Monto contado al cerrar
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Caja cerrada con resumen de operaciones
 */
router.post('/:id/close', authorize('cashregister.close'), cashRegisterController.close);

/**
 * @swagger
 * /cash-registers/{id}/movement:
 *   post:
 *     tags: [Cash Register]
 *     summary: Registrar movimiento de caja
 *     description: Ingreso o egreso manual de efectivo
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - amount
 *               - reason
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [IN, OUT]
 *               amount:
 *                 type: number
 *                 example: 1000
 *               reason:
 *                 type: string
 *                 enum: [WITHDRAWAL, PAYMENT, ADJUSTMENT]
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Movimiento registrado
 */
router.post('/:id/movement', authorize('cashregister.movement'), cashRegisterController.addMovement);

/**
 * @swagger
 * /cash-registers/{id}/movements:
 *   get:
 *     tags: [Cash Register]
 *     summary: Historial de movimientos
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Lista de movimientos
 */
router.get('/:id/movements', authorize('cashregister.view'), cashRegisterController.getMovements);

module.exports = router;
