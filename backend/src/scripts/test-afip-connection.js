const Afip = require('@afipsdk/afip.js');
const fs = require('fs');
const path = require('path');

const CERT_PATH = 'C:\\Users\\lauth\\Downloads\\Varo_5ec6c763b5e9533b.crt';
const KEY_PATH = 'C:\\Users\\lauth\\Downloads\\privada.key';
const CUIT = 20361320116;

console.log('--- INICIANDO PRUEBA DE CONEXIÓN AFIP DIRECTA ---');
console.log(`Leeyendo Certificado: ${CERT_PATH}`);
console.log(`Leeyendo Key: ${KEY_PATH}`);

if (!fs.existsSync(CERT_PATH)) {
    console.error('ERROR: No existe el .crt');
    process.exit(1);
}
if (!fs.existsSync(KEY_PATH)) {
    console.error('ERROR: No existe la .key');
    process.exit(1);
}

// Crear carpeta temporal local para tokens
const tempDir = path.join(__dirname, 'temp_afip_test');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

// FORZAR RUTAS ABSOLUTAS COPIANDO ARCHIVOS
const localCert = path.join(tempDir, 'cert.crt');
const localKey = path.join(tempDir, 'key.key');
fs.copyFileSync(CERT_PATH, localCert);
fs.copyFileSync(KEY_PATH, localKey);

const afip = new Afip({
    CUIT: CUIT,
    cert: localCert,
    key: localKey,
    production: false,
    res_folder: tempDir,
    ta_folder: tempDir
});

(async () => {
    try {
        console.log('Intentando obtener estado del servidor...');
        const status = await afip.ElectronicBilling.getServerStatus();
        console.log('✅ ¡CONEXIÓN EXITOSA!');
        console.log('Estado del servidor:', JSON.stringify(status, null, 2));

        console.log('Intentando obtener último comprobante (Pto Venta 1, Tipo 6)...');
        const lastVoucher = await afip.ElectronicBilling.getLastVoucher(1, 6);
        console.log('✅ Último comprobante:', lastVoucher);

    } catch (error) {
        console.error('❌ ERROR FATAL DE CONEXIÓN:');
        console.error(error);
        if (error.data) {
            console.error('Data:', error.data);
        }
    }
})();
