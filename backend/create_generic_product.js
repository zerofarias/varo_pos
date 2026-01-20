
const prisma = require('./src/config/database');

async function createGeneric() {
    try {
        const categoryCallback = await prisma.category.upsert({
            where: { id: 'generic-cat' },
            create: {
                id: 'generic-cat',
                name: 'Varios',
                description: 'Categoría para productos genéricos',
                isActive: true
            },
            update: {}
        });

        const product = await prisma.product.upsert({
            where: { sku: 'VARIOS' },
            create: {
                sku: 'VARIOS',
                name: 'Varios / Genérico',
                description: 'Producto para ventas rápidas de importe libre',
                costPrice: 0,
                salePrice: 0, // Precio base 0, se sobrescribe en venta
                stockGlobal: 999999,
                manageStock: false,
                allowNegativeStock: true,
                isActive: true,
                isGeneric: true,
                categoryId: categoryCallback.id,
                taxRate: 21,
                taxType: 'IVA'
            },
            update: {
                isGeneric: true,
                manageStock: false,
                allowNegativeStock: true
            }
        });

        console.log('Producto Genérico creado/actualizado:', product.id);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

createGeneric();
