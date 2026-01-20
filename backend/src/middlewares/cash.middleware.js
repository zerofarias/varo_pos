const prisma = require('../config/database');

/**
 * Middleware para asegurar que el usuario tenga un turno de caja abierto
 * antes de permitir operaciones de venta o movimiento de dinero.
 */
const requireOpenShift = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ success: false, error: 'Usuario no autenticado' });
        }

        const userId = req.user.id;

        // Buscar turno abierto para este usuario
        const shift = await prisma.cashShift.findFirst({
            where: {
                userId: userId,
                status: 'OPEN'
            },
            include: {
                cashRegister: true
            }
        });

        if (!shift) {
            return res.status(403).json({
                success: false,
                error: 'NO_OPEN_SHIFT',
                message: 'No hay una caja abierta para este usuario. Debe abrir caja antes de vender.'
            });
        }

        // Adjuntar el turno al request para usarlo en el controlador
        req.cashShift = shift;
        next();
    } catch (error) {
        console.error('Error checking open shift:', error);
        res.status(500).json({ success: false, error: 'Error interno verificando estado de caja' });
    }
};

module.exports = { requireOpenShift };
