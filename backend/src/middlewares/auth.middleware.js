/**
 * VARO POS - Middleware de Autenticación
 */

const jwt = require('jsonwebtoken');
const prisma = require('../config/database');

/**
 * Middleware para verificar token JWT
 */
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'No autorizado',
                details: ['Token de acceso requerido']
            });
        }

        const token = authHeader.split(' ')[1];

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Buscar usuario en la base de datos
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            include: {
                role: true,
                branch: true
            }
        });

        if (!user || !user.isActive) {
            return res.status(401).json({
                success: false,
                error: 'No autorizado',
                details: ['Usuario inválido o inactivo']
            });
        }

        // Adjuntar usuario al request
        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: 'Token expirado',
                details: ['Por favor, inicie sesión nuevamente']
            });
        }

        return res.status(401).json({
            success: false,
            error: 'Token inválido',
            details: [error.message]
        });
    }
};

/**
 * Middleware para verificar permisos
 * @param {string[]} requiredPermissions - Permisos requeridos
 */
const authorize = (...requiredPermissions) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'No autorizado',
                details: ['Debe autenticarse primero']
            });
        }

        const userPermissions = req.user.role?.permissions || [];

        // Admin tiene todos los permisos
        if (userPermissions.includes('*') || req.user.role?.name === 'Administrador') {
            return next();
        }

        const hasPermission = requiredPermissions.some(p => userPermissions.includes(p));

        if (!hasPermission) {
            return res.status(403).json({
                success: false,
                error: 'Acceso denegado',
                details: [`Permisos requeridos: ${requiredPermissions.join(', ')}`]
            });
        }

        next();
    };
};

/**
 * Middleware opcional - no bloquea si no hay token
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            const user = await prisma.user.findUnique({
                where: { id: decoded.userId },
                include: { role: true, branch: true }
            });

            if (user && user.isActive) {
                req.user = user;
            }
        }

        next();
    } catch (error) {
        // Continuar sin usuario
        next();
    }
};

module.exports = {
    authenticate,
    authorize,
    optionalAuth
};
