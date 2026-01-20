/**
 * VARO POS - Database Seed
 * Crea datos de demostración
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Iniciando seed de la base de datos...\n');

    // 1. Crear Roles
    console.log('📋 Creando roles...');
    const adminRole = await prisma.role.upsert({
        where: { name: 'Admin' },
        update: {},
        create: {
            name: 'Admin',
            description: 'Administrador del sistema',
            permissions: JSON.stringify([
                'sales.*', 'products.*', 'customers.*', 'reports.*',
                'cash.*', 'settings.*', 'users.*', 'inventory.*'
            ]),
            isSystem: true
        }
    });

    const sellerRole = await prisma.role.upsert({
        where: { name: 'Vendedor' },
        update: {},
        create: {
            name: 'Vendedor',
            description: 'Cajero/Vendedor',
            permissions: JSON.stringify([
                'sales.create', 'sales.view', 'products.view',
                'customers.view', 'cash.own'
            ]),
            isSystem: true
        }
    });

    // 2. Crear Sucursal
    console.log('🏪 Creando sucursal...');
    const branch = await prisma.branch.upsert({
        where: { code: 'SUC001' },
        update: {},
        create: {
            code: 'SUC001',
            name: 'Sucursal Principal',
            address: 'Av. Principal 123',
            phone: '+54 11 1234-5678',
            isMaster: true,
            isActive: true,
            syncStatus: 'synced'
        }
    });

    // 3. Crear Usuarios
    console.log('👤 Creando usuarios...');
    const hashedPassword = await bcrypt.hash('admin', 10);

    await prisma.user.upsert({
        where: { username: 'admin' },
        update: {},
        create: {
            username: 'admin',
            email: 'admin@varopos.com',
            password: hashedPassword,
            firstName: 'Administrador',
            lastName: 'Sistema',
            phone: '+54 11 9999-0000',
            isActive: true,
            roleId: adminRole.id,
            branchId: branch.id
        }
    });

    await prisma.user.upsert({
        where: { username: 'vendedor' },
        update: {},
        create: {
            username: 'vendedor',
            email: 'vendedor@varopos.com',
            password: hashedPassword,
            firstName: 'Juan',
            lastName: 'Pérez',
            isActive: true,
            roleId: sellerRole.id,
            branchId: branch.id
        }
    });

    // 4. Crear Categorías
    console.log('📁 Creando categorías...');
    const categories = await Promise.all([
        prisma.category.upsert({
            where: { id: 'cat-bebidas' },
            update: {},
            create: { id: 'cat-bebidas', name: 'Bebidas', color: '#3B82F6', icon: 'bottle' }
        }),
        prisma.category.upsert({
            where: { id: 'cat-snacks' },
            update: {},
            create: { id: 'cat-snacks', name: 'Snacks', color: '#F59E0B', icon: 'cookie' }
        }),
        prisma.category.upsert({
            where: { id: 'cat-lacteos' },
            update: {},
            create: { id: 'cat-lacteos', name: 'Lácteos', color: '#10B981', icon: 'milk' }
        }),
        prisma.category.upsert({
            where: { id: 'cat-panaderia' },
            update: {},
            create: { id: 'cat-panaderia', name: 'Panadería', color: '#EC4899', icon: 'bread' }
        }),
        prisma.category.upsert({
            where: { id: 'cat-limpieza' },
            update: {},
            create: { id: 'cat-limpieza', name: 'Limpieza', color: '#8B5CF6', icon: 'spray' }
        }),
        prisma.category.upsert({
            where: { id: 'cat-almacen' },
            update: {},
            create: { id: 'cat-almacen', name: 'Almacén', color: '#6366F1', icon: 'box' }
        }),
        prisma.category.upsert({
            where: { id: 'cat-cigarrillos' },
            update: {},
            create: { id: 'cat-cigarrillos', name: 'Cigarrillos', color: '#EF4444', icon: 'cigarette' }
        }),
        prisma.category.upsert({
            where: { id: 'cat-servicios' },
            update: {},
            create: { id: 'cat-servicios', name: 'Servicios', color: '#14B8A6', icon: 'tool' }
        })
    ]);

    // 5. Crear Productos
    console.log('📦 Creando productos...');
    const products = [
        { sku: 'COC15', barcode: '7790895000201', name: 'Coca Cola 1.5L', costPrice: 800, salePrice: 1500, stock: 50, categoryId: 'cat-bebidas', isFeatured: true },
        { sku: 'COC500', barcode: '7790895000088', name: 'Coca Cola 500ml', costPrice: 400, salePrice: 850, stock: 80, categoryId: 'cat-bebidas' },
        { sku: 'LAYS150', barcode: '7790310980012', name: 'Lays Clásicas 150g', costPrice: 500, salePrice: 1100, stock: 40, categoryId: 'cat-snacks', isFeatured: true },
        { sku: 'LSER1L', barcode: '7791298881234', name: 'Leche La Serenísima 1L', costPrice: 450, salePrice: 850, stock: 30, categoryId: 'cat-lacteos' },
        { sku: 'MEDI1', barcode: '0000000000100', name: 'Medialuna (unidad)', costPrice: 80, salePrice: 180, stock: 100, categoryId: 'cat-panaderia' },
        { sku: 'PAN1', barcode: '0000000000108', name: 'Pan Francés (unidad)', costPrice: 50, salePrice: 120, stock: 100, categoryId: 'cat-panaderia' },
        { sku: 'RECCV1000', barcode: 'SRV-001', name: 'Recarga Virtual $1000', costPrice: 950, salePrice: 1000, stock: 999, categoryId: 'cat-servicios', manageStock: false, isService: true },
        { sku: 'RECCV500', barcode: 'SRV-002', name: 'Recarga Virtual $500', costPrice: 475, salePrice: 500, stock: 999, categoryId: 'cat-servicios', manageStock: false, isService: true },
        { sku: 'AGUAM500', barcode: '7793432430186', name: 'Agua Mineral 500ml', costPrice: 150, salePrice: 400, stock: 60, categoryId: 'cat-bebidas' },
        { sku: 'GALL1', barcode: '7790040009912', name: 'Galletitas Oreo', costPrice: 350, salePrice: 750, stock: 25, categoryId: 'cat-snacks' }
    ];

    for (const prod of products) {
        await prisma.product.upsert({
            where: { sku: prod.sku },
            update: {},
            create: {
                sku: prod.sku,
                barcode: prod.barcode,
                name: prod.name,
                costPrice: prod.costPrice,
                salePrice: prod.salePrice,
                stockGlobal: prod.stock,
                stockMinimum: 5,
                categoryId: prod.categoryId,
                isFeatured: prod.isFeatured || false,
                manageStock: prod.manageStock !== false,
                isService: prod.isService || false,
                taxRate: 21
            }
        });
    }

    // 6. Crear Métodos de Pago
    console.log('💳 Creando métodos de pago...');
    const paymentMethods = [
        { code: 'EFECTIVO', name: 'Efectivo', affectsCash: true, sortOrder: 1, icon: 'banknote', color: '#10B981' },
        { code: 'DEBITO', name: 'Débito', affectsCash: false, sortOrder: 2, icon: 'credit-card', color: '#3B82F6' },
        { code: 'CREDITO', name: 'Crédito', surchargePercent: 10, affectsCash: false, sortOrder: 3, icon: 'credit-card', color: '#8B5CF6' },
        { code: 'MERCADOPAGO', name: 'MercadoPago / QR', affectsCash: false, sortOrder: 4, icon: 'qr-code', color: '#06B6D4' },
        { code: 'CUENTA', name: 'Cuenta Corriente', isAccountPayment: true, affectsCash: false, sortOrder: 5, icon: 'user', color: '#F59E0B' }
    ];

    for (const pm of paymentMethods) {
        await prisma.paymentMethod.upsert({
            where: { code: pm.code },
            update: {},
            create: {
                code: pm.code,
                name: pm.name,
                surchargePercent: pm.surchargePercent || 0,
                affectsCash: pm.affectsCash || false,
                isAccountPayment: pm.isAccountPayment || false,
                sortOrder: pm.sortOrder,
                icon: pm.icon,
                color: pm.color
            }
        });
    }

    // 7. Crear Caja Física
    console.log('💰 Creando caja registradora...');
    await prisma.cashRegister.upsert({
        where: { code: 'CAJA-01' },
        update: {},
        create: {
            code: 'CAJA-01',
            name: 'Caja Principal',
            branchId: branch.id,
            isActive: true
        }
    });

    // 8. Crear Clientes de ejemplo
    console.log('👥 Creando clientes...');
    await prisma.customer.upsert({
        where: { code: 'CLI001' },
        update: {},
        create: {
            code: 'CLI001',
            firstName: 'Carlos',
            lastName: 'Gómez',
            documentType: 'DNI',
            documentNumber: '30123456',
            email: 'carlos@email.com',
            phone: '+54 11 5555-1234',
            creditLimit: 50000,
            currentBalance: 0,
            isActive: true
        }
    });

    await prisma.customer.upsert({
        where: { code: 'CLI002' },
        update: {},
        create: {
            code: 'CLI002',
            firstName: 'María',
            lastName: 'Rodríguez',
            documentType: 'DNI',
            documentNumber: '28456789',
            email: 'maria@email.com',
            creditLimit: 30000,
            currentBalance: -5000,
            alertOnDebt: true,
            isActive: true
        }
    });

    // 9. Settings
    console.log('⚙️ Creando configuraciones...');
    const settings = [
        { key: 'shop_name', value: 'Mi Kiosco VARO', type: 'string', group: 'general' },
        { key: 'shop_address', value: 'Av. Principal 123', type: 'string', group: 'general' },
        { key: 'shop_phone', value: '+54 11 1234-5678', type: 'string', group: 'general' },
        { key: 'ticket_footer', value: 'Gracias por su compra!', type: 'string', group: 'pos' },
        { key: 'allow_negative_stock', value: 'false', type: 'boolean', group: 'pos' },
        { key: 'theme_color', value: 'indigo', type: 'string', group: 'general' }
    ];

    for (const setting of settings) {
        await prisma.setting.upsert({
            where: { key: setting.key },
            update: {},
            create: setting
        });
    }

    console.log('\n✅ Seed completado exitosamente!');
    console.log('📝 Usuarios creados:');
    console.log('   - admin / admin (Administrador)');
    console.log('   - vendedor / admin (Vendedor)');
    console.log(`📦 Productos: ${products.length}`);
    console.log(`📁 Categorías: ${categories.length}`);
    console.log('💳 Métodos de pago: 5');
}

main()
    .catch((e) => {
        console.error('❌ Error durante el seed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
