/**
 * VARO POS - Controlador de Reportes
 */

const prisma = require('../config/database');

const reportController = {
    async getSalesSummary(req, res) {
        try {
            const { startDate, endDate, groupBy = 'day' } = req.query;

            if (!startDate || !endDate) {
                return res.status(400).json({
                    success: false,
                    error: 'Fechas requeridas'
                });
            }

            const sales = await prisma.sale.findMany({
                where: {
                    status: 'completed',
                    createdAt: {
                        gte: new Date(startDate),
                        lte: new Date(endDate + 'T23:59:59')
                    }
                },
                include: { items: true }
            });

            const totals = {
                totalSales: sales.length,
                totalAmount: sales.reduce((sum, s) => sum + parseFloat(s.total), 0),
                totalProfit: sales.reduce((sum, sale) => {
                    return sum + sale.items.reduce((itemSum, item) => {
                        return itemSum + ((parseFloat(item.unitPrice) - parseFloat(item.costPrice)) * item.quantity);
                    }, 0);
                }, 0)
            };

            res.json({ success: true, data: totals });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    async getTopProducts(req, res) {
        try {
            const { limit = 10, startDate, endDate } = req.query;

            const where = {};
            if (startDate || endDate) {
                where.sale = {
                    createdAt: {}
                };
                if (startDate) where.sale.createdAt.gte = new Date(startDate);
                if (endDate) where.sale.createdAt.lte = new Date(endDate + 'T23:59:59');
            }

            const items = await prisma.saleItem.groupBy({
                by: ['productId', 'productName'],
                _sum: { quantity: true, subtotal: true },
                orderBy: { _sum: { quantity: 'desc' } },
                take: parseInt(limit)
            });

            res.json({
                success: true,
                data: items.map(item => ({
                    productId: item.productId,
                    productName: item.productName,
                    totalQuantity: item._sum.quantity,
                    totalAmount: parseFloat(item._sum.subtotal)
                }))
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    async getCashFlow(req, res) {
        try {
            const { startDate, endDate } = req.query;

            const payments = await prisma.payment.findMany({
                where: {
                    sale: {
                        status: 'completed',
                        createdAt: {
                            gte: new Date(startDate),
                            lte: new Date(endDate + 'T23:59:59')
                        }
                    }
                },
                include: { paymentMethod: true }
            });

            const byMethod = {};
            payments.forEach(p => {
                const method = p.paymentMethod?.name || 'Desconocido';
                if (!byMethod[method]) byMethod[method] = { total: 0, count: 0 };
                byMethod[method].total += parseFloat(p.amount);
                byMethod[method].count++;
            });

            res.json({
                success: true,
                data: Object.entries(byMethod).map(([method, data]) => ({
                    method,
                    ...data
                }))
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    async getStockValuation(req, res) {
        try {
            const products = await prisma.product.findMany({
                where: { deletedAt: null, isActive: true, isService: false }
            });

            const valuation = products.reduce((acc, p) => {
                acc.totalCost += parseFloat(p.costPrice) * p.stockGlobal;
                acc.totalSale += parseFloat(p.salePrice) * p.stockGlobal;
                acc.totalItems += p.stockGlobal;
                return acc;
            }, { totalCost: 0, totalSale: 0, totalItems: 0 });

            valuation.potentialProfit = valuation.totalSale - valuation.totalCost;

            res.json({ success: true, data: valuation });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    async getProfitMargin(req, res) {
        try {
            const { startDate, endDate, groupBy = 'product' } = req.query;

            const items = await prisma.saleItem.findMany({
                where: {
                    sale: {
                        status: 'completed',
                        createdAt: {
                            gte: startDate ? new Date(startDate) : new Date('2020-01-01'),
                            lte: endDate ? new Date(endDate + 'T23:59:59') : new Date()
                        }
                    }
                },
                include: { product: { include: { category: true } } }
            });

            const analysis = {};
            items.forEach(item => {
                const key = groupBy === 'category'
                    ? item.product?.category?.name || 'Sin categoría'
                    : item.productName;

                if (!analysis[key]) {
                    analysis[key] = { revenue: 0, cost: 0, quantity: 0 };
                }

                analysis[key].revenue += parseFloat(item.subtotal);
                analysis[key].cost += parseFloat(item.costPrice) * item.quantity;
                analysis[key].quantity += item.quantity;
            });

            const result = Object.entries(analysis).map(([name, data]) => ({
                name,
                ...data,
                profit: data.revenue - data.cost,
                margin: data.revenue > 0 ? ((data.revenue - data.cost) / data.revenue * 100).toFixed(2) : 0
            }));

            result.sort((a, b) => b.profit - a.profit);

            res.json({ success: true, data: result });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
};

module.exports = reportController;
