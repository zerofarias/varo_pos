/**
 * VARO POS - Rutas de Productos
 */

const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const { authenticate, authorize, optionalAuth } = require('../middlewares/auth.middleware');

/**
 * @swagger
 * /products:
 *   get:
 *     tags: [Products]
 *     summary: Listar productos
 *     description: Obtiene todos los productos con filtros y paginación
 *     security: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Buscar por nombre, SKU o código de barras
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: lowStock
 *         schema:
 *           type: boolean
 *         description: Solo productos con stock bajo
 *       - in: query
 *         name: featured
 *         schema:
 *           type: boolean
 *         description: Solo productos destacados (teclas rápidas)
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *           default: true
 *     responses:
 *       200:
 *         description: Lista de productos
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/PaginatedResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Product'
 */
router.get('/', optionalAuth, productController.getAll);

/**
 * @swagger
 * /products/stock-alerts:
 *   get:
 *     tags: [Products]
 *     summary: Alertas de stock
 *     description: |
 *       Devuelve productos con stock bajo o crítico.
 *       
 *       **Semáforo de stock:**
 *       - 🟢 OK: Stock > stockMinimum
 *       - 🟡 Low: Stock <= stockMinimum && Stock > 0
 *       - 🔴 Critical: Stock <= 0
 *       
 *       Incluye predicción de días hasta agotamiento.
 *     responses:
 *       200:
 *         description: Lista de alertas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     critical:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Product'
 *                     low:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Product'
 */
router.get('/stock-alerts', authenticate, authorize('stock.view'), productController.getStockAlerts);

/**
 * @swagger
 * /products/barcode/{barcode}:
 *   get:
 *     tags: [Products]
 *     summary: Buscar por código de barras
 *     description: Busca un producto por su código de barras (escaneo en POS)
 *     parameters:
 *       - in: path
 *         name: barcode
 *         required: true
 *         schema:
 *           type: string
 *         description: Código de barras EAN/UPC
 *     responses:
 *       200:
 *         description: Producto encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 *       404:
 *         description: Producto no encontrado
 */
router.get('/barcode/:barcode', optionalAuth, productController.getByBarcode);

/**
 * @swagger
 * /products/{id}:
 *   get:
 *     tags: [Products]
 *     summary: Obtener producto por ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Producto encontrado
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/:id', optionalAuth, productController.getById);

/**
 * @swagger
 * /products:
 *   post:
 *     tags: [Products]
 *     summary: Crear producto
 *     description: Crea un nuevo producto en el catálogo
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateProductRequest'
 *     responses:
 *       201:
 *         description: Producto creado
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */
router.post('/', authenticate, authorize('products.create'), productController.create);

/**
 * @swagger
 * /products/{id}:
 *   put:
 *     tags: [Products]
 *     summary: Actualizar producto
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
 *             $ref: '#/components/schemas/CreateProductRequest'
 *     responses:
 *       200:
 *         description: Producto actualizado
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.put('/:id', authenticate, authorize('products.edit'), productController.update);

/**
 * @swagger
 * /products/{id}:
 *   delete:
 *     tags: [Products]
 *     summary: Eliminar producto (soft delete)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Producto eliminado
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.delete('/:id', authenticate, authorize('products.delete'), productController.delete);

/**
 * @swagger
 * /products/{id}/stock:
 *   patch:
 *     tags: [Products]
 *     summary: Ajustar stock
 *     description: Ajusta el stock de un producto manualmente
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
 *               - quantity
 *               - type
 *             properties:
 *               quantity:
 *                 type: integer
 *                 example: 10
 *               type:
 *                 type: string
 *                 enum: [add, subtract, set]
 *                 example: "add"
 *               reason:
 *                 type: string
 *                 example: "Recepción de mercadería"
 *     responses:
 *       200:
 *         description: Stock actualizado
 */
router.patch('/:id/stock', authenticate, authorize('stock.adjust'), productController.adjustStock);

module.exports = router;
