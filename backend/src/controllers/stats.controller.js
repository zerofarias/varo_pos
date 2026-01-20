const { PrismaClient } = require('@prisma/client');
const prisma = require('../config/database');

const statsController = {
    /**
     * Resumen del Dashboard (Ventas Hoy)
     */
    async getDashboardSummary(req, res) {
        try {
            // Definir rango: Hoy (00:00 a 23:59 servidor)
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date();
            endOfDay.setHours(23, 59, 59, 999);

            // 1. Total Ventas Hoy
            // 1. Total Ventas Hoy
            const salesToday = await prisma.sale.findMany({
                where: {
                    createdAt: {
                        gte: startOfDay,
                        lte: endOfDay
                    },
                    status: 'completed' // El controller guarda en minúsculas
                },
                include: {
                    items: true,
                    payments: { include: { paymentMethod: true } }
                }
            });

            const totalAmount = salesToday.reduce((sum, sale) => sum + Number(sale.total), 0);
            const transactionCount = salesToday.length;
            const averageTicket = transactionCount > 0 ? totalAmount / transactionCount : 0;

            // 2. Método de Pago Top
            const methodCounts = {};
            salesToday.forEach(sale => {
                sale.payments.forEach(pm => {
                    const name = pm.paymentMethod?.name || 'Otro';
                    methodCounts[name] = (methodCounts[name] || 0) + 1;
                });
            });
            const topMethod = Object.entries(methodCounts).sort((a, b) => b[1] - a[1])[0];

            res.json({
                success: true,
                data: {
                    totalAmount,
                    transactionCount,
                    averageTicket,
                    topPaymentMethod: topMethod ? topMethod[0] : 'N/A'
                }
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Error obteniendo resumen' });
        }
    },

    /**
     * Ranking de Vendedores
     */
    async getTopSellers(req, res) {
        try {
            // Podríamos filtrar por mes actual o histórico total
            // Por defecto: Mes actual
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

            const sales = await prisma.sale.groupBy({
                by: ['userId'],
                where: {
                    createdAt: { gte: startOfMonth }
                },
                _sum: {
                    total: true
                },
                _count: {
                    _all: true
                },
                orderBy: {
                    _sum: {
                        total: 'desc'
                    }
                },
                take: 5
            });

            // Enriquecer con nombres de usuario
            const enriched = await Promise.all(sales.map(async (s) => {
                const user = await prisma.user.findUnique({
                    where: { id: s.userId },
                    select: { firstName: true, lastName: true, role: true }
                });
                return {
                    userId: s.userId,
                    name: user ? `${user.firstName} ${user.lastName}` : 'Desconocido',
                    role: user?.role || 'Vendedor',
                    totalSales: Number(s._sum.total || 0),
                    count: s._count._all
                };
            }));

            res.json({ success: true, data: enriched });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Error obteniendo ranking' });
        }
    },

    /**
     * Ventas por Hora (Mapa de Calor) - De Hoy
     */
    async getHourlySales(req, res) {
        try {
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);

            const sales = await prisma.sale.findMany({
                where: { createdAt: { gte: startOfDay } },
                select: { createdAt: true, total: true }
            });

            // Inicializar 24 horas
            const hourlyData = Array(24).fill(0).map((_, i) => ({ hour: i, total: 0, count: 0 }));

            sales.forEach(s => {
                const hour = new Date(s.createdAt).getHours();
                if (hourlyData[hour]) {
                    hourlyData[hour].total += Number(s.total);
                    hourlyData[hour].count += 1;
                }
            });

            res.json({ success: true, data: hourlyData });

        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Error obteniendo ventas por hora' });
        }
    },

    /**
     * Ventas por Categoría (Top 5)
     */
    async getSalesByCategory(req, res) {
        try {
            // Esto es más complejo en Prisma sin raw query optimizada, 
            // pero lo haremos iterando items del mes actual.
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

            // Fetch items grouped logic manually or via raw query?
            // Raw query es mejor para performance, pero Prisma Client extension es segura.
            // Haremos findMany de SaleItem con include Product.Category

            const items = await prisma.saleItem.findMany({
                where: {
                    sale: { createdAt: { gte: startOfMonth } }
                },
                include: {
                    product: {
                        include: { category: true }
                    }
                }
            });

            const categoryStats = {};

            items.forEach(item => {
                const catName = item.product?.category?.name || 'Sin Categoría';
                // Usamos subtotal del item
                const amount = Number(item.subtotal);

                if (!categoryStats[catName]) {
                    categoryStats[catName] = { name: catName, value: 0 };
                }
                categoryStats[catName].value += amount;
            });

            const result = Object.values(categoryStats)
                .sort((a, b) => b.value - a.value)
                .slice(0, 6); // Top 6

            res.json({ success: true, data: result });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Error obteniendo ventas por categoría' });
        }
    }
};

module.exports = statsController;
