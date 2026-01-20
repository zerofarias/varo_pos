/**
 * VARO POS - Controlador de Autenticación
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/database');

const authController = {
    /**
     * Login de usuario
     */
    async login(req, res) {
        try {
            const { username, password } = req.body;

            if (!username || !password) {
                return res.status(400).json({
                    success: false,
                    error: 'Credenciales requeridas',
                    details: ['Usuario y contraseña son obligatorios']
                });
            }

            // Buscar usuario
            const user = await prisma.user.findFirst({
                where: {
                    OR: [
                        { username: username },
                        { email: username }
                    ],
                    isActive: true,
                    deletedAt: null
                },
                include: {
                    role: true,
                    branch: true
                }
            });

            if (!user) {
                return res.status(401).json({
                    success: false,
                    error: 'Credenciales inválidas',
                    details: ['Usuario no encontrado']
                });
            }

            // Verificar contraseña
            const isValidPassword = await bcrypt.compare(password, user.password);

            if (!isValidPassword) {
                return res.status(401).json({
                    success: false,
                    error: 'Credenciales inválidas',
                    details: ['Contraseña incorrecta']
                });
            }

            // Generar token
            const token = jwt.sign(
                {
                    userId: user.id,
                    username: user.username,
                    roleId: user.roleId,
                    branchId: user.branchId
                },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
            );

            // Remover password del response
            const { password: _, ...userWithoutPassword } = user;

            res.json({
                success: true,
                message: 'Login exitoso',
                data: {
                    token,
                    user: userWithoutPassword
                }
            });
        } catch (error) {
            console.error('Error en login:', error);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor',
                details: [error.message]
            });
        }
    },

    /**
     * Obtener usuario actual
     */
    async me(req, res) {
        try {
            const { password: _, ...userWithoutPassword } = req.user;

            res.json({
                success: true,
                data: userWithoutPassword
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Error al obtener usuario',
                details: [error.message]
            });
        }
    },

    /**
     * Refrescar token
     */
    async refreshToken(req, res) {
        try {
            const user = req.user;

            const token = jwt.sign(
                {
                    userId: user.id,
                    username: user.username,
                    roleId: user.roleId,
                    branchId: user.branchId
                },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
            );

            res.json({
                success: true,
                data: { token }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Error al refrescar token',
                details: [error.message]
            });
        }
    },

    /**
     * Cambiar contraseña
     */
    async changePassword(req, res) {
        try {
            const { currentPassword, newPassword } = req.body;

            if (!currentPassword || !newPassword) {
                return res.status(400).json({
                    success: false,
                    error: 'Datos incompletos',
                    details: ['Contraseña actual y nueva son requeridas']
                });
            }

            if (newPassword.length < 6) {
                return res.status(400).json({
                    success: false,
                    error: 'Contraseña inválida',
                    details: ['La nueva contraseña debe tener al menos 6 caracteres']
                });
            }

            // Obtener usuario con password
            const user = await prisma.user.findUnique({
                where: { id: req.user.id }
            });

            // Verificar contraseña actual
            const isValid = await bcrypt.compare(currentPassword, user.password);

            if (!isValid) {
                return res.status(400).json({
                    success: false,
                    error: 'Contraseña incorrecta',
                    details: ['La contraseña actual no es correcta']
                });
            }

            // Hashear nueva contraseña
            const hashedPassword = await bcrypt.hash(newPassword, 10);

            // Actualizar
            await prisma.user.update({
                where: { id: req.user.id },
                data: { password: hashedPassword }
            });

            res.json({
                success: true,
                message: 'Contraseña actualizada correctamente'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Error al cambiar contraseña',
                details: [error.message]
            });
        }
    }
};

module.exports = authController;
