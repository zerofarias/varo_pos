/**
 * VARO POS - Rutas de Usuarios
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.use(authenticate);

/**
 * @swagger
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: Listar usuarios
 *     responses:
 *       200:
 *         description: Lista de usuarios
 */
router.get('/', authorize('users.view'), userController.getAll);

/**
 * @swagger
 * /users/roles:
 *   get:
 *     tags: [Users]
 *     summary: Listar roles disponibles
 *     responses:
 *       200:
 *         description: Lista de roles
 */
router.get('/roles', authorize('users.view'), userController.getRoles);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Obtener usuario por ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Usuario encontrado
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/:id', authorize('users.view'), userController.getById);

/**
 * @swagger
 * /users:
 *   post:
 *     tags: [Users]
 *     summary: Crear usuario
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateUserRequest'
 *     responses:
 *       201:
 *         description: Usuario creado
 */
router.post('/', authorize('users.create'), userController.create);

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     tags: [Users]
 *     summary: Actualizar usuario
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Usuario actualizado
 */
router.put('/:id', authorize('users.edit'), userController.update);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Eliminar usuario
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Usuario eliminado
 */
router.delete('/:id', authorize('users.delete'), userController.delete);

module.exports = router;
