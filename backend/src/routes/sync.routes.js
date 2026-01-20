/**
 * VARO POS - Rutas de Sincronización
 */

const express = require('express');
const router = express.Router();
const syncController = require('../controllers/sync.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.use(authenticate);

/**
 * @swagger
 * /sync/catalog:
 *   get:
 *     tags: [Sync]
 *     summary: Descargar catálogo del Maestro
 *     description: |
 *       La sucursal descarga productos, categorías, usuarios y promociones
 *       modificados desde la última sincronización.
 *       
 *       **Uso típico:**
 *       1. Sucursal envía `lastSyncTimestamp`
 *       2. Maestro devuelve todos los registros con `updatedAt > lastSyncTimestamp`
 *       3. Sucursal actualiza su BD local
 *     parameters:
 *       - in: query
 *         name: since
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Última fecha de sincronización (ISO 8601)
 *       - in: query
 *         name: full
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Descargar catálogo completo (ignorar fecha)
 *     responses:
 *       200:
 *         description: Catálogo para sincronizar
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SyncCatalogResponse'
 */
router.get('/catalog', authorize('sync.download'), syncController.getCatalog);

/**
 * @swagger
 * /sync/upload-sales:
 *   post:
 *     tags: [Sync]
 *     summary: Subir ventas de sucursal
 *     description: |
 *       La sucursal envía las ventas realizadas offline al servidor maestro.
 *       
 *       **Proceso:**
 *       1. Validar UUIDs (no deben existir en el maestro)
 *       2. Insertar ventas con sus ítems y pagos
 *       3. Actualizar stock global
 *       4. Marcar ventas como sincronizadas
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SyncUploadRequest'
 *     responses:
 *       200:
 *         description: Ventas sincronizadas
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
 *                     processed:
 *                       type: integer
 *                       example: 45
 *                     errors:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           saleId:
 *                             type: string
 *                           error:
 *                             type: string
 */
router.post('/upload-sales', authorize('sync.upload'), syncController.uploadSales);

/**
 * @swagger
 * /sync/full-catalog:
 *   get:
 *     tags: [Sync]
 *     summary: Descargar catálogo completo
 *     description: |
 *       Descarga TODO el catálogo del maestro. Usar para:
 *       - Primera sincronización de una sucursal nueva
 *       - Recuperación después de problemas
 *       
 *       **Incluye:**
 *       - Productos completos
 *       - Categorías
 *       - Métodos de pago
 *       - Promociones activas
 *       - Usuarios (solo datos públicos)
 *     responses:
 *       200:
 *         description: Catálogo completo
 */
router.get('/full-catalog', authorize('sync.download'), syncController.getFullCatalog);

/**
 * @swagger
 * /sync/status:
 *   get:
 *     tags: [Sync]
 *     summary: Estado de sincronización
 *     description: Devuelve el estado actual de sincronización de la sucursal
 *     responses:
 *       200:
 *         description: Estado de sync
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
 *                     lastSync:
 *                       type: string
 *                       format: date-time
 *                     pendingSales:
 *                       type: integer
 *                     status:
 *                       type: string
 *                       enum: [synced, pending, error]
 */
router.get('/status', syncController.getStatus);

/**
 * @swagger
 * /sync/prices:
 *   post:
 *     tags: [Sync]
 *     summary: Actualizar precios (Push del Maestro)
 *     description: |
 *       El maestro envía actualizaciones de precios a las sucursales.
 *       
 *       **Uso:** Cuando el maestro actualiza un precio, puede notificar
 *       a todas las sucursales conectadas.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - products
 *             properties:
 *               products:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     salePrice:
 *                       type: number
 *                     costPrice:
 *                       type: number
 *     responses:
 *       200:
 *         description: Precios actualizados
 */
router.post('/prices', authorize('sync.master'), syncController.updatePrices);

module.exports = router;
