const router = require('express').Router();
const statsController = require('../controllers/stats.controller');
const { authenticate } = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Stats
 *   description: Métricas y reportes del Dashboard
 */

/**
 * @swagger
 * /stats/summary:
 *   get:
 *     tags: [Stats]
 *     summary: Resumen del dashboard (Ventas hoy, Ticket promedio, etc)
 *     responses:
 *       200:
 *         description: Objeto con métricas generales del día
 */
router.get('/summary', authenticate, statsController.getDashboardSummary);

/**
 * @swagger
 * /stats/top-sellers:
 *   get:
 *     tags: [Stats]
 *     summary: Ranking de vendedores del mes
 *     responses:
 *       200:
 *         description: Lista de usuarios con sus totales de venta
 */
router.get('/top-sellers', authenticate, statsController.getTopSellers);

/**
 * @swagger
 * /stats/hourly:
 *   get:
 *     tags: [Stats]
 *     summary: Ventas por hora (Mapa de calor)
 *     responses:
 *       200:
 *         description: Array de 24 horas con totales de venta
 */
router.get('/hourly', authenticate, statsController.getHourlySales);

/**
 * @swagger
 * /stats/by-category:
 *   get:
 *     tags: [Stats]
 *     summary: Ventas distribuidas por categoría
 *     responses:
 *       200:
 *         description: Lista de categorías con monto vendido
 */
router.get('/by-category', authenticate, statsController.getSalesByCategory);

module.exports = router;
