const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const prisma = require('../src/config/database');

async function list() {
    const cats = await prisma.category.findMany({
        include: { _count: { select: { products: true } } },
        orderBy: { name: 'asc' }
    });

    console.table(cats.map(c => ({
        id: c.id,
        name: c.name,
        products: c._count.products
    })));
}

list().finally(() => prisma.$disconnect());
