/**
 * VARO POS - Rutas de Turnos de Caja (Cash Shifts)
 */

const express = require('express');
const router = express.Router();
const cashShiftController = require('../controllers/cashShift.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

/**
 * @swagger
 * /api/cash-shifts/registers:
 *   get:
 *     summary: Listar cajas físicas disponibles
 *     tags: [Cash Shifts]
 *     security:
 *       - bearerAuth: []
 */
router.get('/registers', authenticate, cashShiftController.getCashRegisters);

/**
 * @swagger
 * /api/cash-shifts/open:
 *   post:
 *     summary: Abrir turno de caja
 *     tags: [Cash Shifts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - cashRegisterId
 *             properties:
 *               cashRegisterId:
 *                 type: string
 *               openingCash:
 *                 type: number
 */
router.post('/open', authenticate, cashShiftController.openShift);

/**
 * @swagger
 * /api/cash-shifts/active:
 *   get:
 *     summary: Obtener turno activo del usuario
 *     tags: [Cash Shifts]
 *     security:
 *       - bearerAuth: []
 */
router.get('/active', authenticate, cashShiftController.getActiveShift);

/**
 * @swagger
 * /api/cash-shifts/dashboard:
 *   get:
 *     summary: Dashboard de control de todos los turnos
 *     tags: [Cash Shifts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [OPEN, CLOSED]
 */
router.get('/dashboard', authenticate, authorize('cash.view_all'), cashShiftController.getShiftsDashboard);

/**
 * @swagger
 * /api/cash-shifts/cashier-metrics:
 *   get:
 *     summary: Métricas por cajero (Ticket Promedio, etc.)
 *     tags: [Cash Shifts]
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
 */
router.get('/cashier-metrics', authenticate, authorize('reports.view'), cashShiftController.getCashierMetrics);

/**
 * @swagger
 * /api/cash-shifts/comparison:
 *   get:
 *     summary: Comparativo Hoy vs Ayer (por hora)
 *     tags: [Cash Shifts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: cashRegisterId
 *         schema:
 *           type: string
 */
router.get('/comparison', authenticate, cashShiftController.getShiftComparison);

/**
 * @swagger
 * /api/cash-shifts/history:
 *   get:
 *     summary: Historial completo de turnos (Paginado)
 *     tags: [Cash Shifts]
 *     security:
 *       - bearerAuth: []
 */
router.get('/history', authenticate, authorize('cash.view_all'), cashShiftController.getHistory);

/**
 * @swagger
 * /api/cash-shifts/{id}/details:
 *   get:
 *     summary: Obtener detalle completo de un turno (Ventas y Movimientos)
 *     tags: [Cash Shifts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 */
router.get('/:id/details', authenticate, authorize('cash.view_all'), cashShiftController.getShiftDetails);

/**
 * @swagger
 * /api/cash-shifts/{id}/close:
 *   post:
 *     summary: Cerrar turno (Arqueo)
 *     tags: [Cash Shifts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - countedCash
 *             properties:
 *               countedCash:
 *                 type: number
 *               closingNotes:
 *                 type: string
 */
router.post('/:id/close', authenticate, cashShiftController.closeShift);

/**
 * @swagger
 * /api/cash-shifts/{id}/movement:
 *   post:
 *     summary: Registrar movimiento en el turno
 *     tags: [Cash Shifts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - amount
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [IN, OUT]
 *               reason:
 *                 type: string
 *               amount:
 *                 type: number
 *               description:
 *                 type: string
 */
router.post('/:id/movement', authenticate, cashShiftController.addMovement);

module.exports = router;
