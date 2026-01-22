const Afip = require('@afipsdk/afip.js');
const prisma = require('../config/database');
const fs = require('fs');
const path = require('path');

class AfipService {
    constructor() {
        this.afip = null;
        this.config = null;
        this.certFolder = path.join(__dirname, '../../afip_certs'); // Carpeta para certificados temporales

        // Crear carpeta si no existe
        if (!fs.existsSync(this.certFolder)) {
            fs.mkdirSync(this.certFolder, { recursive: true });
        }
    }

    /**
     * Inicializar la instancia de AFIP con la configuración de la DB
     */
    async init() {
        // Obtener configuración de la DB
        const settings = await prisma.setting.findMany({
            where: {
                group: 'afip'
            }
        });

        const configMap = new Map(settings.map(s => [s.key, s.value]));

        if (!configMap.has('AFIP_CUIT') || !configMap.has('AFIP_CERT') || !configMap.has('AFIP_KEY')) {
            throw new Error('Falta configuración de AFIP (CUIT, Certificado o Key)');
        }

        const cuit = parseInt(configMap.get('AFIP_CUIT'));
        const production = configMap.get('AFIP_PRODUCTION') === 'true';
        const certContent = configMap.get('AFIP_CERT');
        const keyContent = configMap.get('AFIP_KEY');

        // Guardar archivos físicos requeridos por la librería
        const certPath = path.join(this.certFolder, 'cert.crt');
        const keyPath = path.join(this.certFolder, 'private.key');

        fs.writeFileSync(certPath, certContent);
        fs.writeFileSync(keyPath, keyContent);

        this.afip = new Afip({
            CUIT: cuit,
            cert: certPath,
            key: keyPath,
            production: production,
            res_folder: this.certFolder,
            ta_folder: this.certFolder
        });

        this.config = {
            cuit,
            production,
            salesPoint: parseInt(configMap.get('AFIP_SALES_POINT') || '1')
        };

        console.log(`[AFIP] Inicializado para CUIT ${cuit} en modo ${production ? 'PRODUCCIÓN' : 'TEST'}`);
    }

    /**
     * Obtener estado del servidor
     */
    async getServerStatus() {
        if (!this.afip) await this.init();
        return await this.afip.ElectronicBilling.getServerStatus();
    }

