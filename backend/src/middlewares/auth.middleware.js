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
            console.log('❌ [Auth] Request sin token Bearer:', req.path);
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

        if (!user) {
            console.log('❌ [Auth] Usuario ID no encontrado en DB:', decoded.userId);
            return res.status(401).json({
                success: false,
                error: 'No autorizado',
                details: ['Usuario inválido o inactivo']
            });
        }

        if (!user.isActive) {
            console.log('❌ [Auth] Usuario inactivo:', user.username);
            return res.status(401).json({
                success: false,
                error: 'No autorizado',
                details: ['Usuario inactivo']
            });
        }

        // Adjuntar usuario al request
        req.user = user;
        next();
    } catch (error) {
        console.log('❌ [Auth] Error verificando token:', error.message);
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

        let userPermissions = req.user.role?.permissions || [];

        // Parsear permisos si vienen como string (MySQL Text vs JSON)
        if (typeof userPermissions === 'string') {
            try {
                userPermissions = JSON.parse(userPermissions);
            } catch (e) {
                if (!userPermissions.includes('*')) {
                    // Silent fail
                }
            }
        }

        // Asegurar que sea array para busquedas precisas si es posible, o string comp.

        // Admin tiene todos los permisos
        // Aceptamos 'Admin' (del seed) y 'Administrador' (histórico)
        const isAdmin =
            (Array.isArray(userPermissions) && userPermissions.includes('*')) ||
            (typeof userPermissions === 'string' && userPermissions.includes('*')) ||
            req.user.role?.name === 'Administrador' ||
            req.user.role?.name === 'Admin';

        if (isAdmin) {
            return next();
        }

        const hasPermission = requiredPermissions.some(p =>
            Array.isArray(userPermissions) ? userPermissions.includes(p) : userPermissions.includes(p)
        );

        if (!hasPermission) {
            console.log(`⛔ [Auth] Acceso denegado a ${req.user.username}. Requiere: ${requiredPermissions}. Tiene: ${JSON.stringify(userPermissions)}`);
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
