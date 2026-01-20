const express = require('express');
const router = express.Router();
const promoController = require('../controllers/promo.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Promotions
 *   description: Gestión de ofertas y promociones (Ofertero)
 */

/**
 * @swagger
 * /promotions:
 *   get:
 *     tags: [Promotions]
 *     summary: Listar promociones
 *     parameters:
 *       - in: query
 *         name: activeOnly
 *         schema:
 *           type: boolean
 *         description: Filtrar solo activas
 *     responses:
 *       200:
 *         description: Lista de promociones
 */
router.get('/', authenticate, promoController.getAll);

/**
 * @swagger
 * /promotions:
 *   post:
 *     tags: [Promotions]
 *     summary: Crear nueva promoción
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *               - startDate
 *               - endDate
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [N_X_M, PERCENTAGE, FIXED_PRICE]
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               discountPercent:
 *                 type: number
 *               buyQty:
 *                 type: integer
 *               payQty:
 *                 type: integer
 *               productIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Promoción creada correctamente
 */
router.post('/', authenticate, authorize('promotions.create'), promoController.create);

/**
 * @swagger
 * /promotions/{id}:
 *   get:
 *     tags: [Promotions]
 *     summary: Obtener detalles de una promoción
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Detalles de la promoción y productos
 */
router.get('/:id', authenticate, promoController.getById);

/**
 * @swagger
 * /promotions/{id}:
 *   put:
 *     tags: [Promotions]
 *     summary: Actualizar promoción
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *               productIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Promoción actualizada
 */
router.put('/:id', authenticate, authorize('promotions.edit'), promoController.update);

/**
 * @swagger
 * /promotions/{id}:
 *   delete:
 *     tags: [Promotions]
 *     summary: Eliminar promoción (Soft Delete)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Promoción eliminada
 */
router.delete('/:id', authenticate, authorize('promotions.delete'), promoController.delete);

/**
 * @swagger
 * /promotions/{id}/toggle:
 *   patch:
 *     tags: [Promotions]
 *     summary: Activar o desactivar promoción
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Estado actualizado
 */
router.patch('/:id/toggle', authenticate, authorize('promotions.edit'), promoController.toggleActive);

/**
 * @swagger
 * /promotions/{id}/products:
 *   post:
 *     tags: [Promotions]
 *     summary: Agregar productos masivamente a una oferta
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               productIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Productos agregados
 */
router.post('/:id/products', authenticate, authorize('promotions.edit'), promoController.addProducts);

module.exports = router;
