/**
 * VARO POS - Controlador de Categorías
 */

const prisma = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const categoryController = {
    async getAll(req, res) {
        try {
            const categories = await prisma.category.findMany({
                where: { deletedAt: null, isActive: true },
                include: {
                    children: { where: { deletedAt: null } },
                    _count: { select: { products: true } }
                },
                orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }]
            });

            res.json({
                success: true,
                data: categories.map(c => ({
                    ...c,
                    productCount: c._count.products
                }))
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    async getById(req, res) {
        try {
            const category = await prisma.category.findUnique({
                where: { id: req.params.id },
                include: {
                    children: true,
                    parent: true,
                    products: { where: { deletedAt: null }, take: 10 }
                }
            });

            if (!category || category.deletedAt) {
                return res.status(404).json({ success: false, error: 'Categoría no encontrada' });
            }

            res.json({ success: true, data: category });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    async create(req, res) {
        try {
            const { name, description, color, icon, parentId, sortOrder = 0 } = req.body;

            if (!name) {
                return res.status(400).json({ success: false, error: 'Nombre requerido' });
            }

            const category = await prisma.category.create({
                data: {
                    id: uuidv4(),
                    name,
                    description,
                    color,
                    icon,
                    parentId,
                    sortOrder
                }
            });

            res.status(201).json({ success: true, data: category });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    async update(req, res) {
        try {
            const category = await prisma.category.update({
                where: { id: req.params.id },
                data: req.body
            });

            res.json({ success: true, data: category });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    async normalize(req, res) {
        try {
            const categories = await prisma.category.findMany({
                where: { deletedAt: null },
                include: { _count: { select: { products: true } } }
            });

            const normalizeName = (name) => {
                return name.trim().toLowerCase()
                    .replace(/\s+/g, ' ') // Espacios multiples
                    .replace(/\b\w/g, c => c.toUpperCase()); // Capitalize
            };

            const groups = {}; // Map<NormalizedName, Category[]>

            categories.forEach(cat => {
                const norm = normalizeName(cat.name);
                if (!groups[norm]) groups[norm] = [];
                groups[norm].push(cat);
            });

            let mergedCount = 0;
            let renamedCount = 0;

            await prisma.$transaction(async (tx) => {
                for (const [normName, cats] of Object.entries(groups)) {
                    // 1. Fusión de Duplicados
                    if (cats.length > 1) {
                        // Elegir master: la que tenga más productos o la más vieja
                        cats.sort((a, b) => b._count.products - a._count.products);
                        const master = cats[0];
                        const others = cats.slice(1);

                        for (const other of others) {
                            // Mover productos
                            await tx.product.updateMany({
                                where: { categoryId: other.id },
                                data: { categoryId: master.id }
                            });
                            // Borrar duplicado
                            await tx.category.update({
                                where: { id: other.id },
                                data: { deletedAt: new Date(), isActive: false }
                            });
                            mergedCount++;
                        }

                        // Renombrar master si hace falta
                        if (master.name !== normName) {
                            await tx.category.update({
                                where: { id: master.id },
                                data: { name: normName }
                            });
                            renamedCount++;
                        }
                    } else {
                        // 2. Solo Renombrar
                        const cat = cats[0];
                        if (cat.name !== normName) {
                            await tx.category.update({
                                where: { id: cat.id },
                                data: { name: normName }
                            });
                            renamedCount++;
                        }
                    }
                }
            });

            res.json({
                success: true,
                message: 'Normalización completada',
                data: { merged: mergedCount, renamed: renamedCount }
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, error: 'Error normalizando categorías' });
        }
    },

    async delete(req, res) {
        try {
            // Verificar si tiene productos
            const productCount = await prisma.product.count({
                where: { categoryId: req.params.id, deletedAt: null }
            });

            if (productCount > 0) {
                return res.status(400).json({
                    success: false,
                    error: 'No se puede eliminar',
                    details: [`La categoría tiene ${productCount} productos asociados`]
                });
            }

            await prisma.category.update({
                where: { id: req.params.id },
                data: { deletedAt: new Date() }
            });

            res.json({ success: true, message: 'Categoría eliminada' });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
};

module.exports = categoryController;
