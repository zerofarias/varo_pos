const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, '../../nuevas_credenciales');
if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
}

const keyPath = path.join(targetDir, 'privada.key');
const csrPath = path.join(targetDir, 'pedido.csr');
const cuit = '20361320116';

console.log('Generando nuevas credenciales en:', targetDir);

// Comando OpenSSL (asumiendo que está en el PATH o Git Bash)
const cmd = `openssl genrsa -out "${keyPath}" 2048 && openssl req -new -key "${keyPath}" -subj "//C=AR\\O=VaroPos\\CN=Testing\\serialNumber=CUIT ${cuit}" -out "${csrPath}"`;

exec(cmd, (error, stdout, stderr) => {
    if (error) {
        console.error('❌ Error ejecutando OpenSSL. Asegúrate de tener Git Bash o OpenSSL instalado.');
        console.error(error.message);
        return;
    }
    console.log('✅ ¡Éxito!');
    console.log('1. Archivo generado: ' + keyPath);
    console.log('2. Archivo generado: ' + csrPath);
    console.log('\n--- PASOS SIGUIENTES ---');
    console.log('1. Entra a AFIP (WSASS): https://wsass-h1.afip.gob.ar/wsass-registry-app/home.seam');
    console.log('2. Crea un NUEVO ALIAS (ej: "VaroPosTest2").');
    console.log('3. Sube el archivo "pedido.csr" que acabamos de generar.');
    console.log('4. Descarga el certificado y guárdalo en esta misma carpeta como "certificado.crt".');
    console.log('5. Avisame cuando lo tengas.');
});
