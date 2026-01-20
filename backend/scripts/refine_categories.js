const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const prisma = require('../src/config/database');

function toTitleCase(str) {
    if (!str) return '';
    return str.toLowerCase().split(' ').map((word, index) => {
        // Conectores minúsculas (salvo que sea la primera palabra)
        if (index > 0 && ['sin', 'con', 'de', 'del', 'y', 'o', 'el', 'la', 'los', 'las'].includes(word)) return word;
        return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
}

async function findOrCreate(name) {
    let cat = await prisma.category.findFirst({ where: { name } });
    if (!cat) {
        cat = await prisma.category.create({
            data: { name, isActive: true, description: 'Generada automáticamente' }
        });
        console.log(`   ✨ Creada categoría destino: ${name}`);
    }
    return cat;
}

async function main() {
    console.log('🚀 Iniciando Refinamiento de Categorías...');

    // 1. RENOMBRADO Y CORRECCIÓN DE TYPOS (CamelCase)
    console.log('\n📝 Normalizando nombres...');
    let cats = await prisma.category.findMany();

    for (const cat of cats) {
        // Correcciones específicas antes de CamelCase
        let cleanedName = cat.name.toUpperCase()
            .replace('ALCHOL', 'ALCOHOL') // Typo usuario
            .replace('GASEOSAS', 'BEBIDAS SIN ALCOHOL'); // Unificar Gaseosas

        let newName = toTitleCase(cleanedName);

        if (newName !== cat.name) {
            // Verificar colisión
            const existing = await prisma.category.findFirst({
                where: { name: newName, id: { not: cat.id } }
            });

            if (existing) {
                // Fusión
                console.log(`   🔀 Fusionando '${cat.name}' -> '${existing.name}'...`);
                await prisma.product.updateMany({
                    where: { categoryId: cat.id },
                    data: { categoryId: existing.id }
                });
                // Eliminar vieja (catch error si tiene FK constraints raras, pero products ya movidos)
                try {
                    await prisma.category.delete({ where: { id: cat.id } });
                } catch (e) {
                    console.error(`   ⚠️ No se pudo borrar ${cat.name}: ${e.message}`);
                }
            } else {
                // Renombrar
                console.log(`   ✏️ Renombrando '${cat.name}' -> '${newName}'`);
                await prisma.category.update({
                    where: { id: cat.id },
                    data: { name: newName }
                });
            }
        }
    }

    // 2. REDISTRIBUCIÓN DE "BEBIDAS" (Genérica)
    // Buscamos si existe "Bebidas" (ya renombrada)
    const bebidasCat = await prisma.category.findFirst({ where: { name: 'Bebidas' } });

    if (bebidasCat) {
        console.log('\n🍷 Analizando categoría "Bebidas"...');

        const conAlcohol = await findOrCreate('Bebidas con Alcohol');
        const sinAlcohol = await findOrCreate('Bebidas sin Alcohol');

        const products = await prisma.product.findMany({
            where: { categoryId: bebidasCat.id },
            select: { id: true, name: true }
        });

        // Palabras clave de alcohol (ampliada)
        const alcoholKeywords = [
            'CERVEZA', 'VINO', 'FERNET', 'GANCIA', 'SIDRA', 'WHISKY', 'VODKA', 'RON', 'LICOR',
            'FRIZZE', 'CHAMPAGNE', 'DR. LEMON', 'DR LEMON', 'ANDES', 'QUILMES', 'BRAHMA', 'ISENBECK',
            'WARSTEINER', 'MILLER', 'HEINEKEN', 'CORONA', 'STELLA', 'IMPERIAL', 'BUDWEISER',
            'SCHNEIDER', 'PATAGONIA', 'GROLSCH', 'AMSTEL', 'SALTA', 'CORDOBA', 'NORTE', 'PALERMO',
            'CAMPARI', 'CINZANO', 'MARTINI', 'APEROL', 'BLUE CURACAO', 'BAILEYS', 'TIA MARIA',
            'JAGGER', 'JAGERMEISTER', 'SMIRNOFF', 'ABSOLUT', 'SKY', 'CHIVAS', 'JOHNNIE WALKER', 'JACK DANIELS',
            'VINA', 'BOTELLA', 'TINTO', 'BLANCO', 'MALBEC', 'CABERNET'
        ];

        let movedCon = 0;
        let movedSin = 0;

        for (const p of products) {
            const upper = p.name.toUpperCase();

            // Heurística simple: Si tiene keyword de alcohol -> Con Alcohol.
            // Excepción: "SIN ALCOHOL" en el nombre (ej. Cerveza sin alcohol)
            const isAlcohol = alcoholKeywords.some(w => upper.includes(w)) && !upper.includes('SIN ALCOHOL');

            if (isAlcohol) {
                await prisma.product.update({ where: { id: p.id }, data: { categoryId: conAlcohol.id } });
                movedCon++;
            } else {
                await prisma.product.update({ where: { id: p.id }, data: { categoryId: sinAlcohol.id } });
                movedSin++;
            }
        }

        console.log(`   ✅ Redistribuidos: ${movedCon} a Con Alcohol, ${movedSin} a Sin Alcohol.`);

        // Verificar y borrar si vacía
        const count = await prisma.product.count({ where: { categoryId: bebidasCat.id } });
        if (count === 0) {
            await prisma.category.delete({ where: { id: bebidasCat.id } });
            console.log('   🗑️ Categoría "Bebidas" eliminada.');
        }
    }

    // 3. LIMPIEZA FINAL DE CATEGORÍAS VACÍAS
    console.log('\n🧹 Limpiando categorías vacías...');
    const allCats = await prisma.category.findMany({ include: { _count: { select: { products: true } } } });
    let deletedCount = 0;

    for (const c of allCats) {
        if (c._count.products === 0 && c.name !== 'General' && c.name !== 'Varios') {
            try {
                await prisma.category.delete({ where: { id: c.id } });
                // console.log(`   Borrada: ${c.name}`);
                deletedCount++;
            } catch (e) { }
        }
    }
    console.log(`✅ Se eliminaron ${deletedCount} categorías vacías.`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
