require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Configurando Múltiples Cajas...');

    const branch = await prisma.branch.findFirst();
    if (!branch) {
        console.error('Error: No se encontró ninguna sucursal.');
        return;
    }

    // Lista de cajas a asegurar
    const registers = [
        { code: 'CAJA-01', name: 'Caja 01 (Principal)' },
        { code: 'CAJA-02', name: 'Caja 02 (Secundaria)' },
        { code: 'CAJA-03', name: 'Caja 03 (Extra)' }
    ];

    for (const reg of registers) {
        const result = await prisma.cashRegister.upsert({
            where: { code: reg.code },
            update: { name: reg.name }, // Actualiza el nombre si ya existe
            create: {
                code: reg.code,
                name: reg.name,
                branchId: branch.id,
                isActive: true
            }
        });
        console.log(`✅ ${result.name} - Lista para usar`);
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
