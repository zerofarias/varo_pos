const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Verificando medio de pago: Cuenta Corriente...');

    const existing = await prisma.paymentMethod.findFirst({
        where: {
            isAccountPayment: true
        }
    });

    if (existing) {
        console.log('✅ Ya existe un medio de pago para Cuenta Corriente:', existing.name);
        return;
    }

    console.log('🛠️ Creando medio de pago Cuenta Corriente...');

    await prisma.paymentMethod.create({
        data: {
            code: 'CTA_CTE',
            name: 'Cuenta Corriente',
            description: 'Pago diferido a cuenta del cliente',
            isAccountPayment: true,
            affectsCash: false, // NO afecta la caja al vender (solo al cobrar la deuda)
            requiresReference: false,
            sortOrder: 10,
            icon: 'Building', // Nombre del icono para el frontend
            color: '#6366f1' // Indigo
        }
    });

    console.log('✅ Cuenta Corriente creada exitosamente.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
