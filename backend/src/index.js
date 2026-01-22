/**
 * VARO POS - Servidor Principal
 * Sistema Multi-Sucursal Offline-First
 */

require('dotenv').config();
// --- PARCHE DE COMPATIBILIDAD SSL PARA AFIP (Node 20+) ---
const crypto = require('crypto');
try {
    // Permite conexiones a servidores con seguridad antigua (AFIP)
    const { constants } = crypto;
    const https = require('https');
    https.globalAgent.options.secureOptions = constants.SSL_OP_LEGACY_SERVER_CONNECT;
    // Opcional: reducir nivel de seguridad global para cifrados viejos
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
} catch (e) {
    console.warn('No se pudo aplicar parche SSL legacy:', e.message);
}
// -----------------------------------------------------------

const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');
const prisma = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3001;

// ================================
// MIDDLEWARES
// ================================
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
    next();
});

// ================================
// SWAGGER DOCUMENTATION
// ================================
const swaggerOptions = {
    customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info .title { color: #4F46E5; }
    .swagger-ui .info .description { margin-bottom: 20px; }
    .swagger-ui .opblock-tag { font-size: 18px; }
    .swagger-ui .opblock.opblock-post { border-color: #10B981; background: rgba(16, 185, 129, 0.05); }
    .swagger-ui .opblock.opblock-get { border-color: #3B82F6; background: rgba(59, 130, 246, 0.05); }
    .swagger-ui .opblock.opblock-put { border-color: #F59E0B; background: rgba(245, 158, 11, 0.05); }
    .swagger-ui .opblock.opblock-delete { border-color: #EF4444; background: rgba(239, 68, 68, 0.05); }
  `,
    customSiteTitle: 'VARO POS - API Documentation',
    customfavIcon: '/favicon.ico',
    swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        showExtensions: true,
        showCommonExtensions: true
    }
};

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, swaggerOptions));

// Endpoint para obtener el JSON del Swagger
app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpecs);
});

// ================================
// ROUTES
// ================================
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const productRoutes = require('./routes/product.routes');
const categoryRoutes = require('./routes/category.routes');
const saleRoutes = require('./routes/sale.routes');
const customerRoutes = require('./routes/customer.routes');
const syncRoutes = require('./routes/sync.routes');
const reportRoutes = require('./routes/report.routes');
const settingRoutes = require('./routes/setting.routes');
const paymentMethodRoutes = require('./routes/paymentMethod.routes');
const cashRegisterRoutes = require('./routes/cashRegister.routes');
const creditNoteRoutes = require('./routes/creditNote.routes');
const supplierReturnRoutes = require('./routes/supplierReturn.routes');
const cashShiftRoutes = require('./routes/cashShift.routes');
const promoRoutes = require('./routes/promo.routes');
const statsRoutes = require('./routes/stats.routes');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/payment-methods', paymentMethodRoutes);
app.use('/api/cash-registers', cashRegisterRoutes);
app.use('/api/credit-notes', creditNoteRoutes);
app.use('/api/supplier-returns', supplierReturnRoutes);
app.use('/api/cash-shifts', cashShiftRoutes);
app.use('/api/promotions', promoRoutes);
app.use('/api/afip', require('./routes/afip.routes'));
app.use('/api/stats', statsRoutes);

// ================================
// HEALTH CHECK
// ================================
app.get('/api/health', async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({
            success: true,
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            database: 'connected'
        });
    } catch (error) {
        res.status(503).json({
            success: false,
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            database: 'disconnected',
            error: error.message
        });
    }
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        name: 'VARO POS API',
        version: '1.0.0',
        description: 'Sistema de Punto de Venta Multi-Sucursal',
        documentation: '/api-docs',
        health: '/api/health'
    });
});

// ================================
// ERROR HANDLING
// ================================
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint no encontrado',
        path: req.path
    });
});

app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Error interno del servidor',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// ================================
// SERVER START
// ================================
const startServer = async () => {
    try {
        // Verificar conexión a la base de datos
        await prisma.$connect();
        console.log('✅ Conexión a base de datos exitosa');

        app.listen(PORT, () => {
            console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀  VARO POS - Backend Server                          ║
║                                                           ║
║   📍 API:          http://localhost:${PORT}/api             ║
║   📚 Swagger:      http://localhost:${PORT}/api-docs        ║
║   💊 Health:       http://localhost:${PORT}/api/health      ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
      `);
        });
    } catch (error) {
        console.error('❌ Error al iniciar el servidor:', error);
        process.exit(1);
    }
};

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Cerrando servidor...');
    await prisma.$disconnect();
    process.exit(0);
});

startServer();

module.exports = app;