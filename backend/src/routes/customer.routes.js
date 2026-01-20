/**
 * VARO POS - Rutas de Clientes
 */

const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customer.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.use(authenticate);

/**
 * @swagger
 * /customers:
 *   get:
 *     tags: [Customers]
 *     summary: Listar clientes
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Buscar por nombre, DNI o código
 *       - in: query
 *         name: withDebt
 *         schema:
 *           type: boolean
 *         description: Solo clientes con deuda
 *     responses:
 *       200:
 *         description: Lista de clientes
 */
router.get('/', authorize('customers.view'), customerController.getAll);

/**
 * @swagger
 * /customers/{id}:
 *   get:
 *     tags: [Customers]
 *     summary: Obtener cliente por ID
 *     description: Incluye historial de movimientos de cuenta corriente
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Cliente con detalle de cuenta corriente
 */
router.get('/:id', authorize('customers.view'), customerController.getById);

/**
 * @swagger
 * /customers:
 *   post:
 *     tags: [Customers]
 *     summary: Crear cliente
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *             properties:
 *               code:
 *                 type: string
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               documentNumber:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               creditLimit:
 *                 type: number
 *     responses:
 *       201:
 *         description: Cliente creado
 */
router.post('/', authorize('customers.create'), customerController.create);

/**
 * @swagger
 * /customers/{id}:
 *   put:
 *     tags: [Customers]
 *     summary: Actualizar cliente
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Cliente actualizado
 */
router.put('/:id', authorize('customers.edit'), customerController.update);

/**
 * @swagger
 * /customers/{id}:
 *   delete:
 *     tags: [Customers]
 *     summary: Eliminar cliente
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Cliente eliminado
 */
router.delete('/:id', authorize('customers.delete'), customerController.delete);

/**
 * @swagger
 * /customers/{id}/payment:
 *   post:
 *     tags: [Customers]
 *     summary: Registrar pago de cuenta corriente
 *     description: |
 *       Registra un pago parcial o total del cliente.
 *       
 *       **Ejemplo:** Cliente debe $10,000, paga $7,500
 *       - Nuevo saldo: $2,500
 *       - Se registra movimiento tipo CREDIT
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
 *             $ref: '#/components/schemas/CustomerPaymentRequest'
 *     responses:
 *       200:
 *         description: Pago registrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     previousBalance:
 *                       type: number
 *                       example: 10000
 *                     paymentAmount:
 *                       type: number
 *                       example: 7500
 *                     newBalance:
 *                       type: number
 *                       example: 2500
 */
router.post('/:id/payment', authorize('customers.payment'), customerController.registerPayment);

/**
 * @swagger
 * /customers/{id}/account-movements:
 *   get:
 *     tags: [Customers]
 *     summary: Historial de cuenta corriente
 *     description: Devuelve todos los movimientos (cargos y pagos) del cliente
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
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
 *         description: Lista de movimientos
 */
router.get('/:id/account-movements', authorize('customers.view'), customerController.getAccountMovements);

/**
 * @swagger
 * /customers/debt-alerts:
 *   get:
 *     tags: [Customers]
 *     summary: Alertas de deuda
 *     description: |
 *       Lista clientes con deuda antigua o que superan su límite.
 *       
 *       **Criterios:**
 *       - Deuda > 30 días (configurable)
 *       - Saldo >= 80% del límite de crédito
 *     responses:
 *       200:
 *         description: Lista de alertas
 */
router.get('/debt-alerts', authorize('customers.view'), customerController.getDebtAlerts);

module.exports = router;
