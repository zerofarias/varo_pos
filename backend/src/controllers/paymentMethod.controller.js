/**
 * VARO POS - Controlador de Métodos de Pago
 */

const prisma = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const paymentMethodController = {
    async getAll(req, res) {
        try {
            const { includeInactive } = req.query;
            const where = includeInactive === 'true' ? {} : { isActive: true };

            const methods = await prisma.paymentMethod.findMany({
                where,
                orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }]
            });

            res.json({
                success: true,
                data: methods.map(m => ({
                    ...m,
                    surchargePercent: parseFloat(m.surchargePercent),
                    discountPercent: parseFloat(m.discountPercent)
                }))
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    async create(req, res) {
        try {
            const method = await prisma.paymentMethod.create({
                data: {
                    id: uuidv4(),
                    ...req.body
                }
            });

            res.status(201).json({ success: true, data: method });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    async update(req, res) {
        try {
            const method = await prisma.paymentMethod.update({
                where: { id: req.params.id },
                data: req.body
            });

            res.json({ success: true, data: method });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    async delete(req, res) {
        try {
            await prisma.paymentMethod.update({
                where: { id: req.params.id },
                data: { isActive: false }
            });

            res.json({ success: true, message: 'Método de pago desactivado' });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
};

module.exports = paymentMethodController;
