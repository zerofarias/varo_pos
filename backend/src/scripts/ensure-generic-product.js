const prisma = require('../config/database');

async function findGeneric() {
    try {
        console.log('🔍 Buscando Producto Genérico...');

        // 1. Asegurar Categoría
        let category = await prisma.category.findFirst();
        if (!category) {
            console.log('⚠️ No hay categorías. Creando categoría "General"...');
            category = await prisma.category.create({
                data: {
                    name: 'General',
                    description: 'Categoría por defecto',
                    color: '#9ca3af'
                }
            });
        }

        // 2. Asegurar Proveedor
        let supplier = await prisma.supplier.findFirst();
        if (!supplier) {
            console.log('⚠️ No hay proveedores. Creando proveedor "General"...');
            supplier = await prisma.supplier.create({
                data: {
                    code: 'PRO-001',
                    businessName: 'Proveedor General',
                    tradeName: 'General',
                    isActive: true
                }
            });
        }

        // 3. Asegurar Usuario y Sucursal (estos deberían existir si hiciste login)
        const user = await prisma.user.findFirst();
        const branch = await prisma.branch.findFirst();

        if (!user || !branch) {
            console.error('❌ ERROR FATAL: No hay usuarios o sucursales en la DB. Corre los seeds iniciales.');
            return;
        }

        // 4. Buscar Genérico
        const generic = await prisma.product.findFirst({
            where: {
                OR: [
                    { isGeneric: true },
                    { sku: 'VARIOS' },
                    { sku: 'GENERICO' }
                ]
            }
        });

        if (generic) {
            console.log('✅ GENERICO ENCONTRADO:', generic.id, generic.name, generic.sku);
        } else {
            console.log('✨ Creando Producto Genérico...');
            const newGeneric = await prisma.product.create({
                data: {
                    name: 'Varios / Genérico',
                    sku: 'VARIOS',
                    description: 'Producto para venta por monto libre',
                    salePrice: 1, // Base
                    costPrice: 0,
                    isGeneric: true,
                    isService: true, // No maneja stock
                    allowNegativeStock: true,
                    manageStock: false,
                    stockGlobal: 999999,
                    taxRate: 21,
                    taxType: 'IVA_21', // Añadir tipo de impuesto si es requerido
                    userId: user.id,
                    branchId: branch.id,
                    supplierId: supplier.id, // Ahora seguro existe
                    categoryId: category.id // Ahora seguro existe
                }
            });
            console.log('✅ CREADO EXITOSAMENTE:', newGeneric.id);
        }
    } catch (e) {
        console.error('❌ Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

findGeneric();
