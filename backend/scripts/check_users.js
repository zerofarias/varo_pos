const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const prisma = require('../src/config/database');

async function main() {
    const count = await prisma.user.count();
    console.log(`Usuarios en DB: ${count}`);

    if (count > 0) {
        const users = await prisma.user.findMany({ select: { username: true, role: true } });
        console.table(users);
    } else {
        console.log('⚠️ NO HAY USUARIOS. Creando admin por defecto...');
        // Crear Rol Admin si no existe
        let adminRole = await prisma.role.findFirst({ where: { name: 'Admin' } });
        if (!adminRole) {
            adminRole = await prisma.role.create({
                data: {
                    name: 'Admin',
                    description: 'Super Administrador',
                    permissions: '["*"]' // JSON string array
                }
            });
            console.log('Rol Admin creado.');
        }

        // Crear Sucursal default si no existe
        let branch = await prisma.branch.findFirst({ where: { isMaster: true } });
        if (!branch) {
            branch = await prisma.branch.create({
                data: {
                    name: 'Casa Central',
                    code: 'CENTRAL',
                    isMaster: true,
                    isActive: true
                }
            });
            console.log('Sucursal Central creada.');
        }

        // Crear User Admin
        // Password hash predeterminado para 'admin123' (BCrypt)
        // $2b$10$YourHashHere... (Necesitaría bcryptjs para generar, pero usaré uno conocido o importaré bcrypt)
        const bcrypt = require('bcryptjs'); // Asumiendo que está instalado
        const hashedPassword = await bcrypt.hash('admin123', 10);

        await prisma.user.create({
            data: {
                username: 'admin',
                email: 'admin@varopos.com',
                password: hashedPassword,
                firstName: 'Super',
                lastName: 'Admin',
                isActive: true,
                roleId: adminRole.id,
                branchId: branch.id
            }
        });
        console.log('✅ Usuario admin creado: admin / admin123');
    }
}

main()
    .catch(e => {
        console.error(e);
        if (e.code === 'MODULE_NOT_FOUND') {
            console.log('Falta bcryptjs. Ejecutar npm install bcryptjs');
        }
    })
    .finally(() => prisma.$disconnect());
