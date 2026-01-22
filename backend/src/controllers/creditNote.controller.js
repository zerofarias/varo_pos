/**
 * VARO POS - Controlador de Notas de Crédito
 * Maneja devoluciones al cliente con impacto en stock y arqueo
 */

const prisma = require('../config/database');

/**
 * Crear Nota de Crédito
 * - Genera una venta negativa vinculada a la venta original
 * - Repone stock automáticamente
 * - Registra movimiento negativo en el turno de caja
 */
exports.createCreditNote = async (req, res) => {
    try {
        const { originalSaleId, reason, items, paymentMethodId } = req.body;
        const userId = req.user.id;

        // Validar que exista la venta original
        const originalSale = await prisma.sale.findUnique({
            where: { id: originalSaleId },
            include: {
                items: { include: { product: true } },
                payments: true,
                branch: true,
            }
        });

        if (!originalSale) {
            return res.status(404).json({ error: 'Venta original no encontrada' });
        }

        if (originalSale.status === 'REFUNDED') {
            return res.status(400).json({ error: 'Esta venta ya fue devuelta completamente' });
        }

        if (originalSale.isCreditNote) {
            return res.status(400).json({ error: 'No se puede crear NC de una Nota de Crédito' });
        }

        // Obtener turno de caja activo del usuario
        const activeShift = await prisma.cashShift.findFirst({
            where: {
                userId,
                status: 'OPEN'
            }
        });

        if (!activeShift) {
            return res.status(400).json({ error: 'Debe tener un turno de caja abierto' });
        }

        // Determinar qué ítems se devuelven (si no especificó, todos)
        let itemsToRefund = items;
        if (!items || items.length === 0) {
            // Devolución completa
            itemsToRefund = originalSale.items.map(item => ({
                productId: item.productId,
                quantity: item.quantity
            }));
        }

        // Validar que los ítems existan en la venta original
        for (const item of itemsToRefund) {
            const originalItem = originalSale.items.find(oi => oi.productId === item.productId);
            if (!originalItem) {
                return res.status(400).json({
                    error: `Producto ${item.productId} no existe en la venta original`
                });
            }
            if (item.quantity > originalItem.quantity) {
                return res.status(400).json({
                    error: `No puede devolver más de ${originalItem.quantity} unidades`
                });
            }
        }

        // Generar número de NC
        const today = new Date();
        const datePrefix = today.toISOString().slice(0, 10).replace(/-/g, '');
        const lastNC = await prisma.sale.findFirst({
            where: {
                saleNumber: { startsWith: `NC-${datePrefix}` }
            },
            orderBy: { saleNumber: 'desc' }
        });
        const ncSequence = lastNC
            ? parseInt(lastNC.saleNumber.split('-')[2]) + 1
            : 1;
        const ncNumber = `NC-${datePrefix}-${ncSequence.toString().padStart(4, '0')}`;

        // Calcular totales (negativos)
        let subtotal = 0;
        const ncItems = [];

        for (const item of itemsToRefund) {
            const originalItem = originalSale.items.find(oi => oi.productId === item.productId);
            const itemSubtotal = Number(originalItem.unitPrice) * item.quantity;
            subtotal += itemSubtotal;

            ncItems.push({
                productId: item.productId,
                productName: originalItem.productName,
                productSku: originalItem.productSku,
                quantity: item.quantity, // Positivo para NC (representa cantidad devuelta)
                unitPrice: originalItem.unitPrice,
                costPrice: originalItem.costPrice,
                discountPercent: originalItem.discountPercent,
                discountAmount: originalItem.discountAmount,
                subtotal: itemSubtotal
            });
        }

        const totalNC = subtotal; // Valor positivo en la NC pero impacta negativamente

        // Transacción: crear NC + reponer stock + registrar movimiento
        const result = await prisma.$transaction(async (tx) => {
            // 1. Crear la Nota de Crédito
            const creditNote = await tx.sale.create({
                data: {
                    saleNumber: ncNumber,
                    documentType: originalSale.documentType.replace('FACTURA_', 'NOTA_CREDITO_').replace('TICKET_X', 'NC_X'),
                    subtotal: -subtotal,
                    discountAmount: 0,
                    discountPercent: 0,
                    taxAmount: -(Number(originalSale.taxAmount) * (subtotal / Number(originalSale.subtotal))),
                    total: -totalNC,
                    status: 'COMPLETED',
                    isCreditNote: true,
                    originalSaleId: originalSaleId,
                    creditNoteReason: reason || 'CUSTOMER_RETURN',
                    userId,
                    branchId: originalSale.branchId,
                    customerId: originalSale.customerId,
                    cashShiftId: activeShift.id,
                    items: {
                        create: ncItems.map(item => ({
                            ...item,
                            subtotal: -item.subtotal // Negativos en la BD
                        }))
                    },
                    payments: {
                        create: [{
                            paymentMethodId: paymentMethodId || originalSale.payments[0]?.paymentMethodId,
                            amount: -totalNC
                        }]
                    }
                },
                include: {
                    items: true,
                    payments: { include: { paymentMethod: true } }
                }
            });

            // 2. Marcar venta original como REFUNDED si es devolución completa
            const isFullRefund = itemsToRefund.every(item => {
                const orig = originalSale.items.find(oi => oi.productId === item.productId);
                return item.quantity === orig.quantity;
            }) && itemsToRefund.length === originalSale.items.length;

            if (isFullRefund) {
                await tx.sale.update({
                    where: { id: originalSaleId },
                    data: { status: 'REFUNDED' }
                });
            }

            // 3. Reponer Stock (+1 para cada ítem devuelto)
            for (const item of itemsToRefund) {
                const product = await tx.product.findUnique({
                    where: { id: item.productId }
                });

                // Solo reponer si el producto gestiona stock
                if (product && product.manageStock) {
                    const newStock = product.stockGlobal + item.quantity;

                    await tx.product.update({
                        where: { id: item.productId },
                        data: { stockGlobal: newStock }
                    });

                    // Registrar movimiento de stock
                    await tx.stockMovement.create({
                        data: {
                            productId: item.productId,
                            branchId: originalSale.branchId,
                            userId,
                            type: 'IN',
                            reason: 'CREDIT_NOTE',
                            quantity: item.quantity,
                            previousQty: product.stockGlobal,
                            newQty: newStock,
                            reference: ncNumber,
                            notes: `Devolución de venta ${originalSale.saleNumber}`
                        }
                    });
                }
            }

            // 4. Actualizar el turno de caja
            const paymentMethod = await tx.paymentMethod.findUnique({
                where: { id: paymentMethodId || originalSale.payments[0]?.paymentMethodId }
            });

            const updateData = {
                totalCreditNotes: { increment: totalNC },
                creditNoteCount: { increment: 1 }
            };

            // Si afecta efectivo, crear movimiento de egreso
            if (paymentMethod?.affectsCash) {
                updateData.totalCashOut = { increment: totalNC };
                updateData.expectedCash = { decrement: totalNC };

                await tx.cashMovement.create({
                    data: {
                        cashShift: { connect: { id: activeShift.id } },
                        user: { connect: { id: userId } },
                        type: 'OUT',
                        reason: 'CREDIT_NOTE',
                        amount: totalNC,
                        balance: Number(activeShift.expectedCash) - totalNC,
                        description: `Devolución ${ncNumber}`,
                        saleId: creditNote.id
                    }
                });
            } else if (paymentMethod?.code === 'DEBITO' || paymentMethod?.code === 'CREDITO') {
                updateData.totalByCard = { decrement: totalNC };
            } else if (paymentMethod?.code === 'MERCADOPAGO') {
                updateData.totalByQR = { decrement: totalNC };
            }

            await tx.cashShift.update({
                where: { id: activeShift.id },
                data: updateData
            });

            return creditNote;
        });

        res.status(201).json({
            message: 'Nota de Crédito generada exitosamente',
            data: result
        });

    } catch (error) {
        console.error('Error creating credit note:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Obtener Notas de Crédito
 */
exports.getCreditNotes = async (req, res) => {
    try {
        const { startDate, endDate, limit = 50, page = 1 } = req.query;

        const where = {
            isCreditNote: true,
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

        const [creditNotes, total] = await Promise.all([
            prisma.sale.findMany({
                where,
                include: {
                    originalSale: { select: { saleNumber: true, total: true } },
                    user: { select: { firstName: true, lastName: true } },
                    customer: { select: { firstName: true, lastName: true } },
                    items: true
                },
                orderBy: { createdAt: 'desc' },
                take: parseInt(limit),
                skip: (parseInt(page) - 1) * parseInt(limit)
            }),
            prisma.sale.count({ where })
        ]);

        res.json({
            data: creditNotes.map(nc => ({
                ...nc,
                total: Math.abs(Number(nc.total)) // Mostrar como positivo
            })),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('Error fetching credit notes:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Obtener detalle de una NC
 */
exports.getCreditNoteById = async (req, res) => {
    try {
        const { id } = req.params;

        const creditNote = await prisma.sale.findFirst({
            where: {
                id,
                isCreditNote: true
            },
            include: {
                originalSale: {
                    select: {
                        id: true,
                        saleNumber: true,
                        total: true,
                        createdAt: true
                    }
                },
                user: { select: { firstName: true, lastName: true } },
                customer: true,
                items: { include: { product: true } },
                payments: { include: { paymentMethod: true } }
            }
        });

        if (!creditNote) {
            return res.status(404).json({ error: 'Nota de Crédito no encontrada' });
        }

        res.json({
            data: {
                ...creditNote,
                total: Math.abs(Number(creditNote.total))
            }
        });

    } catch (error) {
        console.error('Error fetching credit note:', error);
        res.status(500).json({ error: error.message });
    }
};
