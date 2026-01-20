const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const prisma = require('../src/config/database');

async function main() {
    console.log('🔧 RE-CONFIGURANDO PRODUCTOS COMO SERVICIO...');
    console.log('Objetivo: isService=TRUE, manageStock=FALSE, allowNegativeStock=FALSE');

    const updateStats = await prisma.product.updateMany({
        data: {
            isService: true,          // ✅ Modo Servicio Activado
            manageStock: false,       // ✅ Control de Stock Desactivado
            allowNegativeStock: false // ❌ Stock Negativo Desactivado (Prioriza Modo Servicio)
        }
    });

    console.log(`✅ Configuración aplicada a ${updateStats.count} productos.`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
