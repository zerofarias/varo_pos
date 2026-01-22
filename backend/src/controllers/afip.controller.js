const prisma = require('../config/database');
const afipService = require('../services/afip.service');

const afipController = {
    /**
     * Obtener configuración actual (sin certs sensibles)
     */
    async getConfig(req, res) {
        console.log('🏁 [AfipController] Entrando a getConfig');
        try {
            console.log('🔄 [AfipController] Consultando Prisma Settings...');
            const settings = await prisma.setting.findMany({
                where: { group: 'afip' }
            });
            console.log('✅ [AfipController] Settings recuperados:', settings.length);

            const config = {
                cuit: '',
                salesPoint: 1,
                production: false,
                certExpiry: null,
                hasCert: false,
                hasKey: false
            };

            const settingMap = new Map(settings.map(s => [s.key, s.value]));

            if (settingMap.has('AFIP_CUIT')) config.cuit = settingMap.get('AFIP_CUIT');
            if (settingMap.has('AFIP_SALES_POINT')) config.salesPoint = parseInt(settingMap.get('AFIP_SALES_POINT'));
            if (settingMap.has('AFIP_PRODUCTION')) config.production = settingMap.get('AFIP_PRODUCTION') === 'true';

            config.hasCert = settingMap.has('AFIP_CERT');
            config.hasKey = settingMap.has('AFIP_KEY');

            res.json({ success: true, data: config });
        } catch (error) {
            console.error('❌ [AfipController] Error en getConfig:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    },

    /**
     * Guardar configuración y certificados
     */
    async saveConfig(req, res) {
        try {
            const { cuit, salesPoint, production, cert, key } = req.body;

            await prisma.$transaction(async (tx) => {
                const upsertInfo = async (k, v) => {
                    await tx.setting.upsert({
                        where: { id: `AFIP_${k}` }, // Usamos ID determinista o buscamos por key
                        // Si el schema no tiene ID manual, usamos findFirst/update/create o deleteMany/create
                        // Asumiendo que 'key' es unique? Revisemos schema.
                        // Usaremos deleteMany + create para simplificar si no es unique, o upsert por key si es unique.
                        // Mejor estrategia: upsert sobre key único si existe.
                    });
                };

                // Helper para upsert manual
                const setVal = async (key, val) => {
                    const existing = await tx.setting.findFirst({ where: { key } });
                    if (existing) {
                        await tx.setting.update({ where: { id: existing.id }, data: { value: String(val) } });
                    } else {
                        await tx.setting.create({
                            data: {
                                key,
                                value: String(val),
                                group: 'afip',
                                type: 'string'
                            }
                        });
                    }
                };

                if (cuit) await setVal('AFIP_CUIT', cuit);
                if (salesPoint) await setVal('AFIP_SALES_POINT', salesPoint);
                if (production !== undefined) await setVal('AFIP_PRODUCTION', production);

                // Certificados (vienen en base64 o texto)
                if (cert) await setVal('AFIP_CERT', cert);
                if (key) await setVal('AFIP_KEY', key);
            });

            // Reinicializar servicio
            try {
                await afipService.init();
            } catch (e) {
                console.warn('No se pudo inicializar AFIP tras guardar config:', e.message);
            }

            res.json({ success: true, message: 'Configuración guardada' });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    /**
     * Probar conexión con AFIP
     */
    async testConnection(req, res) {
        try {
            const status = await afipService.getServerStatus();
            res.json({ success: true, data: status });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Error de conexión con AFIP',
                details: error.message
            });
        }
    }
};

module.exports = afipController;
