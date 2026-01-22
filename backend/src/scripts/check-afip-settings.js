const prisma = require('../config/database');

async function checkSettings() {
    try {
        const settings = await prisma.setting.findMany({
            where: { group: 'afip' }
        });

        console.log('--- CONFIGURACIÓN AFIP EN DB ---');
        if (settings.length === 0) {
            console.log('¡NO HAY CONFIGURACIONES GUARDADAS!');
        } else {
            settings.forEach(s => {
                // No mostrar claves completas por seguridad, solo longitud
                const val = s.key.includes('KEY') || s.key.includes('CERT')
                    ? `(Longitud: ${s.value ? s.value.length : 0})`
                    : s.value;
                console.log(`${s.key}: ${val}`);
            });
        }
        console.log('--------------------------------');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkSettings();
