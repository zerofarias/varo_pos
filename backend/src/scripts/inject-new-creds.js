const prisma = require('../config/database');
const fs = require('fs');
const path = require('path');

// RUTAS EXACTAS BASADAS EN LO QUE VIMOS
const CRED_DIR = path.join(__dirname, '../../nuevas_credenciales');
const CERT_PATH = path.join(CRED_DIR, 'Certificiado.crt'); // Nombre exacto del archivo
const KEY_PATH = path.join(CRED_DIR, 'privada.key');
const CUIT = '20361320116';
const SALES_POINT = '1';
const PRODUCTION = 'false';

// Carpeta de certificados del servicio para limpieza
const SERVICE_CERT_DIR = path.join(__dirname, '../../afip_certs');

async function injectNewConfig() {
    console.log('--- CONFIGURANDO AFIP CON CREDENCIALES NUEVAS ---');

    try {
        if (!fs.existsSync(CERT_PATH)) throw new Error(`Falta: ${CERT_PATH}`);
        if (!fs.existsSync(KEY_PATH)) throw new Error(`Falta: ${KEY_PATH}`);

        const certContent = fs.readFileSync(CERT_PATH, 'utf8');
        const keyContent = fs.readFileSync(KEY_PATH, 'utf8');

        console.log('1. Archivos leídos correctamente.');

        // Actualizar DB
        const settings = [
            { key: 'AFIP_CUIT', value: CUIT },
            { key: 'AFIP_CERT', value: certContent },
            { key: 'AFIP_KEY', value: keyContent },
            { key: 'AFIP_PRODUCTION', value: PRODUCTION },
            { key: 'AFIP_SALES_POINT', value: SALES_POINT }
        ];

        for (const s of settings) {
            await prisma.setting.upsert({
                where: { key: s.key },
                update: { value: s.value },
                create: { key: s.key, value: s.value, type: 'string', group: 'afip' }
            });
        }
        console.log('2. Base de datos actualizada.');

        // Limpiar tokens viejos
        if (fs.existsSync(SERVICE_CERT_DIR)) {
            const files = fs.readdirSync(SERVICE_CERT_DIR);
            for (const file of files) {
                if (file.endsWith('.xml') || file.endsWith('.json')) {
                    fs.unlinkSync(path.join(SERVICE_CERT_DIR, file));
                }
            }
            console.log('3. Tokens temporales viejos eliminados.');
        }

        console.log('\n✅ ¡SISTEMA CONFIGURADO Y LISTO!');
        console.log('Por favor, prueba hacer una venta con F4.');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

injectNewConfig();
