/**
 * VARO POS - Controlador de Productos
 */

const prisma = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const productController = {
    /**
     * Listar productos
     */
    async getAll(req, res) {
        try {
            const {
                page = 1,
                limit = 50,
                search,
                categoryId,
                lowStock,
                featured,
                active = 'true'
            } = req.query;

            const skip = (parseInt(page) - 1) * parseInt(limit);

            const where = {
                deletedAt: null
            };

            if (active === 'true') where.isActive = true;
            if (categoryId) where.categoryId = categoryId;
            if (featured === 'true') where.isFeatured = true;

            if (search) {
                where.OR = [
                    { name: { contains: search } },
                    { sku: { contains: search } },
                    { barcode: { contains: search } }
                ];
            }

            if (lowStock === 'true') {
                where.manageStock = true;
                where.stockGlobal = { lte: 0 };
            }

            const [products, total] = await Promise.all([
                prisma.product.findMany({
                    where,
                    include: {
                        category: { select: { id: true, name: true, color: true } }
                    },
                    orderBy: [
                        { isFeatured: 'desc' },
                        { name: 'asc' }
                    ],
                    skip,
                    take: parseInt(limit)
                }),
                prisma.product.count({ where })
            ]);

            // Agregar estado del semáforo de stock
            const productsWithStatus = products.map(product => ({
                ...product,
                stockStatus: getStockStatus(product),
                salePrice: parseFloat(product.salePrice),
                costPrice: parseFloat(product.costPrice)
            }));

            res.json({
                success: true,
                data: productsWithStatus,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / parseInt(limit))
                }
            });
        } catch (error) {
            console.error('Error al listar productos:', error);
            res.status(500).json({
                success: false,
                error: 'Error al obtener productos',
                details: [error.message]
            });
        }
    },

    /**
     * Buscar por código de barras
     */
    async getByBarcode(req, res) {
        try {
            const { barcode } = req.params;

            const product = await prisma.product.findFirst({
                where: {
                    barcode,
                    isActive: true,
                    deletedAt: null
                },
                include: {
                    category: { select: { id: true, name: true } }
                }
            });

            if (!product) {
                return res.status(404).json({
                    success: false,
                    error: 'Producto no encontrado',
                    details: [`No existe producto con código de barras: ${barcode}`]
                });
            }

            res.json({
                success: true,
                data: {
                    ...product,
                    stockStatus: getStockStatus(product),
                    salePrice: parseFloat(product.salePrice),
                    costPrice: parseFloat(product.costPrice)
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Error al buscar producto',
                details: [error.message]
            });
        }
    },

    /**
     * Obtener por ID
     */
    async getById(req, res) {
        try {
            const { id } = req.params;

            const product = await prisma.product.findUnique({
                where: { id },
                include: {
                    category: true,
                    supplier: true,
                    stockByBranch: {
                        include: { branch: { select: { id: true, name: true, code: true } } }
                    }
                }
            });

            if (!product || product.deletedAt) {
                return res.status(404).json({
                    success: false,
                    error: 'Producto no encontrado'
                });
            }

            res.json({
                success: true,
                data: {
                    ...product,
                    stockStatus: getStockStatus(product),
                    salePrice: parseFloat(product.salePrice),
                    costPrice: parseFloat(product.costPrice)
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Error al obtener producto',
                details: [error.message]
            });
        }
    },

    /**
     * Crear producto
     */
    async create(req, res) {
        try {
            const {
                sku,
                barcode,
                name,
                description,
                costPrice = 0,
                salePrice,
                wholesalePrice,
                minWholesaleQty = 1,
                stockMinimum = 0,
                stockMaximum,
                allowNegativeStock = false,
                isService = false,
                isFeatured = false,
                imageUrl,
                taxRate = 21,
                categoryId,
                supplierId
            } = req.body;

            // Validaciones
            if (!sku || !name || !salePrice || !categoryId) {
                return res.status(400).json({
                    success: false,
                    error: 'Datos incompletos',
                    details: ['Los campos sku, name, salePrice y categoryId son requeridos']
                });
            }

            // Verificar SKU único
            const existingSku = await prisma.product.findUnique({ where: { sku } });
            if (existingSku) {
                return res.status(400).json({
                    success: false,
                    error: 'SKU duplicado',
                    details: [`Ya existe un producto con el SKU: ${sku}`]
                });
            }

            // Verificar código de barras único
            if (barcode) {
                const existingBarcode = await prisma.product.findUnique({ where: { barcode } });
                if (existingBarcode) {
                    return res.status(400).json({
                        success: false,
                        error: 'Código de barras duplicado',
                        details: [`Ya existe un producto con el código: ${barcode}`]
                    });
                }
            }

            const product = await prisma.product.create({
                data: {
                    id: uuidv4(),
                    sku,
                    barcode: barcode || null,
                    name,
                    description,
                    costPrice,
                    salePrice,
                    wholesalePrice,
                    minWholesaleQty,
                    stockMinimum,
                    stockMaximum,
                    allowNegativeStock,
                    isService,
                    isFeatured,
                    imageUrl,
                    taxRate,
                    categoryId,
                    supplierId: supplierId || null
                },
                include: {
                    category: true
                }
            });

            res.status(201).json({
                success: true,
                message: 'Producto creado exitosamente',
                data: product
            });
        } catch (error) {
            console.error('Error al crear producto:', error);
            res.status(500).json({
                success: false,
                error: 'Error al crear producto',
                details: [error.message]
            });
        }
    },

    /**
     * Actualizar producto
     */
    async update(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;

            const product = await prisma.product.findUnique({ where: { id } });

            if (!product || product.deletedAt) {
                return res.status(404).json({
                    success: false,
                    error: 'Producto no encontrado'
                });
            }

            // Verificar SKU único si se cambia
            if (updateData.sku && updateData.sku !== product.sku) {
                const existingSku = await prisma.product.findUnique({
                    where: { sku: updateData.sku }
                });
                if (existingSku) {
                    return res.status(400).json({
                        success: false,
                        error: 'SKU duplicado'
                    });
                }
            }

            const updatedProduct = await prisma.product.update({
                where: { id },
                data: {
                    ...updateData,
                    lastSyncTimestamp: new Date()
                },
                include: { category: true }
            });

            res.json({
                success: true,
                message: 'Producto actualizado',
                data: updatedProduct
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Error al actualizar producto',
                details: [error.message]
            });
        }
    },

    /**
     * Eliminar producto (soft delete)
     */
    async delete(req, res) {
        try {
            const { id } = req.params;

            const product = await prisma.product.findUnique({ where: { id } });

            if (!product) {
                return res.status(404).json({
                    success: false,
                    error: 'Producto no encontrado'
                });
            }

            await prisma.product.update({
                where: { id },
                data: { deletedAt: new Date() }
            });

            res.json({
                success: true,
                message: 'Producto eliminado'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Error al eliminar producto',
                details: [error.message]
            });
        }
    },

    /**
     * Ajustar stock
     */
    async adjustStock(req, res) {
        try {
            const { id } = req.params;
            const { quantity, type, reason } = req.body;

            const product = await prisma.product.findUnique({ where: { id } });

            if (!product) {
                return res.status(404).json({
                    success: false,
                    error: 'Producto no encontrado'
                });
            }

            let newStock;
            switch (type) {
                case 'add':
                    newStock = product.stockGlobal + parseInt(quantity);
                    break;
                case 'subtract':
                    newStock = product.stockGlobal - parseInt(quantity);
                    break;
                case 'set':
                    newStock = parseInt(quantity);
                    break;
                default:
                    return res.status(400).json({
                        success: false,
                        error: 'Tipo de ajuste inválido',
                        details: ['Usar: add, subtract o set']
                    });
            }

            await prisma.$transaction([
                prisma.product.update({
                    where: { id },
                    data: { stockGlobal: newStock }
                }),
                prisma.stockMovement.create({
                    data: {
                        id: uuidv4(),
                        productId: id,
                        branchId: req.user.branchId,
                        userId: req.user.id,
                        type: type === 'subtract' ? 'OUT' : 'IN',
                        reason: 'ADJUSTMENT',
                        quantity: Math.abs(quantity),
                        previousQty: product.stockGlobal,
                        newQty: newStock,
                        notes: reason
                    }
                })
            ]);

            res.json({
                success: true,
                message: 'Stock actualizado',
                data: {
                    productId: id,
                    previousStock: product.stockGlobal,
                    newStock,
                    adjustment: type === 'set' ? newStock - product.stockGlobal : quantity
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Error al ajustar stock',
                details: [error.message]
            });
        }
    },

    /**
     * Alertas de stock
     */
    async getStockAlerts(req, res) {
        try {
            const products = await prisma.product.findMany({
                where: {
                    isActive: true,
                    isService: false,
                    deletedAt: null
                },
                include: {
                    category: { select: { name: true } }
                }
            });

            const critical = products.filter(p => p.stockGlobal <= 0);
            const low = products.filter(p => p.stockGlobal > 0 && p.stockGlobal <= p.stockMinimum);

            // Calcular días hasta agotamiento (si hay ventas recientes)
            // TODO: Implementar cálculo basado en promedio de ventas

            res.json({
                success: true,
                data: {
                    critical: critical.map(p => ({
                        ...p,
                        stockStatus: 'critical',
                        salePrice: parseFloat(p.salePrice)
                    })),
                    low: low.map(p => ({
                        ...p,
                        stockStatus: 'low',
                        salePrice: parseFloat(p.salePrice)
                    })),
                    summary: {
                        criticalCount: critical.length,
                        lowCount: low.length
                    }
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Error al obtener alertas',
                details: [error.message]
            });
        }
    }
};

/**
 * Determinar estado del semáforo de stock
 */
function getStockStatus(product) {
    if (product.isService) return 'ok';
    if (product.stockGlobal <= 0) return 'critical';
    if (product.stockGlobal <= product.stockMinimum) return 'low';
    return 'ok';
}

module.exports = productController;
