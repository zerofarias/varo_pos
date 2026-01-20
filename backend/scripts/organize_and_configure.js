const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const prisma = require('../src/config/database');

// Reglas de Clasificación extendidas
const RULES = [
    { cat: 'BEBIDAS', keywords: ['COCA', 'PEPSI', 'SPRITE', 'FANTA', 'CERVEZA', 'VINO', 'AGUA', 'JUGO', 'SPEED', 'MONSTER', 'FERNET', 'GANCIA', 'BAGGIO', 'LEVITE', '7UP', 'MANAOS', 'BRAHMA', 'QUILMES', 'ANDES', 'STELLA', 'HEINEKEN', 'CORONA', 'SCHNEIDER', 'BUDWEISER', 'RED BULL', 'POWERADE', 'GATORADE'] },
    { cat: 'ALMACEN', keywords: ['ARROZ', 'FIDEOS', 'HARINA', 'ACEITE', 'PURE', 'SOPA', 'SAL', 'AZUCAR', 'YERBA', 'TE', 'CAFE', 'MATE', 'GALLETITAS', 'TOSTADAS', 'MERMELADA', 'DULCE DE LECHE', 'MAYONESA', 'KETCHUP', 'SALSA', 'VINAGRE', 'ATUN', 'PATE', 'CALDO', 'POLENTA', 'AVENA', 'CEREAL'] },
    { cat: 'GOLOSINAS', keywords: ['ALFAJOR', 'CHICLE', 'CARAMELO', 'CHOCOLATE', 'TURRON', 'PASTILLA', 'GOMITAS', 'OBLITA', 'BLOCK', 'COFLER', 'MILKA', 'SHOT', 'KINDER', 'FERRERO', 'ROCKLETS', 'SUGUS', 'FLYNN', 'BON O BON', 'MOGUL', 'HALLS', 'BELDENT'] },
    { cat: 'LACTEOS', keywords: ['LECHE', 'YOGUR', 'QUESO', 'MANTECA', 'CREMA', 'SERENISIMA', 'SANCOR', 'ILOLAY', 'TREGAR', 'VERONICA', 'ADLER'] },
    { cat: 'LIMPIEZA', keywords: ['DETERGENTE', 'JABON', 'LAVANDINA', 'ROLLO', 'PAPEL', 'DESODORANTE', 'SHAMPOO', 'ACONDICIONADOR', 'PAÑAL', 'TOALLITAS', 'AEROSOL', 'CIF', 'VIM', 'AYUDIN', 'MAGISTRAL', 'REXONA', 'DOVE', 'PANTENE', 'SEDAL', 'ELVIVE'] },
    { cat: 'CIGARRILLOS', keywords: ['MARLBORO', 'PHILIP', 'CHESTERFIELD', 'LUCKY', 'CAMEL', 'PARLAMENT', 'ROTHMANS'] },
    { cat: 'FIAMBRERIA', keywords: ['SALAME', 'MORTADELA', 'JAMON', 'QUESO MAQUINA', 'PALETA', 'SALCHICHA', 'CHORIZO'] },
    { cat: 'HELADOS', keywords: ['HELADO', 'GRIDO', 'ARCOR HELADOS'] }
];

async function main() {
    console.log('🚀 Iniciando Organización y Configuración de Productos...');

    // 1. CONFIGURACIÓN MASIVA
    console.log('\n🔧 Paso 1: Configuración Global (Sin Stock, IVA 0%)...');

    // Actualizar todos los productos a manageStock = false y taxRate = 0
    // Nota: allowNegativeStock es buena práctica mantener en true si manageStock es false para evitar bloqueos raros.
    const updateStats = await prisma.product.updateMany({
        data: {
            manageStock: false,
            allowNegativeStock: true,
            taxRate: 0
        }
    });
    console.log(`✅ Configurados ${updateStats.count} productos.`);

    // 2. CLASIFICACIÓN
    console.log('\n📂 Paso 2: Clasificando productos por nombre...');

    for (const rule of RULES) {
        // Buscar categoría existente o crear nueva
        let category = await prisma.category.findFirst({ where: { name: rule.cat } });

        if (!category) {
            category = await prisma.category.create({
                data: {
                    name: rule.cat,
                    description: `Categoría ${rule.cat} (Auto-generada)`,
                    isActive: true,
                    color: getRandomColor()
                }
            });
            console.log(`   ✨ Categoría creada: ${rule.cat}`);
        } else {
            // console.log(`   ℹ️ Categoría existente: ${rule.cat}`);
        }

        // Preparar condiciones de búsqueda
        const conditions = rule.keywords.map(k => ({
            name: { contains: k } // Contains es case-insensitive en la mayoría de configs MySQL
        }));

        // Ejecutar Update
        const result = await prisma.product.updateMany({
            where: {
                OR: conditions
            },
            data: {
                categoryId: category.id
            }
        });

        console.log(`   📂 ${rule.cat}: Asignados ${result.count} productos.`);
    }

    // 3. REPORTE FINAL DE "GENERAL"
    const general = await prisma.category.findFirst({ where: { name: 'General' } });
    if (general) {
        const remaining = await prisma.product.count({ where: { categoryId: general.id } });
        console.log(`\nℹ️ Productos restantes en 'General': ${remaining}`);
    }

    console.log('\n✨ Proceso finalizado.');
}

function getRandomColor() {
    // Colores 'Premium' como pidió el usuario en reglas generales (aunque esto es backend, el color sirve para UI)
    const colors = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e'];
    return colors[Math.floor(Math.random() * colors.length)];
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
