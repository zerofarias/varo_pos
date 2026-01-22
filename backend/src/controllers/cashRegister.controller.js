/**
 * VARO POS - Controlador de Caja Registradora
 */

const prisma = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const cashRegisterController = {
    async getAll(req, res) {
        try {
            const { includeInactive } = req.query;

            const where = { branchId: req.user.branchId || undefined };
            if (includeInactive !== 'true') {
                where.isActive = true;
            }

            const registers = await prisma.cashRegister.findMany({
                where,
                include: {
                    branch: { select: { name: true } },
                    _count: {
                        select: { cashShifts: true }
                    }
                },
                orderBy: { name: 'asc' }
            });

            res.json({ success: true, data: registers });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    async getById(req, res) {
        try {
            const { id } = req.params;

            const register = await prisma.cashRegister.findUnique({
                where: { id },
                include: {
                    branch: true,
                    _count: {
                        select: { cashShifts: true }
                    }
                }
            });

            if (!register) {
                return res.status(404).json({ success: false, error: 'Caja no encontrada' });
            }

            res.json({ success: true, data: register });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    async create(req, res) {
        try {
            const { name, code, description, isActive } = req.body;

            // Validaciones
            if (!name || !code) {
                return res.status(400).json({ success: false, error: 'Nombre y código son requeridos' });
            }

            // Verificar que el código no exista
            const existing = await prisma.cashRegister.findUnique({
                where: { code: code.toUpperCase() }
            });

            if (existing) {
                return res.status(400).json({ success: false, error: 'El código de caja ya existe' });
            }

            const register = await prisma.cashRegister.create({
                data: {
                    id: uuidv4(),
                    name,
                    code: code.toUpperCase(),
                    branchId: req.user.branchId,
                    description: description || null,
                    isActive: isActive !== undefined ? isActive : true
                },
                include: {
                    branch: {
                        select: {
                            name: true,
                            code: true
                        }
                    }
                }
            });

            res.status(201).json({
                success: true,
                data: register,
                message: 'Caja creada exitosamente'
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    async update(req, res) {
        try {
            const { id } = req.params;
            const { name, code, description, isActive } = req.body;

            const existing = await prisma.cashRegister.findUnique({
                where: { id }
            });

            if (!existing) {
                return res.status(404).json({ success: false, error: 'Caja no encontrada' });
            }

            // Si se cambia el código, verificar que no exista
            if (code && code.toUpperCase() !== existing.code) {
                const codeExists = await prisma.cashRegister.findUnique({
                    where: { code: code.toUpperCase() }
                });

                if (codeExists) {
                    return res.status(400).json({ success: false, error: 'El código de caja ya existe' });
                }
            }

            const register = await prisma.cashRegister.update({
                where: { id },
                data: {
                    ...(name && { name }),
                    ...(code && { code: code.toUpperCase() }),
                    ...(description !== undefined && { description }),
                    ...(isActive !== undefined && { isActive })
                },
                include: {
                    branch: {
                        select: {
                            name: true,
                            code: true
                        }
                    }
                }
            });

            res.json({
                success: true,
                data: register,
                message: 'Caja actualizada exitosamente'
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    async delete(req, res) {
        try {
            const { id } = req.params;

            const existing = await prisma.cashRegister.findUnique({
                where: { id },
                include: {
                    _count: {
                        select: { cashShifts: true }
                    }
                }
            });

            if (!existing) {
                return res.status(404).json({ success: false, error: 'Caja no encontrada' });
            }

            // Verificar si tiene turnos abiertos
            const openShifts = await prisma.cashShift.count({
                where: {
                    cashRegisterId: id,
                    status: 'OPEN'
                }
            });

            if (openShifts > 0) {
                return res.status(400).json({
                    success: false,
                    error: 'No se puede desactivar una caja con turnos abiertos'
                });
            }

            // Soft delete: solo desactivar
            const register = await prisma.cashRegister.update({
                where: { id },
                data: {
                    isActive: false
                }
            });

            res.json({
                success: true,
                data: register,
                message: 'Caja desactivada exitosamente'
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    async getCurrent(req, res) {
        try {
            const register = await prisma.cashRegister.findFirst({
                where: {
                    isOpen: true,
                    openedById: req.user.id
                },
                include: { branch: true }
            });

            res.json({ success: true, data: register });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    async open(req, res) {
        try {
            const { id } = req.params;
            const { openingAmount } = req.body;

            const register = await prisma.cashRegister.findUnique({ where: { id } });

            if (!register) {
                return res.status(404).json({ success: false, error: 'Caja no encontrada' });
            }

            if (register.isOpen) {
                return res.status(400).json({ success: false, error: 'La caja ya está abierta' });
            }

            const updated = await prisma.$transaction(async (tx) => {
                const cashReg = await tx.cashRegister.update({
                    where: { id },
                    data: {
                        isOpen: true,
                        openedAt: new Date(),
                        openedById: req.user.id,
                        openingAmount: parseFloat(openingAmount) || 0,
                        currentAmount: parseFloat(openingAmount) || 0,
                        closingAmount: null,
                        closedAt: null
                    }
                });

                await tx.cashMovement.create({
                    data: {
                        id: uuidv4(),
                        cashRegisterId: id,
                        userId: req.user.id,
                        type: 'IN',
                        reason: 'OPENING',
                        amount: parseFloat(openingAmount) || 0,
                        balance: parseFloat(openingAmount) || 0,
                        description: 'Apertura de caja'
                    }
                });

                return cashReg;
            });

            res.json({ success: true, message: 'Caja abierta', data: updated });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    async close(req, res) {
        try {
            const { id } = req.params;
            const { closingAmount, notes } = req.body;

            const register = await prisma.cashRegister.findUnique({
                where: { id },
                include: {
                    movements: {
                        where: {
                            createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }
                        }
                    }
                }
            });

            if (!register) {
                return res.status(404).json({ success: false, error: 'Caja no encontrada' });
            }

            if (!register.isOpen) {
                return res.status(400).json({ success: false, error: 'La caja no está abierta' });
            }

            const systemAmount = parseFloat(register.currentAmount);
            const countedAmount = parseFloat(closingAmount) || systemAmount;
            const difference = countedAmount - systemAmount;

            const updated = await prisma.$transaction(async (tx) => {
                const cashReg = await tx.cashRegister.update({
                    where: { id },
                    data: {
                        isOpen: false,
                        closedAt: new Date(),
                        closingAmount: countedAmount
                    }
                });

                await tx.cashMovement.create({
                    data: {
                        id: uuidv4(),
                        cashRegisterId: id,
                        userId: req.user.id,
                        type: 'OUT',
                        reason: 'CLOSING',
                        amount: systemAmount,
                        balance: 0,
                        description: notes || 'Cierre de caja'
                    }
                });

                return cashReg;
            });

            // Resumen
            const inMovements = register.movements.filter(m => m.type === 'IN');
            const outMovements = register.movements.filter(m => m.type === 'OUT');

            res.json({
                success: true,
                message: 'Caja cerrada',
                data: {
                    register: updated,
                    summary: {
                        openingAmount: parseFloat(register.openingAmount),
                        totalIn: inMovements.reduce((sum, m) => sum + parseFloat(m.amount), 0),
                        totalOut: outMovements.reduce((sum, m) => sum + parseFloat(m.amount), 0),
                        systemAmount,
                        countedAmount,
                        difference
                    }
                }
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    async addMovement(req, res) {
        try {
            const { id } = req.params;
            const { type, amount, reason, description } = req.body;

            const register = await prisma.cashRegister.findUnique({ where: { id } });

            if (!register?.isOpen) {
                return res.status(400).json({ success: false, error: 'La caja no está abierta' });
            }

            const currentAmount = parseFloat(register.currentAmount);
            const movementAmount = parseFloat(amount);
            const newBalance = type === 'IN'
                ? currentAmount + movementAmount
                : currentAmount - movementAmount;

            await prisma.$transaction([
                prisma.cashRegister.update({
                    where: { id },
                    data: { currentAmount: newBalance }
                }),
                prisma.cashMovement.create({
                    data: {
                        id: uuidv4(),
                        cashRegisterId: id,
                        userId: req.user.id,
                        type,
                        reason,
                        amount: movementAmount,
                        balance: newBalance,
                        description
                    }
                })
            ]);

            res.json({
                success: true,
                message: 'Movimiento registrado',
                data: { previousBalance: currentAmount, newBalance }
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    async getMovements(req, res) {
        try {
            const movements = await prisma.cashMovement.findMany({
                where: { cashRegisterId: req.params.id },
                include: { user: { select: { firstName: true, lastName: true } } },
                orderBy: { createdAt: 'desc' }
            });

            res.json({ success: true, data: movements });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
};

module.exports = cashRegisterController;
