/**
 * VARO POS - Controlador de Ventas
 */

const prisma = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const saleController = {
    /**
     * Listar ventas con filtros
     */
    async getAll(req, res) {
        try {
            const {
                page = 1,
                limit = 20,
                startDate,
                endDate,
                status,
                customerId,
                userId
            } = req.query;

            const skip = (parseInt(page) - 1) * parseInt(limit);

            // Construir filtros
            const where = {
                branchId: req.user.branchId || undefined,
                deletedAt: null
            };

            if (startDate || endDate) {
                where.createdAt = {};
                if (startDate) where.createdAt.gte = new Date(startDate);
                if (endDate) {
                    const end = new Date(endDate);
                    end.setHours(23, 59, 59, 999);
                    where.createdAt.lte = end;
                }
            }

            if (status) where.status = status;
            if (customerId) where.customerId = customerId;
            if (userId) where.userId = userId;

            const [sales, total] = await Promise.all([
                prisma.sale.findMany({
                    where,
                    include: {
                        items: {
                            include: { product: { select: { name: true, sku: true, imageUrl: true } } }
                        },
                        payments: {
                            include: { paymentMethod: { select: { name: true, code: true } } }
                        },
                        customer: { select: { id: true, firstName: true, lastName: true, code: true } },
                        user: { select: { id: true, firstName: true, lastName: true, username: true } }
                    },
                    orderBy: { createdAt: 'desc' },
                    skip,
                    take: parseInt(limit)
                }),
                prisma.sale.count({ where })
            ]);

            res.json({
                success: true,
                data: sales,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / parseInt(limit))
                }
            });
        } catch (error) {
            console.error('Error al listar ventas:', error);
            res.status(500).json({
                success: false,
                error: 'Error al obtener ventas',
                details: [error.message]
            });
        }
    },

    /**
     * Obtener venta por ID
     */
    async getById(req, res) {
        try {
            const { id } = req.params;

            const sale = await prisma.sale.findUnique({
                where: { id },
                include: {
                    items: {
                        include: { product: true }
                    },
                    payments: {
                        include: { paymentMethod: true }
                    },
                    customer: true,
                    user: { select: { id: true, firstName: true, lastName: true, username: true } },
                    branch: { select: { id: true, name: true, code: true } },
                    cashRegister: true
                }
            });

            if (!sale || sale.deletedAt) {
                return res.status(404).json({
                    success: false,
                    error: 'Venta no encontrada'
                });
            }

            res.json({
                success: true,
                data: sale
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Error al obtener venta',
                details: [error.message]
            });
        }
    },

    /**
     * Crear nueva venta
     */
    async create(req, res) {
        try {
            const {
                documentType = 'TICKET_X',
                customerId,
                discountPercent = 0,
                items,
                payments,
                cashRegisterId
            } = req.body;

            // Validaciones básicas
            if (!items || items.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Venta sin productos',
                    details: ['Debe agregar al menos un producto']
                });
            }

            if (!payments || payments.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Sin método de pago',
                    details: ['Debe especificar al menos un método de pago']
                });
            }

            // Obtener productos y validar stock
            const productIds = items.map(i => i.productId);
            const products = await prisma.product.findMany({
                where: { id: { in: productIds } }
            });

            const productMap = new Map(products.map(p => [p.id, p]));

            // Validar que todos los productos existen
            for (const item of items) {
                if (!productMap.has(item.productId)) {
                    return res.status(400).json({
                        success: false,
                        error: 'Producto no encontrado',
                        details: [`Producto con ID ${item.productId} no existe`]
                    });
                }

                const product = productMap.get(item.productId);

                // Validar stock si no permite negativo y no es servicio
                if (!product.isService && !product.allowNegativeStock) {
                    if (product.stockGlobal < item.quantity) {
                        return res.status(400).json({
                            success: false,
                            error: 'Stock insuficiente',
                            details: [`Producto '${product.name}' tiene ${product.stockGlobal} unidades y se requieren ${item.quantity}`]
                        });
                    }
                }
            }

            // Obtener métodos de pago
            const paymentMethodIds = payments.map(p => p.paymentMethodId);
            const paymentMethods = await prisma.paymentMethod.findMany({
                where: { id: { in: paymentMethodIds } }
            });
            const paymentMethodMap = new Map(paymentMethods.map(pm => [pm.id, pm]));

            // Verificar cliente y límite de crédito si es cuenta corriente
            let customer = null;
            if (customerId) {
                customer = await prisma.customer.findUnique({
                    where: { id: customerId }
                });

                if (!customer) {
                    return res.status(400).json({
                        success: false,
                        error: 'Cliente no encontrado'
                    });
                }
            }

            // Calcular totales
            let subtotal = 0;
            const saleItems = items.map(item => {
                const product = productMap.get(item.productId);

                // Determinar precio unitario:
                // Si es genérico y envían precio personalizado, usarlo.
                // Si no, usar el precio de lista.
                let unitPrice = parseFloat(product.salePrice);
                if (product.isGeneric && item.unitPrice !== undefined) {
                    unitPrice = parseFloat(item.unitPrice);
                }

                const quantity = parseInt(item.quantity);
                const itemDiscountPercent = parseFloat(item.discountPercent || 0);
                const itemDiscountAmount = (unitPrice * quantity * itemDiscountPercent) / 100;
                const itemSubtotal = (unitPrice * quantity) - itemDiscountAmount;

                subtotal += itemSubtotal;

                return {
                    id: uuidv4(),
                    productId: product.id,
                    productName: product.name,
                    productSku: product.sku,
                    quantity,
                    unitPrice, // Usar el precio determinado
                    costPrice: parseFloat(product.costPrice),
                    discountPercent: itemDiscountPercent,
                    discountAmount: itemDiscountAmount,
                    subtotal: itemSubtotal
                };
            });

            // Aplicar descuento general
            const generalDiscountAmount = (subtotal * parseFloat(discountPercent)) / 100;
            const subtotalAfterDiscount = subtotal - generalDiscountAmount;

            // Calcular recargos/descuentos por método de pago
            let paymentAdjustment = 0;
            const salePayments = payments.map(payment => {
                const method = paymentMethodMap.get(payment.paymentMethodId);
                if (method) {
                    const surcharge = (parseFloat(payment.amount) * parseFloat(method.surchargePercent)) / 100;
                    const discount = (parseFloat(payment.amount) * parseFloat(method.discountPercent)) / 100;
                    paymentAdjustment += surcharge - discount;
                }
                return {
                    id: uuidv4(),
                    paymentMethodId: payment.paymentMethodId,
                    amount: parseFloat(payment.amount),
                    reference: payment.reference || null
                };
            });

            // Total final
            const total = subtotalAfterDiscount + paymentAdjustment;

            // Validar monto pagado
            const totalPaid = salePayments.reduce((sum, p) => sum + p.amount, 0);

            // Verificar si hay pago en cuenta corriente
            const accountPayment = salePayments.find(p => {
                const method = paymentMethodMap.get(p.paymentMethodId);
                return method?.isAccountPayment;
            });

            if (accountPayment) {
                if (!customer) {
                    return res.status(400).json({
                        success: false,
                        error: 'Cliente requerido',
                        details: ['Para pago en cuenta corriente debe seleccionar un cliente']
                    });
                }

                // Verificar límite de crédito
                if (customer.blockOnLimit) {
                    const newBalance = parseFloat(customer.currentBalance) + accountPayment.amount;
                    if (newBalance > parseFloat(customer.creditLimit)) {
                        return res.status(400).json({
                            success: false,
                            error: 'Límite de crédito excedido',
                            details: [`El cliente tiene un límite de $${customer.creditLimit} y el saldo sería $${newBalance}`]
                        });
                    }
                }
            }

            // 5. Integración con Turnos de Caja (CashShift)
            const activeShift = await prisma.cashShift.findFirst({
                where: {
                    userId: req.user.id,
                    status: 'OPEN'
                }
            });

            // Generar número de venta
            const branch = await prisma.branch.findUnique({
                where: { id: req.user.branchId || req.user.branch?.id }
            });
            const saleCount = await prisma.sale.count({
                where: { branchId: branch?.id }
            });
            const saleNumber = `T-${branch?.code || 'POS'}-${String(saleCount + 1).padStart(6, '0')}`;

            // Crear venta en transacción
            const sale = await prisma.$transaction(async (tx) => {
                // 1. Crear la venta
                const newSale = await tx.sale.create({
                    data: {
                        id: uuidv4(),
                        saleNumber,
                        documentType,
                        subtotal,
                        discountPercent: parseFloat(discountPercent),
                        discountAmount: generalDiscountAmount,
                        taxAmount: 0,
                        total,
                        status: 'completed',
                        userId: req.user.id,
                        branchId: branch?.id,
                        customerId: customerId || null,
                        // cashRegisterId eliminado en favor de cashShiftId
                        cashShiftId: activeShift?.id || null, // Vincular al turno
                        items: {
                            create: saleItems
                        },
                        payments: {
                            create: salePayments
                        }
                    },
                    include: {
                        items: true,
                        payments: { include: { paymentMethod: true } },
                        customer: true,
                        user: { select: { firstName: true, lastName: true } }
                    }
                });

                // 2. Descontar stock
                for (const item of items) {
                    const product = productMap.get(item.productId);
                    if (!product.isService) {
                        await tx.product.update({
                            where: { id: item.productId },
                            data: {
                                stockGlobal: { decrement: item.quantity }
                            }
                        });

                        await tx.stockMovement.create({
                            data: {
                                id: uuidv4(),
                                productId: item.productId,
                                branchId: branch?.id,
                                userId: req.user.id,
                                type: 'OUT',
                                reason: 'SALE',
                                quantity: item.quantity,
                                previousQty: product.stockGlobal,
                                newQty: product.stockGlobal - item.quantity,
                                reference: newSale.id
                            }
                        });
                    }
                }

                // 3. Actualizar cuenta corriente si aplica
                if (accountPayment && customer) {
                    const newBalance = parseFloat(customer.currentBalance) + accountPayment.amount;

                    await tx.customer.update({
                        where: { id: customer.id },
                        data: { currentBalance: newBalance }
                    });

                    await tx.customerAccountMovement.create({
                        data: {
                            id: uuidv4(),
                            customerId: customer.id,
                            type: 'DEBIT',
                            amount: accountPayment.amount,
                            balance: newBalance,
                            description: `Venta ${saleNumber}`,
                            reference: newSale.id
                        }
                    });
                }

                // 4. Actualizar Turno de Caja (Active Shift)
                if (activeShift) {
                    // Calcular pagos que afectan caja (Efectivo)
                    const cashPayments = salePayments.filter(p => {
                        const method = paymentMethodMap.get(p.paymentMethodId);
                        return method?.affectsCash; // Usar el campo correcto 'affectsCash'
                    });

                    const cashTotal = cashPayments.reduce((sum, p) => sum + p.amount, 0);

                    // Actualizar métricas del turno
                    const updateData = {
                        expectedCash: { increment: cashTotal },
                        totalSales: { increment: total }, // Total vendido en $
                        // transactionCount: { increment: 1 } // Prisma no tiene increment para contador simple en update, se calcula en query
                    };

                    if (cashTotal > 0) {
                        updateData.totalCashIn = { increment: cashTotal };
                    }

                    await tx.cashShift.update({
                        where: { id: activeShift.id },
                        data: updateData
                    });

                    // Si hubo efectivo, registrar movimiento de caja
                    if (cashTotal > 0) {
                        // Crear movimiento (sin actualizar currentAmount de CashRegister)
                        await tx.cashMovement.create({
                            data: {
                                id: uuidv4(),
                                cashShiftId: activeShift.id, // VINCULADO AL TURNO
                                // cashRegisterId eliminado
                                userId: req.user.id,
                                type: 'IN',
                                reason: 'SALE',
                                amount: cashTotal,
                                balance: Number(activeShift.expectedCash) + cashTotal, // Saldo aproximado post-movimiento
                                description: `Venta ${saleNumber}`
                            }
                        });
                    }
                }

                return newSale;
            });

            res.status(201).json({
                success: true,
                message: 'Venta registrada exitosamente',
                data: sale
            });
        } catch (error) {
            console.error('Error al crear venta:', error);
            res.status(500).json({
                success: false,
                error: 'Error al registrar venta',
                details: [error.message]
            });
        }
    },

    /**
     * Cancelar venta
     */
    async cancel(req, res) {
        try {
            const { id } = req.params;
            const { reason } = req.body;

            const sale = await prisma.sale.findUnique({
                where: { id },
                include: {
                    items: true,
                    payments: { include: { paymentMethod: true } }
                }
            });

            if (!sale) {
                return res.status(404).json({
                    success: false,
                    error: 'Venta no encontrada'
                });
            }

            if (sale.status === 'cancelled') {
                return res.status(400).json({
                    success: false,
                    error: 'Venta ya cancelada'
                });
            }

            // Cancelar en transacción
            await prisma.$transaction(async (tx) => {
                // 1. Marcar como cancelada
                await tx.sale.update({
                    where: { id },
                    data: { status: 'cancelled' }
                });

                // 2. Restaurar stock
                for (const item of sale.items) {
                    await tx.product.update({
                        where: { id: item.productId },
                        data: { stockGlobal: { increment: item.quantity } }
                    });

                    await tx.stockMovement.create({
                        data: {
                            id: uuidv4(),
                            productId: item.productId,
                            branchId: sale.branchId,
                            userId: req.user.id,
                            type: 'IN',
                            reason: 'SALE',
                            quantity: item.quantity,
                            previousQty: 0,
                            newQty: item.quantity,
                            reference: sale.id,
                            notes: `Cancelación de venta: ${reason || 'Sin motivo'}`
                        }
                    });
                }

                // 3. Revertir cuenta corriente si aplica
                if (sale.customerId) {
                    const accountPayment = sale.payments.find(p => p.paymentMethod?.isAccountPayment);
                    if (accountPayment) {
                        await tx.customer.update({
                            where: { id: sale.customerId },
                            data: { currentBalance: { decrement: accountPayment.amount } }
                        });

                        await tx.customerAccountMovement.create({
                            data: {
                                id: uuidv4(),
                                customerId: sale.customerId,
                                type: 'CREDIT',
                                amount: accountPayment.amount,
                                balance: 0, // Se actualizará con trigger
                                description: `Cancelación venta ${sale.saleNumber}`,
                                reference: sale.id
                            }
                        });
                    }
                }
            });

            res.json({
                success: true,
                message: 'Venta cancelada correctamente'
            });
        } catch (error) {
            console.error('Error al cancelar venta:', error);
            res.status(500).json({
                success: false,
                error: 'Error al cancelar venta',
                details: [error.message]
            });
        }
    },

    /**
     * Resumen diario
     */
    async getDailySummary(req, res) {
        try {
            const { date } = req.query;
            const targetDate = date ? new Date(date) : new Date();

            const startOfDay = new Date(targetDate);
            startOfDay.setHours(0, 0, 0, 0);

            const endOfDay = new Date(targetDate);
            endOfDay.setHours(23, 59, 59, 999);

            const where = {
                branchId: req.user.branchId || undefined,
                status: 'completed',
                createdAt: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            };

            const sales = await prisma.sale.findMany({
                where,
                include: {
                    payments: {
                        include: { paymentMethod: true }
                    },
                    items: true
                }
            });

            const totalSales = sales.length;
            const totalAmount = sales.reduce((sum, s) => sum + parseFloat(s.total), 0);
            const totalProfit = sales.reduce((sum, sale) => {
                const saleProfit = sale.items.reduce((itemSum, item) => {
                    return itemSum + ((parseFloat(item.unitPrice) - parseFloat(item.costPrice)) * item.quantity);
                }, 0);
                return sum + saleProfit;
            }, 0);

            // Agrupar por método de pago
            const byPaymentMethod = {};
            sales.forEach(sale => {
                sale.payments.forEach(payment => {
                    const method = payment.paymentMethod?.name || 'Desconocido';
                    if (!byPaymentMethod[method]) {
                        byPaymentMethod[method] = { total: 0, count: 0 };
                    }
                    byPaymentMethod[method].total += parseFloat(payment.amount);
                    byPaymentMethod[method].count += 1;
                });
            });

            res.json({
                success: true,
                data: {
                    date: targetDate.toISOString().split('T')[0],
                    totalSales,
                    totalAmount,
                    totalProfit,
                    averageTicket: totalSales > 0 ? totalAmount / totalSales : 0,
                    byPaymentMethod: Object.entries(byPaymentMethod).map(([method, data]) => ({
                        method,
                        ...data
                    }))
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Error al obtener resumen',
                details: [error.message]
            });
        }
    }
};

module.exports = saleController;