    /**
     * Emitir Factura
     * @param {Object} saleData Datos de la venta
     * @param {number} cbteTipo 1=Factura A, 6=Factura B, 11=Factura C
     */
    async createVoucher(saleData, cbteTipo = 6, associatedVoucher = null) {
        if (!this.afip) await this.init();

        const date = new Date(Date.now() - ((new Date()).getTimezoneOffset() * 60000)).toISOString().split('T')[0].replace(/-/g, '');
        const ptoVta = this.config.salesPoint;

        // Obtener último número de comprobante
        const lastVoucher = await this.afip.ElectronicBilling.getLastVoucher(ptoVta, cbteTipo);
        const cbteNro = lastVoucher + 1;

        let docTipo = 99; // Consumidor Final
        let docNro = 0;

        if (saleData.customer) {
            if (saleData.customer.documentType === 'CUIT') {
                docTipo = 80;
                docNro = parseInt(saleData.customer.documentNumber.replace(/\D/g, ''));
            } else if (saleData.customer.documentType === 'DNI') {
                docTipo = 96;
                docNro = parseInt(saleData.customer.documentNumber.replace(/\D/g, ''));
            }
        }

        // --- CORRECCIÓN CRÍTICA: SANITIZAR VALORES NUMÉRICOS ---
        const totalAmount = parseFloat(Number(saleData.total).toFixed(2));

        // --- DETERMINAR CONDICIÓN IVA RECEPTOR (Requerido por RG 5616) ---
        let condicionIvaReceptor = 5; // Default: Consumidor Final

        if (docTipo === 80) { // Es CUIT
            // Si emitimos Factura A o NC A, el receptor es RI (1)
            // Las Notas de Crédito A (3) también requieren receptor RI
            if (cbteTipo === 1 || cbteTipo === 3) condicionIvaReceptor = 1;
            // Si emitimos Factura B/C o NC B/C a un CUIT
            else condicionIvaReceptor = 6;
        }
        // -----------------------------------------------------------------

        // Preparar objeto data para la librería
        const data = {
            'CantReg': 1,
            'PtoVta': ptoVta,
            'CbteTipo': cbteTipo,
            'Concepto': 1, // 1=Productos
            'DocTipo': docTipo,
            'DocNro': docNro,
            'CbteDesde': cbteNro,
            'CbteHasta': cbteNro,
            'CbteFch': parseInt(date),
            'ImpTotal': totalAmount,
            'ImpTotConc': 0,
            'ImpNeto': 0,
            'ImpOpEx': 0,
            'ImpTrib': 0,
            'ImpIVA': 0,
            'FchServDesde': null,
            'FchServHasta': null,
            'FchVtoPago': null,
            'MonId': 'PES',
            'MonCotiz': 1,
            'CondicionIVAReceptorId': condicionIvaReceptor,
        };

        // Agregar comprobantes asociados (para Notas de Crédito/Débito)
        if (associatedVoucher) {
            data.CbtesAsoc = [
                {
                    'Tipo': associatedVoucher.type,
                    'PtoVta': associatedVoucher.salesPoint,
                    'Nro': associatedVoucher.number,
                    'Cuit': docNro > 0 ? docNro : undefined // Algunos WS lo piden si cambia el receptor, aunque en NC debe ser el mismo
                }
            ];
        }

        if (cbteTipo === 11) { // Factura C (Monotributo)
            data.ImpTotal = totalAmount;
            data.ImpNeto = totalAmount;
            data.ImpIVA = 0;
            // Factura C no lleva detalle de IVA
        } else {
            // Factura B (Responsable Inscripto -> Consumidor Final)
            const netAmount = parseFloat((totalAmount / 1.21).toFixed(2));
            const ivaAmount = parseFloat((totalAmount - netAmount).toFixed(2));

            data.ImpNeto = netAmount;
            data.ImpIVA = ivaAmount;

            // Ajuste centavos para que la suma sea exacta
            const diff = parseFloat((data.ImpTotal - (data.ImpNeto + data.ImpIVA)).toFixed(2));
            if (diff !== 0) {
                data.ImpNeto = parseFloat((data.ImpNeto + diff).toFixed(2));
            }

            // Alícuotas
            data.Iva = [
                {
                    'Id': 5, // 21%
                    'BaseImp': data.ImpNeto,
                    'Importe': data.ImpIVA
                }
            ];
        }

        const res = await this.afip.ElectronicBilling.createVoucher(data);

        // --- GENERACIÓN DE DATA QR (Especificación AFIP) ---
        // https://www.afip.gob.ar/fe/qr/especificaciones.asp
        const qrData = {
            ver: 1,
            fecha: date, // YYYYMMDD
            cuit: parseInt(this.config.cuit),
            ptoVta: data.PtoVta,
            tipoCmp: data.CbteTipo,
            nroCmp: cbteNro,
            importe: data.ImpTotal,
            moneda: data.MonId,
            ctz: data.MonCotiz,
            tipoDocRec: data.DocTipo,
            nroDocRec: data.DocNro,
            tipoCodAut: 'E', // 'E' para CAE
            codAut: parseInt(res.CAE)
        };

        const qrBase64 = Buffer.from(JSON.stringify(qrData)).toString('base64');
        const qrUrl = `https://www.afip.gob.ar/fe/qr/?p=${qrBase64}`;
        // ----------------------------------------------------

        return {
            cae: res.CAE,
            caeExpiration: res.CAEFchVto,
            voucherNumber: cbteNro,
            salesPoint: ptoVta, // Devolver punto de venta para formateo
            qrData: qrUrl
        };
    }
}

module.exports = new AfipService();
