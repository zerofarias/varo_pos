/**
 * VARO POS - Controlador de Promociones ("El Ofertero")
 */
const prisma = require('../config/database');

const promoController = {
    /**
     * Crear nueva promoción
     */
    async create(req, res) {
        try {
            const {
                name,
                description,
                type, // 'N_X_M', 'PERCENTAGE', 'FIXED_PRICE'
                startDate,
                endDate,
                daysOfWeek,
                startTime,
                endTime,
                // Reglas
                buyQty,      // N (Legacy support)
                payQty,      // M (Legacy support)
                buyQuantity, // New standard
                payQuantity, // New standard
                discountPercent,
                fixedPrice,
                paymentMethodId,
                // Productos iniciales
                productIds = []
            } = req.body;

            const finalBuyQty = buyQuantity || buyQty;
            const finalPayQty = payQuantity || payQty;

            // Transacción para asegurar integridad
            const result = await prisma.$transaction(async (tx) => {
                // Generar código único
                const code = 'PRM-' + Math.random().toString(36).substring(2, 8).toUpperCase();

                // 1. Crear Promoción
                const promo = await tx.promotion.create({
                    data: {
                        code,
                        name,
                        description,
                        type,
                        startDate: new Date(startDate), // YYYY-MM-DD
                        endDate: new Date(endDate),
                        daysOfWeek,
                        startTime,
                        endTime,
                        isActive: true, // Por defecto activa

                        // Campos específicos
                        buyQuantity: finalBuyQty ? parseInt(finalBuyQty) : null,
                        payQuantity: finalPayQty ? parseInt(finalPayQty) : null,
                        discountPercent: discountPercent ? parseFloat(discountPercent) : null,
                        fixedPrice: fixedPrice ? parseFloat(fixedPrice) : null,

                        paymentMethodId
                    }
                });

                // 2. Asociar Productos (si vienen)
                if (productIds.length > 0) {
                    const connections = productIds.map(pid => ({
                        promotionId: promo.id,
                        productId: pid
                    }));

                    await tx.promotionProduct.createMany({
                        data: connections,
                        skipDuplicates: true
                    });
                }

                return promo;
            });

            res.status(201).json({
                success: true,
                message: 'Promoción creada exitosamente',
                data: result
            });

        } catch (error) {
            console.error('Error creando promoción:', error);
            res.status(500).json({ success: false, error: 'Error al crear la promoción' });
        }
    },

    /**
     * Listar Promociones
     */
    async getAll(req, res) {
        try {
            const { active } = req.query;
            const where = {};

            if (active === 'true') {
                where.isActive = true;
                where.endDate = { gte: new Date() }; // Vigentes
            }

            const promos = await prisma.promotion.findMany({
                where,
                include: {
                    products: {
                        select: { productId: true }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });

            res.json({ success: true, data: promos });
        } catch (error) {
            console.error('Error listando promociones:', error);
            res.status(500).json({ success: false, error: 'Error al listar promociones' });
        }
    },

    /**
     * Obtener detalle con productos
     */
    async getById(req, res) {
        try {
            const { id } = req.params;
            const promo = await prisma.promotion.findUnique({
                where: { id },
                include: {
                    products: {
                        include: {
                            product: {
                                select: { id: true, name: true, sku: true, salePrice: true, category: true }
                            }
                        }
                    }
                }
            });

            if (!promo) return res.status(404).json({ success: false, error: 'Promoción no encontrada' });

            res.json({ success: true, data: promo });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, error: 'Error al obtener promoción' });
        }
    },

    /**
     * Agregar Productos a una Promo existente
     */
    async addProducts(req, res) {
        try {
            const { id } = req.params;
            const { productIds } = req.body; // Array de IDs

            if (!productIds || !Array.isArray(productIds)) {
                return res.status(400).json({ error: 'Se requiere array de productIds' });
            }

            const data = productIds.map(pid => ({
                promotionId: id,
                productId: pid
            }));

            await prisma.promotionProduct.createMany({
                data,
                skipDuplicates: true
            });

            res.json({ success: true, message: `${productIds.length} productos agregados.` });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, error: 'Error agregando productos' });
        }
    },

    async update(req, res) {
        try {
            const { id } = req.params;
            const {
                name, description, startDate, endDate, daysOfWeek, startTime, endTime,
                buyQty, payQty, discountPercent, fixedPrice, paymentMethodId, productIds
            } = req.body;

            const result = await prisma.$transaction(async (tx) => {
                // 1. Update Promo Basics
                const promo = await tx.promotion.update({
                    where: { id },
                    data: {
                        name, description,
                        startDate: new Date(startDate),
                        endDate: new Date(endDate),
                        daysOfWeek, startTime, endTime,
                        buyQuantity: buyQty ? parseInt(buyQty) : null,
                        payQuantity: payQty ? parseInt(payQty) : null,
                        discountPercent: discountPercent ? parseFloat(discountPercent) : null,
                        fixedPrice: fixedPrice ? parseFloat(fixedPrice) : null,
                        paymentMethodId: paymentMethodId || null
                    }
                });

                // 2. Update Products (Estrategia Reemplazo Total)
                if (productIds && Array.isArray(productIds)) {
                    await tx.promotionProduct.deleteMany({ where: { promotionId: id } });
                    if (productIds.length > 0) {
                        await tx.promotionProduct.createMany({
                            data: productIds.map(pid => ({ promotionId: id, productId: pid }))
                        });
                    }
                }
                return promo;
            });

            res.json({ success: true, data: result });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, error: 'Error al actualizar promoción' });
        }
    },

    /**
     * Eliminar (Soft Delete o Hard Delete? Promos viejas pueden quedar)
     * Haremos Hard Delete lógica de relación producto, pero Soft Delete de Promo si queremos historial.
     */
    async delete(req, res) {
        try {
            const { id } = req.params;
            await prisma.promotion.delete({ where: { id } });
            res.json({ success: true, message: 'Promoción eliminada' });
        } catch (error) {
            res.status(400).json({ success: false, error: 'No se pudo eliminar' });
        }
    },

    /**
     * Toggle Active
     */
    async toggleActive(req, res) {
        try {
            const { id } = req.params;
            const { isActive } = req.body;

            await prisma.promotion.update({
                where: { id },
                data: { isActive }
            });

            res.json({ success: true, message: 'Estado actualizado' });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
};

module.exports = promoController;
