require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Configurando Métodos de Pago...');

    const methods = [
        {
            code: 'EFECTIVO',
            name: 'Efectivo',
            description: 'Dinero en efectivo',
            icon: 'Banknote',
            affectsCash: true,
            sortOrder: 1
        },
        {
            code: 'DEBITO',
            name: 'Tarjeta Débito',
            description: 'Tarjeta de débito',
            icon: 'CreditCard',
            affectsCash: false,
            sortOrder: 2
        },
        {
            code: 'CREDITO',
            name: 'Tarjeta Crédito',
            description: 'Tarjeta de crédito',
            icon: 'CreditCard',
            affectsCash: false,
            surchargePercent: 10, // Ejemplo
            sortOrder: 3
        },
        {
            code: 'TRANSFERENCIA',
            name: 'Transferencia',
            description: 'MercadoPago / Banco',
            icon: 'QrCode',
            affectsCash: false,
            sortOrder: 4
        }
    ];

    for (const m of methods) {
        await prisma.paymentMethod.upsert({
            where: { code: m.code },
            update: {
                name: m.name,
                icon: m.icon,
                affectsCash: m.affectsCash
            },
            create: m
        });
        console.log(`✅ Método: ${m.name}`);
    }
}

main()
    .catch(e => {
        console.error('Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
