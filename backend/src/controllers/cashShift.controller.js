/**
 * VARO POS - Controlador de Turnos de Caja (CashShift)
 * Gestión de sesiones de empleados con arqueo por turno
 */

const prisma = require('../config/database');

/**
 * Abrir Turno de Caja
 */
exports.openShift = async (req, res) => {
    try {
        const { cashRegisterId, openingCash } = req.body;
        const userId = req.user.id;

        // Verificar que no tenga un turno abierto
        const existingShift = await prisma.cashShift.findFirst({
            where: {
                userId,
                status: 'OPEN'
            }
        });

        if (existingShift) {
            return res.status(400).json({
                error: 'Ya tiene un turno abierto. Ciérrelo antes de abrir otro.'
            });
        }

        // Verificar que la caja exista
        const cashRegister = await prisma.cashRegister.findUnique({
            where: { id: cashRegisterId }
        });

        if (!cashRegister) {
            return res.status(404).json({ error: 'Caja no encontrada' });
        }

        // Generar número de turno
        const today = new Date();
        const datePrefix = today.toISOString().slice(0, 10).replace(/-/g, '');
        const lastShift = await prisma.cashShift.findFirst({
            where: {
                shiftNumber: { startsWith: `TURNO-${datePrefix}` }
            },
            orderBy: { shiftNumber: 'desc' }
        });
        const sequence = lastShift
            ? parseInt(lastShift.shiftNumber.split('-')[2]) + 1
            : 1;
        const shiftNumber = `TURNO-${datePrefix}-${sequence.toString().padStart(3, '0')}`;

        const opening = parseFloat(openingCash) || 0;

        const shift = await prisma.cashShift.create({
            data: {
                shiftNumber,
                cashRegisterId,
                userId,
                status: 'OPEN',
                openingCash: opening,
                expectedCash: opening,
                movements: {
                    create: {
                        userId,
                        type: 'IN',
                        reason: 'OPENING',
                        amount: opening,
                        balance: opening,
                        description: 'Apertura de turno'
                    }
                }
            },
            include: {
                cashRegister: { select: { name: true, code: true } },
                user: { select: { firstName: true, lastName: true } }
            }
        });

        res.status(201).json({
            message: 'Turno abierto exitosamente',
            data: shift
        });

    } catch (error) {
        console.error('Error opening shift:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Obtener turno activo del usuario
 */
exports.getActiveShift = async (req, res) => {
    try {
        const userId = req.user.id;

        const shift = await prisma.cashShift.findFirst({
            where: {
                userId,
                status: 'OPEN'
            },
            include: {
                cashRegister: { select: { name: true, code: true } },
                user: { select: { firstName: true, lastName: true } },
                movements: {
                    orderBy: { createdAt: 'desc' },
                    take: 20
                },
                _count: { select: { sales: true } }
            }
        });

        if (!shift) {
            return res.json({
                data: null,
                message: 'No hay turno activo'
            });
        }

        // Calcular métricas en tiempo real
        const sales = await prisma.sale.findMany({
            where: {
                cashShiftId: shift.id,
                status: 'COMPLETED',
                isCreditNote: false
            },
            include: {
                payments: { include: { paymentMethod: true } }
            }
        });

        const metrics = {
            transactionCount: sales.length,
            totalSales: sales.reduce((sum, s) => sum + Number(s.total), 0),
            avgTicket: sales.length > 0
                ? sales.reduce((sum, s) => sum + Number(s.total), 0) / sales.length
                : 0,
            byPaymentMethod: {}
        };

        // Agrupar por método de pago
        sales.forEach(sale => {
            sale.payments.forEach(payment => {
                const methodName = payment.paymentMethod.name;
                if (!metrics.byPaymentMethod[methodName]) {
                    metrics.byPaymentMethod[methodName] = { count: 0, total: 0 };
                }
                metrics.byPaymentMethod[methodName].count++;
                metrics.byPaymentMethod[methodName].total += Number(payment.amount);
            });
        });

        res.json({
            data: {
                ...shift,
                metrics
            }
        });

    } catch (error) {
        console.error('Error fetching active shift:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Cerrar Turno de Caja (Arqueo)
 */
exports.closeShift = async (req, res) => {
    try {
        const { id } = req.params;
        const { countedCash, closingNotes } = req.body;
        const userId = req.user.id;

        const shift = await prisma.cashShift.findUnique({
            where: { id },
            include: {
                cashRegister: true,
                user: { select: { firstName: true, lastName: true } }
            }
        });

        if (!shift) {
            return res.status(404).json({ error: 'Turno no encontrado' });
        }

        if (shift.status !== 'OPEN') {
            return res.status(400).json({ error: 'El turno ya está cerrado' });
        }

        // Verificar que sea el usuario dueño del turno (o admin)
        if (shift.userId !== userId && req.user.role?.name !== 'Admin') {
            return res.status(403).json({ error: 'Solo el usuario del turno puede cerrarlo' });
        }

        const counted = parseFloat(countedCash) || 0;
        const difference = counted - Number(shift.expectedCash);

        const closedShift = await prisma.$transaction(async (tx) => {
            // 1. Actualizar turno
            const updated = await tx.cashShift.update({
                where: { id },
                data: {
                    status: 'CLOSED',
                    closedAt: new Date(),
                    countedCash: counted,
                    cashDifference: difference,
                    closingNotes
                },
                include: {
                    cashRegister: true,
                    user: { select: { firstName: true, lastName: true } }
                }
            });

            // 2. Registrar movimiento de cierre
            await tx.cashMovement.create({
                data: {
                    cashShiftId: id,
                    userId,
                    type: 'OUT',
                    reason: 'CLOSING',
                    amount: counted,
                    balance: 0,
                    description: `Cierre de turno${difference !== 0 ? ` (diferencia: $${difference.toFixed(2)})` : ''}`
                }
            });

            return updated;
        });

        res.json({
            message: 'Turno cerrado exitosamente',
            data: {
                ...closedShift,
                summary: {
                    openingCash: Number(shift.openingCash),
                    totalSales: Number(shift.totalSales),
                    totalCreditNotes: Number(shift.totalCreditNotes),
                    totalCashIn: Number(shift.totalCashIn),
                    totalCashOut: Number(shift.totalCashOut),
                    expectedCash: Number(shift.expectedCash),
                    countedCash: counted,
                    difference
                }
            }
        });

    } catch (error) {
        console.error('Error closing shift:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Registrar movimiento de caja en el turno
 */
exports.addMovement = async (req, res) => {
    try {
        const { id } = req.params;
        const { type, reason, amount, description } = req.body;
        const userId = req.user.id;

        const shift = await prisma.cashShift.findUnique({
            where: { id }
        });

        if (!shift || shift.status !== 'OPEN') {
            return res.status(400).json({ error: 'Turno no válido o cerrado' });
        }

        const movementAmount = parseFloat(amount);
        if (isNaN(movementAmount) || movementAmount <= 0) {
            return res.status(400).json({ error: 'Monto inválido' });
        }

        const isIncome = type === 'IN';
        const newBalance = isIncome
            ? Number(shift.expectedCash) + movementAmount
            : Number(shift.expectedCash) - movementAmount;

        const result = await prisma.$transaction(async (tx) => {
            // 1. Crear movimiento
            const movement = await tx.cashMovement.create({
                data: {
                    cashShiftId: id,
                    userId,
                    type,
                    reason: reason || (isIncome ? 'DEPOSIT' : 'WITHDRAWAL'),
                    amount: movementAmount,
                    balance: newBalance,
                    description
                }
            });

            // 2. Actualizar saldo esperado del turno
            const updateData = {
                expectedCash: newBalance
            };

            if (isIncome) {
                updateData.totalCashIn = { increment: movementAmount };
            } else {
                updateData.totalCashOut = { increment: movementAmount };
            }

            await tx.cashShift.update({
                where: { id },
                data: updateData
            });

            return movement;
        });

        res.json({
            message: 'Movimiento registrado',
            data: result
        });

    } catch (error) {
        console.error('Error adding movement:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Dashboard de Control: Ver turnos de todos los empleados
 */
exports.getShiftsDashboard = async (req, res) => {
    try {
        const { date, userId: filterUserId, status } = req.query;

        const targetDate = date ? new Date(date) : new Date();
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        const where = {
            openedAt: {
                gte: startOfDay,
                lte: endOfDay
            }
        };

        if (filterUserId) where.userId = filterUserId;
        if (status) where.status = status;

        const shifts = await prisma.cashShift.findMany({
            where,
            include: {
                cashRegister: { select: { name: true, code: true } },
                user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
                _count: { select: { sales: true, movements: true } }
            },
            orderBy: { openedAt: 'desc' }
        });

        // Calcular métricas por turno
        const shiftsWithMetrics = await Promise.all(shifts.map(async (shift) => {
            const sales = await prisma.sale.findMany({
                where: {
                    cashShiftId: shift.id,
                    status: 'COMPLETED'
                }
            });

            const regularSales = sales.filter(s => !s.isCreditNote);
            const creditNotes = sales.filter(s => s.isCreditNote);

            // Desglose por método de pago para ESTE turno
            const byPaymentMethod = {};
            regularSales.forEach(sale => {
                sale.payments.forEach(p => {
                    const method = p.paymentMethod.name;
                    if (!byPaymentMethod[method]) byPaymentMethod[method] = 0;
                    byPaymentMethod[method] += Number(p.amount);
                });
            });

            return {
                ...shift,
                metrics: {
                    transactionCount: regularSales.length,
                    creditNoteCount: creditNotes.length,
                    totalSales: regularSales.reduce((sum, s) => sum + Number(s.total), 0),
                    totalCreditNotes: creditNotes.reduce((sum, s) => sum + Math.abs(Number(s.total)), 0),
                    netSales: regularSales.reduce((sum, s) => sum + Number(s.total), 0)
                        - creditNotes.reduce((sum, s) => sum + Math.abs(Number(s.total)), 0),
                    avgTicket: regularSales.length > 0
                        ? regularSales.reduce((sum, s) => sum + Number(s.total), 0) / regularSales.length
                        : 0,
                    byPaymentMethod // Desglose individual
                }
            };
        }));

        // Obtener TODAS las ventas de los turnos filtrados para calcular globales
        const allSales = await prisma.sale.findMany({
            where: {
                cashShiftId: { in: shifts.map(s => s.id) },
                status: 'COMPLETED',
                // isCreditNote: false // Incluimos notas de crédito para restar? Normalmente reportes financieros muestran Neto.
                // Mejor filtrar y procesar en memoria para exactitud
            },
            include: {
                payments: { include: { paymentMethod: true } },
                cashShift: { include: { cashRegister: true } } // Para agrupar por caja
            }
        });

        // Agrupar por Método de Pago y Caja
        const byPaymentMethod = {};
        const byCashRegister = {};

        allSales.forEach(sale => {
            const isCreditNote = sale.isCreditNote;
            const multiplier = isCreditNote ? -1 : 1;

            // Por Método de Pago
            sale.payments.forEach(p => {
                const method = p.paymentMethod.name;
                if (!byPaymentMethod[method]) byPaymentMethod[method] = 0;
                byPaymentMethod[method] += Number(p.amount) * multiplier;
            });

            // Por Caja
            if (sale.cashShift?.cashRegister) {
                const register = sale.cashShift.cashRegister.name;
                if (!byCashRegister[register]) byCashRegister[register] = 0;
                byCashRegister[register] += Number(sale.total) * multiplier; // Asignamos total de venta a la caja
            }
        });

        res.json({
            data: shiftsWithMetrics,
            summary: {
                totalShifts: shifts.length,
                openShifts: shifts.filter(s => s.status === 'OPEN').length,
                closedShifts: shifts.filter(s => s.status === 'CLOSED').length,
                totalNetSales: shiftsWithMetrics.reduce((sum, s) => sum + s.metrics.netSales, 0),
                byPaymentMethod, // Nuevo
                byCashRegister   // Nuevo
            }
        });

    } catch (error) {
        console.error('Error fetching shifts dashboard:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Métricas por Cajero
 */
exports.getCashierMetrics = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
        const end = endDate ? new Date(endDate) : new Date();
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        // Obtener todos los turnos del período
        const shifts = await prisma.cashShift.findMany({
            where: {
                openedAt: { gte: start, lte: end }
            },
            include: {
                user: { select: { id: true, firstName: true, lastName: true, avatar: true } }
            }
        });

        // Obtener ventas agrupadas por usuario
        const salesByUser = await prisma.sale.groupBy({
            by: ['userId'],
            where: {
                createdAt: { gte: start, lte: end },
                status: 'COMPLETED',
                isCreditNote: false
            },
            _count: { id: true },
            _sum: { total: true }
        });

        // Construir reporte por cajero
        const userIds = [...new Set(shifts.map(s => s.userId))];
        const users = await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, firstName: true, lastName: true, avatar: true }
        });

        const metrics = users.map(user => {
            const userShifts = shifts.filter(s => s.userId === user.id);
            const userSales = salesByUser.find(s => s.userId === user.id);

            const totalSales = Number(userSales?._sum?.total) || 0;
            const totalTransactions = userSales?._count?.id || 0;

            return {
                userId: user.id,
                userName: `${user.firstName} ${user.lastName}`,
                avatar: user.avatar,
                shifts: userShifts.length,
                totalSales,
                totalTransactions,
                avgTicket: totalTransactions > 0 ? totalSales / totalTransactions : 0,
                avgSalesPerShift: userShifts.length > 0 ? totalSales / userShifts.length : 0,
                totalHours: userShifts.reduce((sum, s) => {
                    if (s.closedAt) {
                        return sum + (new Date(s.closedAt) - new Date(s.openedAt)) / (1000 * 60 * 60);
                    }
                    return sum;
                }, 0)
            };
        });

        res.json({
            data: metrics.sort((a, b) => b.totalSales - a.totalSales),
            period: { start, end }
        });

    } catch (error) {
        console.error('Error fetching cashier metrics:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Comparativo Hoy vs Ayer (por hora)
 */
exports.getShiftComparison = async (req, res) => {
    try {
        const { cashRegisterId } = req.query;

        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const todayStart = new Date(today);
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(today);
        todayEnd.setHours(23, 59, 59, 999);

        const yesterdayStart = new Date(yesterday);
        yesterdayStart.setHours(0, 0, 0, 0);
        const yesterdayEnd = new Date(yesterday);
        yesterdayEnd.setHours(23, 59, 59, 999);

        const where = {
            status: 'COMPLETED',
            isCreditNote: false
        };
        if (cashRegisterId) where.cashShift = { cashRegisterId };

        // Ventas de hoy
        const todaySales = await prisma.sale.findMany({
            where: {
                ...where,
                createdAt: { gte: todayStart, lte: todayEnd }
            },
            select: { total: true, createdAt: true }
        });

        // Ventas de ayer
        const yesterdaySales = await prisma.sale.findMany({
            where: {
                ...where,
                createdAt: { gte: yesterdayStart, lte: yesterdayEnd }
            },
            select: { total: true, createdAt: true }
        });

        // Agrupar por hora
        const groupByHour = (sales) => {
            const hours = {};
            for (let i = 0; i < 24; i++) {
                hours[i] = { hour: i, count: 0, total: 0 };
            }
            sales.forEach(sale => {
                const hour = new Date(sale.createdAt).getHours();
                hours[hour].count++;
                hours[hour].total += Number(sale.total);
            });
            return Object.values(hours);
        };

        const todayByHour = groupByHour(todaySales);
        const yesterdayByHour = groupByHour(yesterdaySales);

        // Combinar para el gráfico
        const comparison = todayByHour.map((h, i) => ({
            hour: `${h.hour.toString().padStart(2, '0')}:00`,
            hoy: h.total,
            hoyCount: h.count,
            ayer: yesterdayByHour[i].total,
            ayerCount: yesterdayByHour[i].count
        }));

        res.json({
            data: comparison,
            summary: {
                today: {
                    total: todaySales.reduce((sum, s) => sum + Number(s.total), 0),
                    count: todaySales.length
                },
                yesterday: {
                    total: yesterdaySales.reduce((sum, s) => sum + Number(s.total), 0),
                    count: yesterdaySales.length
                }
            }
        });

    } catch (error) {
        console.error('Error fetching shift comparison:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Obtener lista de cajas físicas
 */
exports.getCashRegisters = async (req, res) => {
    try {
        const registers = await prisma.cashRegister.findMany({
            where: { isActive: true },
            include: {
                branch: { select: { name: true } },
                cashShifts: {
                    where: { status: 'OPEN' },
                    include: {
                        user: { select: { firstName: true, lastName: true } }
                    },
                    take: 1
                }
            }
        });

        res.json({
            data: registers.map(r => ({
                ...r,
                isOccupied: r.cashShifts.length > 0,
                currentUser: r.cashShifts[0]?.user
            }))
        });

    } catch (error) {
        console.error('Error fetching cash registers:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Obtener historial de todos los turnos (paginado)
 */
/**
 * Obtener detalle completo de un turno específico (con ventas y movimientos)
 */
exports.getShiftDetails = async (req, res) => {
    try {
        const { id } = req.params;

        const shift = await prisma.cashShift.findUnique({
            where: { id },
            include: {
                cashRegister: { select: { name: true, code: true } },
                user: { select: { firstName: true, lastName: true, avatar: true } },
                movements: {
                    orderBy: { createdAt: 'desc' },
                    include: { user: { select: { firstName: true, lastName: true } } }
                },
                sales: {
                    where: { status: 'COMPLETED' },
                    orderBy: { createdAt: 'desc' },
                    include: {
                        items: true,
                        payments: { include: { paymentMethod: true } },
                        customer: { select: { firstName: true, lastName: true } }
                    }
                }
            }
        });

        if (!shift) {
            return res.status(404).json({ error: 'Turno no encontrado' });
        }

        // Procesar métricas detalladas
        const netSales = Number(shift.totalSales) - Number(shift.totalCreditNotes);
        const regularSales = shift.sales.filter(s => !s.isCreditNote);
        const creditNotes = shift.sales.filter(s => s.isCreditNote);

        // Desglose exacto por medio de pago basado en las ventas reales de este turno
        const byPaymentMethod = {};
        shift.sales.forEach(sale => {
            const multiplier = sale.isCreditNote ? -1 : 1;
            sale.payments.forEach(p => {
                const method = p.paymentMethod.name;
                if (!byPaymentMethod[method]) byPaymentMethod[method] = 0;
                byPaymentMethod[method] += Number(p.amount) * multiplier;
            });
        });

        const detailedShift = {
            ...shift,
            openingCash: Number(shift.openingCash),
            totalSales: Number(shift.totalSales),
            totalCashIn: Number(shift.totalCashIn),
            totalCashOut: Number(shift.totalCashOut),
            expectedCash: Number(shift.expectedCash),
            countedCash: shift.countedCash ? Number(shift.countedCash) : null,
            cashDifference: shift.cashDifference ? Number(shift.cashDifference) : null,
            metrics: {
                transactionCount: regularSales.length,
                creditNoteCount: creditNotes.length,
                totalSales: Number(shift.totalSales),
                totalCreditNotes: Number(shift.totalCreditNotes),
                netSales,
                avgTicket: regularSales.length > 0 ? Number(shift.totalSales) / regularSales.length : 0,
                byPaymentMethod
            }
        };

        res.json({
            success: true,
            data: detailedShift
        });

    } catch (error) {
        console.error('Error fetching shift details:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.getHistory = async (req, res) => {
    try {
        const { startDate, endDate, limit = 50 } = req.query;
        const where = {};

        if (startDate && endDate) {
            where.openedAt = {
                gte: new Date(new Date(startDate).setHours(0, 0, 0, 0)),
                lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
            };
        }

        const shifts = await prisma.cashShift.findMany({
            where,
            orderBy: { openedAt: 'desc' },
            take: Number(limit),
            include: {
                user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
                cashRegister: { select: { name: true, code: true } }
            }
        });

        const mappedShifts = shifts.map(s => {
            const netSales = Number(s.totalSales) - Number(s.totalCreditNotes);
            return {
                ...s,
                openingCash: Number(s.openingCash),
                totalSales: Number(s.totalSales),
                totalCashIn: Number(s.totalCashIn),
                totalCashOut: Number(s.totalCashOut),
                expectedCash: Number(s.expectedCash),
                countedCash: s.countedCash ? Number(s.countedCash) : null,
                cashDifference: s.cashDifference ? Number(s.cashDifference) : null,
                metrics: {
                    transactionCount: s.transactionCount,
                    creditNoteCount: s.creditNoteCount,
                    totalSales: Number(s.totalSales),
                    totalCreditNotes: Number(s.totalCreditNotes),
                    netSales,
                    avgTicket: s.transactionCount > 0 ? Number(s.totalSales) / s.transactionCount : 0,
                    // Desglose aproximado basado en acumuladores
                    byPaymentMethod: {
                        'Efectivo': Number(s.totalSales) - Number(s.totalByCard) - Number(s.totalByQR) - Number(s.totalByAccount),
                        'Tarjeta': Number(s.totalByCard),
                        'QR / Digital': Number(s.totalByQR),
                        'Cta. Corriente': Number(s.totalByAccount)
                    }
                }
            };
        });

        res.json({
            success: true,
            data: mappedShifts
        });

    } catch (error) {
        console.error('Error fetching history:', error);
        res.status(500).json({ error: error.message });
    }
};
