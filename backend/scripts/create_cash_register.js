require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Configurando Caja Inicial...');

    // 1. Branch (Sucursal)
    let branch = await prisma.branch.findFirst();
    if (!branch) {
        console.log('Creando Sucursal Principal...');
        branch = await prisma.branch.create({
            data: {
                code: 'SUC-001',
                name: 'Sucursal Principal',
                isMaster: true,
                isActive: true
            }
        });
    } else {
        console.log('Sucursal encontrada:', branch.name);
    }

    // 2. CashRegister (Caja Física)
    const count = await prisma.cashRegister.count({
        where: { branchId: branch.id }
    });

    if (count === 0) {
        console.log('No hay cajas registradas. Creando Caja #1...');
        const newRegister = await prisma.cashRegister.create({
            data: {
                code: 'CAJA-01',
                name: 'Caja Principal',
                branchId: branch.id,
                isActive: true
            }
        });
        console.log('Caja creada exitosamente:', newRegister.name);
    } else {
        console.log(`Ya existen ${count} cajas registradas en esta sucursal.`);
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
