/**
 * VARO POS - Controlador de Clientes
 */

const prisma = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const customerController = {
    /**
     * Listar clientes
     */
    async getAll(req, res) {
        try {
            const { search, withDebt, page = 1, limit = 50 } = req.query;
            const skip = (parseInt(page) - 1) * parseInt(limit);

            const where = { deletedAt: null, isActive: true };

            if (search) {
                where.OR = [
                    { firstName: { contains: search } },
                    { lastName: { contains: search } },
                    { documentNumber: { contains: search } },
                    { code: { contains: search } }
                ];
            }

            if (withDebt === 'true') {
                where.currentBalance = { gt: 0 };
            }

            const [customers, total] = await Promise.all([
                prisma.customer.findMany({
                    where,
                    orderBy: { lastName: 'asc' },
                    skip,
                    take: parseInt(limit)
                }),
                prisma.customer.count({ where })
            ]);

            const customersWithStatus = customers.map(c => ({
                ...c,
                fullName: `${c.firstName} ${c.lastName}`,
                currentBalance: parseFloat(c.currentBalance),
                creditLimit: parseFloat(c.creditLimit),
                debtStatus: getDebtStatus(c)
            }));

            res.json({
                success: true,
                data: customersWithStatus,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / parseInt(limit))
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Error al obtener clientes',
                details: [error.message]
            });
        }
    },

    /**
     * Obtener cliente por ID
     */
    async getById(req, res) {
        try {
            const { id } = req.params;

            const customer = await prisma.customer.findUnique({
                where: { id },
                include: {
                    accountMovements: {
                        orderBy: { createdAt: 'desc' },
                        take: 20
                    }
                }
            });

            if (!customer || customer.deletedAt) {
                return res.status(404).json({
                    success: false,
                    error: 'Cliente no encontrado'
                });
            }

            res.json({
                success: true,
                data: {
                    ...customer,
                    fullName: `${customer.firstName} ${customer.lastName}`,
                    currentBalance: parseFloat(customer.currentBalance),
                    creditLimit: parseFloat(customer.creditLimit),
                    debtStatus: getDebtStatus(customer)
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Error al obtener cliente',
                details: [error.message]
            });
        }
    },

    /**
     * Crear cliente
     */
    async create(req, res) {
        try {
            const {
                firstName,
                lastName,
                documentType = 'DNI',
                documentNumber,
                taxId,
                taxCondition = 'CONSUMIDOR_FINAL',
                email,
                phone,
                address,
                city,
                state,
                creditLimit = 0,
                alertOnDebt = true,
                blockOnLimit = false,
                maxDebtDays = 30,
                notes
            } = req.body;

            if (!firstName || !lastName) {
                return res.status(400).json({
                    success: false,
                    error: 'Datos incompletos',
                    details: ['Nombre y apellido son requeridos']
                });
            }

            // Generar código único
            const count = await prisma.customer.count();
            const code = `CLI${String(count + 1).padStart(5, '0')}`;

            const customer = await prisma.customer.create({
                data: {
                    id: uuidv4(),
                    code,
                    firstName,
                    lastName,
                    documentType,
                    documentNumber,
                    taxId,
                    taxCondition,
                    email,
                    phone,
                    address,
                    city,
                    state,
                    creditLimit,
                    currentBalance: 0,
                    alertOnDebt,
                    blockOnLimit,
                    maxDebtDays,
                    notes
                }
            });

            res.status(201).json({
                success: true,
                message: 'Cliente creado exitosamente',
                data: customer
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Error al crear cliente',
                details: [error.message]
            });
        }
    },

    /**
     * Actualizar cliente
     */
    async update(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;

            const customer = await prisma.customer.findUnique({ where: { id } });

            if (!customer || customer.deletedAt) {
                return res.status(404).json({
                    success: false,
                    error: 'Cliente no encontrado'
                });
            }

            const updatedCustomer = await prisma.customer.update({
                where: { id },
                data: updateData
            });

            res.json({
                success: true,
                message: 'Cliente actualizado',
                data: updatedCustomer
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Error al actualizar cliente',
                details: [error.message]
            });
        }
    },

    /**
     * Eliminar cliente (soft delete)
     */
    async delete(req, res) {
        try {
            const { id } = req.params;

            const customer = await prisma.customer.findUnique({ where: { id } });

            if (!customer) {
                return res.status(404).json({
                    success: false,
                    error: 'Cliente no encontrado'
                });
            }

            // No eliminar si tiene deuda pendiente
            if (parseFloat(customer.currentBalance) > 0) {
                return res.status(400).json({
                    success: false,
                    error: 'No se puede eliminar',
                    details: ['El cliente tiene deuda pendiente']
                });
            }

            await prisma.customer.update({
                where: { id },
                data: { deletedAt: new Date() }
            });

            res.json({
                success: true,
                message: 'Cliente eliminado'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Error al eliminar cliente',
                details: [error.message]
            });
        }
    },

    /**
     * Registrar pago de cuenta corriente
     */
    async registerPayment(req, res) {
        try {
            const { id } = req.params;
            const { amount, description, reference } = req.body;

            if (!amount || amount <= 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Monto inválido',
                    details: ['El monto debe ser mayor a 0']
                });
            }

            // 1. Obtener cliente
            const customer = await prisma.customer.findUnique({ where: { id } });
            if (!customer || customer.deletedAt) {
                return res.status(404).json({
                    success: false,
                    error: 'Cliente no encontrado'
                });
            }

            // 2. Obtener turno activo (NECESARIO para ingresar dinero)
            const activeShift = await prisma.cashShift.findFirst({
                where: {
                    userId: req.user.id,
                    status: 'OPEN'
                }
            });

            if (!activeShift) {
                return res.status(400).json({
                    success: false,
                    error: 'Caja cerrada',
                    details: ['Debe abrir su turno de caja para recibir pagos']
                });
            }

            const previousBalance = parseFloat(customer.currentBalance);
            const paymentAmount = parseFloat(amount);
            // El saldo puede quedar negativo (a favor del cliente) si paga de más
            const newBalance = previousBalance - paymentAmount;

            // 3. Obtener sucursal para el movimiento de stock/caja si fuera necesario
            // En este caso solo caja.

            await prisma.$transaction(async (tx) => {
                // A. Actualizar saldo cliente
                await tx.customer.update({
                    where: { id },
                    data: { currentBalance: newBalance }
                });

                // B. Registrar movimiento en cuenta corriente
                await tx.customerAccountMovement.create({
                    data: {
                        id: uuidv4(),
                        customerId: id,
                        type: 'CREDIT', // Pago = Crédito para la cuenta (baja deuda)
                        amount: paymentAmount,
                        balance: newBalance,
                        description: description || 'Pago a cuenta corriente',
                        reference: reference || null
                    }
                });

                // C. Registrar ingreso en CAJA FÍSICA
                // Primero verificamos el saldo actual de la caja para el registro
                // (Aunque CashMovement guarda el saldo AFTER, necesitamos calcularlo.
                // Sin embargo, para simplificar y evitar race conditions complejos, 
                // prisma no recalcula al vuelo, hacemos un update atómico en Shift)

                await tx.cashMovement.create({
                    data: {
                        id: uuidv4(),
                        cashShift: { connect: { id: activeShift.id } },
                        user: { connect: { id: req.user.id } },
                        type: 'IN',
                        reason: 'DEPOSIT', // Depósito / Cobro de deuda
                        amount: paymentAmount,
                        description: `Cobro Cta.Cte. Cliente: ${customer.firstName} ${customer.lastName}`,
                        // No asignamos saleId porque no es una venta nueva
                        balance: 0 // TODO: Lo ideal sería calcular el saldo acumulado, pero por ahora lo dejamos en 0 o necesitamos leer el último mov.
                        // Para evitar complejidad, dejamos 0 o implementamos lógica de saldo real si es crítico.
                    }
                });

                // D. Actualizar totales del turno
                await tx.cashShift.update({
                    where: { id: activeShift.id },
                    data: {
                        totalCashIn: { increment: paymentAmount },
                        expectedCash: { increment: paymentAmount }
                    }
                });
            });

            res.json({
                success: true,
                message: 'Pago registrado exitosamente',
                data: {
                    previousBalance,
                    paymentAmount,
                    newBalance
                }
            });
        } catch (error) {
            console.error('Error en registerPayment:', error);
            res.status(500).json({
                success: false,
                error: 'Error al registrar pago',
                details: [error.message]
            });
        }
    },

    /**
     * Historial de movimientos
     */
    async getAccountMovements(req, res) {
        try {
            const { id } = req.params;
            const { startDate, endDate, page = 1, limit = 50 } = req.query;
            const skip = (parseInt(page) - 1) * parseInt(limit);

            const where = { customerId: id };

            if (startDate || endDate) {
                where.createdAt = {};
                if (startDate) where.createdAt.gte = new Date(startDate);
                if (endDate) {
                    const end = new Date(endDate);
                    end.setHours(23, 59, 59, 999);
                    where.createdAt.lte = end;
                }
            }

            const [movements, total] = await Promise.all([
                prisma.customerAccountMovement.findMany({
                    where,
                    orderBy: { createdAt: 'desc' },
                    skip,
                    take: parseInt(limit)
                }),
                prisma.customerAccountMovement.count({ where })
            ]);

            res.json({
                success: true,
                data: movements.map(m => ({
                    ...m,
                    amount: parseFloat(m.amount),
                    balance: parseFloat(m.balance)
                })),
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / parseInt(limit))
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Error al obtener movimientos',
                details: [error.message]
            });
        }
    },

    /**
     * Alertas de deuda
     */
    async getDebtAlerts(req, res) {
        try {
            const customers = await prisma.customer.findMany({
                where: {
                    isActive: true,
                    deletedAt: null,
                    currentBalance: { gt: 0 }
                },
                include: {
                    accountMovements: {
                        where: { type: 'DEBIT' },
                        orderBy: { createdAt: 'asc' },
                        take: 1
                    }
                }
            });

            const now = new Date();
            const alerts = [];

            for (const customer of customers) {
                const balance = parseFloat(customer.currentBalance);
                const limit = parseFloat(customer.creditLimit);
                const oldestDebt = customer.accountMovements[0];

                let alertType = null;
                let reason = [];

                // Verificar límite de crédito
                if (limit > 0 && balance >= limit * 0.8) {
                    alertType = balance >= limit ? 'blocked' : 'warning';
                    reason.push(`Saldo ${balance >= limit ? 'supera' : 'cerca del'} límite de crédito`);
                }

                // Verificar antigüedad de deuda
                if (oldestDebt) {
                    const daysSinceDebt = Math.floor((now - new Date(oldestDebt.createdAt)) / (1000 * 60 * 60 * 24));
                    if (daysSinceDebt > customer.maxDebtDays) {
                        alertType = 'blocked';
                        reason.push(`Deuda de ${daysSinceDebt} días (máximo: ${customer.maxDebtDays})`);
                    } else if (daysSinceDebt > customer.maxDebtDays * 0.7) {
                        if (!alertType) alertType = 'warning';
                        reason.push(`Deuda próxima a vencer (${daysSinceDebt} días)`);
                    }
                }

                if (alertType) {
                    alerts.push({
                        customer: {
                            id: customer.id,
                            code: customer.code,
                            fullName: `${customer.firstName} ${customer.lastName}`,
                            currentBalance: balance,
                            creditLimit: limit
                        },
                        alertType,
                        reasons: reason
                    });
                }
            }

            res.json({
                success: true,
                data: {
                    alerts,
                    summary: {
                        blocked: alerts.filter(a => a.alertType === 'blocked').length,
                        warning: alerts.filter(a => a.alertType === 'warning').length
                    }
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Error al obtener alertas',
                details: [error.message]
            });
        }
    }
};

/**
 * Determinar estado de deuda del cliente
 */
function getDebtStatus(customer) {
    const balance = parseFloat(customer.currentBalance);
    const limit = parseFloat(customer.creditLimit);

    if (balance <= 0) return 'ok';
    if (limit > 0 && balance >= limit) return 'blocked';
    if (limit > 0 && balance >= limit * 0.8) return 'warning';
    if (balance > 0) return 'warning';
    return 'ok';
}

module.exports = customerController;
