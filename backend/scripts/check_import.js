
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const prisma = require('../src/config/database');

async function check() {
    try {
        const count = await prisma.product.count();
        const nonZeroStock = await prisma.product.count({
            where: { stockGlobal: { gt: 0 } }
        });

        const categories = await prisma.category.count();
        const branchStock = await prisma.productStock.count();

        console.log('--- REPORTE DE IMPORTACIÓN ---');
        console.log(`✅ Total Productos: ${count}`);
        console.log(`📦 Total Categorías: ${categories}`);
        console.log(`🏢 Registros de Stock en Sucursal: ${branchStock}`);

        if (nonZeroStock === 0) {
            console.log('✅ VALIDADO: Todos los productos tienen Stock 0.');
        } else {
            console.error(`❌ ALERTA: Hay ${nonZeroStock} productos con stock > 0.`);
            const prods = await prisma.product.findMany({
                where: { stockGlobal: { gt: 0 } },
                select: { sku: true, name: true, stockGlobal: true }
            });
            console.table(prods);
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

check();
