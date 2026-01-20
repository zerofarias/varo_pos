/**
 * VARO POS - Rutas de Reportes
 */

const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.use(authenticate);

/**
 * @swagger
 * /reports/sales-summary:
 *   get:
 *     tags: [Reports]
 *     summary: Resumen de ventas
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *     responses:
 *       200:
 *         description: Resumen de ventas
 */
router.get('/sales-summary', authorize('reports.view'), reportController.getSalesSummary);

/**
 * @swagger
 * /reports/top-products:
 *   get:
 *     tags: [Reports]
 *     summary: Productos más vendidos
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
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
 *     responses:
 *       200:
 *         description: Top productos
 */
router.get('/top-products', authorize('reports.view'), reportController.getTopProducts);

/**
 * @swagger
 * /reports/cash-flow:
 *   get:
 *     tags: [Reports]
 *     summary: Flujo de caja
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Flujo de caja por método de pago
 */
router.get('/cash-flow', authorize('reports.view'), reportController.getCashFlow);

/**
 * @swagger
 * /reports/stock-valuation:
 *   get:
 *     tags: [Reports]
 *     summary: Valuación de inventario
 *     description: Valor total del inventario a precio de costo y venta
 *     responses:
 *       200:
 *         description: Valuación de stock
 */
router.get('/stock-valuation', authorize('reports.view'), reportController.getStockValuation);

/**
 * @swagger
 * /reports/profit-margin:
 *   get:
 *     tags: [Reports]
 *     summary: Margen de ganancia
 *     description: Análisis de rentabilidad por producto/categoría
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
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [product, category]
 *     responses:
 *       200:
 *         description: Análisis de rentabilidad
 */
router.get('/profit-margin', authorize('reports.view'), reportController.getProfitMargin);

module.exports = router;
