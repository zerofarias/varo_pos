const prisma = require('../config/database');

async function checkLastError() {
    try {
        const lastSale = await prisma.sale.findFirst({
            orderBy: { createdAt: 'desc' },
            take: 1
        });

        console.log('--- ÚLTIMA VENTA ---');
        console.log('Número:', lastSale.saleNumber);
        console.log('Total:', lastSale.total);
        console.log('AFIP Status:', lastSale.afipStatus);
        console.log('AFIP Error:', lastSale.afipError);
        console.log('--------------------');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkLastError();
