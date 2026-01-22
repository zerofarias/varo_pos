const prisma = require('../config/database');

async function updateSalesPoint() {
    try {
        await prisma.setting.update({
            where: { key: 'AFIP_SALES_POINT' },
            data: { value: '2' }
        });
        console.log('✅ Punto de Venta actualizado a 2');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

updateSalesPoint();
