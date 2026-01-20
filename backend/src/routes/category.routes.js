/**
 * VARO POS - Rutas de Categorías
 */

const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');
const { authenticate, authorize, optionalAuth } = require('../middlewares/auth.middleware');

/**
 * @swagger
 * /categories:
 *   get:
 *     tags: [Categories]
 *     summary: Listar categorías
 *     security: []
 *     responses:
 *       200:
 *         description: Lista de categorías
 */
router.get('/', optionalAuth, categoryController.getAll);

/**
 * @swagger
 * /categories/{id}:
 *   get:
 *     tags: [Categories]
 *     summary: Obtener categoría por ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Categoría encontrada
 */
router.get('/:id', optionalAuth, categoryController.getById);

/**
 * @swagger
 * /categories:
 *   post:
 *     tags: [Categories]
 *     summary: Crear categoría
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               color:
 *                 type: string
 *               icon:
 *                 type: string
 *               parentId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Categoría creada
 */
router.post('/', authenticate, authorize('categories.create'), categoryController.create);
/**
 * @swagger
 * /categories/normalize:
 *   post:
 *     tags: [Categories]
 *     summary: Optimizar categorías (Fusionar duplicados y normalizar nombres)
 *     responses:
 *       200:
 *         description: Reporte de categorías fusionadas y renombradas
 */
router.post('/normalize', authenticate, authorize('categories.edit'), categoryController.normalize);

/**
 * @swagger
 * /categories/{id}:
 *   put:
 *     tags: [Categories]
 *     summary: Actualizar categoría
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Categoría actualizada
 */
router.put('/:id', authenticate, authorize('categories.edit'), categoryController.update);

/**
 * @swagger
 * /categories/{id}:
 *   delete:
 *     tags: [Categories]
 *     summary: Eliminar categoría
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Categoría eliminada
 */
router.delete('/:id', authenticate, authorize('categories.delete'), categoryController.delete);

module.exports = router;
