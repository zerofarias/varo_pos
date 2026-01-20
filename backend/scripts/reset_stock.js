const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const prisma = require('../src/config/database');

async function reset() {
    console.log('🔄 RESETTING ALL STOCK TO 0...');

    // Update Global
    const up1 = await prisma.product.updateMany({
        data: { stockGlobal: 0 }
    });
    console.log(`✅ Updated ${up1.count} products global stock.`);

    // Update Branches
    const up2 = await prisma.productStock.updateMany({
        data: { quantity: 0 }
    });
    console.log(`✅ Updated ${up2.count} branch stock records.`);
}

reset()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
