/**
 * VARO POS - Controlador de Configuración
 */

const prisma = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const settingController = {
    async getAll(req, res) {
        try {
            const { group } = req.query;

            const where = group ? { group } : {};
            const settings = await prisma.setting.findMany({ where });

            // Parsear valores según tipo
            const parsed = settings.reduce((acc, s) => {
                let value = s.value;
                if (s.type === 'number') value = parseFloat(value);
                else if (s.type === 'boolean') value = value === 'true';
                else if (s.type === 'json') value = JSON.parse(value);

                acc[s.key] = value;
                return acc;
            }, {});

            res.json({ success: true, data: parsed });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    async getByKey(req, res) {
        try {
            const setting = await prisma.setting.findUnique({
                where: { key: req.params.key }
            });

            if (!setting) {
                return res.status(404).json({ success: false, error: 'Configuración no encontrada' });
            }

            res.json({ success: true, data: setting });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    async update(req, res) {
        try {
            const { settings } = req.body;

            for (const { key, value } of settings) {
                await prisma.setting.upsert({
                    where: { key },
                    update: { value: String(value) },
                    create: {
                        id: uuidv4(),
                        key,
                        value: String(value)
                    }
                });
            }

            res.json({ success: true, message: 'Configuración actualizada' });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
};

module.exports = settingController;
