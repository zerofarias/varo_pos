const prisma = require('../config/database');
const fs = require('fs');
const path = require('path');

const CERT_PATH = 'C:\\Users\\lauth\\Downloads\\Varo_5ec6c763b5e9533b.crt';
const KEY_PATH = 'C:\\Users\\lauth\\Downloads\\privada.key';
const CUIT = '20361320116';
const SALES_POINT = '1'; // Cambiar si es diferente
const PRODUCTION = 'false';

async function injectConfig() {
    console.log('--- INYECTANDO CONFIGURACIÓN AFIP ---');

    try {
        if (!fs.existsSync(CERT_PATH)) {
            throw new Error(`No se encuentra el certificado en: ${CERT_PATH}`);
        }
        if (!fs.existsSync(KEY_PATH)) {
            throw new Error(`No se encuentra la clave en: ${KEY_PATH}`);
        }

        const certContent = fs.readFileSync(CERT_PATH, 'utf8');
        const keyContent = fs.readFileSync(KEY_PATH, 'utf8');

        console.log('Archivos leídos correctamente.');

        const settings = [
            { key: 'AFIP_CUIT', value: CUIT, type: 'string', group: 'afip' },
            { key: 'AFIP_CERT', value: certContent, type: 'string', group: 'afip' },
            { key: 'AFIP_KEY', value: keyContent, type: 'string', group: 'afip' },
            { key: 'AFIP_PRODUCTION', value: PRODUCTION, type: 'boolean', group: 'afip' },
            { key: 'AFIP_SALES_POINT', value: SALES_POINT, type: 'number', group: 'afip' }
        ];

        for (const setting of settings) {
            await prisma.setting.upsert({
                where: { key: setting.key },
                update: { value: setting.value, type: setting.type, group: setting.group },
                create: { key: setting.key, value: setting.value, type: setting.type, group: setting.group }
            });
            console.log(`✅ Configurado: ${setting.key}`);
        }

        console.log('--- CONFIGURACIÓN COMPLETADA ---');
        console.log('Ya puedes probar la venta (F4) de nuevo.');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

injectConfig();
