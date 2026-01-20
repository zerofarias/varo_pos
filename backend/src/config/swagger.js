/**
 * VARO POS - Configuración de Swagger
 * Documentación OpenAPI 3.0
 */

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'VARO POS API',
            version: '1.0.0',
            description: `
## Sistema de Punto de Venta Multi-Sucursal

VARO POS es un sistema de gestión para Kioscos y Almacenes con arquitectura **Offline-First** y sincronización **Maestro/Cliente**.

### Características principales:
- 🏪 **Multi-Sucursal**: Gestión centralizada de múltiples puntos de venta
- 📴 **Offline-First**: Funciona sin conexión a internet
- 🔄 **Sincronización**: Sync eventual entre sucursales y servidor maestro
- 💳 **Pagos Flexibles**: Múltiples métodos de pago con recargos/descuentos
- 📊 **Reportes Inteligentes**: Predicción de agotamiento de stock
- 👥 **Cuentas Corrientes**: Gestión de fiado y pagos parciales
- 🎯 **Promociones Avanzadas**: 2x1, 3x2, combos, descuentos temporales

### Autenticación:
La API utiliza **JWT (JSON Web Tokens)** para autenticación. 
Incluir el token en el header: \`Authorization: Bearer <token>\`
      `,
            contact: {
                name: 'VARO POS Support',
                email: 'soporte@varopos.com'
            },
            license: {
                name: 'MIT',
                url: 'https://opensource.org/licenses/MIT'
            }
        },
        servers: [
            {
                url: 'http://localhost:3001/api',
                description: 'Servidor de Desarrollo'
            },
            {
                url: 'http://192.168.1.100:3001/api',
                description: 'Servidor Maestro (LAN)'
            }
        ],
        tags: [
            { name: 'Auth', description: 'Autenticación y autorización' },
            { name: 'Users', description: 'Gestión de usuarios' },
            { name: 'Products', description: 'Catálogo de productos' },
            { name: 'Categories', description: 'Categorías de productos' },
            { name: 'Sales', description: 'Gestión de ventas (POS)' },
            { name: 'Customers', description: 'Clientes y cuentas corrientes' },
            { name: 'Cash Register', description: 'Gestión de caja' },
            { name: 'Promotions', description: 'Ofertas y promociones' },
            { name: 'Stock', description: 'Movimientos de inventario' },
            { name: 'Purchases', description: 'Compras a proveedores' },
            { name: 'Sync', description: 'Sincronización Maestro/Cliente' },
            { name: 'Reports', description: 'Reportes y estadísticas' },
            { name: 'Settings', description: 'Configuración del sistema' }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Ingrese el token JWT obtenido del endpoint /auth/login'
                }
            },
            schemas: {
                // ==================== AUTH ====================
                LoginRequest: {
                    type: 'object',
                    required: ['username', 'password'],
                    properties: {
                        username: { type: 'string', example: 'admin' },
                        password: { type: 'string', format: 'password', example: '123456' }
                    }
                },
                LoginResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        data: {
                            type: 'object',
                            properties: {
                                token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIs...' },
                                user: { $ref: '#/components/schemas/User' }
                            }
                        }
                    }
                },

                // ==================== USER ====================
                User: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' },
                        username: { type: 'string', example: 'vendedor1' },
                        email: { type: 'string', format: 'email', example: 'vendedor@varopos.com' },
                        firstName: { type: 'string', example: 'Juan' },
                        lastName: { type: 'string', example: 'Pérez' },
                        phone: { type: 'string', example: '+54 11 1234-5678' },
                        isActive: { type: 'boolean', example: true },
                        role: { $ref: '#/components/schemas/Role' },
                        branch: { $ref: '#/components/schemas/Branch' },
                        createdAt: { type: 'string', format: 'date-time' }
                    }
                },
                CreateUserRequest: {
                    type: 'object',
                    required: ['username', 'email', 'password', 'firstName', 'lastName', 'roleId'],
                    properties: {
                        username: { type: 'string', example: 'nuevo_usuario' },
                        email: { type: 'string', format: 'email', example: 'nuevo@varopos.com' },
                        password: { type: 'string', format: 'password', example: '123456' },
                        firstName: { type: 'string', example: 'María' },
                        lastName: { type: 'string', example: 'García' },
                        phone: { type: 'string', example: '+54 11 9876-5432' },
                        roleId: { type: 'string', format: 'uuid' },
                        branchId: { type: 'string', format: 'uuid' }
                    }
                },

                // ==================== ROLE ====================
                Role: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string', example: 'Vendedor' },
                        description: { type: 'string', example: 'Rol para vendedores de mostrador' },
                        permissions: {
                            type: 'array',
                            items: { type: 'string' },
                            example: ['sales.create', 'products.view', 'customers.view']
                        }
                    }
                },

                // ==================== BRANCH ====================
                Branch: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        code: { type: 'string', example: 'SUC001' },
                        name: { type: 'string', example: 'Sucursal Centro' },
                        address: { type: 'string', example: 'Av. Corrientes 1234' },
                        phone: { type: 'string', example: '+54 11 4567-8901' },
                        isMaster: { type: 'boolean', example: false },
                        isActive: { type: 'boolean', example: true },
                        syncStatus: { type: 'string', enum: ['pending', 'syncing', 'synced', 'error'] }
                    }
                },

                // ==================== PRODUCT ====================
                Product: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        sku: { type: 'string', example: 'PROD001' },
                        barcode: { type: 'string', example: '7790001234567' },
                        name: { type: 'string', example: 'Coca Cola 500ml' },
                        description: { type: 'string', example: 'Bebida gaseosa 500ml' },
                        costPrice: { type: 'number', format: 'double', example: 500.00 },
                        salePrice: { type: 'number', format: 'double', example: 850.00 },
                        wholesalePrice: { type: 'number', format: 'double', example: 750.00 },
                        stockGlobal: { type: 'integer', example: 150 },
                        stockMinimum: { type: 'integer', example: 20 },
                        allowNegativeStock: { type: 'boolean', example: false },
                        isService: { type: 'boolean', example: false },
                        isActive: { type: 'boolean', example: true },
                        isFeatured: { type: 'boolean', example: true },
                        imageUrl: { type: 'string', example: '/uploads/products/coca-500.jpg' },
                        taxRate: { type: 'number', example: 21 },
                        category: { $ref: '#/components/schemas/Category' },
                        stockStatus: {
                            type: 'string',
                            enum: ['ok', 'low', 'critical', 'out'],
                            description: 'Semáforo de stock'
                        },
                        daysUntilEmpty: { type: 'integer', example: 15, description: 'Días estimados hasta agotamiento' }
                    }
                },
                CreateProductRequest: {
                    type: 'object',
                    required: ['sku', 'name', 'salePrice', 'categoryId'],
                    properties: {
                        sku: { type: 'string', example: 'PROD002' },
                        barcode: { type: 'string', example: '7790009876543' },
                        name: { type: 'string', example: 'Pepsi 500ml' },
                        description: { type: 'string', example: 'Bebida gaseosa 500ml' },
                        costPrice: { type: 'number', example: 480.00 },
                        salePrice: { type: 'number', example: 820.00 },
                        wholesalePrice: { type: 'number', example: 720.00 },
                        stockMinimum: { type: 'integer', example: 15 },
                        allowNegativeStock: { type: 'boolean', example: false },
                        isService: { type: 'boolean', example: false },
                        isFeatured: { type: 'boolean', example: false },
                        taxRate: { type: 'number', example: 21 },
                        categoryId: { type: 'string', format: 'uuid' },
                        supplierId: { type: 'string', format: 'uuid' }
                    }
                },

                // ==================== CATEGORY ====================
                Category: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string', example: 'Bebidas' },
                        description: { type: 'string', example: 'Bebidas gaseosas, jugos y agua' },
                        color: { type: 'string', example: '#3B82F6' },
                        icon: { type: 'string', example: 'bottle' },
                        productCount: { type: 'integer', example: 45 }
                    }
                },

                // ==================== SALE ====================
                Sale: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        saleNumber: { type: 'string', example: 'T-SUC001-00001' },
                        documentType: { type: 'string', enum: ['TICKET_X', 'FACTURA_A', 'FACTURA_B', 'FACTURA_C'] },
                        subtotal: { type: 'number', example: 2500.00 },
                        discountAmount: { type: 'number', example: 250.00 },
                        discountPercent: { type: 'number', example: 10 },
                        taxAmount: { type: 'number', example: 472.50 },
                        total: { type: 'number', example: 2722.50 },
                        status: { type: 'string', enum: ['pending', 'completed', 'cancelled', 'refunded'] },
                        items: { type: 'array', items: { $ref: '#/components/schemas/SaleItem' } },
                        payments: { type: 'array', items: { $ref: '#/components/schemas/Payment' } },
                        customer: { $ref: '#/components/schemas/CustomerSummary' },
                        user: { $ref: '#/components/schemas/UserSummary' },
                        createdAt: { type: 'string', format: 'date-time' }
                    }
                },
                CreateSaleRequest: {
                    type: 'object',
                    required: ['items', 'payments'],
                    properties: {
                        documentType: { type: 'string', enum: ['TICKET_X', 'FACTURA_A', 'FACTURA_B', 'FACTURA_C'], default: 'TICKET_X' },
                        customerId: { type: 'string', format: 'uuid', nullable: true },
                        discountPercent: { type: 'number', example: 10 },
                        items: {
                            type: 'array',
                            items: {
                                type: 'object',
                                required: ['productId', 'quantity'],
                                properties: {
                                    productId: { type: 'string', format: 'uuid' },
                                    quantity: { type: 'integer', minimum: 1, example: 2 },
                                    discountPercent: { type: 'number', example: 0 }
                                }
                            }
                        },
                        payments: {
                            type: 'array',
                            description: 'Pagos mixtos (efectivo + tarjeta, etc.)',
                            items: {
                                type: 'object',
                                required: ['paymentMethodId', 'amount'],
                                properties: {
                                    paymentMethodId: { type: 'string', format: 'uuid' },
                                    amount: { type: 'number', example: 1500.00 },
                                    reference: { type: 'string', example: 'TXN-12345' }
                                }
                            }
                        }
                    }
                },
                SaleItem: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        productId: { type: 'string', format: 'uuid' },
                        productName: { type: 'string', example: 'Coca Cola 500ml' },
                        productSku: { type: 'string', example: 'PROD001' },
                        quantity: { type: 'integer', example: 2 },
                        unitPrice: { type: 'number', example: 850.00 },
                        discountPercent: { type: 'number', example: 0 },
                        discountAmount: { type: 'number', example: 0 },
                        subtotal: { type: 'number', example: 1700.00 }
                    }
                },
                Payment: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        paymentMethodId: { type: 'string', format: 'uuid' },
                        paymentMethodName: { type: 'string', example: 'Efectivo' },
                        amount: { type: 'number', example: 1500.00 },
                        reference: { type: 'string', example: null }
                    }
                },

                // ==================== CUSTOMER ====================
                Customer: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        code: { type: 'string', example: 'CLI001' },
                        firstName: { type: 'string', example: 'Carlos' },
                        lastName: { type: 'string', example: 'González' },
                        documentType: { type: 'string', example: 'DNI' },
                        documentNumber: { type: 'string', example: '30123456' },
                        email: { type: 'string', example: 'carlos@email.com' },
                        phone: { type: 'string', example: '+54 11 5555-1234' },
                        creditLimit: { type: 'number', example: 50000.00 },
                        currentBalance: { type: 'number', example: 15000.00, description: 'Saldo deudor actual' },
                        alertOnDebt: { type: 'boolean', example: true },
                        blockOnLimit: { type: 'boolean', example: false },
                        isActive: { type: 'boolean', example: true },
                        debtStatus: {
                            type: 'string',
                            enum: ['ok', 'warning', 'blocked'],
                            description: 'Estado de deuda del cliente'
                        }
                    }
                },
                CustomerSummary: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        code: { type: 'string', example: 'CLI001' },
                        fullName: { type: 'string', example: 'Carlos González' },
                        currentBalance: { type: 'number', example: 15000.00 }
                    }
                },
                UserSummary: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        username: { type: 'string', example: 'vendedor1' },
                        fullName: { type: 'string', example: 'Juan Pérez' }
                    }
                },
                CustomerPaymentRequest: {
                    type: 'object',
                    required: ['amount'],
                    properties: {
                        amount: { type: 'number', example: 5000.00, description: 'Monto del pago parcial' },
                        description: { type: 'string', example: 'Pago parcial en efectivo' },
                        reference: { type: 'string', example: 'REC-001' }
                    }
                },

                // ==================== PROMOTION ====================
                Promotion: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        code: { type: 'string', example: 'VERANO2024' },
                        name: { type: 'string', example: 'Promo Verano 2x1' },
                        description: { type: 'string', example: 'Llevá 2 y pagá 1 en bebidas seleccionadas' },
                        type: { type: 'string', enum: ['PERCENTAGE', 'FIXED_AMOUNT', 'BUY_X_GET_Y', 'COMBO_PRICE'] },
                        discountPercent: { type: 'number', example: null },
                        buyQuantity: { type: 'integer', example: 2 },
                        getQuantity: { type: 'integer', example: 1 },
                        startDate: { type: 'string', format: 'date-time' },
                        endDate: { type: 'string', format: 'date-time' },
                        maxUses: { type: 'integer', example: 100 },
                        currentUses: { type: 'integer', example: 45 },
                        isActive: { type: 'boolean', example: true }
                    }
                },

                // ==================== SYNC ====================
                SyncUploadRequest: {
                    type: 'object',
                    required: ['sales'],
                    properties: {
                        branchId: { type: 'string', format: 'uuid' },
                        sales: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/Sale' }
                        },
                        lastSyncTimestamp: { type: 'string', format: 'date-time' }
                    }
                },
                SyncCatalogResponse: {
                    type: 'object',
                    properties: {
                        products: { type: 'array', items: { $ref: '#/components/schemas/Product' } },
                        categories: { type: 'array', items: { $ref: '#/components/schemas/Category' } },
                        promotions: { type: 'array', items: { $ref: '#/components/schemas/Promotion' } },
                        paymentMethods: { type: 'array', items: { type: 'object' } },
                        lastSyncTimestamp: { type: 'string', format: 'date-time' }
                    }
                },

                // ==================== COMMON ====================
                ApiResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        message: { type: 'string', example: 'Operación exitosa' },
                        data: { type: 'object' }
                    }
                },
                ErrorResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: false },
                        error: { type: 'string', example: 'Error de validación' },
                        details: { type: 'array', items: { type: 'string' } }
                    }
                },
                PaginatedResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        data: { type: 'array', items: {} },
                        pagination: {
                            type: 'object',
                            properties: {
                                page: { type: 'integer', example: 1 },
                                limit: { type: 'integer', example: 20 },
                                total: { type: 'integer', example: 150 },
                                totalPages: { type: 'integer', example: 8 }
                            }
                        }
                    }
                }
            },
            responses: {
                UnauthorizedError: {
                    description: 'Token de acceso faltante o inválido',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/ErrorResponse' },
                            example: {
                                success: false,
                                error: 'No autorizado',
                                details: ['Token inválido o expirado']
                            }
                        }
                    }
                },
                NotFoundError: {
                    description: 'Recurso no encontrado',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/ErrorResponse' },
                            example: {
                                success: false,
                                error: 'No encontrado',
                                details: ['El recurso solicitado no existe']
                            }
                        }
                    }
                },
                ValidationError: {
                    description: 'Error de validación',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/ErrorResponse' },
                            example: {
                                success: false,
                                error: 'Error de validación',
                                details: ['El campo "name" es requerido', 'El campo "price" debe ser mayor a 0']
                            }
                        }
                    }
                }
            }
        },
        security: [{ bearerAuth: [] }]
    },
    apis: ['./src/routes/*.js']
};

const specs = swaggerJsdoc(options);

module.exports = specs;
