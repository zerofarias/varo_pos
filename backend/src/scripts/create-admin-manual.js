const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    // Permite pasar argumentos: node create-admin-manual.js [usuario] [password]
    const username = process.argv[2] || 'admin';
    const password = process.argv[3] || 'admin';

    console.log(`\n⚡ Configurando usuario Admin...`);
    console.log(`👤 Usuario objetivo: ${username}`);
    console.log(`🔑 Contraseña a establecer: ${password}`);

    // 1. Obtener o Crear Rol Admin
    let adminRole = await prisma.role.findFirst({ where: { name: 'Admin' } });
    if (!adminRole) {
        console.log('⚠️  Rol Admin no encontrado. Creando uno con permisos totales...');
        adminRole = await prisma.role.create({
            data: {
                name: 'Admin',
                description: 'Administrador del sistema',
                permissions: JSON.stringify(['*']),
                isSystem: true
            }
        });
    }

    // 2. Obtener o Crear Sucursal Principal
    let branch = await prisma.branch.findFirst();
    if (!branch) {
        console.log('⚠️  No se encontraron sucursales. Creando Sucursal Principal...');
        branch = await prisma.branch.create({
            data: {
                code: 'SUC001',
                name: 'Sucursal Principal',
                address: 'Dirección por defecto',
                isMaster: true,
                isActive: true
            }
        });
    }

    // 3. Crear o Actualizar Usuario Admin
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        const user = await prisma.user.upsert({
            where: { username },
            update: {
                password: hashedPassword, // Resetea la contraseña
                roleId: adminRole.id,
                branchId: branch.id,
                isActive: true
            },
            create: {
                username,
                password: hashedPassword,
                email: 'admin@varopos.com',
                firstName: 'Administrador',
                lastName: 'Sistema',
                roleId: adminRole.id,
                branchId: branch.id,
                isActive: true
            }
        });

        console.log(`\n✅ ¡ADMINISTRADOR CONFIGURADO!`);
        console.log(`-------------------------------------------`);
        console.log(`🆔 Usuario:  ${user.username}`);
        console.log(`🔐 Password: ${password}`);
        console.log(`-------------------------------------------`);
        console.log(`Ya puedes iniciar sesión en el sistema.`);

    } catch (error) {
        console.error('\n❌ Ocurrió un error:', error);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
