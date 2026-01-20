/**
 * VARO POS - Controlador de Sincronización
 */

const prisma = require('../config/database');

const syncController = {
    /**
     * Descargar catálogo (productos modificados desde última sync)
     */
    async getCatalog(req, res) {
        try {
            const { since, full } = req.query;

            let where = { deletedAt: null, isActive: true };

            if (since && full !== 'true') {
                where.updatedAt = { gt: new Date(since) };
            }

            const [products, categories, promotions, paymentMethods] = await Promise.all([
                prisma.product.findMany({
                    where,
                    include: { category: { select: { id: true, name: true } } }
                }),
                prisma.category.findMany({
                    where: { deletedAt: null, isActive: true }
                }),
                prisma.promotion.findMany({
                    where: {
                        deletedAt: null,
                        isActive: true,
                        endDate: { gte: new Date() }
                    },
                    include: { products: true }
                }),
                prisma.paymentMethod.findMany({
                    where: { isActive: true }
                })
            ]);

            res.json({
                success: true,
                data: {
                    products: products.map(p => ({
                        ...p,
                        salePrice: parseFloat(p.salePrice),
                        costPrice: parseFloat(p.costPrice)
                    })),
                    categories,
                    promotions,
                    paymentMethods,
                    lastSyncTimestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Error al obtener catálogo',
                details: [error.message]
            });
        }
    },

    /**
     * Subir ventas de sucursal al maestro
     */
    async uploadSales(req, res) {
        try {
            const { branchId, sales, lastSyncTimestamp } = req.body;

            if (!sales || sales.length === 0) {
                return res.json({
                    success: true,
                    data: { processed: 0, errors: [] }
                });
            }

            const errors = [];
            let processed = 0;

            for (const sale of sales) {
                try {
                    // Verificar si la venta ya existe
                    const existing = await prisma.sale.findUnique({
                        where: { id: sale.id }
                    });

                    if (existing) {
                        errors.push({ saleId: sale.id, error: 'Ya existe en el maestro' });
                        continue;
                    }

                    // Insertar venta con sus relaciones
                    await prisma.sale.create({
                        data: {
                            id: sale.id,
                            saleNumber: sale.saleNumber,
                            documentType: sale.documentType,
                            subtotal: sale.subtotal,
                            discountAmount: sale.discountAmount || 0,
                            discountPercent: sale.discountPercent || 0,
                            taxAmount: sale.taxAmount || 0,
                            total: sale.total,
                            status: sale.status,
                            userId: sale.userId,
                            branchId: sale.branchId || branchId,
                            customerId: sale.customerId,
                            syncedToMaster: true,
                            createdAt: new Date(sale.createdAt),
                            items: {
                                create: sale.items.map(item => ({
                                    id: item.id,
                                    productId: item.productId,
                                    productName: item.productName,
                                    productSku: item.productSku,
                                    quantity: item.quantity,
                                    unitPrice: item.unitPrice,
                                    costPrice: item.costPrice || 0,
                                    discountPercent: item.discountPercent || 0,
                                    discountAmount: item.discountAmount || 0,
                                    subtotal: item.subtotal
                                }))
                            },
                            payments: {
                                create: sale.payments.map(payment => ({
                                    id: payment.id,
                                    paymentMethodId: payment.paymentMethodId,
                                    amount: payment.amount,
                                    reference: payment.reference
                                }))
                            }
                        }
                    });

                    processed++;
                } catch (err) {
                    errors.push({ saleId: sale.id, error: err.message });
                }
            }

            // Actualizar estado de sync de la sucursal
            if (branchId) {
                await prisma.branch.update({
                    where: { id: branchId },
                    data: {
                        lastSyncAt: new Date(),
                        syncStatus: errors.length === 0 ? 'synced' : 'error'
                    }
                });
            }

            // Registrar en log de sync
            await prisma.syncLog.create({
                data: {
                    id: require('uuid').v4(),
                    branchId: branchId || 'unknown',
                    type: 'PARTIAL',
                    direction: 'UPLOAD',
                    status: errors.length === 0 ? 'completed' : 'completed_with_errors',
                    recordsProcessed: processed,
                    errors: errors.length > 0 ? errors : null,
                    startedAt: new Date(),
                    completedAt: new Date()
                }
            });

            res.json({
                success: true,
                data: { processed, errors }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Error al subir ventas',
                details: [error.message]
            });
        }
    },

    /**
     * Descargar catálogo completo
     */
    async getFullCatalog(req, res) {
        try {
            const [products, categories, promotions, paymentMethods, users, branches] = await Promise.all([
                prisma.product.findMany({
                    where: { deletedAt: null },
                    include: {
                        category: { select: { id: true, name: true } },
                        supplier: { select: { id: true, businessName: true } }
                    }
                }),
                prisma.category.findMany({ where: { deletedAt: null } }),
                prisma.promotion.findMany({
                    where: { deletedAt: null },
                    include: { products: true }
                }),
                prisma.paymentMethod.findMany(),
                prisma.user.findMany({
                    where: { deletedAt: null, isActive: true },
                    select: {
                        id: true,
                        username: true,
                        firstName: true,
                        lastName: true,
                        roleId: true,
                        branchId: true
                    }
                }),
                prisma.branch.findMany({ where: { deletedAt: null } })
            ]);

            res.json({
                success: true,
                data: {
                    products: products.map(p => ({
                        ...p,
                        salePrice: parseFloat(p.salePrice),
                        costPrice: parseFloat(p.costPrice)
                    })),
                    categories,
                    promotions,
                    paymentMethods,
                    users,
                    branches,
                    lastSyncTimestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Error al obtener catálogo completo',
                details: [error.message]
            });
        }
    },

    /**
     * Estado de sincronización
     */
    async getStatus(req, res) {
        try {
            const branchId = req.user.branchId;

            if (!branchId) {
                return res.json({
                    success: true,
                    data: {
                        isMaster: true,
                        status: 'master_node'
                    }
                });
            }

            const branch = await prisma.branch.findUnique({
                where: { id: branchId }
            });

            const pendingSales = await prisma.sale.count({
                where: {
                    branchId,
                    syncedToMaster: false
                }
            });

            res.json({
                success: true,
                data: {
                    branchId,
                    branchName: branch?.name,
                    lastSync: branch?.lastSyncAt,
                    syncStatus: branch?.syncStatus || 'unknown',
                    pendingSales,
                    status: pendingSales > 0 ? 'pending' : 'synced'
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Error al obtener estado',
                details: [error.message]
            });
        }
    },

    /**
     * Actualizar precios (push del maestro)
     */
    async updatePrices(req, res) {
        try {
            const { products } = req.body;

            if (!products || products.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Sin productos',
                    details: ['Debe enviar al menos un producto']
                });
            }

            let updated = 0;
            const errors = [];

            for (const product of products) {
                try {
                    await prisma.product.update({
                        where: { id: product.id },
                        data: {
                            salePrice: product.salePrice,
                            costPrice: product.costPrice,
                            lastSyncTimestamp: new Date()
                        }
                    });
                    updated++;
                } catch (err) {
                    errors.push({ productId: product.id, error: err.message });
                }
            }

            res.json({
                success: true,
                data: { updated, errors }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Error al actualizar precios',
                details: [error.message]
            });
        }
    }
};

module.exports = syncController;
