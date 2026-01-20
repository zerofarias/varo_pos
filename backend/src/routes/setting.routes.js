/**
 * VARO POS - Rutas de Configuración
 */

const express = require('express');
const router = express.Router();
const settingController = require('../controllers/setting.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.use(authenticate);

/**
 * @swagger
 * /settings:
 *   get:
 *     tags: [Settings]
 *     summary: Obtener todas las configuraciones
 *     parameters:
 *       - in: query
 *         name: group
 *         schema:
 *           type: string
 *           enum: [general, pos, sync, fiscal]
 *         description: Filtrar por grupo
 *     responses:
 *       200:
 *         description: Configuraciones del sistema
 */
router.get('/', authorize('settings.view'), settingController.getAll);

/**
 * @swagger
 * /settings/{key}:
 *   get:
 *     tags: [Settings]
 *     summary: Obtener configuración por clave
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         example: "company_name"
 *     responses:
 *       200:
 *         description: Valor de la configuración
 */
router.get('/:key', authorize('settings.view'), settingController.getByKey);

/**
 * @swagger
 * /settings:
 *   put:
 *     tags: [Settings]
 *     summary: Actualizar configuraciones
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               settings:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     key:
 *                       type: string
 *                     value:
 *                       type: string
 *     responses:
 *       200:
 *         description: Configuraciones actualizadas
 */
router.put('/', authorize('settings.edit'), settingController.update);

module.exports = router;
