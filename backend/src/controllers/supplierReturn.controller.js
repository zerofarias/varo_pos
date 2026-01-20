/**
 * VARO POS - Controlador de Devoluciones a Proveedor
 * Maneja devoluciones de mercadería defectuosa/vencida
 * NO afecta la caja diaria, solo descuenta stock
 */

const prisma = require('../config/database');

/**
 * Crear Devolución a Proveedor
 * - Genera Remito de Devolución
 * - Descuenta stock
 * - NO afecta caja
 */
exports.createSupplierReturn = async (req, res) => {
    try {
        const { supplierId, returnType, items, notes } = req.body;
        const userId = req.user.id;
        const branchId = req.user.branchId;

        if (!supplierId || !items || items.length === 0) {
            return res.status(400).json({
                error: 'Debe especificar proveedor e ítems a devolver'
            });
        }

        // Validar proveedor
        const supplier = await prisma.supplier.findUnique({
            where: { id: supplierId }
        });

        if (!supplier) {
            return res.status(404).json({ error: 'Proveedor no encontrado' });
        }

        // Generar número de remito
        const today = new Date();
        const datePrefix = today.toISOString().slice(0, 10).replace(/-/g, '');
        const lastReturn = await prisma.supplierReturn.findFirst({
            where: {
                returnNumber: { startsWith: `REM-DEV-${datePrefix}` }
            },
            orderBy: { returnNumber: 'desc' }
        });
        const sequence = lastReturn
            ? parseInt(lastReturn.returnNumber.split('-')[3]) + 1
            : 1;
        const returnNumber = `REM-DEV-${datePrefix}-${sequence.toString().padStart(4, '0')}`;

        // Validar productos y calcular totales
        let totalItems = 0;
        let totalValue = 0;
        const validatedItems = [];

        for (const item of items) {
            const product = await prisma.product.findUnique({
                where: { id: item.productId }
            });

            if (!product) {
                return res.status(400).json({
                    error: `Producto ${item.productId} no encontrado`
                });
            }

            // Verificar stock disponible
            if (product.manageStock && product.stockGlobal < item.quantity) {
                return res.status(400).json({
                    error: `Stock insuficiente para ${product.name}. Disponible: ${product.stockGlobal}`
                });
            }

            const itemCost = Number(product.costPrice) * item.quantity;
            totalItems += item.quantity;
            totalValue += itemCost;

            validatedItems.push({
                productId: item.productId,
                productName: product.name,
                productSku: product.sku,
                quantity: item.quantity,
                unitCost: product.costPrice,
                subtotal: itemCost,
                reason: item.reason || returnType,
                expirationDate: item.expirationDate ? new Date(item.expirationDate) : null,
                batchNumber: item.batchNumber
            });
        }

        // Transacción: crear devolución + descontar stock
        const result = await prisma.$transaction(async (tx) => {
            // 1. Crear el remito de devolución
            const supplierReturn = await tx.supplierReturn.create({
                data: {
                    returnNumber,
                    supplierId,
                    branchId,
                    userId,
                    returnType: returnType || 'DEFECTIVE',
                    totalItems,
                    totalValue,
                    status: 'pending',
                    notes,
                    items: {
                        create: validatedItems
                    }
                },
                include: {
                    supplier: { select: { businessName: true } },
                    items: { include: { product: true } },
                    user: { select: { firstName: true, lastName: true } }
                }
            });

            // 2. Descontar stock (NO afecta caja)
            for (const item of validatedItems) {
                const product = await tx.product.findUnique({
                    where: { id: item.productId }
                });

                if (product && product.manageStock) {
                    const newStock = product.stockGlobal - item.quantity;

                    await tx.product.update({
                        where: { id: item.productId },
                        data: { stockGlobal: newStock }
                    });

                    // Registrar movimiento de stock
                    await tx.stockMovement.create({
                        data: {
                            productId: item.productId,
                            branchId,
                            userId,
                            type: 'OUT',
                            reason: 'SUPPLIER_RETURN',
                            quantity: -item.quantity,
                            previousQty: product.stockGlobal,
                            newQty: newStock,
                            reference: returnNumber,
                            notes: `Devolución a proveedor: ${item.reason || returnType}`
                        }
                    });
                }
            }

            return supplierReturn;
        });

        res.status(201).json({
            message: 'Remito de devolución generado exitosamente',
            data: result
        });

    } catch (error) {
        console.error('Error creating supplier return:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Obtener lista de devoluciones a proveedor
 */
exports.getSupplierReturns = async (req, res) => {
    try {
        const { supplierId, status, startDate, endDate, limit = 50, page = 1 } = req.query;

        const where = {};

        if (supplierId) where.supplierId = supplierId;
        if (status) where.status = status;

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                where.createdAt.lte = end;
            }
        }

        const [returns, total] = await Promise.all([
            prisma.supplierReturn.findMany({
                where,
                include: {
                    supplier: { select: { businessName: true, code: true } },
                    user: { select: { firstName: true, lastName: true } },
                    branch: { select: { name: true } },
                    _count: { select: { items: true } }
                },
                orderBy: { createdAt: 'desc' },
                take: parseInt(limit),
                skip: (parseInt(page) - 1) * parseInt(limit)
            }),
            prisma.supplierReturn.count({ where })
        ]);

        res.json({
            data: returns,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('Error fetching supplier returns:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Obtener detalle de un remito de devolución
 */
exports.getSupplierReturnById = async (req, res) => {
    try {
        const { id } = req.params;

        const supplierReturn = await prisma.supplierReturn.findUnique({
            where: { id },
            include: {
                supplier: true,
                branch: true,
                user: { select: { firstName: true, lastName: true } },
                items: { include: { product: true } }
            }
        });

        if (!supplierReturn) {
            return res.status(404).json({ error: 'Remito de devolución no encontrado' });
        }

        res.json({ data: supplierReturn });

    } catch (error) {
        console.error('Error fetching supplier return:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Actualizar estado de devolución
 */
exports.updateSupplierReturnStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, supplierRef, notes } = req.body;

        const validStatuses = ['pending', 'approved', 'completed', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                error: `Estado inválido. Valores permitidos: ${validStatuses.join(', ')}`
            });
        }

        const supplierReturn = await prisma.supplierReturn.update({
            where: { id },
            data: {
                status,
                supplierRef: supplierRef || undefined,
                notes: notes || undefined
            },
            include: {
                supplier: { select: { businessName: true } },
                items: true
            }
        });

        res.json({
            message: 'Estado actualizado',
            data: supplierReturn
        });

    } catch (error) {
        console.error('Error updating supplier return:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Cancelar devolución (repone stock si aún no fue procesada)
 */
exports.cancelSupplierReturn = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const branchId = req.user.branchId;

        const supplierReturn = await prisma.supplierReturn.findUnique({
            where: { id },
            include: { items: true }
        });

        if (!supplierReturn) {
            return res.status(404).json({ error: 'Remito no encontrado' });
        }

        if (supplierReturn.status === 'completed') {
            return res.status(400).json({
                error: 'No se puede cancelar una devolución ya completada'
            });
        }

        if (supplierReturn.status === 'cancelled') {
            return res.status(400).json({ error: 'La devolución ya está cancelada' });
        }

        // Transacción: cancelar + reponer stock
        const result = await prisma.$transaction(async (tx) => {
            // 1. Marcar como cancelada
            const updated = await tx.supplierReturn.update({
                where: { id },
                data: { status: 'cancelled' }
            });

            // 2. Reponer stock
            for (const item of supplierReturn.items) {
                const product = await tx.product.findUnique({
                    where: { id: item.productId }
                });

                if (product && product.manageStock) {
                    const newStock = product.stockGlobal + item.quantity;

                    await tx.product.update({
                        where: { id: item.productId },
                        data: { stockGlobal: newStock }
                    });

                    await tx.stockMovement.create({
                        data: {
                            productId: item.productId,
                            branchId,
                            userId,
                            type: 'IN',
                            reason: 'SUPPLIER_RETURN',
                            quantity: item.quantity,
                            previousQty: product.stockGlobal,
                            newQty: newStock,
                            reference: supplierReturn.returnNumber,
                            notes: 'Cancelación de remito de devolución'
                        }
                    });
                }
            }

            return updated;
        });

        res.json({
            message: 'Remito cancelado y stock repuesto',
            data: result
        });

    } catch (error) {
        console.error('Error cancelling supplier return:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Reporte de devoluciones por proveedor
 */
exports.getReturnsBySupplierReport = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const where = { status: { not: 'cancelled' } };

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                where.createdAt.lte = end;
            }
        }

        const returns = await prisma.supplierReturn.groupBy({
            by: ['supplierId'],
            where,
            _count: { id: true },
            _sum: { totalValue: true, totalItems: true }
        });

        // Obtener nombres de proveedores
        const supplierIds = returns.map(r => r.supplierId);
        const suppliers = await prisma.supplier.findMany({
            where: { id: { in: supplierIds } },
            select: { id: true, businessName: true, code: true }
        });

        const report = returns.map(r => {
            const supplier = suppliers.find(s => s.id === r.supplierId);
            return {
                supplierId: r.supplierId,
                supplierName: supplier?.businessName,
                supplierCode: supplier?.code,
                totalReturns: r._count.id,
                totalItems: r._sum.totalItems || 0,
                totalValue: Number(r._sum.totalValue) || 0
            };
        });

        res.json({
            data: report.sort((a, b) => b.totalValue - a.totalValue)
        });

    } catch (error) {
        console.error('Error generating returns report:', error);
        res.status(500).json({ error: error.message });
    }
};
