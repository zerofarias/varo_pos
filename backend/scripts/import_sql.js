const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const prisma = require('../src/config/database');

// Ruta al archivo SQL
const SQL_PATH = 'c:\\Users\\lauth\\Downloads\\kiosco.sql';

async function main() {
    console.log('🚀 Iniciando importación de Kiosco SQL...');

    if (!fs.existsSync(SQL_PATH)) {
        console.error(`❌ No se encontró el archivo SQL en: ${SQL_PATH}`);
        process.exit(1);
    }

    const sqlContent = fs.readFileSync(SQL_PATH, 'utf-8');
    console.log(`PAGE: Leído archivo SQL (${(sqlContent.length / 1024 / 1024).toFixed(2)} MB)`);

    // ==========================================
    // 1. IMPORTAR CATEGORÍAS
    // ==========================================
    console.log('\n📦 Importando Categorías...');

    // Mapa: Legacy ID -> Prisma ID
    const categoryMap = new Map();

    // Categoría por defecto "General"
    let defaultCategory = await prisma.category.findFirst({ where: { name: 'General' } });
    if (!defaultCategory) {
        defaultCategory = await prisma.category.create({
            data: { name: 'General', description: 'Categoría por defecto', color: '#64748b' }
        });
    }
    console.log(`ℹ️ Categoría por defecto: ${defaultCategory.id}`);

    // Regex para capturar valores de INSERT INTO `categoria`
    const catRegex = /INSERT INTO `categoria` .*? VALUES\s*([\s\S]*?);/g;
    let catMatch;

    while ((catMatch = catRegex.exec(sqlContent)) !== null) {
        const valuesBlock = catMatch[1];
        const tuples = valuesBlock.match(/\(([^)]+)\)/g);

        if (tuples) {
            for (const tuple of tuples) {
                const parts = tuple
                    .replace(/^\(|\)$/g, '')
                    .split(/,(?=(?:(?:[^']*'){2})*[^']*$)/);

                if (parts.length >= 2) {
                    const id = parseInt(parts[0].trim());
                    const nameRaw = parts[1].trim().replace(/^'|'$/g, '');
                    const descRaw = parts.length > 2 ? parts[2].trim().replace(/^'|'$/g, '') : '';

                    const name = nameRaw.toUpperCase().trim();

                    let cat = await prisma.category.findFirst({ where: { name } });
                    if (!cat) {
                        cat = await prisma.category.create({
                            data: { name, description: descRaw, color: getRandomColor(), isActive: true }
                        });
                        console.log(`   ✅ Creada: ${name}`);
                    }

                    categoryMap.set(id, cat.id);
                }
            }
        }
    }

    console.log(`✅ ${categoryMap.size} categorías procesadas.`);

    // ==========================================
    // 2. CONFIGURAR SUCURSAL
    // ==========================================
    let defaultBranch = await prisma.branch.findFirst({ where: { isMaster: true } });
    if (!defaultBranch) {
        defaultBranch = await prisma.branch.findFirst();
    }
    if (!defaultBranch) {
        console.log('ℹ️ Creando Sucursal Casa Central...');
        defaultBranch = await prisma.branch.create({
            data: { name: 'Casa Central', code: 'SUC-001', isMaster: true, address: 'Imported Address' }
        });
    }
    console.log(`🏢 Usando sucursal para stock: ${defaultBranch.name}\n`);

    // ==========================================
    // 3. IMPORTAR PRODUCTOS
    // ==========================================
    console.log('\n🛒 Importando Productos...');

    const prodRegex = /INSERT INTO `producto` .*? VALUES\s*([\s\S]*?);/g;
    let prodMatch;
    let productsCount = 0;
    let errorsCount = 0;

    while ((prodMatch = prodRegex.exec(sqlContent)) !== null) {
        const valuesBlock = prodMatch[1];
        const tuples = valuesBlock.match(/\(([^)]+)\)/g);

        if (tuples) {
            for (const tuple of tuples) {
                try {
                    const parts = tuple
                        .replace(/^\(|\)$/g, '')
                        .split(/,(?=(?:(?:[^']*'){2})*[^']*$)/);

                    if (parts.length < 6) continue;

                    const idLegacy = parts[0].trim();
                    let code = parts[1].trim().replace(/^'|'$/g, '');
                    const descRaw = parts[2].trim().replace(/^'|'$/g, '');
                    const price = parseFloat(parts[4].trim().replace(/^'|'$/g, '')) || 0;
                    const catIdLegacy = parseInt(parts[7].trim());

                    // LIMPIEZA
                    let name = descRaw.toUpperCase().trim();
                    if (name.length > 3) name = name.replace(/\s+/g, ' ');

                    // FORZAR STOCK 0
                    let stock = 0;

                    if (!code || code === '0' || code.length < 3) {
                        code = `LEGACY-${idLegacy}`;
                    }

                    const categoryId = categoryMap.get(catIdLegacy) || defaultCategory.id;

                    const existing = await prisma.product.findFirst({
                        where: { OR: [{ barcode: code }, { sku: code }] }
                    });

                    if (existing) continue;

                    await prisma.product.create({
                        data: {
                            name,
                            description: `Importado (${descRaw})`,
                            sku: code,
                            barcode: code.startsWith('LEGACY') ? null : code,
                            salePrice: price,
                            costPrice: 0,
                            stockGlobal: stock, // 0
                            categoryId,
                            isActive: true,
                            manageStock: true,
                            stockMinimum: 5,
                            taxRate: 21,
                            stockByBranch: {
                                create: {
                                    branchId: defaultBranch.id,
                                    quantity: stock // 0
                                }
                            }
                        }
                    });

                    productsCount++;
                    if (productsCount % 50 === 0) process.stdout.write('.');

                } catch (err) {
                    errorsCount++;
                }
            }
        }
    }

    console.log(`\n\n✨ Importación Finalizada!`);
    console.log(`✅ Productos: ${productsCount}`);
    console.log(`⚠️ Errores: ${errorsCount}`);
}

function getRandomColor() {
    const colors = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e'];
    return colors[Math.floor(Math.random() * colors.length)];
}

main()
    .catch(e => {
        console.error('❌ ERROR CRÍTICO:');
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
