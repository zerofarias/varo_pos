const express = require('express');
const router = express.Router();
const afipController = require('../controllers/afip.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.use(authenticate);

// Todas las rutas requieren autenticación y rol de admin
// Asumiendo que 'settings.manage' es el permiso, o 'admin'
router.get('/config', authorize('settings.view'), afipController.getConfig);
router.post('/config', authorize('settings.edit'), afipController.saveConfig);
router.get('/status', authorize('settings.view'), afipController.testConnection);

module.exports = router;
